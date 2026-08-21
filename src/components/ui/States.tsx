import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-ink-200/70', className)} />;
}

export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-ink-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-3.5', columnIndex === 0 ? 'w-24' : columnIndex === 1 ? 'flex-1' : 'w-20')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-md border border-ink-200 bg-white p-5 shadow-panel', className)}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-7 w-40" />
      <Skeleton className="mt-3 h-3 w-24" />
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ title, description, action, icon, className, compact = false }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-6 py-10' : 'px-6 py-16', className)}>
      <span className="flex size-11 items-center justify-center rounded-md border border-ink-200 bg-ink-50 text-ink-400">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </span>
      <h3 className="mt-3.5 text-sm font-semibold text-ink-800">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-[13px] leading-relaxed text-ink-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Data gagal dimuat',
  message = 'Terjadi kendala saat menghubungi layanan. Periksa koneksi Anda lalu coba lagi.',
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-6 py-10' : 'px-6 py-16', className)}>
      <span className="flex size-11 items-center justify-center rounded-md border border-negative-100 bg-negative-50 text-negative-600">
        <AlertCircle className="size-5" aria-hidden />
      </span>
      <h3 className="mt-3.5 text-sm font-semibold text-ink-800">{title}</h3>
      <p className="mt-1 max-w-md text-[13px] leading-relaxed text-ink-500">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" size="sm" leadingIcon={<RefreshCw className="size-3.5" />} onClick={onRetry}>
          Muat ulang
        </Button>
      ) : null}
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink-500">
      <RefreshCw className="size-3.5 animate-spin" aria-hidden />
      {label ?? 'Memuat'}
    </span>
  );
}
