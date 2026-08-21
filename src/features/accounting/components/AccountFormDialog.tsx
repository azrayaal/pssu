import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Account } from '@/types';
import { ACCOUNT_TYPES } from '@/types';
import {
  accountSchema,
  accountDefaults,
  SUBTYPES_BY_TYPE,
  type AccountFormInput,
  type AccountFormValues,
} from '@/schemas/account.schema';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { ApiError } from '@/lib/api-error';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

export function AccountFormDialog({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: Account | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(account);

  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: accountDefaults,
    mode: 'onBlur',
  });

  const { data: parentOptions } = useQuery({
    queryKey: [...queryKeys.accounts.options, 'parents'],
    queryFn: () => accountingService.accountOptions({ postableOnly: 'false', includeInactive: 'true' }),
    enabled: open,
  });

  const selectedType = form.watch('type');

  useEffect(() => {
    if (!open) return;
    form.reset(
      account
        ? {
            code: account.code,
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            parentId: account.parentId,
            openingBalance: account.openingBalance,
            status: account.status,
            description: account.description,
          }
        : accountDefaults,
    );
  }, [open, account, form]);

  useEffect(() => {
    const allowed = SUBTYPES_BY_TYPE[selectedType];
    if (!allowed.includes(form.getValues('subtype'))) {
      form.setValue('subtype', allowed[0] as AccountFormValues['subtype']);
    }
  }, [selectedType, form]);

  const mutation = useMutation({
    mutationFn: (values: AccountFormValues) =>
      isEdit ? accountingService.updateAccount(account!.id, values) : accountingService.createAccount(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success(
        isEdit ? 'Akun diperbarui' : 'Akun berhasil dibuat',
        `${saved.code} · ${saved.name} tersimpan pada bagan akun.`,
      );
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          form.setError(field as keyof AccountFormInput, { message: messages[0] });
        }
      }
      toast.error('Akun gagal disimpan', error instanceof Error ? error.message : undefined);
    },
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Ubah Akun ${account?.code}` : 'Tambah Akun Baru'}
      description="Akun akan langsung tersedia untuk pencatatan jurnal setelah disimpan."
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button
            variant="primary"
            loading={mutation.isPending}
            disabled={!form.formState.isDirty && isEdit}
            onClick={form.handleSubmit((values) => mutation.mutate(values))}
          >
            {isEdit ? 'Simpan perubahan' : 'Simpan akun'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Kode Akun" htmlFor="code" required error={errors.code?.message} hint="Format 1-1101">
          <TextInput
            id="code"
            placeholder="1-1101"
            invalid={Boolean(errors.code)}
            disabled={account?.isSystem}
            {...form.register('code')}
          />
        </Field>

        <Field label="Nama Akun" htmlFor="name" required error={errors.name?.message}>
          <TextInput id="name" placeholder="Kas Kecil" invalid={Boolean(errors.name)} {...form.register('name')} />
        </Field>

        <Field label="Tipe Akun" htmlFor="type" required error={errors.type?.message}>
          <SelectInput id="type" invalid={Boolean(errors.type)} {...form.register('type')}>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Kelompok Akun" htmlFor="subtype" required error={errors.subtype?.message}>
          <SelectInput id="subtype" invalid={Boolean(errors.subtype)} {...form.register('subtype')}>
            {SUBTYPES_BY_TYPE[selectedType].map((subtype) => (
              <option key={subtype} value={subtype}>
                {subtype}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field
          label="Akun Induk"
          htmlFor="parentId"
          error={errors.parentId?.message}
          hint="Kosongkan untuk membuat akun tingkat teratas"
        >
          <Controller
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <SelectInput
                id="parentId"
                value={field.value ?? ''}
                onChange={(event) => field.onChange(event.target.value || null)}
              >
                <option value="">Tanpa akun induk</option>
                {(parentOptions ?? [])
                  .filter((option) => option.value !== account?.id)
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </SelectInput>
            )}
          />
        </Field>

        <Field label="Saldo Awal" htmlFor="openingBalance" error={errors.openingBalance?.message}>
          <Controller
            control={form.control}
            name="openingBalance"
            render={({ field }) => (
              <CurrencyInput
                id="openingBalance"
                value={field.value ?? 0}
                onValueChange={field.onChange}
                disabled={isEdit && account?.isSystem}
              />
            )}
          />
        </Field>

        <Field label="Status" htmlFor="status" error={errors.status?.message}>
          <SelectInput id="status" {...form.register('status')}>
            <option value="Active">Aktif</option>
            <option value="Inactive">Nonaktif</option>
          </SelectInput>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Keterangan" htmlFor="description" error={errors.description?.message}>
            <TextArea
              id="description"
              rows={3}
              placeholder="Jelaskan penggunaan akun ini bagi tim akuntansi"
              {...form.register('description')}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
