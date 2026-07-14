export default function Kpi({ label, value, unit, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-semibold tabular-nums text-slate-800">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}
