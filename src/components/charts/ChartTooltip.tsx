import type { TooltipContentProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { formatCurrency } from '@/utils/format';

type TooltipPayload = TooltipContentProps<ValueType, NameType>;

export function CurrencyTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-44 rounded-md border border-ink-200 bg-white px-3 py-2 shadow-raised">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-1.5 text-ink-600">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              {entry.name}
            </span>
            <span className="tabular font-medium text-ink-900">{formatCurrency(Number(entry.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SingleValueTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded-md border border-ink-200 bg-white px-3 py-2 shadow-raised">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="tabular mt-1 text-[13px] font-semibold text-ink-900">
        {formatCurrency(Number(entry?.value ?? 0))}
      </p>
    </div>
  );
}
