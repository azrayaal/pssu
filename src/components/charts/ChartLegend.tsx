export interface LegendEntry {
  label: string;
  color: string;
}

/** Legend is always rendered for two or more series, so identity is never colour alone. */
export function ChartLegend({ entries }: { entries: LegendEntry[] }) {
  if (entries.length < 2) return null;

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {entries.map((entry) => (
        <li key={entry.label} className="flex items-center gap-1.5 text-[12px] text-ink-600">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} aria-hidden />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
