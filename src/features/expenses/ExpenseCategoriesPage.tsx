import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ExpenseCategory } from '@/types';
import { expensesService } from '@/services/expenses.service';
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
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { RowActions } from '@/components/tables/RowActions';
import { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { formatCurrency, formatPercent } from '@/utils/format';
import { cn } from '@/lib/cn';
import { ExpenseCategoryDialog } from './components/ExpenseCategoryDialog';

export default function ExpenseCategoriesPage() {
  useDocumentTitle('Kategori Biaya');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({ defaultSort: { field: 'code', direction: 'asc' }, filterKeys: ['status'] });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.expenseCategories.list(table.params),
    queryFn: () => expensesService.listCategories(table.params),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Inactive' }) =>
      expensesService.setCategoryStatus(id, status),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      toast.success(category.status === 'Active' ? 'Kategori diaktifkan' : 'Kategori dinonaktifkan', category.name);
    },
    onError: (error: Error) => toast.error('Perubahan status gagal', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesService.removeCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      toast.success('Kategori dihapus', 'Kategori biaya telah dikeluarkan dari sistem.');
    },
    onError: (error: Error) => toast.error('Kategori gagal dihapus', error.message),
  });

  const columns: Column<ExpenseCategory>[] = [
    { id: 'code', header: 'Kode', sortField: 'code', width: '8rem', cell: (row) => <span className="tabular font-medium text-ink-700">{row.code}</span> },
    { id: 'name', header: 'Nama Kategori', sortField: 'name', minWidth: '14rem', cell: (row) => <span className="font-medium text-ink-900">{row.name}</span> },
    {
      id: 'gl',
      header: 'Akun Buku Besar',
      minWidth: '16rem',
      hideBelow: 'md',
      cell: (row) => (
        <span className="text-ink-600">
          <span className="tabular">{row.glAccountCode}</span>
          <span className="ml-2 text-ink-500">{row.glAccountName}</span>
        </span>
      ),
    },
    { id: 'budget', header: 'Anggaran Bulanan', sortField: 'monthlyBudget', align: 'right', width: '12rem', cell: (row) => formatCurrency(row.monthlyBudget) },
    { id: 'spent', header: 'Realisasi Bulan Ini', sortField: 'spentThisMonth', align: 'right', width: '12.5rem', cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.spentThisMonth)}</span> },
    {
      id: 'usage',
      header: 'Serapan',
      align: 'right',
      width: '8rem',
      hideBelow: 'lg',
      cell: (row) => {
        const usage = row.monthlyBudget === 0 ? 0 : (row.spentThisMonth / row.monthlyBudget) * 100;
        return (
          <span
            className={cn(
              'font-medium',
              usage > 100 ? 'text-negative-700' : usage > 85 ? 'text-caution-700' : 'text-ink-700',
            )}
          >
            {formatPercent(usage, 0)}
          </span>
        );
      },
    },
    { id: 'status', header: 'Status', sortField: 'status', width: '8rem', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem icon={<Pencil className="size-3.5" />} onClick={() => { close(); setEditing(row); setFormOpen(true); }}>
                Ubah kategori
              </DropdownItem>
              <DropdownItem
                icon={row.status === 'Active' ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                onClick={() => {
                  close();
                  statusMutation.mutate({ id: row.id, status: row.status === 'Active' ? 'Inactive' : 'Active' });
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
                    title: 'Hapus kategori biaya',
                    tone: 'danger',
                    confirmLabel: 'Hapus kategori',
                    message: (
                      <>
                        Kategori <strong>{row.name}</strong> akan dihapus. Kategori yang sudah digunakan pada
                        transaksi biaya tidak dapat dihapus.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus kategori
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
        title="Kategori Biaya"
        description="Pos anggaran biaya operasional beserta pemetaan akun buku besar dan realisasi bulan berjalan."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/expenses')}>
              Daftar Biaya
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              Tambah Kategori
            </Button>
          </>
        }
      />

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari kode, nama, atau akun"
          onResetFilters={table.resetFilters}
          filters={[
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
          error={isError ? new Error('Daftar kategori tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          emptyIcon={<FolderTree className="size-5" />}
          emptyTitle="Belum ada kategori biaya"
          emptyDescription="Tambahkan kategori untuk mengelompokkan pengeluaran operasional perusahaan."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Tambah kategori
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
            itemLabel="kategori"
          />
        ) : null}
      </Panel>

      <ExpenseCategoryDialog open={formOpen} category={editing} onClose={() => { setFormOpen(false); setEditing(null); }} />
      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
