import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, PackageCheck, Pencil, Printer, XCircle } from 'lucide-react';
import type { PurchaseOrder } from '@/types';
import { purchaseService } from '@/services/purchase.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useConfirm } from '@/hooks/useConfirm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader, MetaItem } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DetailList, SummaryBar } from '@/components/ui/DetailList';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { formatCurrency } from '@/utils/format';
import { formatDate, formatDateTime } from '@/utils/date';
import { printDocument } from '@/utils/export';
import { DocumentItemsTable, DocumentTotalsPanel } from './components/DocumentItemsTable';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id ?? ''),
    queryFn: () => purchaseService.getPurchaseOrder(id!),
    enabled: Boolean(id),
  });

  useDocumentTitle(data ? `Pesanan ${data.number}` : 'Detail Pesanan');

  const statusMutation = useMutation({
    mutationFn: (status: PurchaseOrder['status']) => purchaseService.setPurchaseOrderStatus(id!, status),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success('Status pesanan diperbarui', `${order.number} kini berstatus ${order.status}.`);
    },
    onError: (error: Error) => toast.error('Status pesanan gagal diubah', error.message),
  });

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Pesanan tidak ditemukan" onRetry={() => refetch()} />
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Pesanan ${data.number}`}
        description={
          <>
            Ditujukan kepada{' '}
            <Link to={`/purchase/vendors/${data.vendorId}`} className="font-medium text-brand-700 hover:underline">
              {data.vendorName}
            </Link>
          </>
        }
        meta={
          <>
            <StatusBadge status={data.status} />
            <MetaItem label="Tanggal" value={formatDate(data.date)} />
            <MetaItem label="Target terima" value={formatDate(data.expectedDate)} />
            <MetaItem label="Referensi" value={data.reference || '—'} />
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/purchase/orders')}>
              Daftar pesanan
            </Button>
            <Button variant="outline" leadingIcon={<Printer className="size-4" />} onClick={printDocument}>
              Cetak
            </Button>
            {['Draft', 'Awaiting Approval'].includes(data.status) ? (
              <Button variant="outline" leadingIcon={<Pencil className="size-4" />} onClick={() => navigate(`/purchase/orders/${data.id}/edit`)}>
                Ubah
              </Button>
            ) : null}
            {['Draft', 'Awaiting Approval'].includes(data.status) ? (
              <Button
                variant="primary"
                leadingIcon={<Check className="size-4" />}
                loading={statusMutation.isPending}
                onClick={() =>
                  confirmation.confirm({
                    title: 'Setujui pesanan pembelian',
                    tone: 'info',
                    confirmLabel: 'Setujui pesanan',
                    message: (
                      <>
                        Pesanan <strong>{data.number}</strong> senilai {formatCurrency(data.total)} akan disetujui
                        dan menjadi komitmen pengadaan.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync('Approved'),
                  })
                }
              >
                Setujui
              </Button>
            ) : null}
            {['Approved', 'Partially Received'].includes(data.status) ? (
              <Button
                variant="primary"
                leadingIcon={<PackageCheck className="size-4" />}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate('Received')}
              >
                Tandai diterima
              </Button>
            ) : null}
            {!['Cancelled', 'Closed'].includes(data.status) ? (
              <Button
                variant="outline"
                leadingIcon={<XCircle className="size-4" />}
                onClick={() =>
                  confirmation.confirm({
                    title: 'Batalkan pesanan',
                    tone: 'warning',
                    confirmLabel: 'Batalkan pesanan',
                    message: (
                      <>
                        Pesanan <strong>{data.number}</strong> akan dibatalkan dan dikeluarkan dari komitmen
                        pengadaan berjalan.
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
            { label: 'Nilai Pesanan', value: formatCurrency(data.total) },
            { label: 'Progres Penerimaan', value: `${data.receivedPercent}%`, tone: data.receivedPercent === 100 ? 'positive' : 'caution' },
            { label: 'Jumlah Item', value: `${data.items.length} baris` },
            { label: 'Disetujui oleh', value: data.approvedBy ?? 'Belum disetujui' },
          ]}
        />
      </Panel>

      <Panel className="print-region">
        <PanelHeader title="Rincian Pengadaan" description={`${data.items.length} item dalam pesanan ini`} compact />
        <DocumentItemsTable items={data.items} />
        <div className="flex flex-col gap-5 border-t border-ink-200 p-5 lg:flex-row lg:justify-between">
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Catatan</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              {data.notes || 'Tidak ada catatan khusus untuk pesanan ini.'}
            </p>
          </div>
          <DocumentTotalsPanel
            subtotal={data.subtotal}
            discountTotal={data.discountTotal}
            taxTotal={data.taxTotal}
            total={data.total}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Jejak Dokumen" compact />
        <div className="p-5">
          <DetailList
            columns={4}
            items={[
              { label: 'Dibuat oleh', value: data.createdBy },
              { label: 'Waktu dibuat', value: formatDateTime(data.createdAt) },
              { label: 'Disetujui oleh', value: data.approvedBy ?? '—' },
              { label: 'Waktu persetujuan', value: data.approvedAt ? formatDateTime(data.approvedAt) : '—' },
            ]}
          />
        </div>
      </Panel>

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
