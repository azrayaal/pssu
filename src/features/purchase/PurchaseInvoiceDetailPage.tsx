import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Pencil, Printer, Wallet } from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
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
import { SummaryBar } from '@/components/ui/DetailList';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { formatCurrency } from '@/utils/format';
import { formatDate, daysOverdue } from '@/utils/date';
import { printDocument } from '@/utils/export';
import { PaymentDialog } from '@/features/sales/components/PaymentDialog';
import { DocumentItemsTable, DocumentTotalsPanel } from './components/DocumentItemsTable';

export default function PurchaseInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.purchaseInvoices.detail(id ?? ''),
    queryFn: () => purchaseService.getPurchaseInvoice(id!),
    enabled: Boolean(id),
  });

  useDocumentTitle(data ? `Tagihan ${data.number}` : 'Detail Tagihan');

  const statusMutation = useMutation({
    mutationFn: () => purchaseService.setPurchaseInvoiceStatus(id!, 'Cancelled'),
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoices.all });
      toast.success('Tagihan dibatalkan', `${bill.number} dikeluarkan dari perhitungan utang.`);
    },
    onError: (error: Error) => toast.error('Tagihan gagal dibatalkan', error.message),
  });

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Tagihan tidak ditemukan" onRetry={() => refetch()} />
      </Panel>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const overdue = data.outstanding > 0 ? daysOverdue(data.dueDate) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Tagihan ${data.number}`}
        description={
          <>
            Diterima dari{' '}
            <Link to={`/purchase/vendors/${data.vendorId}`} className="font-medium text-brand-700 hover:underline">
              {data.vendorName}
            </Link>
          </>
        }
        meta={
          <>
            <StatusBadge status={data.status} />
            {overdue > 0 ? <Badge tone="negative">Terlambat {overdue} hari</Badge> : null}
            <MetaItem label="Faktur pemasok" value={data.vendorInvoiceNumber} />
            <MetaItem label="Tanggal" value={formatDate(data.date)} />
            <MetaItem label="Jatuh tempo" value={formatDate(data.dueDate)} />
            {data.purchaseOrderNumber ? (
              <MetaItem
                label="Pesanan"
                value={
                  <Link to={`/purchase/orders/${data.purchaseOrderId}`} className="text-brand-700 hover:underline">
                    {data.purchaseOrderNumber}
                  </Link>
                }
              />
            ) : null}
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/purchase/invoices')}>
              Daftar tagihan
            </Button>
            <Button variant="outline" leadingIcon={<Printer className="size-4" />} onClick={printDocument}>
              Cetak
            </Button>
            {data.status !== 'Paid' && data.status !== 'Cancelled' ? (
              <Button variant="outline" leadingIcon={<Pencil className="size-4" />} onClick={() => navigate(`/purchase/invoices/${data.id}/edit`)}>
                Ubah
              </Button>
            ) : null}
            {data.outstanding > 0 && data.status !== 'Cancelled' ? (
              <Button variant="primary" leadingIcon={<Wallet className="size-4" />} onClick={() => setPaymentOpen(true)}>
                Catat Pembayaran
              </Button>
            ) : null}
            {data.status !== 'Cancelled' && data.paidAmount === 0 ? (
              <Button
                variant="outline"
                leadingIcon={<Ban className="size-4" />}
                onClick={() =>
                  confirmation.confirm({
                    title: 'Batalkan tagihan',
                    tone: 'warning',
                    confirmLabel: 'Batalkan tagihan',
                    message: (
                      <>
                        Tagihan <strong>{data.number}</strong> akan dibatalkan dan dikeluarkan dari perhitungan
                        utang usaha.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync(),
                  })
                }
              >
                Batalkan
              </Button>
            ) : null}
          </>
        }
      />

      <Panel>
        <SummaryBar
          className="border-b-0"
          items={[
            { label: 'Nilai Tagihan', value: formatCurrency(data.total) },
            { label: 'Sudah Dibayar', value: formatCurrency(data.paidAmount), tone: 'positive' },
            { label: 'Sisa Utang', value: formatCurrency(data.outstanding), tone: overdue > 0 ? 'negative' : 'neutral' },
            { label: 'Jumlah Pembayaran', value: `${data.payments.length} transaksi` },
          ]}
        />
      </Panel>

      <Panel className="print-region">
        <PanelHeader title="Rincian Tagihan" description={`${data.items.length} item dalam tagihan ini`} compact />
        <DocumentItemsTable items={data.items} />
        <div className="flex flex-col gap-5 border-t border-ink-200 p-5 lg:flex-row lg:justify-between">
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Catatan</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              {data.notes || 'Tidak ada catatan khusus untuk tagihan ini.'}
            </p>
          </div>
          <DocumentTotalsPanel
            subtotal={data.subtotal}
            discountTotal={data.discountTotal}
            taxTotal={data.taxTotal}
            total={data.total}
            paidAmount={data.paidAmount}
            outstanding={data.outstanding}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Riwayat Pembayaran" description={`${data.payments.length} pengeluaran tercatat`} compact />
        {data.payments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-ink-200">
                  <th className="w-32 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Tanggal</th>
                  <th className="w-40 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Metode</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Rekening</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Referensi</th>
                  <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-ink-50">
                    <td className="tabular px-4 py-2.5 text-ink-600">{formatDate(payment.date)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone="muted">{payment.method}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-700">{payment.accountName}</td>
                    <td className="tabular px-4 py-2.5 text-ink-500">{payment.reference}</td>
                    <td className="tabular px-4 py-2.5 text-right font-medium text-ink-900">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-[13px] text-ink-500">
            Belum ada pembayaran yang tercatat untuk tagihan ini.
          </p>
        )}
      </Panel>

      <PaymentDialog
        mode="payment"
        documentId={paymentOpen ? data.id : null}
        documentNumber={data.number}
        partyName={data.vendorName}
        outstanding={data.outstanding}
        onClose={() => setPaymentOpen(false)}
      />

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
