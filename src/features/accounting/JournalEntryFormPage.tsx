import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { journalSchema, type JournalFormInput, type JournalFormValues } from '@/schemas/journal.schema';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { FormActions, FormErrorSummary, FormSection, FullWidth } from '@/components/forms/FormLayout';
import { Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/utils/format';
import { TODAY } from '@/utils/date';

const emptyLine = { accountId: '', description: '', debit: 0, credit: 0 };

export default function JournalEntryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useDocumentTitle(isEdit ? 'Ubah Jurnal' : 'Jurnal Baru');

  const { data: accountOptions } = useQuery({
    queryKey: queryKeys.accounts.options,
    queryFn: () => accountingService.accountOptions(),
  });

  const { data: existing, isPending: loadingExisting } = useQuery({
    queryKey: queryKeys.journals.detail(id ?? ''),
    queryFn: () => accountingService.getJournal(id!),
    enabled: isEdit,
  });

  const form = useForm<JournalFormInput, unknown, JournalFormValues>({
    resolver: zodResolver(journalSchema),
    mode: 'onBlur',
    defaultValues: {
      date: TODAY,
      reference: '',
      memo: '',
      status: 'Draft',
      lines: [{ ...emptyLine }, { ...emptyLine }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      date: existing.date,
      reference: existing.reference,
      memo: existing.memo,
      status: existing.status === 'Posted' ? 'Posted' : 'Draft',
      lines: existing.lines.map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      })),
    });
  }, [existing, form]);

  const lines = form.watch('lines') ?? [];
  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line?.debit) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line?.credit) || 0), 0);
    return { debit, credit, difference: debit - credit };
  }, [lines]);

  const balanced = totals.difference === 0 && totals.debit > 0;

  const mutation = useMutation({
    mutationFn: ({ values, status }: { values: JournalFormValues; status: 'Draft' | 'Posted' }) =>
      isEdit
        ? accountingService.updateJournal(id!, { ...values, status })
        : accountingService.createJournal({ ...values, status }),
    onSuccess: (journal, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success(
        variables.status === 'Posted' ? 'Jurnal diposting' : 'Draft jurnal tersimpan',
        `${journal.number} · ${formatCurrency(journal.totalDebit)}`,
      );
      navigate(`/accounting/journal-entries/${journal.id}`);
    },
    onError: (error: Error) => toast.error('Jurnal gagal disimpan', error.message),
  });

  const submit = (status: 'Draft' | 'Posted') =>
    form.handleSubmit((values) => mutation.mutate({ values, status }))();

  const errors = form.formState.errors;
  const errorMessages = [
    errors.date?.message,
    errors.reference?.message,
    errors.memo?.message,
    errors.lines?.message ?? errors.lines?.root?.message,
  ].filter((message): message is string => Boolean(message));

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isEdit && existing && existing.status !== 'Draft') {
    return (
      <div className="space-y-5">
        <PageHeader title="Jurnal tidak dapat diubah" />
        <Panel>
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-ink-600">
              Jurnal <strong>{existing.number}</strong> berstatus {existing.status} sehingga tidak dapat diubah.
            </p>
            <Button
              className="mt-4"
              variant="primary"
              onClick={() => navigate(`/accounting/journal-entries/${existing.id}`)}
            >
              Lihat detail jurnal
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? `Ubah Jurnal ${existing?.number ?? ''}` : 'Jurnal Umum Baru'}
        description="Setiap jurnal harus memiliki total debit dan kredit yang seimbang sebelum dapat disimpan."
        actions={
          <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
        }
      />

      <form onSubmit={(event) => event.preventDefault()}>
        <Panel>
          <FormErrorSummary messages={errorMessages} />

          <FormSection
            title="Informasi Jurnal"
            description="Tanggal jurnal menentukan periode pelaporan tempat transaksi diakui."
            columns={3}
          >
            <Field label="Tanggal Jurnal" htmlFor="date" required error={errors.date?.message}>
              <TextInput id="date" type="date" max={TODAY} invalid={Boolean(errors.date)} {...form.register('date')} />
            </Field>

            <Field label="Nomor Referensi" htmlFor="reference" required error={errors.reference?.message}>
              <TextInput
                id="reference"
                placeholder="ADJ-20260821"
                invalid={Boolean(errors.reference)}
                {...form.register('reference')}
              />
            </Field>

            <Field label="Status Awal" htmlFor="status">
              <SelectInput id="status" {...form.register('status')}>
                <option value="Draft">Simpan sebagai draft</option>
                <option value="Posted">Langsung diposting</option>
              </SelectInput>
            </Field>

            <FullWidth>
              <Field label="Keterangan" htmlFor="memo" required error={errors.memo?.message}>
                <TextArea
                  id="memo"
                  rows={2}
                  placeholder="Jelaskan tujuan pencatatan jurnal ini"
                  invalid={Boolean(errors.memo)}
                  {...form.register('memo')}
                />
              </Field>
            </FullWidth>
          </FormSection>

          <div>
            <PanelHeader
              compact
              className="border-t"
              title="Baris Jurnal"
              description="Isi salah satu kolom debit atau kredit pada setiap baris."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={<Plus className="size-3.5" />}
                  onClick={() => append({ ...emptyLine })}
                >
                  Tambah baris
                </Button>
              }
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] border-collapse text-sm">
                <thead className="bg-ink-50">
                  <tr className="border-b border-ink-200">
                    <th className="w-10 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      #
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      Akun
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      Keterangan
                    </th>
                    <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      Debit
                    </th>
                    <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      Kredit
                    </th>
                    <th className="w-12 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {fields.map((field, index) => {
                    const lineError = errors.lines?.[index];
                    return (
                      <tr key={field.id} className="align-top">
                        <td className="tabular px-4 py-2.5 text-ink-400">{index + 1}</td>
                        <td className="px-4 py-2.5">
                          <SelectInput
                            aria-label={`Akun baris ${index + 1}`}
                            invalid={Boolean(lineError?.accountId)}
                            {...form.register(`lines.${index}.accountId` as const)}
                          >
                            <option value="">Pilih akun</option>
                            {(accountOptions ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SelectInput>
                          {lineError?.accountId ? (
                            <p className="mt-1 text-xs text-negative-600">{lineError.accountId.message}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5">
                          <TextInput
                            aria-label={`Keterangan baris ${index + 1}`}
                            placeholder="Keterangan baris"
                            {...form.register(`lines.${index}.description` as const)}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <Controller
                            control={form.control}
                            name={`lines.${index}.debit` as const}
                            render={({ field: debitField }) => (
                              <CurrencyInput
                                aria-label={`Debit baris ${index + 1}`}
                                value={Number(debitField.value ?? 0)}
                                onValueChange={(value) => {
                                  debitField.onChange(value);
                                  if (value > 0) form.setValue(`lines.${index}.credit` as const, 0);
                                }}
                                invalid={Boolean(lineError?.debit)}
                              />
                            )}
                          />
                          {lineError?.debit ? (
                            <p className="mt-1 text-xs text-negative-600">{lineError.debit.message}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5">
                          <Controller
                            control={form.control}
                            name={`lines.${index}.credit` as const}
                            render={({ field: creditField }) => (
                              <CurrencyInput
                                aria-label={`Kredit baris ${index + 1}`}
                                value={Number(creditField.value ?? 0)}
                                onValueChange={(value) => {
                                  creditField.onChange(value);
                                  if (value > 0) form.setValue(`lines.${index}.debit` as const, 0);
                                }}
                                invalid={Boolean(lineError?.credit)}
                              />
                            )}
                          />
                          {lineError?.credit ? (
                            <p className="mt-1 text-xs text-negative-600">{lineError.credit.message}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={fields.length <= 2}
                            aria-label={`Hapus baris ${index + 1}`}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-3.5 text-ink-400" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-[13px] font-semibold text-ink-700">
                      Total
                    </td>
                    <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                      {formatCurrency(totals.debit, 'IDR', { withSymbol: false })}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                      {formatCurrency(totals.credit, 'IDR', { withSymbol: false })}
                    </td>
                    <td />
                  </tr>
                  <tr className="border-t border-ink-200">
                    <td colSpan={3} className="px-4 py-3 text-right text-[13px] font-semibold text-ink-700">
                      Selisih
                    </td>
                    <td
                      colSpan={2}
                      className={cn(
                        'tabular px-4 py-3 text-right text-[13px] font-semibold',
                        balanced ? 'text-positive-700' : 'text-negative-700',
                      )}
                    >
                      {formatCurrency(totals.difference, 'IDR', { withSymbol: false })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <FormActions>
            <div className="mr-auto flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
                  balanced
                    ? 'border-positive-100 bg-positive-50 text-positive-700'
                    : 'border-caution-100 bg-caution-50 text-caution-700',
                )}
              >
                {balanced ? 'Jurnal seimbang' : 'Debit dan kredit belum seimbang'}
              </span>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button
              variant="outline"
              disabled={!balanced || mutation.isPending}
              loading={mutation.isPending && mutation.variables?.status === 'Draft'}
              onClick={() => submit('Draft')}
            >
              Simpan draft
            </Button>
            <Button
              variant="primary"
              disabled={!balanced || mutation.isPending}
              loading={mutation.isPending && mutation.variables?.status === 'Posted'}
              onClick={() => submit('Posted')}
            >
              Simpan dan posting
            </Button>
          </FormActions>
        </Panel>
      </form>
    </div>
  );
}
