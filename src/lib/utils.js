/* ---------- 共通ヘルパ ---------- */
export const fmt = (n) => Math.round(n).toLocaleString("ja-JP");

// "2025-08" -> "25/08"
export const shortYm = (ym) => ym.slice(2).replace("-", "/");

// rows を keyFn でグループ化し、点数（ten）と件数（count）を合算する。
// extra(r) を渡すと、各グループの初回レコードから追加フィールドを付与できる。
export function groupSum(rows, keyFn, extra) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, { key: k, ten: 0, count: 0, ...(extra ? extra(r) : {}) });
    const o = m.get(k);
    o.ten += r.ten;
    o.count += 1;
  }
  return [...m.values()];
}
