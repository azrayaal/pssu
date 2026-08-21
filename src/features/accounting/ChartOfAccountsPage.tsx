import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Download, Eye, ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Account } from '@/types';
import { ACCOUNT_TYPES } from '@/types';
import { accountingService } from '@/services/accounting.service';
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
import { exportToCsv, exportToExcel } from '@/utils/export';
import { AccountFormDialog } from './components/AccountFormDialog';
import { AccountDetailDrawer } from './components/AccountDetailDrawer';

export default function ChartOfAccountsPage() {
  useDocumentTitle('Bagan Akun');
  const queryClient = useQueryClient();
  const table = useTableQuery({ defaultSort: { field: 'code', direction: 'asc' }, filterKeys: ['type', 'status'] });
  const confirmation = useConfirm();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.accounts.list(table.params),
    queryFn: () => accountingService.listAccounts(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.accounts.all, 'summary'],
    queryFn: accountingService.accountSummary,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Inactive' }) =>
      accountingService.setAccountStatus(id, status),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success(
        account.status === 'Active' ? 'Akun diaktifkan' : 'Akun dinonaktifkan',
        `${account.code} · ${account.name}`,
      );
    },
    onError: (error: Error) => toast.error('Perubahan status gagal', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success('Akun dihapus', 'Akun telah dikeluarkan dari bagan akun.');
    },
    onError: (error: Error) => toast.error('Akun gagal dihapus', error.message),
  });

  const columns: Column<Account>[] = [
    {
      id: 'code',
      header: 'Kode',
      sortField: 'code',
      width: '7.5rem',
      cell: (row) => <span className="tabular font-medium text-ink-900">{row.code}</span>,
    },
    {
      id: 'name',
      header: 'Nama Akun',
      sortField: 'name',
      minWidth: '18rem',
      cell: (row) => (
        <div style={{ paddingLeft: `${Math.min(row.level, 3) * 14}px` }} className="flex items-center gap-2">
          <span className={row.level === 0 ? 'font-semibold text-ink-900' : 'text-ink-700'}>{row.name}</span>
          {row.isSystem ? <Badge tone="muted">Sistem</Badge> : null}
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Tipe',
      sortField: 'type',
      width: '8rem',
      cell: (row) => <span className="text-ink-600">{row.type}</span>,
    },
    {
      id: 'subtype',
      header: 'Kelompok',
      hideBelow: 'xl',
      minWidth: '11rem',
      cell: (row) => <span className="text-ink-500">{row.subtype}</span>,
    },
    {
      id: 'parent',
      header: 'Akun Induk',
      sortField: 'parentName',
      hideBelow: 'lg',
      minWidth: '13rem',
      cell: (row) =>
        row.parentCode ? (
          <span className="text-ink-600">
            <span className="tabular">{row.parentCode}</span>
            <span className="ml-1.5 text-ink-400">{row.parentName}</span>
          </span>
        ) : (
          <span className="text-ink-300">&mdash;</span>
        ),
    },
    {
      id: 'balance',
      header: 'Saldo',
      sortField: 'balance',
      align: 'right',
      width: '11.5rem',
      cell: (row) => (
        <span className={row.balance < 0 ? 'font-medium text-negative-700' : 'font-medium text-ink-900'}>
          {formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      width: '7.5rem',
      cell: (row) => <StatusBadge status={row.status === 'Active' ? 'Active' : 'Inactive'} />,
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
                  setDetailId(row.id);
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
                Ubah akun
              </DropdownItem>
              <DropdownItem
                icon={row.status === 'Active' ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                disabled={row.isSystem}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: row.status === 'Active' ? 'Nonaktifkan akun' : 'Aktifkan akun',
                    tone: row.status === 'Active' ? 'warning' : 'info',
                    confirmLabel: row.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan',
                    message: (
                      <>
                        Akun <strong>{row.code} · {row.name}</strong>{' '}
                        {row.status === 'Active'
                          ? 'tidak akan tersedia lagi saat membuat transaksi baru. Saldo dan riwayat tetap tersimpan.'
                          : 'akan kembali tersedia untuk pencatatan transaksi baru.'}
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
                disabled={row.isSystem}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Hapus akun',
                    tone: 'danger',
                    confirmLabel: 'Hapus akun',
                    message: (
                      <>
                        Akun <strong>{row.code} · {row.name}</strong> akan dihapus permanen dari bagan akun.
                        Tindakan ini tidak dapat dibatalkan.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus akun
              </DropdownItem>
            </>
          )}
        </RowActions>
      ),
    },
  ];

  const exportColumns = [
    { header: 'Kode Akun', value: (row: Account) => row.code },
    { header: 'Nama Akun', value: (row: Account) => row.name },
    { header: 'Tipe', value: (row: Account) => row.type },
    { header: 'Kelompok', value: (row: Account) => row.subtype },
    { header: 'Akun Induk', value: (row: Account) => row.parentName ?? '' },
    { header: 'Saldo', value: (row: Account) => row.balance },
    { header: 'Status', value: (row: Account) => row.status },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bagan Akun"
        description="Struktur akun buku besar yang menjadi dasar seluruh pencatatan transaksi keuangan perusahaan."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToCsv('bagan-akun', exportColumns, data?.data ?? []);
                toast.success('Ekspor selesai', 'Berkas CSV bagan akun telah diunduh.');
              }}
            >
              Ekspor CSV
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Tambah Akun
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0 lg:grid-cols-5"
            items={[
              { label: 'Total Akun', value: summary.total },
              { label: 'Akun Aktif', value: summary.active, tone: 'positive' },
              {
                label: 'Total Aset',
                value: formatCurrency(summary.byType.find((entry) => entry.type === 'Asset')?.balance ?? 0),
              },
              {
                label: 'Total Kewajiban',
                value: formatCurrency(summary.byType.find((entry) => entry.type === 'Liability')?.balance ?? 0),
              },
              {
                label: 'Total Ekuitas',
                value: formatCurrency(summary.byType.find((entry) => entry.type === 'Equity')?.balance ?? 0),
              },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari kode atau nama akun"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'type',
              label: 'Tipe',
              value: table.filters.type ?? '',
              onChange: (value) => table.setFilter('type', value),
              options: ACCOUNT_TYPES.map((type) => ({ value: type, label: type })),
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
          actions={
            <Button
              variant="outline"
              size="md"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel('bagan-akun', exportColumns, data?.data ?? [], {
                  title: 'Bagan Akun',
                  subtitle: 'PT PSSU Indonesia',
                });
                toast.success('Ekspor selesai', 'Berkas Excel bagan akun telah diunduh.');
              }}
            >
              Excel
            </Button>
          }
        />

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isPending || (isFetching && !data)}
          error={isError ? new Error('Bagan akun tidak dapat dimuat saat ini.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => setDetailId(row.id)}
          emptyIcon={<ListTree className="size-5" />}
          emptyTitle={table.search || table.activeFilterCount ? 'Tidak ada akun yang cocok' : 'Bagan akun masih kosong'}
          emptyDescription={
            table.search || table.activeFilterCount
              ? 'Ubah kata kunci pencarian atau atur ulang filter untuk menampilkan akun lainnya.'
              : 'Mulai dengan menambahkan akun pertama pada struktur buku besar perusahaan.'
          }
          emptyAction={
            table.search || table.activeFilterCount ? (
              <Button variant="outline" size="sm" onClick={table.resetFilters}>
                Atur ulang filter
              </Button>
            ) : (
              <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
                Tambah akun
              </Button>
            )
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
            itemLabel="akun"
          />
        ) : null}
      </Panel>

      <AccountFormDialog
        open={formOpen}
        account={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <AccountDetailDrawer
        accountId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(account) => {
          setDetailId(null);
          setEditing(account);
          setFormOpen(true);
        }}
      />

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
