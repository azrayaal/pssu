import type { ReactNode } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '@/lib/cn';

export type ConfirmTone = 'danger' | 'warning' | 'info';

const TONE_CONFIG: Record<ConfirmTone, { icon: typeof AlertTriangle; wrapper: string; confirmVariant: 'danger' | 'primary' }> = {
  danger: { icon: ShieldAlert, wrapper: 'bg-negative-50 text-negative-600 border-negative-100', confirmVariant: 'danger' },
  warning: { icon: AlertTriangle, wrapper: 'bg-caution-50 text-caution-600 border-caution-100', confirmVariant: 'primary' },
  info: { icon: Info, wrapper: 'bg-info-50 text-info-600 border-info-100', confirmVariant: 'primary' },
};

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const config = TONE_CONFIG[tone];
  const Icon = config.icon;

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      title={title}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={config.confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md border', config.wrapper)}>
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="pt-1 text-sm leading-relaxed text-ink-600">{message}</div>
      </div>
    </Modal>
  );
}
