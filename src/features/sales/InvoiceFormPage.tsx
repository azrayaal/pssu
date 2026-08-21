import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { salesService } from '@/services/sales.service';
import { queryKeys } from '@/lib/query-keys';
import { invoiceSchema, emptyLineItem, type InvoiceFormInput, type InvoiceFormValues } from '@/schemas/invoice.schema';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/States';
import { FormActions, FormErrorSummary, FormSection, FullWidth } from '@/components/forms/FormLayout';
import { LineItemsEditor, computeTotals } from '@/components/forms/LineItemsEditor';
import { TODAY } from '@/utils/date';

export default function InvoiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useDocumentTitle(isEdit ? 'Ubah Faktur' : 'Faktur Baru');

  const { data: customerOptions } = useQuery({
    queryKey: queryKeys.customers.options,
    queryFn: salesService.customerOptions,
  });

  const { data: existing, isPending: loadingExisting } = useQuery({
    queryKey: queryKeys.invoices.detail(id ?? ''),
    queryFn: () => salesService.getInvoice(id!),
    enabled: isEdit,
  });

  const form = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    mode: 'onBlur',
    defaultValues: {
      customerId: searchParams.get('customerId') ?? '',
      date: TODAY,
      dueDate: format(addDays(parseISO(TODAY), 30), 'yyyy-MM-dd'),
      reference: '',
      terms: 'Net 30 hari sejak tanggal faktur',
      notes: '',
      status: 'Draft',
      items: [{ ...emptyLineItem }],
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      customerId: existing.customerId,
      date: existing.date,
      dueDate: existing.dueDate,
      reference: existing.reference,
      terms: existing.terms,
      notes: existing.notes,
      status: existing.status,
      items: existing.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxPercent: item.taxPercent,
        amount: item.amount,
      })),
    });
  }, [existing, form]);

  const items = form.watch('items') ?? [];
  const totals = useMemo(() => computeTotals(items), [items]);

  const mutation = useMutation({
    mutationFn: ({ values, status }: { values: InvoiceFormValues; status: InvoiceFormValues['status'] }) =>
      isEdit
        ? salesService.updateInvoice(id!, { ...values, status })
        : salesService.createInvoice({ ...values, status }),
    onSuccess: (invoice, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success(
        variables.status === 'Draft' ? 'Draft faktur tersimpan' : 'Faktur diterbitkan',
        `${invoice.number} · ${invoice.customerName}`,
      );
      navigate(`/sales/invoices/${invoice.id}`);
    },
    onError: (error: Error) => toast.error('Faktur gagal disimpan', error.message),
  });

  const errors = form.formState.errors;
  const errorMessages = [
    errors.customerId?.message,
    errors.date?.message,
    errors.dueDate?.message,
    errors.items?.message ?? errors.items?.root?.message,
  ].filter((message): message is string => Boolean(message));

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? `Ubah Faktur ${existing?.number ?? ''}` : 'Faktur Penjualan Baru'}
        description="Nilai faktur dihitung otomatis dari rincian item, diskon per baris, dan PPN."
        actions={
          <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
        }
      />

      <form onSubmit={(event) => event.preventDefault()}>
        <Panel>
          <FormErrorSummary messages={errorMessages} />

          <FormSection title="Informasi Faktur" description="Pelanggan dan termin menentukan tanggal jatuh tempo penagihan." columns={3}>
            <Field label="Pelanggan" htmlFor="customerId" required error={errors.customerId?.message}>
              <SelectInput id="customerId" invalid={Boolean(errors.customerId)} {...form.register('customerId')}>
                <option value="">Pilih pelanggan</option>
                {(customerOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Tanggal Faktur" htmlFor="date" required error={errors.date?.message}>
              <TextInput id="date" type="date" invalid={Boolean(errors.date)} {...form.register('date')} />
            </Field>

            <Field label="Jatuh Tempo" htmlFor="dueDate" required error={errors.dueDate?.message}>
              <TextInput id="dueDate" type="date" invalid={Boolean(errors.dueDate)} {...form.register('dueDate')} />
            </Field>

            <Field label="Nomor Referensi" htmlFor="reference" error={errors.reference?.message} hint="Nomor pesanan atau kontrak">
              <TextInput id="reference" placeholder="SO-2026-0001" {...form.register('reference')} />
            </Field>

            <Field label="Termin Pembayaran" htmlFor="terms" error={errors.terms?.message}>
              <TextInput id="terms" {...form.register('terms')} />
            </Field>

            <Field label="Status" htmlFor="status">
              <SelectInput id="status" {...form.register('status')}>
                <option value="Draft">Draft</option>
                <option value="Sent">Terkirim</option>
              </SelectInput>
            </Field>

            <FullWidth>
              <Field label="Catatan" htmlFor="notes" error={errors.notes?.message}>
                <TextArea id="notes" rows={2} placeholder="Instruksi pembayaran atau catatan untuk pelanggan" {...form.register('notes')} />
              </Field>
            </FullWidth>
          </FormSection>

          <LineItemsEditor
            control={form.control}
            register={form.register}
            errors={errors}
            items={items}
            totals={totals}
            rootError={errors.items?.message ?? errors.items?.root?.message}
          />

          <FormActions>
            <Button variant="outline" onClick={() => navigate(-1)} disabled={mutation.isPending}>
              Batal
            </Button>
            <Button
              variant="outline"
              loading={mutation.isPending && mutation.variables?.status === 'Draft'}
              disabled={mutation.isPending || totals.total <= 0}
              onClick={form.handleSubmit((values) => mutation.mutate({ values, status: 'Draft' }))}
            >
              Simpan draft
            </Button>
            <Button
              variant="primary"
              loading={mutation.isPending && mutation.variables?.status === 'Sent'}
              disabled={mutation.isPending || totals.total <= 0}
              onClick={form.handleSubmit((values) => mutation.mutate({ values, status: 'Sent' }))}
            >
              Terbitkan faktur
            </Button>
          </FormActions>
        </Panel>
      </form>
    </div>
  );
}
