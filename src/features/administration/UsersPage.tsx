import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Eye, Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { User } from '@/types';
import { administrationService } from '@/services/administration.service';
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
import { formatDateTime } from '@/utils/date';
import { UserFormDialog } from './components/UserFormDialog';

export default function UsersPage() {
  useDocumentTitle('Pengguna');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({ defaultSort: { field: 'name', direction: 'asc' }, filterKeys: ['status', 'roleId'] });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.users.list(table.params),
    queryFn: () => administrationService.listUsers(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.users.all, 'summary'],
    queryFn: administrationService.userSummary,
  });

  const { data: roles } = useQuery({
    queryKey: queryKeys.roles.list,
    queryFn: administrationService.listRoles,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Inactive' }) =>
      administrationService.setUserStatus(id, status),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(user.status === 'Active' ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan', user.name);
    },
    onError: (error: Error) => toast.error('Perubahan status gagal', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => administrationService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Pengguna dihapus', 'Akses pengguna telah dicabut dari sistem.');
    },
    onError: (error: Error) => toast.error('Pengguna gagal dihapus', error.message),
  });

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Nama Pengguna',
      sortField: 'name',
      minWidth: '16rem',
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-800">
            {row.initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink-900">{row.name}</span>
            <span className="block truncate text-xs text-ink-500">{row.email}</span>
          </span>
        </div>
      ),
    },
    { id: 'role', header: 'Peran', sortField: 'roleName', width: '12rem', cell: (row) => <Badge tone="brand">{row.roleName}</Badge> },
    { id: 'department', header: 'Departemen', sortField: 'department', width: '12rem', hideBelow: 'lg', cell: (row) => <span className="text-ink-600">{row.department}</span> },
    { id: 'jobTitle', header: 'Jabatan', sortField: 'jobTitle', minWidth: '11rem', hideBelow: 'xl', cell: (row) => <span className="line-clamp-1 text-ink-600">{row.jobTitle}</span> },
    {
      id: 'lastLogin',
      header: 'Terakhir Masuk',
      sortField: 'lastLoginAt',
      width: '12.5rem',
      hideBelow: 'md',
      cell: (row) => <span className="tabular text-ink-500">{row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Belum pernah'}</span>,
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
              <DropdownItem icon={<Eye className="size-3.5" />} onClick={() => { close(); navigate(`/administration/users/${row.id}`); }}>
                Lihat profil
              </DropdownItem>
              <DropdownItem icon={<Pencil className="size-3.5" />} onClick={() => { close(); setEditing(row); setFormOpen(true); }}>
                Ubah pengguna
              </DropdownItem>
              <DropdownItem
                icon={row.status === 'Active' ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: row.status === 'Active' ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna',
                    tone: row.status === 'Active' ? 'warning' : 'info',
                    confirmLabel: row.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan',
                    message: (
                      <>
                        <strong>{row.name}</strong>{' '}
                        {row.status === 'Active'
                          ? 'tidak akan dapat masuk ke aplikasi sampai diaktifkan kembali.'
                          : 'akan kembali memperoleh akses sesuai peran yang diberikan.'}
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
                    title: 'Hapus pengguna',
                    tone: 'danger',
                    confirmLabel: 'Hapus pengguna',
                    message: (
                      <>
                        Akun <strong>{row.name}</strong> akan dihapus permanen beserta seluruh haknya. Jejak audit
                        aktivitas tetap tersimpan.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus pengguna
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
        title="Pengguna"
        description="Kelola akun pengguna aplikasi beserta peran dan hak aksesnya."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/administration/roles')}>
              Peran & Hak Akses
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              Tambah Pengguna
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0"
            items={[
              { label: 'Total Pengguna', value: summary.total },
              { label: 'Pengguna Aktif', value: summary.active, tone: 'positive' },
              { label: 'Pengguna Nonaktif', value: summary.inactive, tone: summary.inactive > 0 ? 'caution' : 'neutral' },
              { label: 'Jumlah Departemen', value: summary.departments },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nama, email, atau jabatan"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'roleId',
              label: 'Peran',
              value: table.filters.roleId ?? '',
              onChange: (value) => table.setFilter('roleId', value),
              options: (roles ?? []).map((role) => ({ value: role.id, label: role.name })),
              width: 'w-48',
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
          error={isError ? new Error('Daftar pengguna tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/administration/users/${row.id}`)}
          emptyIcon={<Users className="size-5" />}
          emptyTitle="Tidak ada pengguna"
          emptyDescription="Tambahkan pengguna baru atau ubah kriteria pencarian."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Tambah pengguna
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
            itemLabel="pengguna"
          />
        ) : null}
      </Panel>

      <UserFormDialog open={formOpen} user={editing} onClose={() => { setFormOpen(false); setEditing(null); }} />
      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
