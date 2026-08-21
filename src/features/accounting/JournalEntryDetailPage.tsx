import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Pencil, Printer, XCircle } from 'lucide-react';
import { accountingService } from '@/services/accounting.service';
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
import { DetailList } from '@/components/ui/DetailList';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { formatCurrency } from '@/utils/format';
import { formatDate, formatDateTime } from '@/utils/date';
import { printDocument } from '@/utils/export';

export default function JournalEntryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.journals.detail(id ?? ''),
    queryFn: () => accountingService.getJournal(id!),
    enabled: Boolean(id),
  });

  useDocumentTitle(data ? `Jurnal ${data.number}` : 'Detail Jurnal');

  const postMutation = useMutation({
    mutationFn: () => accountingService.postJournal(id!),
    onSuccess: (journal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success('Jurnal diposting', `${journal.number} tercatat pada buku besar.`);
    },
    onError: (error: Error) => toast.error('Jurnal gagal diposting', error.message),
  });

  const voidMutation = useMutation({
    mutationFn: () => accountingService.voidJournal(id!),
    onSuccess: (journal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.all });
      toast.success('Jurnal dibatalkan', `${journal.number} ditandai void.`);
    },
    onError: (error: Error) => toast.error('Jurnal gagal dibatalkan', error.message),
  });

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Jurnal tidak ditemukan" onRetry={() => refetch()} />
      </Panel>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Jurnal ${data.number}`}
        description={data.memo}
        meta={
          <>
            <StatusBadge status={data.status} />
            <Badge tone="muted">{data.source}</Badge>
            <MetaItem label="Tanggal" value={formatDate(data.date)} />
            <MetaItem label="Referensi" value={data.reference} />
            <MetaItem label="Nilai" value={formatCurrency(data.totalDebit)} />
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/accounting/journal-entries')}>
              Daftar jurnal
            </Button>
            <Button variant="outline" leadingIcon={<Printer className="size-4" />} onClick={printDocument}>
              Cetak
            </Button>
            {data.status === 'Draft' ? (
              <>
                <Button
                  variant="outline"
                  leadingIcon={<Pencil className="size-4" />}
                  onClick={() => navigate(`/accounting/journal-entries/${data.id}/edit`)}
                >
                  Ubah
                </Button>
                <Button
                  variant="primary"
                  leadingIcon={<Check className="size-4" />}
                  loading={postMutation.isPending}
                  onClick={() =>
                    confirmation.confirm({
                      title: 'Posting jurnal',
                      tone: 'info',
                      confirmLabel: 'Posting sekarang',
                      message: (
                        <>
                          Jurnal <strong>{data.number}</strong> senilai {formatCurrency(data.totalDebit)} akan
                          diposting ke buku besar dan menjadi permanen.
                        </>
                      ),
                      onConfirm: () => postMutation.mutateAsync(),
                    })
                  }
                >
                  Posting jurnal
                </Button>
              </>
            ) : data.status === 'Posted' ? (
              <Button
                variant="outline"
                leadingIcon={<XCircle className="size-4" />}
                loading={voidMutation.isPending}
                onClick={() =>
                  confirmation.confirm({
                    title: 'Batalkan jurnal',
                    tone: 'warning',
                    confirmLabel: 'Batalkan jurnal',
                    message: (
                      <>
                        Jurnal <strong>{data.number}</strong> akan ditandai void dan saldo buku besar disesuaikan.
                      </>
                    ),
                    onConfirm: () => voidMutation.mutateAsync(),
                  })
                }
              >
                Batalkan jurnal
              </Button>
            ) : null}
          </>
        }
      />

      <Panel>
        <PanelHeader title="Informasi Jurnal" compact />
        <div className="p-5">
          <DetailList
            columns={4}
            items={[
              { label: 'Nomor jurnal', value: <span className="tabular font-medium">{data.number}</span> },
              { label: 'Tanggal', value: formatDate(data.date) },
              { label: 'Referensi', value: data.reference },
              { label: 'Sumber', value: data.source },
              { label: 'Dibuat oleh', value: data.createdBy },
              { label: 'Waktu dibuat', value: formatDateTime(data.createdAt) },
              { label: 'Diposting oleh', value: data.postedBy ?? '—' },
              { label: 'Waktu posting', value: data.postedAt ? formatDateTime(data.postedAt) : '—' },
            ]}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Baris Jurnal" description={`${data.lines.length} baris pencatatan`} compact />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead className="bg-ink-50">
              <tr className="border-b border-ink-200">
                <th className="w-10 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">#</th>
                <th className="w-32 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Kode</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Nama Akun</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Keterangan</th>
                <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Debit</th>
                <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.lines.map((line, index) => (
                <tr key={line.id} className="hover:bg-ink-50">
                  <td className="tabular px-4 py-2.5 text-ink-400">{index + 1}</td>
                  <td className="tabular px-4 py-2.5 font-medium text-ink-800">{line.accountCode}</td>
                  <td className="px-4 py-2.5 text-ink-700">{line.accountName}</td>
                  <td className="px-4 py-2.5 text-ink-500">{line.description || '—'}</td>
                  <td className="tabular px-4 py-2.5 text-right font-medium text-ink-900">
                    {line.debit > 0 ? formatCurrency(line.debit, 'IDR', { withSymbol: false }) : '—'}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-medium text-ink-900">
                    {line.credit > 0 ? formatCurrency(line.credit, 'IDR', { withSymbol: false }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink-300 bg-ink-50">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-[13px] font-semibold text-ink-700">
                  Total
                </td>
                <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                  {formatCurrency(data.totalDebit, 'IDR', { withSymbol: false })}
                </td>
                <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                  {formatCurrency(data.totalCredit, 'IDR', { withSymbol: false })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
