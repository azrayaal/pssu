import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'caution' | 'info' | 'brand' | 'muted';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  positive: 'bg-positive-50 text-positive-700 border-positive-100',
  negative: 'bg-negative-50 text-negative-700 border-negative-100',
  caution: 'bg-caution-50 text-caution-700 border-caution-100',
  info: 'bg-info-50 text-info-700 border-info-100',
  brand: 'bg-brand-50 text-brand-800 border-brand-100',
  muted: 'bg-white text-ink-500 border-ink-200',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  uppercase?: boolean;
}

export function Badge({ tone = 'neutral', children, className, uppercase = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap',
        uppercase && 'text-[11px] uppercase tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
