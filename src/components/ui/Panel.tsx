import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-md border border-ink-200 bg-white shadow-panel', className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
  compact = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-ink-200',
        compact ? 'px-4 py-3' : 'px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-ink-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={cn(padded && 'p-5', className)}>{children}</div>;
}

export function PanelFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer className={cn('flex items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-5 py-3', className)}>
      {children}
    </footer>
  );
}
