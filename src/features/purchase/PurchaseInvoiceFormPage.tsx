import { useEffect, useMemo } from 'react';
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
  purchaseInvoiceSchema,
  type PurchaseInvoiceFormInput,
  type PurchaseInvoiceFormValues,
} from '@/schemas/purchase-invoice.schema';
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

export default function PurchaseInvoiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useDocumentTitle(isEdit ? 'Ubah Tagihan' : 'Tagihan Baru');

  const { data: vendorOptions } = useQuery({
    queryKey: queryKeys.vendors.options,
    queryFn: purchaseService.vendorOptions,
  });

  const { data: existing, isPending: loadingExisting } = useQuery({
    queryKey: queryKeys.purchaseInvoices.detail(id ?? ''),
    queryFn: () => purchaseService.getPurchaseInvoice(id!),
    enabled: isEdit,
  });

  const form = useForm<PurchaseInvoiceFormInput, unknown, PurchaseInvoiceFormValues>({
    resolver: zodResolver(purchaseInvoiceSchema),
    mode: 'onBlur',
    defaultValues: {
      vendorId: searchParams.get('vendorId') ?? '',
      vendorInvoiceNumber: '',
      purchaseOrderId: null,
      date: TODAY,
      dueDate: format(addDays(parseISO(TODAY), 30), 'yyyy-MM-dd'),
      reference: '',
      notes: '',
      status: 'Draft',
      items: [{ ...emptyLineItem }],
    },
  });

  const vendorId = form.watch('vendorId');

  const { data: vendorOrders } = useQuery({
    queryKey: queryKeys.purchaseOrders.list({ vendorId, pageSize: 50 }),
    queryFn: () => purchaseService.listPurchaseOrders({ vendorId, pageSize: 50 }),
    enabled: Boolean(vendorId),
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      vendorId: existing.vendorId,
      vendorInvoiceNumber: existing.vendorInvoiceNumber,
      purchaseOrderId: existing.purchaseOrderId,
      date: existing.date,
      dueDate: existing.dueDate,
      reference: existing.reference,
      notes: existing.notes,
      status: existing.status,
      items: existing.items.map((item) => ({ ...item })),
    });
  }, [existing, form]);

  const items = form.watch('items') ?? [];
  const totals = useMemo(() => computeTotals(items), [items]);

  const mutation = useMutation({
    mutationFn: ({ values, status }: { values: PurchaseInvoiceFormValues; status: PurchaseInvoiceFormValues['status'] }) =>
      isEdit
        ? purchaseService.updatePurchaseInvoice(id!, { ...values, status })
        : purchaseService.createPurchaseInvoice({ ...values, status }),
    onSuccess: (bill, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseInvoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      toast.success(
        variables.status === 'Draft' ? 'Draft tagihan tersimpan' : 'Tagihan dicatat',
        `${bill.number} · ${bill.vendorName}`,
      );
      navigate(`/purchase/invoices/${bill.id}`);
    },
    onError: (error: Error) => toast.error('Tagihan gagal disimpan', error.message),
  });

  const errors = form.formState.errors;
  const errorMessages = [
    errors.vendorId?.message,
    errors.vendorInvoiceNumber?.message,
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
        title={isEdit ? `Ubah Tagihan ${existing?.number ?? ''}` : 'Faktur Pembelian Baru'}
        description="Catat tagihan pemasok dan hubungkan dengan pesanan pembelian yang telah diterbitkan."
        actions={
          <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
        }
      />

      <form onSubmit={(event) => event.preventDefault()}>
        <Panel>
          <FormErrorSummary messages={errorMessages} />

          <FormSection title="Informasi Tagihan" description="Nomor faktur pemasok wajib dicatat untuk kepentingan rekonsiliasi pajak masukan." columns={3}>
            <Field label="Pemasok" htmlFor="billVendor" required error={errors.vendorId?.message}>
              <SelectInput id="billVendor" invalid={Boolean(errors.vendorId)} {...form.register('vendorId')}>
                <option value="">Pilih pemasok</option>
                {(vendorOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Nomor Faktur Pemasok" htmlFor="vendorInvoiceNumber" required error={errors.vendorInvoiceNumber?.message}>
              <TextInput
                id="vendorInvoiceNumber"
                placeholder="FK0001/2026/00123"
                invalid={Boolean(errors.vendorInvoiceNumber)}
                {...form.register('vendorInvoiceNumber')}
              />
            </Field>

            <Field label="Pesanan Terkait" htmlFor="purchaseOrderId" hint="Opsional, untuk menautkan ke pesanan">
              <SelectInput id="purchaseOrderId" {...form.register('purchaseOrderId')}>
                <option value="">Tanpa pesanan</option>
                {(vendorOrders?.data ?? []).map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.number}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Tanggal Tagihan" htmlFor="billDate" required error={errors.date?.message}>
              <TextInput id="billDate" type="date" invalid={Boolean(errors.date)} {...form.register('date')} />
            </Field>

            <Field label="Jatuh Tempo" htmlFor="billDueDate" required error={errors.dueDate?.message}>
              <TextInput id="billDueDate" type="date" invalid={Boolean(errors.dueDate)} {...form.register('dueDate')} />
            </Field>

            <Field label="Nomor Referensi" htmlFor="billReference" error={errors.reference?.message}>
              <TextInput id="billReference" placeholder="PR-2026-0001" {...form.register('reference')} />
            </Field>

            <FullWidth>
              <Field label="Catatan" htmlFor="billNotes" error={errors.notes?.message}>
                <TextArea id="billNotes" rows={2} placeholder="Catatan verifikasi atau instruksi pembayaran" {...form.register('notes')} />
              </Field>
            </FullWidth>
          </FormSection>

          <LineItemsEditor
            control={form.control}
            register={form.register}
            errors={errors}
            items={items}
            totals={totals}
            title="Rincian Tagihan"
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
              loading={mutation.isPending && mutation.variables?.status === 'Awaiting Payment'}
              disabled={mutation.isPending || totals.total <= 0}
              onClick={form.handleSubmit((values) => mutation.mutate({ values, status: 'Awaiting Payment' }))}
            >
              Catat tagihan
            </Button>
          </FormActions>
        </Panel>
      </form>
    </div>
  );
}
