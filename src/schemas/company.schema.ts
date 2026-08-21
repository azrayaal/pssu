import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';

export const companySchema = z.object({
  name: z.string().trim().min(3, 'Nama perusahaan wajib diisi').max(80),
  legalName: z.string().trim().min(3, 'Nama badan hukum wajib diisi').max(120),
  taxId: z
    .string()
    .trim()
    .regex(/^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/, 'Gunakan format NPWP 01.234.567.8-045.000'),
  currency: z.enum(['IDR', 'USD', 'SGD', 'EUR']),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/, 'Gunakan format MM-DD'),
  address: z.string().trim().min(5, 'Alamat wajib diisi'),
  city: z.string().trim().min(2, 'Kota wajib diisi'),
  province: z.string().trim().min(2, 'Provinsi wajib diisi'),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Kode pos harus 5 digit'),
  phone: phoneSchema,
  email: emailSchema,
  website: z.string().trim().min(3, 'Situs web wajib diisi'),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

export type CompanyFormInput = z.input<typeof companySchema>;
