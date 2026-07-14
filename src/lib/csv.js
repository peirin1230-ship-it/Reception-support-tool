import Papa from "papaparse";

/* ---------- 増減点連絡書CSVの取込（PapaParse ラッパ） ---------- */
// 支払基金／国保連合会がオンライン請求システムで配信する「増減点連絡書データ(CSV)」の
// 原本形式（レコード種別 1=ヘッダ / 2=タイトル部 / 3・4=明細部。csv_ika.pdf 準拠。
// 文字コードは Shift_JIS）にも、非識別化・集計済みの簡易フラット形式にも対応する。
//
// 方針（個人情報保護）: 分析に必要な列（診療年月／診療科／事由／診療識別＝区分／請求内容＝項目名／
// 増減点数 等）のみを読み、患者氏名・カルテ番号・受付番号・保険者番号・被保険者記号番号などの
// 個人識別列は読み込まない（原本CSVに含まれていても取り込まない）。
// すべてブラウザ内で処理し、外部送信・保存は行わない。

// 診療識別コード（箇所, 2桁）→ 診療区分 の対応（レセプト電算の診療識別に準拠）
const SHIKIBETSU_KUBUN = {
  "11": "初・再診", "12": "初・再診", "13": "医学管理", "14": "在宅",
  "21": "投薬", "22": "投薬", "23": "投薬", "24": "投薬", "25": "投薬", "26": "投薬", "27": "投薬", "28": "投薬",
  "31": "注射", "32": "注射", "33": "注射", "39": "注射",
  "40": "処置", "50": "手術", "54": "麻酔",
  "60": "検査", "64": "病理", "70": "画像診断",
  "80": "その他", "90": "入院料", "92": "入院料", "97": "食事療養",
};

// 全角英数→半角（事由記号 Ａ〜Ｋ・GYYMM 等の正規化）
const toHalf = (s) => String(s).replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

