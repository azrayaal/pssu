import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Download, Eye, FileText, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import type { PurchaseInvoice } from '@/types';
import { BILL_STATUSES } from '@/types';
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
import { formatDate, daysOverdue } from '@/utils/date';
import { exportToExcel } from '@/utils/export';
import { PaymentDialog } from '@/features/sales/components/PaymentDialog';

export default function PurchaseInvoicesPage() {
  useDocumentTitle('Faktur Pembelian');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({
    defaultSort: { field: 'date', direction: 'desc' },
    filterKeys: ['status', 'from', 'to'],
  });
  const [preset, setPreset] = useState<'custom' | 'this-month'>('custom');
  const [paymentTarget, setPaymentTarget] = useState<PurchaseInvoice | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.purchaseInvoices.list(table.params),
    queryFn: () => purchaseService.listPurchaseInvoices(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.purchaseInvoices.all, 'summary'],
    queryFn: purchaseService.purchaseInvoiceSummary,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseInvoice['status'] }) =>
      purchaseService.setPurchaseInvoiceStatus(id, status),
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      toast.success('Status tagihan diperbarui', `${bill.number} kini berstatus ${bill.status}.`);
    },
    onError: (error: Error) => toast.error('Status tagihan gagal diubah', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseService.deletePurchaseInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoices.all });
      toast.success('Tagihan dihapus', 'Draft faktur pembelian telah dihapus.');
    },
    onError: (error: Error) => toast.error('Tagihan gagal dihapus', error.message),
  });

  const columns: Column<PurchaseInvoice>[] = [
    { id: 'number', header: 'Nomor Tagihan', sortField: 'number', width: '10rem', cell: (row) => <span className="tabular font-medium text-brand-700">{row.number}</span> },
    {
      id: 'vendor',
      header: 'Pemasok',
      sortField: 'vendorName',
      minWidth: '13rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-1 text-ink-800">{row.vendorName}</p>
          <p className="tabular text-xs text-ink-400">{row.vendorInvoiceNumber}</p>
        </div>
      ),
    },
    { id: 'date', header: 'Tanggal', sortField: 'date', width: '7.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    {
      id: 'dueDate',
      header: 'Jatuh Tempo',
      sortField: 'dueDate',
      width: '9rem',
      cell: (row) => {
        const overdue = row.outstanding > 0 ? daysOverdue(row.dueDate) : 0;
        return (
          <span className="tabular text-ink-600">
            {formatDate(row.dueDate)}
            {overdue > 0 ? <span className="ml-1.5 text-xs text-negative-600">+{overdue}h</span> : null}
          </span>
        );
      },
    },
    { id: 'total', header: 'Nilai', sortField: 'total', align: 'right', width: '10.5rem', cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.total)}</span> },
    { id: 'paid', header: 'Dibayar', sortField: 'paidAmount', align: 'right', hideBelow: '2xl', width: '10.5rem', cell: (row) => <span className="text-ink-600">{formatCurrency(row.paidAmount)}</span> },
    {
      id: 'outstanding',
      header: 'Sisa Utang',
      sortField: 'outstanding',
      align: 'right',
      width: '10.5rem',
      cell: (row) => (
        <span className={row.outstanding > 0 ? 'font-medium text-ink-900' : 'text-ink-400'}>{formatCurrency(row.outstanding)}</span>
      ),
    },
    { id: 'status', header: 'Status', sortField: 'status', width: '10.5rem', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem icon={<Eye className="size-3.5" />} onClick={() => { close(); navigate(`/purchase/invoices/${row.id}`); }}>
                Lihat tagihan
              </DropdownItem>
              <DropdownItem
                icon={<Pencil className="size-3.5" />}
                disabled={row.status === 'Paid' || row.status === 'Cancelled'}
                onClick={() => { close(); navigate(`/purchase/invoices/${row.id}/edit`); }}
              >
                Ubah tagihan
              </DropdownItem>
              <DropdownItem
                icon={<Wallet className="size-3.5" />}
                disabled={row.outstanding <= 0 || row.status === 'Cancelled'}
                onClick={() => { close(); setPaymentTarget(row); }}
              >
                Catat pembayaran
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<Ban className="size-3.5" />}
                disabled={row.status === 'Cancelled' || row.paidAmount > 0}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Batalkan tagihan',
                    tone: 'warning',
                    confirmLabel: 'Batalkan tagihan',
                    message: (
                      <>
                        Tagihan <strong>{row.number}</strong> senilai {formatCurrency(row.total)} akan dibatalkan dan
                        dikeluarkan dari perhitungan utang usaha.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: 'Cancelled' }),
                  });
                }}
              >
                Batalkan tagihan
              </DropdownItem>
              <DropdownItem
                icon={<Trash2 className="size-3.5" />}
                destructive
                disabled={row.status !== 'Draft'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Hapus draft tagihan',
                    tone: 'danger',
                    confirmLabel: 'Hapus tagihan',
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
        title="Faktur Pembelian"
        description="Tagihan dari pemasok beserta status pembayaran dan posisi utang usaha."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'faktur-pembelian',
                  [
                    { header: 'Nomor', value: (row: PurchaseInvoice) => row.number },
                    { header: 'Faktur Pemasok', value: (row: PurchaseInvoice) => row.vendorInvoiceNumber },
                    { header: 'Pemasok', value: (row: PurchaseInvoice) => row.vendorName },
                    { header: 'Tanggal', value: (row: PurchaseInvoice) => row.date },
                    { header: 'Jatuh Tempo', value: (row: PurchaseInvoice) => row.dueDate },
                    { header: 'Total', value: (row: PurchaseInvoice) => row.total },
                    { header: 'Dibayar', value: (row: PurchaseInvoice) => row.paidAmount },
                    { header: 'Sisa', value: (row: PurchaseInvoice) => row.outstanding },
                    { header: 'Status', value: (row: PurchaseInvoice) => row.status },
                  ],
                  data?.data ?? [],
                  { title: 'Faktur Pembelian', subtitle: 'PT PTSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel faktur pembelian telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/purchase/invoices/new')}>
              Catat Tagihan
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0 lg:grid-cols-5"
            items={[
              { label: 'Total Pembelian', value: formatCurrency(summary.purchased) },
              { label: 'Sudah Dibayar', value: formatCurrency(summary.paid), tone: 'positive' },
              { label: 'Sisa Utang', value: formatCurrency(summary.outstanding) },
              {
                label: 'Jatuh Tempo',
                value: formatCurrency(summary.overdueValue),
                tone: summary.overdueValue > 0 ? 'negative' : 'positive',
              },
              { label: 'Jumlah Tagihan', value: summary.count },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nomor tagihan atau pemasok"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'status',
              label: 'Status',
              value: table.filters.status ?? '',
              onChange: (value) => table.setFilter('status', value),
              options: BILL_STATUSES.map((status) => ({ value: status, label: status })),
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
          error={isError ? new Error('Daftar tagihan tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/purchase/invoices/${row.id}`)}
          emptyIcon={<FileText className="size-5" />}
          emptyTitle="Tidak ada faktur pembelian"
          emptyDescription="Catat tagihan pemasok pertama atau sesuaikan filter status."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/purchase/invoices/new')}>
              Catat tagihan
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
            itemLabel="tagihan"
          />
        ) : null}
      </Panel>

      <PaymentDialog
        mode="payment"
        documentId={paymentTarget?.id ?? null}
        documentNumber={paymentTarget?.number ?? ''}
        partyName={paymentTarget?.vendorName ?? ''}
        outstanding={paymentTarget?.outstanding ?? 0}
        onClose={() => setPaymentTarget(null)}
      />

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
