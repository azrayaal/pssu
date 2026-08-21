import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Download, Eye, Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { Customer } from '@/types';
import { salesService } from '@/services/sales.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useTableQuery } from '@/hooks/useTableQuery';
import { useConfirm } from '@/hooks/useConfirm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SummaryBar } from '@/components/ui/DetailList';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { RowActions } from '@/components/tables/RowActions';
import { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { formatCurrency } from '@/utils/format';
import { exportToExcel } from '@/utils/export';
import { CustomerFormDialog } from './components/CustomerFormDialog';

export default function CustomersPage() {
  useDocumentTitle('Pelanggan');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({
    defaultSort: { field: 'name', direction: 'asc' },
    filterKeys: ['status', 'category', 'hasOutstanding'],
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.customers.list(table.params),
    queryFn: () => salesService.listCustomers(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.customers.all, 'summary'],
    queryFn: salesService.customerSummary,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Inactive' }) =>
      salesService.setCustomerStatus(id, status),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success(customer.status === 'Active' ? 'Pelanggan diaktifkan' : 'Pelanggan dinonaktifkan', customer.name);
    },
    onError: (error: Error) => toast.error('Perubahan status gagal', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Pelanggan dihapus', 'Data pelanggan telah dikeluarkan dari sistem.');
    },
    onError: (error: Error) => toast.error('Pelanggan gagal dihapus', error.message),
  });

  const columns: Column<Customer>[] = [
    {
      id: 'code',
      header: 'Kode',
      sortField: 'code',
      width: '8rem',
      cell: (row) => <span className="tabular font-medium text-ink-700">{row.code}</span>,
    },
    {
      id: 'name',
      header: 'Nama Pelanggan',
      sortField: 'name',
      minWidth: '18rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="line-clamp-1 text-xs text-ink-500">
            {row.contactPerson} · {row.email}
          </p>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Kategori',
      sortField: 'category',
      hideBelow: 'lg',
      width: '8.5rem',
      cell: (row) => <Badge tone="muted">{row.category}</Badge>,
    },
    {
      id: 'city',
      header: 'Kota',
      sortField: 'city',
      hideBelow: 'xl',
      width: '10rem',
      cell: (row) => <span className="text-ink-600">{row.city}</span>,
    },
    {
      id: 'term',
      header: 'Termin',
      sortField: 'paymentTermDays',
      align: 'right',
      hideBelow: 'md',
      width: '6.5rem',
      cell: (row) => <span className="text-ink-600">{row.paymentTermDays} hari</span>,
    },
    {
      id: 'billed',
      header: 'Total Ditagih',
      sortField: 'totalBilled',
      align: 'right',
      hideBelow: 'lg',
      width: '11.5rem',
      cell: (row) => <span className="text-ink-700">{formatCurrency(row.totalBilled)}</span>,
    },
    {
      id: 'outstanding',
      header: 'Piutang',
      sortField: 'outstandingBalance',
      align: 'right',
      width: '11.5rem',
      cell: (row) => (
        <span
          className={
            row.outstandingBalance > row.creditLimit ? 'font-medium text-negative-700' : 'font-medium text-ink-900'
          }
        >
          {formatCurrency(row.outstandingBalance)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      width: '7.5rem',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3.5rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem
                icon={<Eye className="size-3.5" />}
                onClick={() => {
                  close();
                  navigate(`/sales/customers/${row.id}`);
                }}
              >
                Lihat detail
              </DropdownItem>
              <DropdownItem
                icon={<Pencil className="size-3.5" />}
                onClick={() => {
                  close();
                  setEditing(row);
                  setFormOpen(true);
                }}
              >
                Ubah data
              </DropdownItem>
              <DropdownItem
                icon={row.status === 'Active' ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: row.status === 'Active' ? 'Nonaktifkan pelanggan' : 'Aktifkan pelanggan',
                    tone: row.status === 'Active' ? 'warning' : 'info',
                    confirmLabel: row.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan',
                    message: (
                      <>
                        <strong>{row.name}</strong>{' '}
                        {row.status === 'Active'
                          ? 'tidak akan muncul saat menerbitkan faktur baru. Riwayat transaksi tetap tersimpan.'
                          : 'akan kembali tersedia untuk penerbitan faktur.'}
                      </>
                    ),
                    onConfirm: () =>
                      statusMutation.mutateAsync({
                        id: row.id,
                        status: row.status === 'Active' ? 'Inactive' : 'Active',
                      }),
                  });
                }}
              >
                {row.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<Trash2 className="size-3.5" />}
                destructive
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Hapus pelanggan',
                    tone: 'danger',
                    confirmLabel: 'Hapus pelanggan',
                    message: (
                      <>
                        <strong>{row.name}</strong> akan dihapus permanen. Pelanggan yang sudah memiliki faktur
                        tidak dapat dihapus.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus pelanggan
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
        title="Pelanggan"
        description="Data mitra penjualan beserta batas kredit dan posisi piutang usaha masing-masing."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'daftar-pelanggan',
                  [
                    { header: 'Kode', value: (row: Customer) => row.code },
                    { header: 'Nama', value: (row: Customer) => row.name },
                    { header: 'Kategori', value: (row: Customer) => row.category },
                    { header: 'Kota', value: (row: Customer) => row.city },
                    { header: 'Kontak', value: (row: Customer) => row.contactPerson },
                    { header: 'Email', value: (row: Customer) => row.email },
                    { header: 'Termin (hari)', value: (row: Customer) => row.paymentTermDays },
                    { header: 'Batas Kredit', value: (row: Customer) => row.creditLimit },
                    { header: 'Total Ditagih', value: (row: Customer) => row.totalBilled },
                    { header: 'Piutang', value: (row: Customer) => row.outstandingBalance },
                    { header: 'Status', value: (row: Customer) => row.status },
                  ],
                  data?.data ?? [],
                  { title: 'Daftar Pelanggan', subtitle: 'PT PTSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel daftar pelanggan telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Tambah Pelanggan
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0"
            items={[
              { label: 'Total Pelanggan', value: summary.total },
              { label: 'Pelanggan Aktif', value: summary.active, tone: 'positive' },
              { label: 'Total Piutang', value: formatCurrency(summary.outstandingTotal) },
              {
                label: 'Melebihi Batas Kredit',
                value: summary.overLimit,
                tone: summary.overLimit > 0 ? 'negative' : 'positive',
              },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nama, kode, atau kota"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'category',
              label: 'Kategori',
              value: table.filters.category ?? '',
              onChange: (value) => table.setFilter('category', value),
              options: [
                { value: 'Corporate', label: 'Corporate' },
                { value: 'Government', label: 'Government' },
                { value: 'Distributor', label: 'Distributor' },
                { value: 'Retail', label: 'Retail' },
              ],
              width: 'w-40',
            },
            {
              id: 'status',
              label: 'Status',
              value: table.filters.status ?? '',
              onChange: (value) => table.setFilter('status', value),
              options: [
                { value: 'Active', label: 'Aktif' },
                { value: 'Inactive', label: 'Nonaktif' },
              ],
              width: 'w-36',
            },
            {
              id: 'hasOutstanding',
              label: 'Piutang',
              value: table.filters.hasOutstanding ?? '',
              onChange: (value) => table.setFilter('hasOutstanding', value),
              options: [{ value: 'true', label: 'Memiliki piutang' }],
              width: 'w-44',
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isPending}
          error={isError ? new Error('Daftar pelanggan tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/sales/customers/${row.id}`)}
          emptyIcon={<Users className="size-5" />}
          emptyTitle="Tidak ada pelanggan"
          emptyDescription="Tambahkan pelanggan baru atau ubah kriteria pencarian untuk melihat data lainnya."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Tambah pelanggan
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
            itemLabel="pelanggan"
          />
        ) : null}
      </Panel>

      <CustomerFormDialog
        open={formOpen}
        customer={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
