/* ---------- 増減点連絡書 分析：サンプルデータ生成 ---------- */
// 初期表示用のダミーデータ。決定論的な擬似乱数（mulberry32）で毎回同じ結果になる。
// 自院CSVを読み込むと差し替えられる。実データは一切含まない。

export const MONTHS = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"];

const DEPTS = [
  { name: "内科" }, { name: "外科" }, { name: "整形外科" }, { name: "循環器内科" },
  { name: "消化器内科" }, { name: "小児科" }, { name: "産婦人科" }, { name: "眼科" },
  { name: "皮膚科" }, { name: "泌尿器科" },
];

const KUBUN = {
  "検査": { items: ["血液学的検査", "生化学的検査(I)", "腫瘍マーカー", "細菌培養同定検査", "心電図検査"], range: [20, 180] },
  "投薬": { items: ["内服薬", "外用薬", "抗菌薬", "消炎鎮痛剤"], range: [15, 120] },
  "注射": { items: ["点滴注射", "中心静脈注射", "抗悪性腫瘍剤", "生物学的製剤"], range: [30, 420] },
  "画像診断": { items: ["CT撮影", "MRI撮影", "単純X線撮影", "造影剤使用撮影"], range: [60, 460] },
  "処置": { items: ["創傷処置", "ドレーン法", "酸素吸入", "人工腎臓"], range: [20, 300] },
  "手術": { items: ["創傷処理", "内視鏡的手術", "関節鏡下手術", "ヘルニア手術"], range: [300, 1500] },
  "医学管理": { items: ["特定疾患療養管理料", "薬剤管理指導料", "診療情報提供料", "悪性腫瘍特異物質治療管理料"], range: [40, 260] },
  "リハビリ": { items: ["疾患別リハビリテーション", "早期リハビリ加算"], range: [30, 200] },
  "入院料": { items: ["入院基本料", "特定入院料", "入院基本料等加算"], range: [80, 900] },
  "DPC包括": { items: ["包括対象診療行為の混入", "医療資源病名の不一致", "診断群分類の変更"], range: [100, 1200] },
};
const KUBUN_KEYS = Object.keys(KUBUN);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function wpick(rng, arr, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < arr.length; i++) { r -= weights[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}

export function makeSample() {
  const rng = mulberry32(20260714);
  const mW = [22, 20, 18, 16, 14, 10];
  const dW = [20, 14, 14, 12, 10, 8, 6, 6, 5, 5];
  const kW = [22, 16, 12, 10, 9, 5, 10, 4, 7, 5];
  const rKeys = ["A", "B", "C", "D", "F"], rW = [18, 30, 12, 28, 12];
  const out = [];
  for (let i = 0; i < 280; i++) {
    const ym = wpick(rng, MONTHS, mW);
    const d = wpick(rng, DEPTS, dW);
    const kubun = wpick(rng, KUBUN_KEYS, kW);
    const meta = KUBUN[kubun];
    const item = meta.items[Math.floor(rng() * meta.items.length)];
    const reason = wpick(rng, rKeys, rW);
    const [lo, hi] = meta.range;
    const ten = Math.round(lo + rng() * (hi - lo));
    out.push({ id: i, ym, dept: d.name, reason, kubun, item, ten });
  }
  return out;
}
