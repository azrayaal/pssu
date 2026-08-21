import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  variant?: 'underline' | 'segmented';
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  className,
  variant = 'underline',
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div className={cn('inline-flex rounded-md border border-ink-300 bg-ink-100 p-0.5', className)} role="tablist">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={value === item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-medium transition-colors',
              value === item.value
                ? 'bg-white text-ink-900 shadow-panel'
                : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined ? <span className="tabular text-xs text-ink-400">{item.count}</span> : null}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-5 overflow-x-auto border-b border-ink-200', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 border-b-2 px-0.5 pb-2.5 pt-1 text-sm font-medium transition-colors',
            value === item.value
              ? 'border-brand-700 text-brand-800'
              : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700',
          )}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined ? (
            <span
              className={cn(
                'tabular rounded border px-1.5 text-xs',
                value === item.value ? 'border-brand-100 bg-brand-50 text-brand-800' : 'border-ink-200 bg-ink-100 text-ink-500',
              )}
            >
              {item.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
