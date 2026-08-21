import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Ban, Download, Eye, FileText, Pencil, Plus, Send, Trash2, Wallet } from 'lucide-react';
import type { Invoice } from '@/types';
import { INVOICE_STATUSES } from '@/types';
import { salesService } from '@/services/sales.service';
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
import { PaymentDialog } from './components/PaymentDialog';

export default function InvoicesPage() {
  useDocumentTitle('Faktur Penjualan');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({
    defaultSort: { field: 'date', direction: 'desc' },
    filterKeys: ['status', 'from', 'to'],
  });
  const [preset, setPreset] = useState<'custom' | 'this-month'>('custom');
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.invoices.list(table.params),
    queryFn: () => salesService.listInvoices(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.invoices.all, 'summary'],
    queryFn: salesService.invoiceSummary,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Invoice['status'] }) =>
      salesService.setInvoiceStatus(id, status),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Status faktur diperbarui', `${invoice.number} kini berstatus ${invoice.status}.`);
    },
    onError: (error: Error) => toast.error('Status faktur gagal diubah', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      toast.success('Faktur dihapus', 'Draft faktur telah dihapus dari sistem.');
    },
    onError: (error: Error) => toast.error('Faktur gagal dihapus', error.message),
  });

  const columns: Column<Invoice>[] = [
    {
      id: 'number',
      header: 'Nomor Faktur',
      sortField: 'number',
      width: '11.5rem',
      cell: (row) => <span className="tabular font-medium text-brand-700">{row.number}</span>,
    },
    {
      id: 'customer',
      header: 'Pelanggan',
      sortField: 'customerName',
      minWidth: '13rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-1 text-ink-800">{row.customerName}</p>
          <p className="tabular text-xs text-ink-400">{row.reference}</p>
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Tanggal',
      sortField: 'date',
      width: '7.5rem',
      cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span>,
    },
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
    {
      id: 'total',
      header: 'Nilai',
      sortField: 'total',
      align: 'right',
      width: '10.5rem',
      cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.total)}</span>,
    },
    {
      id: 'paid',
      header: 'Dibayar',
      sortField: 'paidAmount',
      align: 'right',
      hideBelow: '2xl',
      width: '10.5rem',
      cell: (row) => <span className="text-ink-600">{formatCurrency(row.paidAmount)}</span>,
    },
    {
      id: 'outstanding',
      header: 'Sisa Tagihan',
      sortField: 'outstanding',
      align: 'right',
      width: '10.5rem',
      cell: (row) => (
        <span className={row.outstanding > 0 ? 'font-medium text-ink-900' : 'text-ink-400'}>
          {formatCurrency(row.outstanding)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      width: '8.75rem',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem
                icon={<Eye className="size-3.5" />}
                onClick={() => {
                  close();
                  navigate(`/sales/invoices/${row.id}`);
                }}
              >
                Lihat faktur
              </DropdownItem>
              <DropdownItem
                icon={<Pencil className="size-3.5" />}
                disabled={row.status === 'Paid' || row.status === 'Cancelled'}
                onClick={() => {
                  close();
                  navigate(`/sales/invoices/${row.id}/edit`);
                }}
              >
                Ubah faktur
              </DropdownItem>
              <DropdownItem
                icon={<Send className="size-3.5" />}
                disabled={row.status !== 'Draft'}
                onClick={() => {
                  close();
                  statusMutation.mutate({ id: row.id, status: 'Sent' });
                }}
              >
                Tandai terkirim
              </DropdownItem>
              <DropdownItem
                icon={<Wallet className="size-3.5" />}
                disabled={row.outstanding <= 0 || row.status === 'Cancelled'}
                onClick={() => {
                  close();
                  setPaymentTarget(row);
                }}
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
                    title: 'Batalkan faktur',
                    tone: 'warning',
                    confirmLabel: 'Batalkan faktur',
                    message: (
                      <>
                        Faktur <strong>{row.number}</strong> senilai {formatCurrency(row.total)} akan dibatalkan dan
                        dikeluarkan dari perhitungan piutang.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: 'Cancelled' }),
                  });
                }}
              >
                Batalkan faktur
              </DropdownItem>
              <DropdownItem
                icon={<Trash2 className="size-3.5" />}
                destructive
                disabled={row.status !== 'Draft'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Hapus draft faktur',
                    tone: 'danger',
                    confirmLabel: 'Hapus faktur',
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
        title="Faktur Penjualan"
        description="Penerbitan, penagihan, dan pelunasan faktur kepada pelanggan perusahaan."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'faktur-penjualan',
                  [
                    { header: 'Nomor Faktur', value: (row: Invoice) => row.number },
                    { header: 'Pelanggan', value: (row: Invoice) => row.customerName },
                    { header: 'Tanggal', value: (row: Invoice) => row.date },
                    { header: 'Jatuh Tempo', value: (row: Invoice) => row.dueDate },
                    { header: 'Subtotal', value: (row: Invoice) => row.subtotal },
                    { header: 'Diskon', value: (row: Invoice) => row.discountTotal },
                    { header: 'PPN', value: (row: Invoice) => row.taxTotal },
                    { header: 'Total', value: (row: Invoice) => row.total },
                    { header: 'Dibayar', value: (row: Invoice) => row.paidAmount },
                    { header: 'Sisa', value: (row: Invoice) => row.outstanding },
                    { header: 'Status', value: (row: Invoice) => row.status },
                  ],
                  data?.data ?? [],
                  { title: 'Faktur Penjualan', subtitle: 'PT PTSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel faktur penjualan telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/sales/invoices/new')}>
              Buat Faktur
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0 lg:grid-cols-5"
            items={[
              { label: 'Total Ditagih', value: formatCurrency(summary.billed) },
              { label: 'Sudah Diterima', value: formatCurrency(summary.collected), tone: 'positive' },
              { label: 'Sisa Piutang', value: formatCurrency(summary.outstanding) },
              {
                label: 'Jatuh Tempo',
                value: formatCurrency(summary.overdueValue),
                tone: summary.overdueValue > 0 ? 'negative' : 'positive',
              },
              { label: 'Faktur Draft', value: summary.draft, tone: summary.draft > 0 ? 'caution' : 'neutral' },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nomor faktur atau pelanggan"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'status',
              label: 'Status',
              value: table.filters.status ?? '',
              onChange: (value) => table.setFilter('status', value),
              options: INVOICE_STATUSES.map((status) => ({ value: status, label: status })),
              width: 'w-44',
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
          error={isError ? new Error('Daftar faktur tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/sales/invoices/${row.id}`)}
          emptyIcon={<FileText className="size-5" />}
          emptyTitle="Tidak ada faktur"
          emptyDescription="Terbitkan faktur pertama atau sesuaikan filter status dan periode."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/sales/invoices/new')}>
              Buat faktur
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
            itemLabel="faktur"
          />
        ) : null}
      </Panel>

      <PaymentDialog
        mode="receipt"
        documentId={paymentTarget?.id ?? null}
        documentNumber={paymentTarget?.number ?? ''}
        partyName={paymentTarget?.customerName ?? ''}
        outstanding={paymentTarget?.outstanding ?? 0}
        onClose={() => setPaymentTarget(null)}
      />

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
