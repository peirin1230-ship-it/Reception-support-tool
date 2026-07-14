export default function Panel({ title, note, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        {note && <span className="text-xs text-slate-400">{note}</span>}
      </div>
      {children}
    </div>
  );
}
