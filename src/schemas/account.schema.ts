import { z } from 'zod';
import { ACCOUNT_SUBTYPES, ACCOUNT_TYPES } from '@/types';
import { optionalString, recordStatusSchema } from './common.schema';

export const accountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Kode akun wajib diisi')
    .regex(/^\d-\d{4}$/, 'Gunakan format kode akun seperti 1-1101'),
  name: z.string().trim().min(3, 'Nama akun minimal 3 karakter').max(80, 'Nama akun maksimal 80 karakter'),
  type: z.enum(ACCOUNT_TYPES),
  subtype: z.enum(ACCOUNT_SUBTYPES),
  parentId: z.string().nullable().default(null),
  openingBalance: z.number().default(0),
  status: recordStatusSchema.default('Active'),
  description: optionalString,
});

export type AccountFormValues = z.infer<typeof accountSchema>;

export const accountDefaults: AccountFormValues = {
  code: '',
  name: '',
  type: 'Asset',
  subtype: 'Current Asset',
  parentId: null,
  openingBalance: 0,
  status: 'Active',
  description: '',
};

/** Sub-types that are valid for a given account type, used to keep the form coherent. */
export const SUBTYPES_BY_TYPE: Record<(typeof ACCOUNT_TYPES)[number], readonly string[]> = {
  Asset: ['Current Asset', 'Fixed Asset', 'Other Asset'],
  Liability: ['Current Liability', 'Long Term Liability'],
  Equity: ['Equity'],
  Revenue: ['Operating Revenue', 'Other Revenue'],
  Expense: ['Cost of Goods Sold', 'Operating Expense', 'Other Expense'],
};

export type AccountFormInput = z.input<typeof accountSchema>;
