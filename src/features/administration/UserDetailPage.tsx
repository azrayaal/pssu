import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCircle2, Pencil } from 'lucide-react';
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
import { DetailList } from '@/components/ui/DetailList';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { PERMISSION_ACTIONS } from '@/types';
import { PermissionMatrixTable } from './components/PermissionMatrixTable';
import { UserFormDialog } from './components/UserFormDialog';
import { formatDateTime } from '@/utils/date';

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: () => administrationService.getUser(id!),
    enabled: Boolean(id),
  });

  useDocumentTitle(data ? data.user.name : 'Detail Pengguna');

  const statusMutation = useMutation({
    mutationFn: (status: 'Active' | 'Inactive') => administrationService.setUserStatus(id!, status),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(user.status === 'Active' ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan', user.name);
    },
    onError: (error: Error) => toast.error('Perubahan status gagal', error.message),
  });

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Pengguna tidak ditemukan" onRetry={() => refetch()} />
      </Panel>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const { user, role, activity } = data;
  const grantedCount = role
    ? Object.values(role.permissions).reduce(
        (sum, actions) => sum + PERMISSION_ACTIONS.filter((action) => actions[action]).length,
        0,
      )
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={user.name}
        description={`${user.jobTitle} · ${user.department}`}
        meta={
          <>
            <StatusBadge status={user.status} />
            <Badge tone="brand">{user.roleName}</Badge>
            <MetaItem label="Email" value={user.email} />
            <MetaItem label="Telepon" value={user.phone} />
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/administration/users')}>
              Daftar pengguna
            </Button>
            <Button variant="outline" leadingIcon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>
              Ubah data
            </Button>
            <Button
              variant={user.status === 'Active' ? 'outline' : 'primary'}
              leadingIcon={user.status === 'Active' ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
              loading={statusMutation.isPending}
              onClick={() =>
                confirmation.confirm({
                  title: user.status === 'Active' ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna',
                  tone: user.status === 'Active' ? 'warning' : 'info',
                  confirmLabel: user.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan',
                  message: (
                    <>
                      <strong>{user.name}</strong>{' '}
                      {user.status === 'Active'
                        ? 'tidak akan dapat masuk ke aplikasi sampai diaktifkan kembali.'
                        : 'akan kembali memperoleh akses sesuai peran yang diberikan.'}
                    </>
                  ),
                  onConfirm: () => statusMutation.mutateAsync(user.status === 'Active' ? 'Inactive' : 'Active'),
                })
              }
            >
              {user.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Informasi Pengguna" compact />
          <div className="p-5">
            <DetailList
              columns={3}
              items={[
                { label: 'Nama lengkap', value: user.name },
                { label: 'Email', value: user.email },
                { label: 'Telepon', value: user.phone },
                { label: 'Peran', value: user.roleName },
                { label: 'Departemen', value: user.department },
                { label: 'Jabatan', value: user.jobTitle },
                { label: 'Terakhir masuk', value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Belum pernah' },
                { label: 'Dibuat', value: formatDateTime(user.createdAt) },
                { label: 'Diperbarui', value: formatDateTime(user.updatedAt) },
              ]}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Ringkasan Akses" description={role?.description} compact />
          <div className="p-5">
            <p className="tabular text-2xl font-semibold text-ink-900">{grantedCount}</p>
            <p className="mt-0.5 text-[13px] text-ink-500">Total hak akses yang diberikan pada peran ini</p>
            <div className="mt-4 space-y-2 border-t border-ink-100 pt-3">
              {PERMISSION_ACTIONS.map((action) => {
                const count = role
                  ? Object.values(role.permissions).filter((actions) => actions[action]).length
                  : 0;
                const total = role ? Object.keys(role.permissions).length : 0;
                return (
                  <div key={action} className="flex items-center justify-between text-[13px]">
                    <span className="capitalize text-ink-600">{action}</span>
                    <span className="tabular font-medium text-ink-900">
                      {count} / {total} modul
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {role ? (
        <Panel>
          <PanelHeader
            title={`Matriks Hak Akses — ${role.name}`}
            description="Hak akses diwarisi dari peran yang diberikan kepada pengguna ini"
            compact
          />
          <PermissionMatrixTable permissions={role.permissions} readOnly />
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title="Aktivitas Terakhir" description={`${activity.length} aktivitas tercatat`} compact />
        {activity.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-ink-200">
                  <th className="w-48 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Waktu</th>
                  <th className="w-28 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Aksi</th>
                  <th className="w-40 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Modul</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Keterangan</th>
                  <th className="w-36 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Alamat IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {activity.map((log) => (
                  <tr key={log.id} className="hover:bg-ink-50">
                    <td className="tabular whitespace-nowrap px-4 py-2.5 text-ink-600">{formatDateTime(log.timestamp)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone="muted">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-600">{log.module}</td>
                    <td className="px-4 py-2.5">
                      <span className="line-clamp-1 text-ink-700">{log.description}</span>
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-2.5 text-ink-500">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-[13px] text-ink-500">Belum ada aktivitas tercatat untuk pengguna ini.</p>
        )}
      </Panel>

      <UserFormDialog open={editOpen} user={user} onClose={() => setEditOpen(false)} />
      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
