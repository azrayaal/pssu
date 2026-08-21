import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import type { PermissionAction, PermissionMatrix, Role } from '@/types';
import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '@/types';
import { administrationService } from '@/services/administration.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useConfirm } from '@/hooks/useConfirm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { PermissionMatrixTable } from './components/PermissionMatrixTable';

function emptyMatrix(): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const module of PERMISSION_MODULES) {
    matrix[module] = { view: false, create: false, edit: false, delete: false, approve: false, export: false };
  }
  return matrix;
}

export default function RolesPage() {
  useDocumentTitle('Peran dan Hak Akses');
  const queryClient = useQueryClient();
  const confirmation = useConfirm();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionMatrix | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  const { data: roles, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.roles.list,
    queryFn: administrationService.listRoles,
  });

  const activeRole: Role | undefined = useMemo(
    () => roles?.find((role) => role.id === selectedId) ?? roles?.[0],
    [roles, selectedId],
  );

  useEffect(() => {
    if (activeRole) setDraft(structuredClone(activeRole.permissions));
  }, [activeRole]);

  const dirty = useMemo(
    () => Boolean(activeRole && draft && JSON.stringify(activeRole.permissions) !== JSON.stringify(draft)),
    [activeRole, draft],
  );

  const saveMutation = useMutation({
    mutationFn: () => administrationService.updateRole(activeRole!.id, { permissions: draft! }),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      toast.success('Hak akses tersimpan', `Perubahan pada peran ${role.name} telah diterapkan.`);
    },
    onError: (error: Error) => toast.error('Hak akses gagal disimpan', error.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      administrationService.createRole({ name: newRole.name, description: newRole.description, permissions: emptyMatrix() }),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      setSelectedId(role.id);
      setCreateOpen(false);
      setNewRole({ name: '', description: '' });
      toast.success('Peran dibuat', `${role.name} siap dikonfigurasi hak aksesnya.`);
    },
    onError: (error: Error) => toast.error('Peran gagal dibuat', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => administrationService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      setSelectedId(null);
      toast.success('Peran dihapus', 'Peran telah dikeluarkan dari sistem.');
    },
    onError: (error: Error) => toast.error('Peran gagal dihapus', error.message),
  });

  const toggle = (module: string, action: PermissionAction, value: boolean): void => {
    setDraft((current) =>
      current ? { ...current, [module]: { ...current[module]!, [action]: value } } : current,
    );
  };

  const toggleModule = (module: string, value: boolean): void => {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current[module]! };
      PERMISSION_ACTIONS.forEach((action) => {
        next[action] = value;
      });
      return { ...current, [module]: next };
    });
  };

  const toggleAction = (action: PermissionAction, value: boolean): void => {
    setDraft((current) => {
      if (!current) return current;
      const next: PermissionMatrix = { ...current };
      PERMISSION_MODULES.forEach((module) => {
        next[module] = { ...next[module]!, [action]: value };
      });
      return next;
    });
  };

  const grantedCount = draft
    ? Object.values(draft).reduce((sum, actions) => sum + PERMISSION_ACTIONS.filter((a) => actions[a]).length, 0)
    : 0;
  const totalCount = PERMISSION_MODULES.length * PERMISSION_ACTIONS.length;

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Daftar peran tidak dapat dimuat" onRetry={() => refetch()} />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Peran dan Hak Akses"
        description="Tetapkan hak akses setiap peran terhadap modul aplikasi melalui matriks perizinan."
        actions={
          <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            Tambah Peran
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[20rem_1fr]">
        <Panel className="h-fit">
          <PanelHeader title="Daftar Peran" description={`${roles?.length ?? 0} peran terdaftar`} compact />
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {(roles ?? []).map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors',
                      activeRole?.id === role.id ? 'bg-brand-50' : 'hover:bg-ink-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-[13px] font-semibold',
                          activeRole?.id === role.id ? 'text-brand-800' : 'text-ink-900',
                        )}
                      >
                        {role.name}
                      </span>
                      {role.isSystem ? <Badge tone="muted">Sistem</Badge> : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">{role.description}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{role.userCount} pengguna</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title={activeRole ? `Matriks Hak Akses — ${activeRole.name}` : 'Matriks Hak Akses'}
            description={
              activeRole
                ? `${grantedCount} dari ${totalCount} izin diberikan · ${activeRole.userCount} pengguna terdampak`
                : 'Pilih peran untuk mengatur hak aksesnya'
            }
            actions={
              activeRole ? (
                <>
                  {!activeRole.isSystem ? (
                    <Button
                      variant="outline"
                      size="sm"
                      leadingIcon={<Trash2 className="size-3.5" />}
                      onClick={() =>
                        confirmation.confirm({
                          title: 'Hapus peran',
                          tone: 'danger',
                          confirmLabel: 'Hapus peran',
                          message: (
                            <>
                              Peran <strong>{activeRole.name}</strong> akan dihapus. Peran yang masih digunakan
                              pengguna aktif tidak dapat dihapus.
                            </>
                          ),
                          onConfirm: () => deleteMutation.mutateAsync(activeRole.id),
                        })
                      }
                    >
                      Hapus
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    leadingIcon={<Undo2 className="size-3.5" />}
                    disabled={!dirty}
                    onClick={() => setDraft(structuredClone(activeRole.permissions))}
                  >
                    Kembalikan
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leadingIcon={<Save className="size-3.5" />}
                    disabled={!dirty || activeRole.isSystem}
                    loading={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    Simpan perubahan
                  </Button>
                </>
              ) : null
            }
          />

          {activeRole?.isSystem ? (
            <div className="flex items-start gap-2.5 border-b border-caution-100 bg-caution-50 px-4 py-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-caution-600" aria-hidden />
              <p className="text-[13px] text-caution-700">
                Peran sistem memiliki akses penuh dan tidak dapat diubah untuk menjaga integritas kontrol aplikasi.
              </p>
            </div>
          ) : null}

          {draft ? (
            <PermissionMatrixTable
              permissions={draft}
              readOnly={activeRole?.isSystem}
              onToggle={toggle}
              onToggleModule={toggleModule}
              onToggleAction={toggleAction}
            />
          ) : (
            <Skeleton className="m-4 h-96" />
          )}
        </Panel>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="md"
        title="Tambah Peran Baru"
        description="Peran baru dibuat tanpa hak akses. Atur perizinan melalui matriks setelah peran tersimpan."
        dismissible={!createMutation.isPending}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Batal
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              disabled={newRole.name.trim().length < 3 || newRole.description.trim().length < 10}
              onClick={() => createMutation.mutate()}
            >
              Simpan peran
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nama Peran" htmlFor="roleName" required hint="Minimal 3 karakter">
            <TextInput
              id="roleName"
              placeholder="Tax Officer"
              value={newRole.name}
              onChange={(event) => setNewRole((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="Deskripsi" htmlFor="roleDescription" required hint="Minimal 10 karakter">
            <TextArea
              id="roleDescription"
              rows={3}
              placeholder="Jelaskan cakupan tanggung jawab peran ini"
              value={newRole.description}
              onChange={(event) => setNewRole((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
