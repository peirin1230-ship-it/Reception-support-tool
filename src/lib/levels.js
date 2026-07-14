/* ---------- エラーコードのメタ情報（区分の意味） ---------- */
// 支払基金の定義に基づく区分（L1〜L4 / L48 / L7）。UI の色分け・トリアージの根拠。
export const LEVELS = {
  L1:  { label: "L1",  name: "医療機関単位エラー",         action: "再請求が必要",                badge: "bg-rose-50 text-rose-700 border-rose-200",     dot: "bg-rose-500" },
  L2:  { label: "L2",  name: "レセプト単位エラー",         action: "再請求が必要",                badge: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500" },
  L3:  { label: "L3",  name: "要確認（返戻対象）",         action: "内容を確認（返戻となる）",      badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  L4:  { label: "L4",  name: "要確認（査定・返戻・正当）", action: "内容を確認（査定/返戻/正当）",   badge: "bg-sky-50 text-sky-700 border-sky-200",         dot: "bg-sky-500" },
  L48: { label: "L48", name: "連絡のみ（正常受付）",       action: "再請求は不要",                badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  L7:  { label: "L7",  name: "算定ルールチェック（要確認）", action: "内容を確認（査定/返戻/正当）",  badge: "bg-cyan-50 text-cyan-700 border-cyan-200",     dot: "bg-cyan-500" },
};

// 対応の目安（詳細パネルに表示）
export const HINTS = {
  L1: "医療機関情報の記録を修正し、レセプト全体を再作成・再送します。",
  L2: "該当レセプトの記録内容を修正し、当月中（12日まで）に再送、または翌月に再請求します。",
  L3: "記録内容を確認し、誤りがあれば修正して再請求します。返戻の対象となる可能性があります。",
  L4: "医学的妥当性・算定要件・DPC定義との整合を確認します。届出済みで相違がなければそのまま請求します。",
  L48: "正常分として受け付けられています。再請求は不要ですが、次回以降の記録方法にご留意ください。",
  L7: "コンピュータチェック（併算定・算定回数の上限等）による要確認です。算定内容を確認し、適切であればそのまま請求します。",
};

// エラー内容の分類
export const CATS = ["形式・構造", "資格・保険者", "公費", "DPCコーディング", "算定ルール", "傷病名", "金額・負担金"];
