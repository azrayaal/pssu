import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { expensesService } from '@/services/expenses.service';
import { cashBankService } from '@/services/cash-bank.service';
import { queryKeys } from '@/lib/query-keys';
import { expenseSchema, expenseDefaults, type ExpenseFormInput, type ExpenseFormValues } from '@/schemas/expense.schema';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { FileUpload } from '@/components/ui/FileUpload';
import { Skeleton } from '@/components/ui/States';
import { FormActions, FormErrorSummary, FormSection, FullWidth } from '@/components/forms/FormLayout';
import { formatCurrency } from '@/utils/format';
import { TODAY } from '@/utils/date';

export default function ExpenseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useDocumentTitle(isEdit ? 'Ubah Biaya' : 'Catat Biaya');

  const { data: categoryOptions } = useQuery({
    queryKey: queryKeys.expenseCategories.options,
    queryFn: expensesService.categoryOptions,
  });

  const { data: accountOptions } = useQuery({
    queryKey: queryKeys.bankAccounts.options,
    queryFn: cashBankService.accountOptions,
  });

  const { data: existing, isPending: loadingExisting } = useQuery({
    queryKey: queryKeys.expenses.detail(id ?? ''),
    queryFn: () => expensesService.get(id!),
    enabled: isEdit,
  });

  const form = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    mode: 'onBlur',
    defaultValues: { ...expenseDefaults, date: TODAY, reference: `RCP-${TODAY.replace(/-/g, '')}-001` },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      date: existing.date,
      categoryId: existing.categoryId,
      description: existing.description,
      amount: existing.amount,
      taxAmount: existing.taxAmount,
      paymentAccountId: existing.paymentAccountId,
      vendorName: existing.vendorName,
      reference: existing.reference,
      status: existing.status,
      notes: existing.notes,
      attachments: existing.attachments,
    });
  }, [existing, form]);

  const amount = Number(form.watch('amount') ?? 0);
  const taxAmount = Number(form.watch('taxAmount') ?? 0);

  const mutation = useMutation({
    mutationFn: ({ values, status }: { values: ExpenseFormValues; status: ExpenseFormValues['status'] }) =>
      isEdit ? expensesService.update(id!, { ...values, status }) : expensesService.create({ ...values, status }),
    onSuccess: (expense, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      toast.success(
        variables.status === 'Draft' ? 'Draft biaya tersimpan' : 'Pengajuan biaya terkirim',
        `${expense.number} · ${formatCurrency(expense.total)}`,
      );
      navigate(`/expenses/${expense.id}`);
    },
    onError: (error: Error) => toast.error('Biaya gagal disimpan', error.message),
  });

  const errors = form.formState.errors;
  const errorMessages = [
    errors.date?.message,
    errors.categoryId?.message,
    errors.description?.message,
    errors.amount?.message,
    errors.paymentAccountId?.message,
    errors.reference?.message,
  ].filter((message): message is string => Boolean(message));

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[28rem] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? `Ubah Biaya ${existing?.number ?? ''}` : 'Catat Biaya Operasional'}
        description="Lengkapi rincian pengeluaran beserta bukti pendukung sebelum diajukan untuk persetujuan."
        actions={
          <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
        }
      />

      <form onSubmit={(event) => event.preventDefault()}>
        <Panel>
          <FormErrorSummary messages={errorMessages} />

          <FormSection title="Rincian Biaya" description="Kategori menentukan akun buku besar yang dibebani pengeluaran ini." columns={3}>
            <Field label="Tanggal" htmlFor="expDate" required error={errors.date?.message}>
              <TextInput id="expDate" type="date" max={TODAY} invalid={Boolean(errors.date)} {...form.register('date')} />
            </Field>

            <Field label="Kategori Biaya" htmlFor="expCategory" required error={errors.categoryId?.message}>
              <SelectInput id="expCategory" invalid={Boolean(errors.categoryId)} {...form.register('categoryId')}>
                <option value="">Pilih kategori</option>
                {(categoryOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Nomor Referensi" htmlFor="expReference" required error={errors.reference?.message} hint="Nomor kuitansi atau bukti">
              <TextInput id="expReference" invalid={Boolean(errors.reference)} {...form.register('reference')} />
            </Field>

            <FullWidth>
              <Field label="Keterangan" htmlFor="expDescription" required error={errors.description?.message}>
                <TextInput
                  id="expDescription"
                  placeholder="Pembayaran tagihan listrik kantor pusat"
                  invalid={Boolean(errors.description)}
                  {...form.register('description')}
                />
              </Field>
            </FullWidth>

            <Field label="Nilai Biaya" htmlFor="expAmount" required error={errors.amount?.message}>
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput id="expAmount" value={Number(field.value ?? 0)} onValueChange={field.onChange} invalid={Boolean(errors.amount)} />
                )}
              />
            </Field>

            <Field label="PPN" htmlFor="expTax" error={errors.taxAmount?.message} hint="Kosongkan bila tidak dikenakan pajak">
              <Controller
                control={form.control}
                name="taxAmount"
                render={({ field }) => (
                  <CurrencyInput id="expTax" value={Number(field.value ?? 0)} onValueChange={field.onChange} />
                )}
              />
            </Field>

            <Field label="Total Dibebankan">
              <div className="flex h-[38px] items-center rounded-md border border-ink-200 bg-ink-50 px-3">
                <span className="tabular text-sm font-semibold text-ink-900">{formatCurrency(amount + taxAmount)}</span>
              </div>
            </Field>

            <Field label="Akun Pembayaran" htmlFor="expAccount" required error={errors.paymentAccountId?.message}>
              <SelectInput id="expAccount" invalid={Boolean(errors.paymentAccountId)} {...form.register('paymentAccountId')}>
                <option value="">Pilih akun pembayaran</option>
                {(accountOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Nama Pemasok" htmlFor="expVendor" error={errors.vendorName?.message} hint="Opsional">
              <TextInput id="expVendor" placeholder="PT PLN (Persero)" {...form.register('vendorName')} />
            </Field>
          </FormSection>

          <FormSection title="Bukti Pendukung" description="Unggah kuitansi, faktur pajak, atau bukti transfer sebagai lampiran." columns={1}>
            <Controller
              control={form.control}
              name="attachments"
              render={({ field }) => (
                <FileUpload attachments={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </FormSection>

          <FormSection title="Catatan Tambahan" description="Informasi lain yang perlu diketahui pemberi persetujuan." columns={1}>
            <Field label="Catatan" htmlFor="expNotes" error={errors.notes?.message}>
              <TextArea id="expNotes" rows={3} placeholder="Catatan verifikasi atau penjelasan pengeluaran" {...form.register('notes')} />
            </Field>
          </FormSection>

          <FormActions>
            <Button variant="outline" onClick={() => navigate(-1)} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button
              variant="outline"
              loading={mutation.isPending && mutation.variables?.status === 'Draft'}
              disabled={mutation.isPending || amount <= 0}
              onClick={form.handleSubmit((values) => mutation.mutate({ values, status: 'Draft' }))}
            >
              Simpan draft
            </Button>
            <Button
              variant="primary"
              loading={mutation.isPending && mutation.variables?.status === 'Submitted'}
              disabled={mutation.isPending || amount <= 0}
              onClick={form.handleSubmit((values) => mutation.mutate({ values, status: 'Submitted' }))}
            >
              Ajukan persetujuan
            </Button>
          </FormActions>
        </Panel>
      </form>
    </div>
  );
}
