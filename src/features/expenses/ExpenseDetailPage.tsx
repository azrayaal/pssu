import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, FileText, Pencil, Printer, Send, X } from 'lucide-react';
import type { Expense } from '@/types';
import { expensesService } from '@/services/expenses.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useConfirm } from '@/hooks/useConfirm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader, MetaItem } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailList, SummaryBar } from '@/components/ui/DetailList';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { formatCurrency, formatFileSize } from '@/utils/format';
import { formatDate, formatDateTime } from '@/utils/date';
import { printDocument } from '@/utils/export';

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.expenses.detail(id ?? ''),
    queryFn: () => expensesService.get(id!),
    enabled: Boolean(id),
  });

  useDocumentTitle(data ? `Biaya ${data.number}` : 'Detail Biaya');

  const statusMutation = useMutation({
    mutationFn: (status: Expense['status']) => expensesService.setStatus(id!, status),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      toast.success('Status biaya diperbarui', `${expense.number} kini berstatus ${expense.status}.`);
    },
    onError: (error: Error) => toast.error('Status biaya gagal diubah', error.message),
  });

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Data biaya tidak ditemukan" onRetry={() => refetch()} />
      </Panel>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Biaya ${data.number}`}
        description={data.description}
        meta={
          <>
            <StatusBadge status={data.status} />
            <Badge tone="muted">{data.categoryName}</Badge>
            <MetaItem label="Tanggal" value={formatDate(data.date)} />
            <MetaItem label="Referensi" value={data.reference} />
            <MetaItem label="Diajukan oleh" value={data.submittedBy} />
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/expenses')}>
              Daftar biaya
            </Button>
            <Button variant="outline" leadingIcon={<Printer className="size-4" />} onClick={printDocument}>
              Cetak
            </Button>
            {data.status !== 'Paid' ? (
              <Button variant="outline" leadingIcon={<Pencil className="size-4" />} onClick={() => navigate(`/expenses/${data.id}/edit`)}>
                Ubah
              </Button>
            ) : null}
            {data.status === 'Draft' ? (
              <Button
                variant="primary"
                leadingIcon={<Send className="size-4" />}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate('Submitted')}
              >
                Ajukan persetujuan
              </Button>
            ) : null}
            {data.status === 'Submitted' ? (
              <>
                <Button
                  variant="outline"
                  leadingIcon={<X className="size-4" />}
                  onClick={() =>
                    confirmation.confirm({
                      title: 'Tolak pengajuan biaya',
                      tone: 'warning',
                      confirmLabel: 'Tolak biaya',
                      message: (
                        <>
                          Pengajuan <strong>{data.number}</strong> akan ditolak dan dikembalikan kepada pengaju.
                        </>
                      ),
                      onConfirm: () => statusMutation.mutateAsync('Rejected'),
                    })
                  }
                >
                  Tolak
                </Button>
                <Button
                  variant="primary"
                  leadingIcon={<Check className="size-4" />}
                  loading={statusMutation.isPending}
                  onClick={() =>
                    confirmation.confirm({
                      title: 'Setujui pengajuan biaya',
                      tone: 'info',
                      confirmLabel: 'Setujui biaya',
                      message: (
                        <>
                          Biaya <strong>{data.number}</strong> senilai {formatCurrency(data.total)} akan disetujui
                          dan siap dibayarkan.
                        </>
                      ),
                      onConfirm: () => statusMutation.mutateAsync('Approved'),
                    })
                  }
                >
                  Setujui
                </Button>
              </>
            ) : null}
            {data.status === 'Approved' ? (
              <Button
                variant="primary"
                leadingIcon={<Check className="size-4" />}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate('Paid')}
              >
                Tandai dibayar
              </Button>
            ) : null}
          </>
        }
      />

      <Panel>
        <SummaryBar
          className="border-b-0"
          items={[
            { label: 'Nilai Biaya', value: formatCurrency(data.amount) },
            { label: 'PPN', value: formatCurrency(data.taxAmount) },
            { label: 'Total Dibebankan', value: formatCurrency(data.total) },
            { label: 'Disetujui oleh', value: data.approvedBy ?? 'Belum disetujui' },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2 print-region">
          <PanelHeader title="Informasi Biaya" compact />
          <div className="p-5">
            <DetailList
              columns={3}
              items={[
                { label: 'Nomor biaya', value: <span className="tabular font-medium">{data.number}</span> },
                { label: 'Tanggal', value: formatDate(data.date) },
                { label: 'Kategori', value: data.categoryName },
                { label: 'Akun pembayaran', value: data.paymentAccountName },
                { label: 'Pemasok', value: data.vendorName || '—' },
                { label: 'Referensi', value: data.reference },
                { label: 'Keterangan', value: data.description, span: true },
                { label: 'Diajukan oleh', value: data.submittedBy },
                { label: 'Waktu pengajuan', value: formatDateTime(data.createdAt) },
                { label: 'Disetujui oleh', value: data.approvedBy ?? '—' },
                { label: 'Catatan', value: data.notes || '—', span: true },
              ]}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Lampiran" description={`${data.attachments.length} berkas terlampir`} compact />
          <div className="p-5">
            {data.attachments.length ? (
              <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
                {data.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center gap-3 px-3.5 py-3">
                    <FileText className="size-4 shrink-0 text-ink-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink-800">{attachment.fileName}</p>
                      <p className="text-xs text-ink-500">
                        {formatFileSize(attachment.sizeBytes)} · {formatDate(attachment.uploadedAt.slice(0, 10))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-ink-300 bg-ink-50 px-4 py-8 text-center text-[13px] text-ink-500">
                Tidak ada bukti pendukung yang dilampirkan pada pengajuan ini.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
