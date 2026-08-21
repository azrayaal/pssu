import { z } from 'zod';
import { optionalString, recordStatusSchema } from './common.schema';

export const expenseCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Kode kategori wajib diisi')
    .regex(/^EXC-\d{2}$/, 'Gunakan format kode seperti EXC-01'),
  name: z.string().trim().min(3, 'Nama kategori minimal 3 karakter').max(60),
  glAccountId: z.string().min(1, 'Akun buku besar wajib dipilih'),
  monthlyBudget: z.number().nonnegative('Anggaran tidak boleh negatif').default(0),
  status: recordStatusSchema.default('Active'),
  description: optionalString,
});

export type ExpenseCategoryFormValues = z.infer<typeof expenseCategorySchema>;

export const expenseCategoryDefaults: ExpenseCategoryFormValues = {
  code: '',
  name: '',
  glAccountId: '',
  monthlyBudget: 0,
  status: 'Active',
  description: '',
};

export type ExpenseCategoryFormInput = z.input<typeof expenseCategorySchema>;
