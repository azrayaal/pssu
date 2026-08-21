import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { MetricSnapshot } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';

export interface MetricCardProps {
  label: string;
  metric?: MetricSnapshot;
  value?: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  /** For cost-style metrics an increase is unfavourable. */
  invertTrend?: boolean;
  loading?: boolean;
  className?: string;
  footer?: ReactNode;
}

export function MetricCard({
  label,
  metric,
  value,
  caption,
  icon,
  invertTrend = false,
  loading = false,
  className,
  footer,
}: MetricCardProps) {
  const direction = metric?.direction ?? 'flat';
  const favourable = direction === 'flat' ? null : invertTrend ? direction === 'down' : direction === 'up';
  const TrendIcon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <div className={cn('rounded-md border border-ink-200 bg-white p-4 shadow-panel', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        {icon ? <span className="shrink-0 text-ink-300">{icon}</span> : null}
      </div>

      {loading ? (
        <div className="mt-2.5 h-7 w-32 animate-pulse rounded bg-ink-200/70" />
      ) : (
        <p className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-ink-900">
          {value ?? formatCurrency(metric?.value ?? 0)}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {metric && !loading ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium',
              favourable === null && 'border-ink-200 bg-ink-100 text-ink-600',
              favourable === true && 'border-positive-100 bg-positive-50 text-positive-700',
              favourable === false && 'border-negative-100 bg-negative-50 text-negative-700',
            )}
          >
            <TrendIcon className="size-3" aria-hidden />
            <span className="tabular">{formatPercent(Math.abs(metric.changePercent))}</span>
          </span>
        ) : null}
        {caption ? <span className="text-xs text-ink-500">{caption}</span> : null}
      </div>

      {footer ? <div className="mt-3 border-t border-ink-100 pt-2.5">{footer}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'positive' | 'negative' | 'caution';
  className?: string;
}) {
  const toneClass = {
    neutral: 'text-ink-900',
    positive: 'text-positive-700',
    negative: 'text-negative-700',
    caution: 'text-caution-700',
  }[tone];

  return (
    <div className={cn('px-4 py-3', className)}>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={cn('tabular mt-1 text-base font-semibold', toneClass)}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}
