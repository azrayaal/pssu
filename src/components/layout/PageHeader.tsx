import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Breadcrumbs } from './Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  showBreadcrumbs?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
  showBreadcrumbs = true,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {showBreadcrumbs ? <Breadcrumbs /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-500">{description}</p>
          ) : null}
          {meta ? <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 print-hidden">{actions}</div> : null}
      </div>
    </div>
  );
}

export function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="flex items-baseline gap-1.5 text-[13px]">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </span>
  );
}
