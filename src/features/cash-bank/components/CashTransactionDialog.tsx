import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cashTransactionSchema,
  type CashTransactionFormInput,
  type CashTransactionFormValues,
} from '@/schemas/cash-transaction.schema';
import { cashBankService } from '@/services/cash-bank.service';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { TODAY } from '@/utils/date';

export function CashTransactionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data: bankOptions } = useQuery({
    queryKey: queryKeys.bankAccounts.options,
    queryFn: cashBankService.accountOptions,
    enabled: open,
  });

  const { data: glOptions } = useQuery({
    queryKey: queryKeys.accounts.options,
    queryFn: () => accountingService.accountOptions(),
    enabled: open,
  });

  const form = useForm<CashTransactionFormInput, unknown, CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionSchema),
    mode: 'onBlur',
    defaultValues: {
      date: TODAY,
      type: 'Income',
      bankAccountId: '',
      counterAccountId: '',
      transferToAccountId: '',
      amount: 0,
      reference: '',
      description: '',
    },
  });

  const type = form.watch('type');

  useEffect(() => {
    if (!open) return;
    form.reset({
      date: TODAY,
      type: 'Income',
      bankAccountId: bankOptions?.[0]?.value ?? '',
      counterAccountId: '',
      transferToAccountId: '',
      amount: 0,
      reference: `CASH-${TODAY.replace(/-/g, '')}-001`,
      description: '',
    });
  }, [open, bankOptions, form]);

  const mutation = useMutation({
    mutationFn: (values: CashTransactionFormValues) => cashBankService.createTransaction(values),
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cashTransactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts.all });
      toast.success('Transaksi tersimpan', `${transaction.reference} tercatat pada ${transaction.bankAccountName}.`);
      onClose();
    },
    onError: (error: Error) => toast.error('Transaksi gagal disimpan', error.message),
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Catat Transaksi Kas"
      description="Transaksi akan menambah atau mengurangi saldo rekening yang dipilih."
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button variant="primary" loading={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
            Simpan transaksi
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Tabs
              variant="segmented"
              value={field.value ?? 'Income'}
              onChange={field.onChange}
              items={[
                { value: 'Income', label: 'Penerimaan' },
                { value: 'Expense', label: 'Pengeluaran' },
                { value: 'Transfer', label: 'Transfer' },
              ]}
            />
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal" htmlFor="ctDate" required error={errors.date?.message}>
            <TextInput id="ctDate" type="date" max={TODAY} invalid={Boolean(errors.date)} {...form.register('date')} />
          </Field>

          <Field label="Nilai Transaksi" htmlFor="ctAmount" required error={errors.amount?.message}>
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  id="ctAmount"
                  value={Number(field.value ?? 0)}
                  onValueChange={field.onChange}
                  invalid={Boolean(errors.amount)}
                />
              )}
            />
          </Field>

          <Field
            label={type === 'Transfer' ? 'Rekening Asal' : 'Rekening'}
            htmlFor="ctBank"
            required
            error={errors.bankAccountId?.message}
          >
            <SelectInput id="ctBank" invalid={Boolean(errors.bankAccountId)} {...form.register('bankAccountId')}>
              <option value="">Pilih rekening</option>
              {(bankOptions ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          {type === 'Transfer' ? (
            <Field label="Rekening Tujuan" htmlFor="ctTarget" required error={errors.transferToAccountId?.message}>
              <SelectInput id="ctTarget" invalid={Boolean(errors.transferToAccountId)} {...form.register('transferToAccountId')}>
                <option value="">Pilih rekening tujuan</option>
                {(bankOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : (
            <Field
              label="Akun Lawan"
              htmlFor="ctCounter"
              required
              error={errors.counterAccountId?.message}
              hint={type === 'Income' ? 'Akun pendapatan atau piutang' : 'Akun beban atau utang'}
            >
              <SelectInput id="ctCounter" invalid={Boolean(errors.counterAccountId)} {...form.register('counterAccountId')}>
                <option value="">Pilih akun lawan</option>
                {(glOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}

          <div className="sm:col-span-2">
            <Field label="Nomor Referensi" htmlFor="ctReference" required error={errors.reference?.message}>
              <TextInput id="ctReference" invalid={Boolean(errors.reference)} {...form.register('reference')} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Keterangan" htmlFor="ctDescription" required error={errors.description?.message}>
              <TextArea
                id="ctDescription"
                rows={2}
                placeholder="Jelaskan tujuan transaksi kas ini"
                invalid={Boolean(errors.description)}
                {...form.register('description')}
              />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}
