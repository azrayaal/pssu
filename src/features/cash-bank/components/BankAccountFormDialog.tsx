import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BankAccount } from '@/types';
import {
  bankAccountSchema,
  bankAccountDefaults,
  type BankAccountFormInput,
  type BankAccountFormValues,
} from '@/schemas/bank-account.schema';
import { cashBankService } from '@/services/cash-bank.service';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

export function BankAccountFormDialog({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: BankAccount | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(account);

  const { data: glOptions } = useQuery({
    queryKey: [...queryKeys.accounts.options, 'cash'],
    queryFn: () => accountingService.accountOptions(),
    enabled: open,
  });

  const form = useForm<BankAccountFormInput, unknown, BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: bankAccountDefaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      account
        ? {
            name: account.name,
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            branch: account.branch,
            holderName: account.holderName,
            glAccountId: account.glAccountId,
            currency: account.currency,
            kind: account.kind,
            openingBalance: account.openingBalance,
            status: account.status,
          }
        : bankAccountDefaults,
    );
  }, [open, account, form]);

  const mutation = useMutation({
    mutationFn: (values: BankAccountFormValues) =>
      isEdit ? cashBankService.updateAccount(account!.id, values) : cashBankService.createAccount(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts.all });
      toast.success(isEdit ? 'Rekening diperbarui' : 'Rekening berhasil ditambahkan', saved.name);
      onClose();
    },
    onError: (error: Error) => toast.error('Rekening gagal disimpan', error.message),
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Ubah Rekening ${account?.name ?? ''}` : 'Tambah Rekening Kas atau Bank'}
      description="Setiap rekening harus dipetakan ke akun buku besar agar mutasi kas tercatat otomatis."
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button variant="primary" loading={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
            {isEdit ? 'Simpan perubahan' : 'Simpan rekening'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Nama Rekening" htmlFor="bname" required error={errors.name?.message}>
          <TextInput id="bname" placeholder="Bank Mandiri - Operasional" invalid={Boolean(errors.name)} {...form.register('name')} />
        </Field>
        <Field label="Jenis Rekening" htmlFor="bkind" required error={errors.kind?.message}>
          <SelectInput id="bkind" {...form.register('kind')}>
            <option value="Bank">Bank</option>
            <option value="Cash">Kas</option>
            <option value="E-Wallet">Dompet Digital</option>
            <option value="Virtual Account">Virtual Account</option>
          </SelectInput>
        </Field>
        <Field label="Nomor Rekening" htmlFor="baccount" required error={errors.accountNumber?.message}>
          <TextInput id="baccount" invalid={Boolean(errors.accountNumber)} {...form.register('accountNumber')} />
        </Field>
        <Field label="Nama Bank" htmlFor="bbank" required error={errors.bankName?.message}>
          <TextInput id="bbank" placeholder="Bank Central Asia" invalid={Boolean(errors.bankName)} {...form.register('bankName')} />
        </Field>
        <Field label="Cabang" htmlFor="bbranch" required error={errors.branch?.message}>
          <TextInput id="bbranch" invalid={Boolean(errors.branch)} {...form.register('branch')} />
        </Field>
        <Field label="Nama Pemilik" htmlFor="bholder" required error={errors.holderName?.message}>
          <TextInput id="bholder" invalid={Boolean(errors.holderName)} {...form.register('holderName')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Akun Buku Besar" htmlFor="bgl" required error={errors.glAccountId?.message}>
            <SelectInput id="bgl" invalid={Boolean(errors.glAccountId)} {...form.register('glAccountId')}>
              <option value="">Pilih akun buku besar</option>
              {(glOptions ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Mata Uang" htmlFor="bcurrency" required error={errors.currency?.message}>
          <SelectInput id="bcurrency" {...form.register('currency')}>
            <option value="IDR">IDR — Rupiah</option>
            <option value="USD">USD — Dolar Amerika</option>
            <option value="SGD">SGD — Dolar Singapura</option>
            <option value="EUR">EUR — Euro</option>
          </SelectInput>
        </Field>
        <Field label="Saldo Awal" htmlFor="bopening" error={errors.openingBalance?.message}>
          <Controller
            control={form.control}
            name="openingBalance"
            render={({ field }) => (
              <CurrencyInput id="bopening" value={Number(field.value ?? 0)} onValueChange={field.onChange} disabled={isEdit} />
            )}
          />
        </Field>
        <Field label="Status" htmlFor="bstatus">
          <SelectInput id="bstatus" {...form.register('status')}>
            <option value="Active">Aktif</option>
            <option value="Inactive">Nonaktif</option>
          </SelectInput>
        </Field>
      </form>
    </Modal>
  );
}
