import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Vendor } from '@/types';
import { vendorSchema, vendorDefaults, type VendorFormInput, type VendorFormValues } from '@/schemas/vendor.schema';
import { purchaseService } from '@/services/purchase.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';

export function VendorFormDialog({
  open,
  onClose,
  vendor,
}: {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(vendor);

  const form = useForm<VendorFormInput, unknown, VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendorDefaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      vendor
        ? {
            name: vendor.name,
            legalName: vendor.legalName,
            taxId: vendor.taxId,
            email: vendor.email,
            phone: vendor.phone,
            contactPerson: vendor.contactPerson,
            address: vendor.address,
            city: vendor.city,
            province: vendor.province,
            postalCode: vendor.postalCode,
            paymentTermDays: vendor.paymentTermDays,
            bankName: vendor.bankName,
            bankAccount: vendor.bankAccount,
            category: vendor.category,
            status: vendor.status,
            notes: vendor.notes,
          }
        : vendorDefaults,
    );
  }, [open, vendor, form]);

  const mutation = useMutation({
    mutationFn: (values: VendorFormValues) =>
      isEdit ? purchaseService.updateVendor(vendor!.id, values) : purchaseService.createVendor(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      toast.success(isEdit ? 'Data pemasok diperbarui' : 'Pemasok berhasil ditambahkan', saved.name);
      onClose();
    },
    onError: (error: Error) => toast.error('Data pemasok gagal disimpan', error.message),
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Ubah Pemasok ${vendor?.code}` : 'Tambah Pemasok'}
      description="Data pemasok digunakan pada pesanan pembelian, faktur, dan penjadwalan pembayaran."
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button variant="primary" loading={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
            {isEdit ? 'Simpan perubahan' : 'Simpan pemasok'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Nama Pemasok" htmlFor="vname" required error={errors.name?.message}>
          <TextInput id="vname" placeholder="PT Sumber Rejeki Utama" invalid={Boolean(errors.name)} {...form.register('name')} />
        </Field>
        <Field label="Nama Badan Hukum" htmlFor="vlegal" required error={errors.legalName?.message}>
          <TextInput id="vlegal" invalid={Boolean(errors.legalName)} {...form.register('legalName')} />
        </Field>
        <Field label="NPWP" htmlFor="vtax" required error={errors.taxId?.message} hint="Format 01.234.567.8-045.000">
          <TextInput id="vtax" placeholder="01.234.567.8-045.000" invalid={Boolean(errors.taxId)} {...form.register('taxId')} />
        </Field>
        <Field label="Kategori" htmlFor="vcategory" required error={errors.category?.message}>
          <SelectInput id="vcategory" {...form.register('category')}>
            <option value="Goods">Barang</option>
            <option value="Services">Jasa</option>
            <option value="Logistics">Logistik</option>
            <option value="Utilities">Utilitas</option>
            <option value="Professional">Profesional</option>
          </SelectInput>
        </Field>
        <Field label="Nama Kontak" htmlFor="vcontact" required error={errors.contactPerson?.message}>
          <TextInput id="vcontact" invalid={Boolean(errors.contactPerson)} {...form.register('contactPerson')} />
        </Field>
        <Field label="Email" htmlFor="vemail" required error={errors.email?.message}>
          <TextInput id="vemail" type="email" invalid={Boolean(errors.email)} {...form.register('email')} />
        </Field>
        <Field label="Telepon" htmlFor="vphone" required error={errors.phone?.message}>
          <TextInput id="vphone" invalid={Boolean(errors.phone)} {...form.register('phone')} />
        </Field>
        <Field label="Termin Pembayaran" htmlFor="vterm" required error={errors.paymentTermDays?.message}>
          <TextInput
            id="vterm"
            type="number"
            suffix="hari"
            align="right"
            invalid={Boolean(errors.paymentTermDays)}
            {...form.register('paymentTermDays', { valueAsNumber: true })}
          />
        </Field>
        <Field label="Nama Bank" htmlFor="vbank" required error={errors.bankName?.message}>
          <TextInput id="vbank" placeholder="Bank Mandiri" invalid={Boolean(errors.bankName)} {...form.register('bankName')} />
        </Field>
        <Field label="Nomor Rekening" htmlFor="vaccount" required error={errors.bankAccount?.message}>
          <TextInput id="vaccount" invalid={Boolean(errors.bankAccount)} {...form.register('bankAccount')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Alamat" htmlFor="vaddress" required error={errors.address?.message}>
            <TextInput id="vaddress" invalid={Boolean(errors.address)} {...form.register('address')} />
          </Field>
        </div>
        <Field label="Kota" htmlFor="vcity" required error={errors.city?.message}>
          <TextInput id="vcity" invalid={Boolean(errors.city)} {...form.register('city')} />
        </Field>
        <Field label="Provinsi" htmlFor="vprovince" required error={errors.province?.message}>
          <TextInput id="vprovince" invalid={Boolean(errors.province)} {...form.register('province')} />
        </Field>
        <Field label="Kode Pos" htmlFor="vpostal" required error={errors.postalCode?.message}>
          <TextInput id="vpostal" invalid={Boolean(errors.postalCode)} {...form.register('postalCode')} />
        </Field>
        <Field label="Status" htmlFor="vstatus">
          <SelectInput id="vstatus" {...form.register('status')}>
            <option value="Active">Aktif</option>
            <option value="Inactive">Nonaktif</option>
          </SelectInput>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Catatan" htmlFor="vnotes" error={errors.notes?.message}>
            <TextArea id="vnotes" rows={2} {...form.register('notes')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
