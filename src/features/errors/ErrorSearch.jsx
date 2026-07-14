import { useState, useMemo, useEffect } from "react";
import { Search, AlertTriangle, X } from "lucide-react";
import { LEVELS, HINTS, CATS } from "../../lib/levels.js";
import LevelBadge from "../../components/LevelBadge.jsx";

/* ================= タブ1：エラーコード検索・一覧 ================= */
// エラーコードマスタは public/data/error-codes.json から実行時に読み込む。
// マスタ（改定対応）はコード変更なしで更新できる。マスタは公開情報（PIIなし）。
export default function ErrorSearch() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [q, setQ] = useState("");
  const [lv, setLv] = useState("all");
  const [cat, setCat] = useState("all");
  const [mustOnly, setMustOnly] = useState(false);
  const [tgt, setTgt] = useState("all");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    let alive = true;
    const url = `${import.meta.env.BASE_URL}data/error-codes.json`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!alive) return;
        setCodes(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err.message || "読み込みに失敗しました");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return codes.filter((e) => {
      if (lv !== "all" && e.level !== lv) return false;
      if (cat !== "all" && e.cat !== cat) return false;
      if (mustOnly && !e.must) return false;
      if (tgt === "医科" && !e.targets.includes("医科")) return false;
      if (tgt === "DPC" && !e.targets.includes("DPC")) return false;
      if (tgt === "共通" && e.targets.length < 2) return false;
      if (kw && !(e.code.toLowerCase().includes(kw) || e.msg.toLowerCase().includes(kw) || e.cause.toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [codes, q, lv, cat, mustOnly, tgt]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        {/* 検索 */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="エラーコード（例：L4428）や内容のキーワードで検索"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {/* フィルタ */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {["all", "L1", "L2", "L3", "L4", "L48", "L7"].map((k) => (
            <button
              key={k}
              onClick={() => setLv(k)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                lv === k ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {k === "all" ? "すべての区分" : k}
            </button>
          ))}
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 outline-none focus:border-teal-500"
          >
            <option value="all">すべての分類</option>
            {CATS.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select
            value={tgt}
            onChange={(e) => setTgt(e.target.value)}
            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 outline-none focus:border-teal-500"
          >
            <option value="all">医科・DPC両方</option>
            <option value="医科">医科で使う</option>
            <option value="DPC">DPCで使う</option>
            <option value="共通">共通のみ</option>
          </select>
          <label className="ml-1 inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={mustOnly} onChange={(e) => setMustOnly(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-200" />
            修正必須（●）のみ
          </label>
          <span className="ml-auto text-xs text-slate-500">{rows.length} 件</span>
        </div>

        {/* 表 */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="max-h-[30rem] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">コード</th>
                  <th className="border-b border-slate-200 px-2 py-2 font-medium">区分</th>
                  <th className="border-b border-slate-200 px-2 py-2 font-medium">必須</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium">エラー内容</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.code}
                    onClick={() => setSel(e)}
                    className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-teal-50/60 ${sel?.code === e.code ? "bg-teal-50" : ""}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="font-mono text-[13px] font-medium text-slate-700">{e.code}</div>
                      <div className="mt-0.5 text-slate-400" style={{ fontSize: "10px" }}>{e.targets.join("・")}</div>
                    </td>
                    <td className="px-2 py-2"><LevelBadge level={e.level} /></td>
                    <td className="px-2 py-2 text-center">{e.must ? <span className="text-rose-500">●</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-600"><span className="line-clamp-2">{e.msg}</span></td>
                  </tr>
                ))}
                {loading && (
                  <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-400">エラーコードマスタを読み込んでいます…</td></tr>
                )}
                {loadError && !loading && (
                  <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-rose-500">マスタの読み込みに失敗しました（{loadError}）。</td></tr>
                )}
                {!loading && !loadError && rows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-400">該当するエラーコードがありません。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 詳細 */}
      <div className="lg:col-span-2">
        <div className="sticky top-4 rounded-lg border border-slate-200 bg-white p-4">
          {sel ? (
            <div>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-mono text-lg font-semibold text-slate-800">{sel.code}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <LevelBadge level={sel.level} />
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600">{sel.cat}</span>
                    <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">対象: {sel.targets.join("・")}</span>
                    {sel.must && <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-600">修正必須</span>}
                  </div>
                </div>
                <button onClick={() => setSel(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="閉じる"><X className="h-4 w-4" /></button>
              </div>

              <div className="mb-3 rounded-md bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">対応区分（{LEVELS[sel.level].label}：{LEVELS[sel.level].name}）</div>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{LEVELS[sel.level].action}</div>
              </div>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-slate-500">エラー内容</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-700">{sel.msg}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">エラー原因</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-700">{sel.cause}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">対応の目安</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-700">{HINTS[sel.level]}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="mb-2 h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-400">左の一覧からエラーコードを<br />選択すると詳細を表示します。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
