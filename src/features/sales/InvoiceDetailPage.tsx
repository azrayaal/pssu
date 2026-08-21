import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Pencil, Printer, Send, Wallet } from 'lucide-react';
import { useQuery as useCompanyQuery } from '@tanstack/react-query';
import { salesService } from '@/services/sales.service';
import { administrationService } from '@/services/administration.service';
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
import { PaymentDialog } from './components/PaymentDialog';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.invoices.detail(id ?? ''),
    queryFn: () => salesService.getInvoice(id!),
    enabled: Boolean(id),
  });

  const { data: company } = useCompanyQuery({
    queryKey: queryKeys.company,
    queryFn: administrationService.getCompany,
    staleTime: Infinity,
  });

  useDocumentTitle(data ? `Faktur ${data.number}` : 'Detail Faktur');

  const statusMutation = useMutation({
    mutationFn: (status: 'Sent' | 'Cancelled') => salesService.setInvoiceStatus(id!, status),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      toast.success('Status faktur diperbarui', `${invoice.number} kini berstatus ${invoice.status}.`);
    },
    onError: (error: Error) => toast.error('Status faktur gagal diubah', error.message),
  });

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Faktur tidak ditemukan" onRetry={() => refetch()} />
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
        title={`Faktur ${data.number}`}
        description={
          <>
            Diterbitkan untuk{' '}
            <Link to={`/sales/customers/${data.customerId}`} className="font-medium text-brand-700 hover:underline">
              {data.customerName}
            </Link>
          </>
        }
        meta={
          <>
            <StatusBadge status={data.status} />
            {overdue > 0 ? <Badge tone="negative">Terlambat {overdue} hari</Badge> : null}
            <MetaItem label="Tanggal" value={formatDate(data.date)} />
            <MetaItem label="Jatuh tempo" value={formatDate(data.dueDate)} />
            <MetaItem label="Referensi" value={data.reference || '—'} />
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/sales/invoices')}>
              Daftar faktur
            </Button>
            <Button variant="outline" leadingIcon={<Printer className="size-4" />} onClick={printDocument}>
              Cetak
            </Button>
            {data.status === 'Draft' ? (
              <Button
                variant="outline"
                leadingIcon={<Send className="size-4" />}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate('Sent')}
              >
                Tandai terkirim
              </Button>
            ) : null}
            {data.status !== 'Paid' && data.status !== 'Cancelled' ? (
              <Button
                variant="outline"
                leadingIcon={<Pencil className="size-4" />}
                onClick={() => navigate(`/sales/invoices/${data.id}/edit`)}
              >
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
                    title: 'Batalkan faktur',
                    tone: 'warning',
                    confirmLabel: 'Batalkan faktur',
                    message: (
                      <>
                        Faktur <strong>{data.number}</strong> akan dibatalkan dan dikeluarkan dari perhitungan
                        piutang usaha.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync('Cancelled'),
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
            { label: 'Nilai Faktur', value: formatCurrency(data.total) },
            { label: 'Sudah Dibayar', value: formatCurrency(data.paidAmount), tone: 'positive' },
            {
              label: 'Sisa Tagihan',
              value: formatCurrency(data.outstanding),
              tone: overdue > 0 ? 'negative' : 'neutral',
            },
            { label: 'Jumlah Pembayaran', value: `${data.payments.length} transaksi` },
          ]}
        />
      </Panel>

      <Panel className="print-region">
        <div className="grid gap-6 border-b border-ink-200 p-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Diterbitkan oleh</p>
            <p className="mt-1.5 text-sm font-semibold text-ink-900">{company?.legalName}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">
              {company?.address}
              <br />
              {company?.city}, {company?.province} {company?.postalCode}
              <br />
              NPWP {company?.taxId}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Ditagihkan kepada</p>
            <p className="mt-1.5 text-sm font-semibold text-ink-900">{data.customerName}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">
              Nomor faktur {data.number}
              <br />
              Tanggal {formatDate(data.date)}
              <br />
              Jatuh tempo {formatDate(data.dueDate)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead className="bg-ink-50">
              <tr className="border-b border-ink-200">
                <th className="w-10 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">#</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Deskripsi</th>
                <th className="w-24 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Qty</th>
                <th className="w-24 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Satuan</th>
                <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Harga</th>
                <th className="w-20 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Disk</th>
                <th className="w-20 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">PPN</th>
                <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="tabular px-4 py-2.5 text-ink-400">{index + 1}</td>
                  <td className="px-4 py-2.5 text-ink-800">{item.description}</td>
                  <td className="tabular px-4 py-2.5 text-right text-ink-700">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-ink-500">{item.unit}</td>
                  <td className="tabular px-4 py-2.5 text-right text-ink-700">
                    {formatCurrency(item.unitPrice, 'IDR', { withSymbol: false })}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-ink-500">{item.discountPercent}%</td>
                  <td className="tabular px-4 py-2.5 text-right text-ink-500">{item.taxPercent}%</td>
                  <td className="tabular px-4 py-2.5 text-right font-medium text-ink-900">
                    {formatCurrency(item.amount, 'IDR', { withSymbol: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-5 border-t border-ink-200 p-5 lg:flex-row lg:justify-between">
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Termin dan catatan</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{data.terms}</p>
            {data.notes ? <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{data.notes}</p> : null}
          </div>

          <dl className="w-full max-w-sm space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <dt className="text-ink-600">Subtotal</dt>
              <dd className="tabular font-medium text-ink-900">{formatCurrency(data.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <dt className="text-ink-600">Diskon</dt>
              <dd className="tabular font-medium text-negative-700">
                {data.discountTotal > 0 ? `- ${formatCurrency(data.discountTotal)}` : formatCurrency(0)}
              </dd>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <dt className="text-ink-600">PPN</dt>
              <dd className="tabular font-medium text-ink-900">{formatCurrency(data.taxTotal)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-ink-300 pt-2">
              <dt className="text-sm font-semibold text-ink-900">Total tagihan</dt>
              <dd className="tabular text-base font-semibold text-ink-900">{formatCurrency(data.total)}</dd>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <dt className="text-ink-600">Sudah dibayar</dt>
              <dd className="tabular font-medium text-positive-700">{formatCurrency(data.paidAmount)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-ink-200 pt-2">
              <dt className="text-[13px] font-semibold text-ink-900">Sisa tagihan</dt>
              <dd className="tabular text-[15px] font-semibold text-ink-900">{formatCurrency(data.outstanding)}</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Riwayat Pembayaran" description={`${data.payments.length} penerimaan tercatat`} compact />
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
                    <td className="tabular px-4 py-2.5 text-right font-medium text-ink-900">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-[13px] text-ink-500">
            Belum ada pembayaran yang tercatat untuk faktur ini.
          </p>
        )}
      </Panel>

      <PaymentDialog
        mode="receipt"
        documentId={paymentOpen ? data.id : null}
        documentNumber={data.number}
        partyName={data.customerName}
        outstanding={data.outstanding}
        onClose={() => setPaymentOpen(false)}
      />

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
