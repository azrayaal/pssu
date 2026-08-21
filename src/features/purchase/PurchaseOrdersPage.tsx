import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, Download, Eye, PackageCheck, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import type { PurchaseOrder } from '@/types';
import { PURCHASE_ORDER_STATUSES } from '@/types';
import { purchaseService } from '@/services/purchase.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useTableQuery } from '@/hooks/useTableQuery';
import { useConfirm } from '@/hooks/useConfirm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { RowActions } from '@/components/tables/RowActions';
import { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { exportToExcel } from '@/utils/export';

export default function PurchaseOrdersPage() {
  useDocumentTitle('Pesanan Pembelian');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({
    defaultSort: { field: 'date', direction: 'desc' },
    filterKeys: ['status', 'from', 'to'],
  });
  const [preset, setPreset] = useState<'custom' | 'this-month'>('custom');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.purchaseOrders.list(table.params),
    queryFn: () => purchaseService.listPurchaseOrders(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.purchaseOrders.all, 'summary'],
    queryFn: purchaseService.purchaseOrderSummary,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrder['status'] }) =>
      purchaseService.setPurchaseOrderStatus(id, status),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success('Status pesanan diperbarui', `${order.number} kini berstatus ${order.status}.`);
    },
    onError: (error: Error) => toast.error('Status pesanan gagal diubah', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseService.deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success('Pesanan dihapus', 'Draft pesanan pembelian telah dihapus.');
    },
    onError: (error: Error) => toast.error('Pesanan gagal dihapus', error.message),
  });

  const columns: Column<PurchaseOrder>[] = [
    { id: 'number', header: 'Nomor Pesanan', sortField: 'number', width: '9.75rem', cell: (row) => <span className="tabular font-medium text-brand-700">{row.number}</span> },
    {
      id: 'vendor',
      header: 'Pemasok',
      sortField: 'vendorName',
      minWidth: '13rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-1 text-ink-800">{row.vendorName}</p>
          <p className="tabular text-xs text-ink-400">{row.reference}</p>
        </div>
      ),
    },
    { id: 'date', header: 'Tanggal', sortField: 'date', width: '7.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    { id: 'expected', header: 'Target Terima', sortField: 'expectedDate', width: '9.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.expectedDate)}</span> },
    { id: 'total', header: 'Nilai', sortField: 'total', align: 'right', width: '10.5rem', cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.total)}</span> },
    {
      id: 'received',
      header: 'Diterima',
      sortField: 'receivedPercent',
      align: 'right',
      hideBelow: 'xl',
      width: '7.5rem',
      cell: (row) => (
        <span className={row.receivedPercent === 100 ? 'font-medium text-positive-700' : 'text-ink-600'}>
          {row.receivedPercent}%
        </span>
      ),
    },
    { id: 'status', header: 'Status', sortField: 'status', width: '11rem', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem icon={<Eye className="size-3.5" />} onClick={() => { close(); navigate(`/purchase/orders/${row.id}`); }}>
                Lihat pesanan
              </DropdownItem>
              <DropdownItem
                icon={<Pencil className="size-3.5" />}
                disabled={!['Draft', 'Awaiting Approval'].includes(row.status)}
                onClick={() => { close(); navigate(`/purchase/orders/${row.id}/edit`); }}
              >
                Ubah pesanan
              </DropdownItem>
              <DropdownItem
                icon={<Check className="size-3.5" />}
                disabled={row.status !== 'Awaiting Approval' && row.status !== 'Draft'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Setujui pesanan pembelian',
                    tone: 'info',
                    confirmLabel: 'Setujui pesanan',
                    message: (
                      <>
                        Pesanan <strong>{row.number}</strong> senilai {formatCurrency(row.total)} akan disetujui dan
                        dapat dikirimkan kepada {row.vendorName}.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: 'Approved' }),
                  });
                }}
              >
                Setujui pesanan
              </DropdownItem>
              <DropdownItem
                icon={<PackageCheck className="size-3.5" />}
                disabled={row.status !== 'Approved' && row.status !== 'Partially Received'}
                onClick={() => { close(); statusMutation.mutate({ id: row.id, status: 'Received' }); }}
              >
                Tandai diterima penuh
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<XCircle className="size-3.5" />}
                disabled={row.status === 'Cancelled' || row.status === 'Closed'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Batalkan pesanan',
                    tone: 'warning',
                    confirmLabel: 'Batalkan pesanan',
                    message: (
                      <>
                        Pesanan <strong>{row.number}</strong> akan dibatalkan dan dikeluarkan dari komitmen
                        pengadaan berjalan.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: 'Cancelled' }),
                  });
                }}
              >
                Batalkan pesanan
              </DropdownItem>
              <DropdownItem
                icon={<Trash2 className="size-3.5" />}
                destructive
                disabled={row.status !== 'Draft'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Hapus draft pesanan',
                    tone: 'danger',
                    confirmLabel: 'Hapus pesanan',
                    message: (
                      <>
                        Draft <strong>{row.number}</strong> akan dihapus permanen dari sistem.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus draft
              </DropdownItem>
            </>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pesanan Pembelian"
        description="Komitmen pengadaan barang dan jasa kepada pemasok beserta status penerimaannya."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'pesanan-pembelian',
                  [
                    { header: 'Nomor', value: (row: PurchaseOrder) => row.number },
                    { header: 'Pemasok', value: (row: PurchaseOrder) => row.vendorName },
                    { header: 'Tanggal', value: (row: PurchaseOrder) => row.date },
                    { header: 'Target Terima', value: (row: PurchaseOrder) => row.expectedDate },
                    { header: 'Subtotal', value: (row: PurchaseOrder) => row.subtotal },
                    { header: 'PPN', value: (row: PurchaseOrder) => row.taxTotal },
                    { header: 'Total', value: (row: PurchaseOrder) => row.total },
                    { header: 'Diterima (%)', value: (row: PurchaseOrder) => row.receivedPercent },
                    { header: 'Status', value: (row: PurchaseOrder) => row.status },
                  ],
                  data?.data ?? [],
                  { title: 'Pesanan Pembelian', subtitle: 'PT PTSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel pesanan pembelian telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/purchase/orders/new')}>
              Buat Pesanan
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0"
            items={[
              { label: 'Total Pesanan', value: summary.count },
              { label: 'Menunggu Persetujuan', value: summary.awaitingApproval, tone: summary.awaitingApproval > 0 ? 'caution' : 'neutral' },
              { label: 'Nilai Komitmen', value: formatCurrency(summary.committedValue) },
              { label: 'Nilai Belum Selesai', value: formatCurrency(summary.openValue) },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nomor pesanan atau pemasok"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'status',
              label: 'Status',
              value: table.filters.status ?? '',
              onChange: (value) => table.setFilter('status', value),
              options: PURCHASE_ORDER_STATUSES.map((status) => ({ value: status, label: status })),
              width: 'w-48',
            },
          ]}
          extra={
            <DateRangeFilter
              compact
              className="hidden xl:flex"
              preset={preset}
              onPresetChange={(next) => setPreset(next as typeof preset)}
              value={{ from: table.filters.from ?? '', to: table.filters.to ?? '' }}
              onChange={(range) => {
                table.setFilter('from', range.from);
                table.setFilter('to', range.to);
              }}
            />
          }
        />

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isPending}
          error={isError ? new Error('Daftar pesanan tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/purchase/orders/${row.id}`)}
          emptyIcon={<ClipboardList className="size-5" />}
          emptyTitle="Tidak ada pesanan pembelian"
          emptyDescription="Buat pesanan pembelian pertama atau sesuaikan filter status."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/purchase/orders/new')}>
              Buat pesanan
            </Button>
          }
        />

        {data && data.total > 0 ? (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={data.totalPages}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            itemLabel="pesanan"
          />
        ) : null}
      </Panel>

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
