import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, FolderOpen, FilePlus, Download, RotateCcw, ShieldCheck, Trash2, Inbox } from "lucide-react";
import { REASONS } from "../../lib/reasons.js";
import { makeSample } from "../../lib/sample.js";
import { fmt, shortYm, groupSum } from "../../lib/utils.js";
import { parseAssessmentCsv, exportAssessmentCsv } from "../../lib/csv.js";
import Kpi from "../../components/Kpi.jsx";
import Panel from "../../components/Panel.jsx";

/* ================= タブ2：増減点連絡書 分析 ================= */
export default function Assessment() {
  const [data, setData] = useState(makeSample);
  const [custom, setCustom] = useState(false);
  const [ym, setYm] = useState("all");
  const [dept, setDept] = useState("all");
  const fileRef = useRef(null);
  const modeRef = useRef("open");

  const period = useMemo(() => {
    if (!data.length) return null;
    const yms = data.map((r) => r.ym).filter((y) => y && y !== "不明").sort();
    return yms.length ? { min: yms[0], max: yms[yms.length - 1] } : null;
  }, [data]);
  const ymOptions = useMemo(() => [...new Set(data.map((r) => r.ym))].filter(Boolean).sort(), [data]);
  const deptOptions = useMemo(() => [...new Set(data.map((r) => r.dept))].filter(Boolean).sort(), [data]);

  const byDeptOnly = useMemo(() => data.filter((r) => dept === "all" || r.dept === dept), [data, dept]);
  const scoped = useMemo(() => byDeptOnly.filter((r) => ym === "all" || r.ym === ym), [byDeptOnly, ym]);

  const monthly = useMemo(() => {
    const g = groupSum(byDeptOnly, (r) => r.ym);
    return g.sort((a, b) => a.key.localeCompare(b.key)).map((o) => ({ name: shortYm(o.key), ten: o.ten, count: o.count }));
  }, [byDeptOnly]);

  const totalTen = scoped.reduce((s, r) => s + r.ten, 0);
  const count = scoped.length;
  const avg = count ? totalTen / count : 0;
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const delta = last && prev && prev.ten ? ((last.ten - prev.ten) / prev.ten) * 100 : null;

  const deptData = useMemo(
    () => groupSum(scoped, (r) => r.dept).sort((a, b) => b.ten - a.ten).slice(0, 10).map((o) => ({ name: o.key, ten: o.ten })),
    [scoped]
  );
  const reasonData = useMemo(
    () => groupSum(scoped, (r) => r.reason).sort((a, b) => b.ten - a.ten).map((o) => ({ name: REASONS[o.key]?.name ?? o.key, key: o.key, value: o.ten })),
    [scoped]
  );
  const kubunData = useMemo(
    () => groupSum(scoped, (r) => r.kubun).sort((a, b) => b.ten - a.ten).map((o) => ({ name: o.key, ten: o.ten })),
    [scoped]
  );
  const topItems = useMemo(
    () => groupSum(scoped, (r) => r.item, (r) => ({ kubun: r.kubun })).sort((a, b) => b.ten - a.ten).slice(0, 10),
    [scoped]
  );
  const topDrs = useMemo(
    () => groupSum(scoped, (r) => `${r.doctor}／${r.dept}`, (r) => ({ doctor: r.doctor, dept: r.dept })).sort((a, b) => b.ten - a.ten).slice(0, 8),
    [scoped]
  );

  function chooseFile(mode) {
    modeRef.current = mode;
    fileRef.current?.click();
  }
  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    let recs;
    try {
      recs = await parseAssessmentCsv(f);
    } catch {
      alert("CSVの読み込み中にエラーが発生しました。ファイル形式をご確認ください。");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (fileRef.current) fileRef.current.value = "";
    if (!recs.length) {
      alert("読み込めるデータがありませんでした。列名（診療年月／診療科／医師／事由／区分／項目名／増減点数）をご確認ください。");
      return;
    }
    if (modeRef.current === "add") {
      const newYms = [...new Set(recs.map((r) => r.ym))];
      const existingYms = new Set(data.map((r) => r.ym));
      const overlap = newYms.filter((y) => existingYms.has(y));
      let base = data, incoming = recs;
      if (overlap.length) {
        const replace = window.confirm(`すでに含まれる診療年月（${overlap.join(", ")}）があります。\n\nOK：置き換える／キャンセル：重複する月は取り込まない`);
        if (replace) base = data.filter((r) => !newYms.includes(r.ym));
        else incoming = recs.filter((r) => !overlap.includes(r.ym));
      }
      setData([...base, ...incoming].map((r, i) => ({ ...r, id: i })));
      setCustom(true);
      setYm("all");
    } else {
      setData(recs.map((r, i) => ({ ...r, id: i })));
      setCustom(true);
      setYm("all");
      setDept("all");
    }
  }
  function exportCumulative() {
    exportAssessmentCsv(data);
  }
  function reset() {
    setData(makeSample());
    setCustom(false);
    setYm("all");
    setDept("all");
  }
  // 累計をリセット：読み込み済みの累計データを消去して空の状態にする（サンプルには戻さない）
  function resetCumulative() {
    if (data.length === 0) return;
    if (!window.confirm("読み込み済みの累計データをすべて消去し、空の状態にします。よろしいですか？\n（「累積を書き出す」で保存していない変更は失われます）")) return;
    setData([]);
    setCustom(true);
    setYm("all");
    setDept("all");
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>アップロードしたCSVはこのブラウザ内だけで処理され、サーバーには送信・保存されません。患者氏名・被保険者番号などの個人を特定できる情報は含めないでください（医師名も可能な限りコード化を推奨します）。</p>
      </div>
      {/* ツールバー */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">診療年月</span>
          <select value={ym} onChange={(e) => setYm(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-teal-500">
            <option value="all">すべて</option>
            {ymOptions.map((m) => (<option key={m} value={m}>{m.replace("-", "年")}月</option>))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">診療科</span>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-teal-500">
            <option value="all">すべて</option>
            {deptOptions.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${!custom ? "bg-slate-100 text-slate-500" : data.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {!custom ? "サンプルデータ" : data.length ? "自院データ（累積）" : "累計リセット済み（データなし）"}
          </span>
          {period && <span className="text-xs text-slate-500">対象期間 {period.min}〜{period.max}／{fmt(data.length)}件</span>}
          <button onClick={() => chooseFile("open")} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400">
            <FolderOpen className="h-3.5 w-3.5" /> 累積を開く
          </button>
          <button onClick={() => chooseFile("add")} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400">
            <FilePlus className="h-3.5 w-3.5" /> 当月分を追加
          </button>
          <button onClick={exportCumulative} disabled={!data.length} className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${data.length ? "border-teal-600 bg-teal-600 text-white hover:bg-teal-700" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"}`}>
            <Download className="h-3.5 w-3.5" /> 累積を書き出す
          </button>
          {custom && data.length > 0 && (
            <button onClick={resetCumulative} className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> 累計をリセット
            </button>
          )}
          {custom && (
            <button onClick={reset} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400">
              <RotateCcw className="h-3.5 w-3.5" /> サンプルに戻す
            </button>
          )}
          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">累計データは空です</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            「累積を開く」で保存済みの累計ファイルを読み込むか、「当月分を追加」で当月の増減点連絡書CSVを取り込んでください。デモを見るには「サンプルに戻す」を押します。
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => chooseFile("open")} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400">
              <FolderOpen className="h-3.5 w-3.5" /> 累積を開く
            </button>
            <button onClick={() => chooseFile("add")} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400">
              <FilePlus className="h-3.5 w-3.5" /> 当月分を追加
            </button>
            <button onClick={reset} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400">
              <RotateCcw className="h-3.5 w-3.5" /> サンプルに戻す
            </button>
          </div>
        </div>
      ) : (
      <>
      {/* KPI */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <Kpi label="減点点数（対象期間）" value={fmt(totalTen)} unit="点" />
        <Kpi label="減点金額（10円換算）" value={"¥" + fmt(totalTen * 10)} />
        <Kpi label="査定件数" value={fmt(count)} unit="件" />
        <Kpi label="1件あたり平均" value={fmt(avg)} unit="点" />
        <Kpi
          label="最新月の減点点数（前月比）"
          value={delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
          unit={delta == null ? "" : "%"}
          sub={
            delta == null ? null : (
              <span className={`inline-flex items-center gap-0.5 ${delta <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {delta <= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                {delta <= 0 ? "改善" : "増加"}
              </span>
            )
          }
        />
      </div>

      {/* グラフ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="減点点数の月次推移" note="全期間・診療科フィルタ反映">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} width={44} />
                <Tooltip formatter={(v) => [`${fmt(v)}点`, "減点点数"]} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="ten" stroke="#0e7490" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="診療科別の減点点数" note="上位10科">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 12, fill: "#475569" }} />
                <Tooltip formatter={(v) => [`${fmt(v)}点`, "減点点数"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="ten" fill="#0f766e" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="増減点事由の内訳" note="A〜F区分・減点点数">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {reasonData.map((d) => (<Cell key={d.key} fill={REASONS[d.key]?.color ?? "#94a3b8"} />))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${fmt(v)}点`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {reasonData.map((d) => (
              <span key={d.key} className="inline-flex items-center gap-1 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: REASONS[d.key]?.color ?? "#94a3b8" }} />
                {d.name}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="診療区分別の減点点数" note="降順">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kubunData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-30} textAnchor="end" height={56} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} width={44} />
                <Tooltip formatter={(v) => [`${fmt(v)}点`, "減点点数"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="ten" fill="#0891b2" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* 明細テーブル */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="減点点数 上位の項目" note="上位10項目">
          <table className="w-full border-collapse text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-2 py-1.5 font-medium">項目</th>
                <th className="border-b border-slate-200 px-2 py-1.5 font-medium">区分</th>
                <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium">件数</th>
                <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium">減点点数</th>
                <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium">金額</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((o) => (
                <tr key={o.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5 text-slate-700">{o.key}</td>
                  <td className="px-2 py-1.5 text-slate-500">{o.kubun}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{fmt(o.count)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-800">{fmt(o.ten)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">¥{fmt(o.ten * 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="医師別の減点点数" note="上位8名">
          <table className="w-full border-collapse text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-2 py-1.5 font-medium">医師</th>
                <th className="border-b border-slate-200 px-2 py-1.5 font-medium">診療科</th>
                <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium">件数</th>
                <th className="border-b border-slate-200 px-2 py-1.5 text-right font-medium">減点点数</th>
              </tr>
            </thead>
            <tbody>
              {topDrs.map((o) => (
                <tr key={o.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5 text-slate-700">{o.doctor}</td>
                  <td className="px-2 py-1.5 text-slate-500">{o.dept}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{fmt(o.count)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-800">{fmt(o.ten)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      </>
      )}
    </div>
  );
}
