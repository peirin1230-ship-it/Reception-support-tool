import { LEVELS } from "../lib/levels.js";

export default function LevelBadge({ level }) {
  const m = LEVELS[level];
  if (!m) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${m.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
