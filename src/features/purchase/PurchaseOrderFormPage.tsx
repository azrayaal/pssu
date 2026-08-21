import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { purchaseService } from '@/services/purchase.service';
import { queryKeys } from '@/lib/query-keys';
import { emptyLineItem } from '@/schemas/invoice.schema';
import {
  purchaseOrderSchema,
  type PurchaseOrderFormInput,
  type PurchaseOrderFormValues,
} from '@/schemas/purchase-order.schema';
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

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useDocumentTitle(isEdit ? 'Ubah Pesanan' : 'Pesanan Baru');

  const { data: vendorOptions } = useQuery({
    queryKey: queryKeys.vendors.options,
    queryFn: purchaseService.vendorOptions,
  });

  const { data: existing, isPending: loadingExisting } = useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id ?? ''),
    queryFn: () => purchaseService.getPurchaseOrder(id!),
    enabled: isEdit,
  });

  const form = useForm<PurchaseOrderFormInput, unknown, PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    mode: 'onBlur',
    defaultValues: {
      vendorId: searchParams.get('vendorId') ?? '',
      date: TODAY,
      expectedDate: format(addDays(parseISO(TODAY), 14), 'yyyy-MM-dd'),
      reference: '',
      notes: '',
      status: 'Draft',
      items: [{ ...emptyLineItem }],
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      vendorId: existing.vendorId,
      date: existing.date,
      expectedDate: existing.expectedDate,
      reference: existing.reference,
      notes: existing.notes,
      status: existing.status,
      items: existing.items.map((item) => ({ ...item })),
    });
  }, [existing, form]);

  const items = form.watch('items') ?? [];
  // Derived during render: form.watch() mutates its array in place, so a
  // useMemo keyed on it would never recompute.
  const totals = computeTotals(items);

  const mutation = useMutation({
    mutationFn: ({ values, status }: { values: PurchaseOrderFormValues; status: PurchaseOrderFormValues['status'] }) =>
      isEdit
        ? purchaseService.updatePurchaseOrder(id!, { ...values, status })
        : purchaseService.createPurchaseOrder({ ...values, status }),
    onSuccess: (order, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      toast.success(
        variables.status === 'Draft' ? 'Draft pesanan tersimpan' : 'Pesanan diajukan',
        `${order.number} · ${order.vendorName}`,
      );
      navigate(`/purchase/orders/${order.id}`);
    },
    onError: (error: Error) => toast.error('Pesanan gagal disimpan', error.message),
  });

  const errors = form.formState.errors;
  const errorMessages = [
    errors.vendorId?.message,
    errors.date?.message,
    errors.expectedDate?.message,
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
        title={isEdit ? `Ubah Pesanan ${existing?.number ?? ''}` : 'Pesanan Pembelian Baru'}
        description="Pesanan yang diajukan akan menunggu persetujuan sebelum dikirim kepada pemasok."
        actions={
          <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
        }
      />

      <form onSubmit={(event) => event.preventDefault()}>
        <Panel>
          <FormErrorSummary messages={errorMessages} />

          <FormSection title="Informasi Pesanan" description="Tentukan pemasok dan target penerimaan barang atau jasa." columns={3}>
            <Field label="Pemasok" htmlFor="vendorId" required error={errors.vendorId?.message}>
              <SelectInput id="vendorId" invalid={Boolean(errors.vendorId)} {...form.register('vendorId')}>
                <option value="">Pilih pemasok</option>
                {(vendorOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Tanggal Pesanan" htmlFor="poDate" required error={errors.date?.message}>
              <TextInput id="poDate" type="date" invalid={Boolean(errors.date)} {...form.register('date')} />
            </Field>

            <Field label="Target Penerimaan" htmlFor="expectedDate" required error={errors.expectedDate?.message}>
              <TextInput id="expectedDate" type="date" invalid={Boolean(errors.expectedDate)} {...form.register('expectedDate')} />
            </Field>

            <Field label="Nomor Referensi" htmlFor="poReference" error={errors.reference?.message} hint="Nomor permintaan pembelian">
              <TextInput id="poReference" placeholder="PR-2026-0001" {...form.register('reference')} />
            </Field>

            <FullWidth>
              <Field label="Catatan" htmlFor="poNotes" error={errors.notes?.message}>
                <TextArea id="poNotes" rows={2} placeholder="Instruksi pengiriman atau syarat khusus" {...form.register('notes')} />
              </Field>
            </FullWidth>
          </FormSection>

          <LineItemsEditor
            control={form.control}
            register={form.register}
            errors={errors}
            items={items}
            totals={totals}
            title="Rincian Pengadaan"
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
              loading={mutation.isPending && mutation.variables?.status === 'Awaiting Approval'}
              disabled={mutation.isPending || totals.total <= 0}
              onClick={form.handleSubmit((values) => mutation.mutate({ values, status: 'Awaiting Approval' }))}
            >
              Ajukan persetujuan
            </Button>
          </FormActions>
        </Panel>
      </form>
    </div>
  );
}
