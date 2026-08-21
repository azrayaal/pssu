import { z } from 'zod';
import { emailSchema, optionalString, phoneSchema, recordStatusSchema } from './common.schema';

export const vendorSchema = z.object({
  name: z.string().trim().min(3, 'Nama pemasok minimal 3 karakter').max(100),
  legalName: z.string().trim().min(3, 'Nama badan hukum wajib diisi').max(120),
  taxId: z
    .string()
    .trim()
    .min(1, 'NPWP wajib diisi')
    .regex(/^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/, 'Gunakan format NPWP 01.234.567.8-045.000'),
  email: emailSchema,
  phone: phoneSchema,
  contactPerson: z.string().trim().min(3, 'Nama kontak wajib diisi'),
  address: z.string().trim().min(5, 'Alamat wajib diisi'),
  city: z.string().trim().min(2, 'Kota wajib diisi'),
  province: z.string().trim().min(2, 'Provinsi wajib diisi'),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Kode pos harus 5 digit'),
  paymentTermDays: z.number().int().min(0).max(180, 'Termin maksimal 180 hari'),
  bankName: z.string().trim().min(2, 'Nama bank wajib diisi'),
  bankAccount: z.string().trim().min(5, 'Nomor rekening wajib diisi'),
  category: z.enum(['Goods', 'Services', 'Logistics', 'Utilities', 'Professional']),
  status: recordStatusSchema.default('Active'),
  notes: optionalString,
});

export type VendorFormValues = z.infer<typeof vendorSchema>;

export const vendorDefaults: VendorFormValues = {
  name: '',
  legalName: '',
  taxId: '',
  email: '',
  phone: '',
  contactPerson: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  paymentTermDays: 30,
  bankName: '',
  bankAccount: '',
  category: 'Goods',
  status: 'Active',
  notes: '',
};

export type VendorFormInput = z.input<typeof vendorSchema>;
