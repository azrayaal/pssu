import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import { userSchema, userDefaults, type UserFormInput, type UserFormValues } from '@/schemas/user.schema';
import { administrationService } from '@/services/administration.service';
import { queryKeys } from '@/lib/query-keys';
import { ApiError } from '@/lib/api-error';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextInput } from '@/components/ui/Field';

const DEPARTMENTS = [
  'Keuangan',
  'Akuntansi',
  'Penjualan',
  'Pembelian',
  'Teknologi Informasi',
  'Audit Internal',
  'Operasional',
];

export function UserFormDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(user);

  const { data: roles } = useQuery({
    queryKey: queryKeys.roles.list,
    queryFn: administrationService.listRoles,
    enabled: open,
  });

  const form = useForm<UserFormInput, unknown, UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: userDefaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      user
        ? {
            name: user.name,
            email: user.email,
            phone: user.phone,
            roleId: user.roleId,
            department: user.department,
            jobTitle: user.jobTitle,
            status: user.status,
          }
        : userDefaults,
    );
  }, [open, user, form]);

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      isEdit ? administrationService.updateUser(user!.id, values) : administrationService.createUser(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      toast.success(isEdit ? 'Data pengguna diperbarui' : 'Pengguna berhasil ditambahkan', saved.name);
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          form.setError(field as keyof UserFormInput, { message: messages[0] });
        }
      }
      toast.error('Data pengguna gagal disimpan', error instanceof Error ? error.message : undefined);
    },
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? `Ubah Pengguna ${user?.name ?? ''}` : 'Tambah Pengguna'}
      description="Peran menentukan modul dan tindakan yang dapat diakses pengguna pada sistem."
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button variant="primary" loading={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
            {isEdit ? 'Simpan perubahan' : 'Simpan pengguna'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="sm:col-span-2">
          <Field label="Nama Lengkap" htmlFor="uname" required error={errors.name?.message}>
            <TextInput id="uname" placeholder="Dewi Kartika Sari" invalid={Boolean(errors.name)} {...form.register('name')} />
          </Field>
        </div>
        <Field label="Email" htmlFor="uemail" required error={errors.email?.message}>
          <TextInput id="uemail" type="email" placeholder="nama@pssu.co.id" invalid={Boolean(errors.email)} {...form.register('email')} />
        </Field>
        <Field label="Telepon" htmlFor="uphone" required error={errors.phone?.message}>
          <TextInput id="uphone" placeholder="0812-3456-7890" invalid={Boolean(errors.phone)} {...form.register('phone')} />
        </Field>
        <Field label="Peran" htmlFor="urole" required error={errors.roleId?.message}>
          <SelectInput id="urole" invalid={Boolean(errors.roleId)} {...form.register('roleId')}>
            <option value="">Pilih peran</option>
            {(roles ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Departemen" htmlFor="udept" required error={errors.department?.message}>
          <SelectInput id="udept" invalid={Boolean(errors.department)} {...form.register('department')}>
            <option value="">Pilih departemen</option>
            {DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Jabatan" htmlFor="ujob" required error={errors.jobTitle?.message}>
          <TextInput id="ujob" placeholder="Finance Manager" invalid={Boolean(errors.jobTitle)} {...form.register('jobTitle')} />
        </Field>
        <Field label="Status" htmlFor="ustatus">
          <SelectInput id="ustatus" {...form.register('status')}>
            <option value="Active">Aktif</option>
            <option value="Inactive">Nonaktif</option>
          </SelectInput>
        </Field>
      </form>
    </Modal>
  );
}
