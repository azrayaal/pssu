import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { ConfirmTone } from '@/components/ui/ConfirmDialog';

export interface ConfirmRequest {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onConfirm: () => unknown | Promise<unknown>;
}

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((next: ConfirmRequest) => setRequest(next), []);
  const cancel = useCallback(() => setRequest(null), []);

  const accept = useCallback(async () => {
    if (!request) return;
    try {
      setLoading(true);
      await request.onConfirm();
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [request]);

  return {
    request,
    loading,
    confirm,
    cancel,
    accept,
    dialogProps: {
      open: Boolean(request),
      title: request?.title ?? '',
      message: request?.message ?? '',
      confirmLabel: request?.confirmLabel,
      cancelLabel: request?.cancelLabel,
      tone: request?.tone,
      loading,
      onConfirm: accept,
      onCancel: cancel,
    },
  };
}
