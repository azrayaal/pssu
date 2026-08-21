import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Building2, CheckCircle2, Download, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Vendor } from '@/types';
import { purchaseService } from '@/services/purchase.service';
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
import { VendorFormDialog } from './components/VendorFormDialog';

const CATEGORY_LABELS: Record<Vendor['category'], string> = {
  Goods: 'Barang',
  Services: 'Jasa',
  Logistics: 'Logistik',
  Utilities: 'Utilitas',
  Professional: 'Profesional',
};

export default function VendorsPage() {
  useDocumentTitle('Pemasok');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({
    defaultSort: { field: 'name', direction: 'asc' },
    filterKeys: ['status', 'category'],
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.vendors.list(table.params),
    queryFn: () => purchaseService.listVendors(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.vendors.all, 'summary'],
    queryFn: purchaseService.vendorSummary,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Inactive' }) =>
      purchaseService.setVendorStatus(id, status),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      toast.success(vendor.status === 'Active' ? 'Pemasok diaktifkan' : 'Pemasok dinonaktifkan', vendor.name);
    },
    onError: (error: Error) => toast.error('Perubahan status gagal', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseService.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      toast.success('Pemasok dihapus', 'Data pemasok telah dikeluarkan dari sistem.');
    },
    onError: (error: Error) => toast.error('Pemasok gagal dihapus', error.message),
  });

  const columns: Column<Vendor>[] = [
    { id: 'code', header: 'Kode', sortField: 'code', width: '8rem', cell: (row) => <span className="tabular font-medium text-ink-700">{row.code}</span> },
    {
      id: 'name',
      header: 'Nama Pemasok',
      sortField: 'name',
      minWidth: '14rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium text-ink-900">{row.name}</p>
          <p className="line-clamp-1 text-xs text-ink-500">
            {row.contactPerson} · {row.phone}
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
      cell: (row) => <Badge tone="muted">{CATEGORY_LABELS[row.category]}</Badge>,
    },
    { id: 'city', header: 'Kota', sortField: 'city', hideBelow: '2xl', width: '9.5rem', cell: (row) => <span className="text-ink-600">{row.city}</span> },
    { id: 'bank', header: 'Bank', hideBelow: 'xl', width: '11rem', cell: (row) => <span className="text-ink-600">{row.bankName}</span> },
    { id: 'term', header: 'Termin', sortField: 'paymentTermDays', align: 'right', hideBelow: 'md', width: '6.5rem', cell: (row) => <span className="text-ink-600">{row.paymentTermDays} hari</span> },
    { id: 'purchased', header: 'Total Pembelian', sortField: 'totalPurchased', align: 'right', hideBelow: '2xl', width: '11rem', cell: (row) => <span className="text-ink-700">{formatCurrency(row.totalPurchased)}</span> },
    {
      id: 'outstanding',
      header: 'Utang',
      sortField: 'outstandingBalance',
      align: 'right',
      width: '10.5rem',
      cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.outstandingBalance)}</span>,
    },
    { id: 'status', header: 'Status', sortField: 'status', width: '8.75rem', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem icon={<Eye className="size-3.5" />} onClick={() => { close(); navigate(`/purchase/vendors/${row.id}`); }}>
                Lihat detail
              </DropdownItem>
              <DropdownItem icon={<Pencil className="size-3.5" />} onClick={() => { close(); setEditing(row); setFormOpen(true); }}>
                Ubah data
              </DropdownItem>
              <DropdownItem
                icon={row.status === 'Active' ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: row.status === 'Active' ? 'Nonaktifkan pemasok' : 'Aktifkan pemasok',
                    tone: row.status === 'Active' ? 'warning' : 'info',
                    confirmLabel: row.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan',
                    message: (
                      <>
                        <strong>{row.name}</strong>{' '}
                        {row.status === 'Active'
                          ? 'tidak akan muncul saat membuat pesanan pembelian baru.'
                          : 'akan kembali tersedia untuk pesanan pembelian baru.'}
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: row.status === 'Active' ? 'Inactive' : 'Active' }),
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
                    title: 'Hapus pemasok',
                    tone: 'danger',
                    confirmLabel: 'Hapus pemasok',
                    message: (
                      <>
                        <strong>{row.name}</strong> akan dihapus permanen. Pemasok yang memiliki riwayat transaksi
                        tidak dapat dihapus.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus pemasok
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
        title="Pemasok"
        description="Data mitra pengadaan barang dan jasa beserta posisi utang usaha masing-masing."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'daftar-pemasok',
                  [
                    { header: 'Kode', value: (row: Vendor) => row.code },
                    { header: 'Nama', value: (row: Vendor) => row.name },
                    { header: 'Kategori', value: (row: Vendor) => CATEGORY_LABELS[row.category] },
                    { header: 'Kota', value: (row: Vendor) => row.city },
                    { header: 'Bank', value: (row: Vendor) => row.bankName },
                    { header: 'Rekening', value: (row: Vendor) => row.bankAccount },
                    { header: 'Termin (hari)', value: (row: Vendor) => row.paymentTermDays },
                    { header: 'Total Pembelian', value: (row: Vendor) => row.totalPurchased },
                    { header: 'Utang', value: (row: Vendor) => row.outstandingBalance },
                    { header: 'Status', value: (row: Vendor) => row.status },
                  ],
                  data?.data ?? [],
                  { title: 'Daftar Pemasok', subtitle: 'PT PSSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel daftar pemasok telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              Tambah Pemasok
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0"
            items={[
              { label: 'Total Pemasok', value: summary.total },
              { label: 'Pemasok Aktif', value: summary.active, tone: 'positive' },
              { label: 'Total Pembelian', value: formatCurrency(summary.purchasedTotal) },
              { label: 'Total Utang', value: formatCurrency(summary.outstandingTotal) },
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
              options: (Object.keys(CATEGORY_LABELS) as Vendor['category'][]).map((key) => ({
                value: key,
                label: CATEGORY_LABELS[key],
              })),
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
          ]}
        />

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isPending}
          error={isError ? new Error('Daftar pemasok tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/purchase/vendors/${row.id}`)}
          emptyIcon={<Building2 className="size-5" />}
          emptyTitle="Tidak ada pemasok"
          emptyDescription="Tambahkan pemasok baru atau ubah kriteria pencarian."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Tambah pemasok
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
            itemLabel="pemasok"
          />
        ) : null}
      </Panel>

      <VendorFormDialog open={formOpen} vendor={editing} onClose={() => { setFormOpen(false); setEditing(null); }} />
      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
