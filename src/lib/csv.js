import Papa from "papaparse";

/* ---------- 増減点連絡書CSVの取込（PapaParse ラッパ） ---------- */
// 支払基金／国保連合会がオンライン請求システムで配信する「増減点連絡書データ（CSV）」の
// 原本形式にも、非識別化・集計済み抽出にも対応する。
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

// 全角英字→半角（事由記号 Ａ〜Ｋ 等の正規化）
const toHalf = (s) => s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

// 診療年月の正規化：YYYY-MM / YYYY/MM / YYYYMM / YYYYMMDD / 令和・平成 表記に対応 → "YYYY-MM"
function normalizeYm(raw) {
  if (!raw) return "";
  let s = toHalf(String(raw)).trim();
  // 和暦（令和/平成/R/H）→ 西暦
  const era = s.match(/(令和|平成|昭和|R|H|S)\s*(\d{1,2})[.\-年]\s*(\d{1,2})/);
  if (era) {
    const base = { "令和": 2018, R: 2018, "平成": 1988, H: 1988, "昭和": 1925, S: 1925 }[era[1]];
    const y = base + parseInt(era[2], 10);
    return `${y}-${String(parseInt(era[3], 10)).padStart(2, "0")}`;
  }
  s = s.replace(/[./年]/g, "-").replace(/月/g, "");
  const m1 = s.match(/^(\d{4})-(\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, "0")}`;
  const m2 = s.match(/^(\d{4})(\d{2})/); // YYYYMM / YYYYMMDD
  if (m2) return `${m2[1]}-${m2[2]}`;
  return s.slice(0, 7);
}

// 想定列（いずれの別名でも可）:
//  診療年月 / 診療科 / 医師(任意) / 事由 / 区分 または 診療識別(箇所) / 項目名 または 請求内容 / 増減点数
export function parseAssessmentCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const recs = [];
        for (const row of res.data) {
          const col = (keys) => {
            for (const k of keys) if (row[k] != null && row[k] !== "") return String(row[k]).trim();
            return "";
          };
          // 増減点数（±符号・全角マイナス・カンマ等を除去し、絶対値＝減点点数として扱う）
          const tenRaw = toHalf(col(["増減点数", "減点点数", "点数", "増減点", "ten"])).replace(/[^0-9-]/g, "");
          const tenV = Math.abs(parseInt(tenRaw, 10) || 0);
          if (!tenV) continue;

          const item = col(["項目名", "請求内容", "診療行為", "名称", "項目", "item"]) || "不明";

          // 区分：明示の区分列があれば優先、なければ診療識別コードから導出。
          // 診療識別だけでは区別できない区分（DPC包括・リハビリ・精神・放射線）は請求内容から補完。
          let kubun = col(["区分", "診療区分", "kubun"]);
          if (!kubun) {
            const code = toHalf(col(["診療識別", "箇所", "診区", "shikibetsu"])).replace(/[^0-9]/g, "").slice(0, 2);
            kubun = SHIKIBETSU_KUBUN[code] || "";
            if (/診断群分類|医療資源|副傷病|包括|ＤＰＣ|DPC/.test(item)) kubun = "DPC包括";
            else if (!kubun || kubun === "その他") {
              if (/リハビリ|ﾘﾊﾋﾞﾘ/.test(item)) kubun = "リハビリ";
              else if (/精神/.test(item)) kubun = "精神";
              else if (/放射線|体外照射/.test(item)) kubun = "放射線治療";
            }
          }

          recs.push({
            ym: normalizeYm(col(["診療年月", "診療月", "ym"])) || "不明",
            dept: col(["診療科", "科", "dept"]) || "不明",
            doctor: col(["医師", "医師コード", "担当医", "doctor"]) || "不明",
            reason: (toHalf(col(["事由", "増減点事由", "reason"])) || "K").charAt(0).toUpperCase(),
            kubun: kubun || "その他",
            item,
            ten: tenV,
          });
        }
        resolve(recs);
      },
      error: (err) => reject(err),
    });
  });
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
