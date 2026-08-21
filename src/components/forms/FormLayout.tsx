import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function FormSection({
  title,
  description,
  children,
  className,
  columns = 2,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <section className={cn('border-b border-ink-200 px-5 py-5 last:border-b-0', className)}>
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <div>
          <h3 className="text-[13px] font-semibold text-ink-900">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-relaxed text-ink-500">{description}</p> : null}
        </div>
        <div
          className={cn(
            'grid gap-x-4 gap-y-4',
            columns === 1 && 'sm:grid-cols-1',
            columns === 2 && 'sm:grid-cols-2',
            columns === 3 && 'sm:grid-cols-3',
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export function FormActions({
  children,
  className,
  sticky = true,
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3',
        sticky && 'sticky bottom-0 z-10',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FullWidth({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('sm:col-span-2 lg:col-span-3', className)}>{children}</div>;
}

export function FormErrorSummary({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <div className="mx-5 mt-5 rounded-md border border-negative-100 bg-negative-50 px-4 py-3">
      <p className="text-[13px] font-semibold text-negative-700">
        Periksa kembali {messages.length} isian berikut
      </p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[13px] text-negative-700">
        {messages.slice(0, 6).map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
