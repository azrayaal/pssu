import { z } from 'zod';
import { emailSchema, optionalString, phoneSchema, recordStatusSchema } from './common.schema';

export const customerSchema = z.object({
  name: z.string().trim().min(3, 'Nama pelanggan minimal 3 karakter').max(100),
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
  paymentTermDays: z.number().int().min(0, 'Termin tidak boleh negatif').max(180, 'Termin maksimal 180 hari'),
  creditLimit: z.number().nonnegative('Batas kredit tidak boleh negatif'),
  category: z.enum(['Corporate', 'Government', 'Retail', 'Distributor']),
  status: recordStatusSchema.default('Active'),
  notes: optionalString,
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const customerDefaults: CustomerFormValues = {
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
  creditLimit: 0,
  category: 'Corporate',
  status: 'Active',
  notes: '',
};

export type CustomerFormInput = z.input<typeof customerSchema>;