// 診療年月の正規化：YYYY-MM / YYYY/MM / YYYYMM / YYYYMMDD / GYYMM(和暦5桁) / 令和・平成 表記 → "YYYY-MM"
function normalizeYm(raw) {
  if (!raw) return "";
  let s = toHalf(raw).trim();
  // 和暦（令和/平成/R/H 等の文字付き）
  const era = s.match(/(令和|平成|昭和|R|H|S)\s*(\d{1,2})[.\-年]\s*(\d{1,2})/);
  if (era) {
    const base = { "令和": 2018, R: 2018, "平成": 1988, H: 1988, "昭和": 1925, S: 1925 }[era[1]];
    return `${base + parseInt(era[2], 10)}-${String(parseInt(era[3], 10)).padStart(2, "0")}`;
  }
  // GYYMM（年号区分1桁＋YY＋MM。原本の診療年月）
  const g = s.match(/^(\d)(\d{2})(\d{2})$/);
  if (g) {
    const base = { 1: 1867, 2: 1911, 3: 1925, 4: 1988, 5: 2018 }[g[1]];
    if (base) return `${base + parseInt(g[2], 10)}-${g[3]}`;
  }
  s = s.replace(/[./年]/g, "-").replace(/月/g, "");
  const m1 = s.match(/^(\d{4})-(\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, "0")}`;
  const m2 = s.match(/^(\d{4})(\d{2})/); // YYYYMM / YYYYMMDD
  if (m2) return `${m2[1]}-${m2[2]}`;
  return s.slice(0, 7);
}

// 診療識別＋請求内容 → 診療区分（診療識別だけでは区別できない区分は請求内容から補完）
function deriveKubun(explicit, code2, item) {
  if (explicit) return explicit;
  let k = SHIKIBETSU_KUBUN[code2] || "";
  if (/診断群分類|医療資源|副傷病|包括|ＤＰＣ|DPC/.test(item)) return "DPC包括";
  if (!k || k === "その他") {
    if (/リハビリ|ﾘﾊﾋﾞﾘ/.test(item)) k = "リハビリ";
    else if (/精神/.test(item)) k = "精神";
    else if (/放射線|体外照射/.test(item)) k = "放射線治療";
  }
  return k || "その他";
}

const parseTen = (raw) => Math.abs(parseInt(toHalf(raw).replace(/[^0-9-]/g, ""), 10) || 0);
const parseReason = (raw) => (toHalf(raw).trim() || "K").charAt(0).toUpperCase();

// ---- 原本形式（レコード種別 1/2/3/4）のパース ----
// 明細部フィールド（0基点）: 1診療年月 3診療科コード 13区分 19箇所1 22増減点数 23事由 25請求内容
function parseOfficial(rows) {
  const recs = [];
  let dept = "不明";
  let lastYm = "";
  for (const r of rows) {
    const type = String(r[0] ?? "").trim();
    if (type === "1") { dept = (r[7] || "").trim() || "不明"; continue; } // ヘッダ：診療科名称
    if (type === "2") continue; // タイトル部（見出し）
    if (type !== "3" && type !== "4") continue; // 3=明細1行目, 4=2行目以降
    const ymRaw = (r[1] || "").trim();
    if (ymRaw) lastYm = normalizeYm(ymRaw); // 圧縮：2行目以降は前行を引き継ぐ
    const ten = parseTen(r[22]);
    if (!ten) continue;
    const item = (r[25] || "").trim() || "不明";
    const code = toHalf(r[19] || "").replace(/[^0-9]/g, "").slice(0, 2);
    recs.push({
      ym: lastYm || "不明",
      dept,
      doctor: "不明", // 原本に医師情報なし
      reason: parseReason(r[23]),
      kubun: deriveKubun("", code, item),
      item,
      ten,
    });
  }
  return recs;
}

// ---- フラット形式（ヘッダ付き1行1明細）のパース ----
function parseFlat(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h ?? "").trim());
  const recs = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    header.forEach((h, j) => { obj[h] = row[j]; });
    const col = (keys) => { for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim(); return ""; };
    const ten = parseTen(col(["増減点数", "減点点数", "点数", "増減点", "ten"]));
    if (!ten) continue;
    const item = col(["項目名", "請求内容", "診療行為", "名称", "項目", "item"]) || "不明";
    const code = toHalf(col(["診療識別", "箇所", "箇所1", "診区", "shikibetsu"])).replace(/[^0-9]/g, "").slice(0, 2);
    recs.push({
      ym: normalizeYm(col(["診療年月", "診療月", "ym"])) || "不明",
      dept: col(["診療科", "科", "dept"]) || "不明",
      doctor: col(["医師", "医師コード", "担当医", "doctor"]) || "不明",
      reason: parseReason(col(["事由", "増減点事由", "reason"])),
      kubun: deriveKubun(col(["区分", "診療区分", "kubun"]), code, item),
      item,
      ten,
    });
  }
  return recs;
}

// ファイル/文字列を読み、原本形式（Shift_JIS含む）／フラット形式を自動判別して取り込む
export async function parseAssessmentCsv(file) {
  const text = await readText(file);
  const rows = Papa.parse(text, { skipEmptyLines: true }).data; // header:false → 配列で取得
  const isOfficial = rows.some((r) => String(r[0]).trim() === "2" && String(r[1]).trim() === "診療年月");
  return isOfficial ? parseOfficial(rows) : parseFlat(rows);
}

// 文字コード判定：UTF-8(BOM)→UTF-8→（文字化けする場合）Shift_JIS の順で復号
async function readText(file) {
  if (typeof file === "string") return file;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes);
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (utf8.includes("\uFFFD")) {
    try { return new TextDecoder("shift_jis").decode(bytes); } catch { return utf8; }
  }
  return utf8;
}

// 累積データの CSV 書き出し（非識別化された内部形式。Excel等で開けるよう BOM 付き UTF-8）
export function exportAssessmentCsv(records, filename = "assessment-cumulative.csv") {
  const esc = (v) => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = ["診療年月", "診療科", "医師", "事由", "区分", "項目名", "増減点数"];
  const lines = [header.join(",")];
  for (const r of records) lines.push([r.ym, r.dept, r.doctor, r.reason, r.kubun, r.item, r.ten].map(esc).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
