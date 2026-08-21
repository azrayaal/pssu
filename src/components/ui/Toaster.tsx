import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToastStore, type Toast, type ToastVariant } from '@/stores/toast.store';

const VARIANT_CONFIG: Record<ToastVariant, { icon: typeof CheckCircle2; accent: string; iconColor: string }> = {
  success: { icon: CheckCircle2, accent: 'border-l-positive-600', iconColor: 'text-positive-600' },
  error: { icon: XCircle, accent: 'border-l-negative-600', iconColor: 'text-negative-600' },
  warning: { icon: AlertTriangle, accent: 'border-l-caution-600', iconColor: 'text-caution-600' },
  info: { icon: Info, accent: 'border-l-info-600', iconColor: 'text-info-600' },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const config = VARIANT_CONFIG[toast.variant];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-md border border-l-4 border-ink-200 bg-white px-4 py-3 shadow-raised',
        config.accent,
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', config.iconColor)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink-900">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
        aria-label="Tutup notifikasi"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  if (!toasts.length) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 print-hidden">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}
