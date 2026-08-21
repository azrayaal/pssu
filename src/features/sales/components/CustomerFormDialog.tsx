import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@/types';
import {
  customerSchema,
  customerDefaults,
  type CustomerFormInput,
  type CustomerFormValues,
} from '@/schemas/customer.schema';
import { salesService } from '@/services/sales.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Controller } from 'react-hook-form';

export function CustomerFormDialog({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(customer);

  const form = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customerDefaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      customer
        ? {
            name: customer.name,
            legalName: customer.legalName,
            taxId: customer.taxId,
            email: customer.email,
            phone: customer.phone,
            contactPerson: customer.contactPerson,
            address: customer.address,
            city: customer.city,
            province: customer.province,
            postalCode: customer.postalCode,
            paymentTermDays: customer.paymentTermDays,
            creditLimit: customer.creditLimit,
            category: customer.category,
            status: customer.status,
            notes: customer.notes,
          }
        : customerDefaults,
    );
  }, [open, customer, form]);

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      isEdit ? salesService.updateCustomer(customer!.id, values) : salesService.createCustomer(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success(isEdit ? 'Data pelanggan diperbarui' : 'Pelanggan berhasil ditambahkan', saved.name);
      onClose();
    },
    onError: (error: Error) => toast.error('Data pelanggan gagal disimpan', error.message),
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Ubah Pelanggan ${customer?.code}` : 'Tambah Pelanggan'}
      description="Data pelanggan digunakan pada penerbitan faktur dan analisis piutang usaha."
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={form.handleSubmit((values) => mutation.mutate(values))}
          >
            {isEdit ? 'Simpan perubahan' : 'Simpan pelanggan'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Nama Pelanggan" htmlFor="name" required error={errors.name?.message}>
          <TextInput id="name" placeholder="PT Nusantara Digital" invalid={Boolean(errors.name)} {...form.register('name')} />
        </Field>
        <Field label="Nama Badan Hukum" htmlFor="legalName" required error={errors.legalName?.message}>
          <TextInput id="legalName" invalid={Boolean(errors.legalName)} {...form.register('legalName')} />
        </Field>
        <Field label="NPWP" htmlFor="taxId" required error={errors.taxId?.message} hint="Format 01.234.567.8-045.000">
          <TextInput id="taxId" placeholder="01.234.567.8-045.000" invalid={Boolean(errors.taxId)} {...form.register('taxId')} />
        </Field>
        <Field label="Kategori" htmlFor="category" required error={errors.category?.message}>
          <SelectInput id="category" {...form.register('category')}>
            <option value="Corporate">Corporate</option>
            <option value="Government">Government</option>
            <option value="Distributor">Distributor</option>
            <option value="Retail">Retail</option>
          </SelectInput>
        </Field>
        <Field label="Nama Kontak" htmlFor="contactPerson" required error={errors.contactPerson?.message}>
          <TextInput id="contactPerson" invalid={Boolean(errors.contactPerson)} {...form.register('contactPerson')} />
        </Field>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <TextInput id="email" type="email" invalid={Boolean(errors.email)} {...form.register('email')} />
        </Field>
        <Field label="Telepon" htmlFor="phone" required error={errors.phone?.message}>
          <TextInput id="phone" invalid={Boolean(errors.phone)} {...form.register('phone')} />
        </Field>
        <Field label="Termin Pembayaran" htmlFor="paymentTermDays" required error={errors.paymentTermDays?.message}>
          <TextInput
            id="paymentTermDays"
            type="number"
            suffix="hari"
            align="right"
            invalid={Boolean(errors.paymentTermDays)}
            {...form.register('paymentTermDays', { valueAsNumber: true })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Alamat" htmlFor="address" required error={errors.address?.message}>
            <TextInput id="address" invalid={Boolean(errors.address)} {...form.register('address')} />
          </Field>
        </div>
        <Field label="Kota" htmlFor="city" required error={errors.city?.message}>
          <TextInput id="city" invalid={Boolean(errors.city)} {...form.register('city')} />
        </Field>
        <Field label="Provinsi" htmlFor="province" required error={errors.province?.message}>
          <TextInput id="province" invalid={Boolean(errors.province)} {...form.register('province')} />
        </Field>
        <Field label="Kode Pos" htmlFor="postalCode" required error={errors.postalCode?.message}>
          <TextInput id="postalCode" invalid={Boolean(errors.postalCode)} {...form.register('postalCode')} />
        </Field>
        <Field label="Batas Kredit" htmlFor="creditLimit" error={errors.creditLimit?.message}>
          <Controller
            control={form.control}
            name="creditLimit"
            render={({ field }) => (
              <CurrencyInput id="creditLimit" value={Number(field.value ?? 0)} onValueChange={field.onChange} />
            )}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <SelectInput id="status" {...form.register('status')}>
            <option value="Active">Aktif</option>
            <option value="Inactive">Nonaktif</option>
          </SelectInput>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Catatan" htmlFor="notes" error={errors.notes?.message}>
            <TextArea id="notes" rows={2} placeholder="Catatan internal mengenai pelanggan ini" {...form.register('notes')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
