import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DetailItem {
  label: string;
  value: ReactNode;
  span?: boolean;
}

export function DetailList({
  items,
  columns = 2,
  className,
}: {
  items: DetailItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className={cn(item.span && 'sm:col-span-2 lg:col-span-3')}>
          <dt className="text-xs font-medium text-ink-500">{item.label}</dt>
          <dd className="mt-1 text-[13px] text-ink-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SummaryBar({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; tone?: 'neutral' | 'positive' | 'negative' | 'caution' }[];
  className?: string;
}) {
  return (
    <div className={cn('grid divide-y divide-ink-200 border-b border-ink-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4', className)}>
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <p className="text-xs font-medium text-ink-500">{item.label}</p>
          <p
            className={cn(
              'tabular mt-1 text-[15px] font-semibold',
              item.tone === 'positive' && 'text-positive-700',
              item.tone === 'negative' && 'text-negative-700',
              item.tone === 'caution' && 'text-caution-700',
              (!item.tone || item.tone === 'neutral') && 'text-ink-900',
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
