import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Invoice, PurchaseInvoice } from '@/types';
import { paymentSchema, type PaymentFormInput, type PaymentFormValues } from '@/schemas/payment.schema';
import { salesService } from '@/services/sales.service';
import { purchaseService } from '@/services/purchase.service';
import { cashBankService } from '@/services/cash-bank.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/utils/format';
import { TODAY } from '@/utils/date';

export interface PaymentDialogProps {
  mode: 'receipt' | 'payment';
  documentId: string | null;
  documentNumber: string;
  partyName: string;
  outstanding: number;
  onClose: () => void;
}

export function PaymentDialog({
  mode,
  documentId,
  documentNumber,
  partyName,
  outstanding,
  onClose,
}: PaymentDialogProps) {
  const queryClient = useQueryClient();
  const isReceipt = mode === 'receipt';

  const { data: bankOptions } = useQuery({
    queryKey: queryKeys.bankAccounts.options,
    queryFn: cashBankService.accountOptions,
    enabled: Boolean(documentId),
  });

  const form = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    mode: 'onBlur',
    defaultValues: {
      date: TODAY,
      amount: 0,
      method: 'Bank Transfer',
      accountName: '',
      reference: '',
    },
  });

  useEffect(() => {
    if (!documentId) return;
    form.reset({
      date: TODAY,
      amount: outstanding,
      method: 'Bank Transfer',
      accountName: bankOptions?.[0]?.label ?? '',
      reference: `${isReceipt ? 'TRF' : 'PAY'}-${TODAY.replace(/-/g, '')}-${documentNumber.slice(-4)}`,
    });
  }, [documentId, outstanding, bankOptions, documentNumber, isReceipt, form]);

  const mutation = useMutation<Invoice | PurchaseInvoice, Error, PaymentFormValues>({
    mutationFn: (values) =>
      isReceipt
        ? salesService.recordPayment(documentId!, values)
        : purchaseService.recordBillPayment(documentId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isReceipt ? queryKeys.invoices.all : queryKeys.purchaseInvoices.all });
      queryClient.invalidateQueries({ queryKey: isReceipt ? queryKeys.customers.all : queryKeys.vendors.all });
      toast.success(
        isReceipt ? 'Pembayaran diterima' : 'Pembayaran dicatat',
        `${documentNumber} telah diperbarui.`,
      );
      onClose();
    },
    onError: (error) => toast.error('Pembayaran gagal dicatat', error.message),
  });

  const errors = form.formState.errors;
  const amount = Number(form.watch('amount') ?? 0);
  const remaining = outstanding - amount;

  return (
    <Modal
      open={Boolean(documentId)}
      onClose={onClose}
      size="md"
      title={isReceipt ? 'Catat Penerimaan Pembayaran' : 'Catat Pembayaran kepada Pemasok'}
      description={`${documentNumber} · ${partyName}`}
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button
            variant="primary"
            loading={mutation.isPending}
            disabled={amount <= 0 || amount > outstanding}
            onClick={form.handleSubmit((values) => mutation.mutate(values))}
          >
            Simpan pembayaran
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-md border border-ink-200 bg-ink-50 px-4 py-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-600">{isReceipt ? 'Sisa tagihan' : 'Sisa utang'}</span>
          <span className="tabular font-semibold text-ink-900">{formatCurrency(outstanding)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[13px]">
          <span className="text-ink-600">Sisa setelah pembayaran ini</span>
          <span className={remaining < 0 ? 'tabular font-semibold text-negative-700' : 'tabular font-semibold text-ink-900'}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Tanggal Pembayaran" htmlFor="paymentDate" required error={errors.date?.message}>
          <TextInput id="paymentDate" type="date" max={TODAY} invalid={Boolean(errors.date)} {...form.register('date')} />
        </Field>

        <Field
          label="Nilai Pembayaran"
          htmlFor="paymentAmount"
          required
          error={errors.amount?.message ?? (amount > outstanding ? 'Nilai melebihi sisa tagihan' : undefined)}
        >
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <CurrencyInput
                id="paymentAmount"
                value={Number(field.value ?? 0)}
                onValueChange={field.onChange}
                invalid={Boolean(errors.amount) || amount > outstanding}
              />
            )}
          />
        </Field>

        <Field label="Metode" htmlFor="paymentMethod" required error={errors.method?.message}>
          <SelectInput id="paymentMethod" {...form.register('method')}>
            <option value="Bank Transfer">Transfer Bank</option>
            <option value="Virtual Account">Virtual Account</option>
            <option value="Cheque">Cek / Giro</option>
            <option value="Cash">Tunai</option>
          </SelectInput>
        </Field>

        <Field label="Rekening" htmlFor="paymentAccount" required error={errors.accountName?.message}>
          <SelectInput id="paymentAccount" invalid={Boolean(errors.accountName)} {...form.register('accountName')}>
            <option value="">Pilih rekening</option>
            {(bankOptions ?? []).map((option) => (
              <option key={option.value} value={option.label}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Nomor Referensi" htmlFor="paymentReference" required error={errors.reference?.message}>
            <TextInput id="paymentReference" invalid={Boolean(errors.reference)} {...form.register('reference')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
