import { z } from 'zod';
import { recordStatusSchema } from './common.schema';

export const bankAccountSchema = z.object({
  name: z.string().trim().min(3, 'Nama rekening minimal 3 karakter').max(80),
  accountNumber: z.string().trim().min(4, 'Nomor rekening wajib diisi').max(40),
  bankName: z.string().trim().min(2, 'Nama bank wajib diisi'),
  branch: z.string().trim().min(2, 'Cabang wajib diisi'),
  holderName: z.string().trim().min(3, 'Nama pemilik rekening wajib diisi'),
  glAccountId: z.string().min(1, 'Akun buku besar wajib dipilih'),
  currency: z.enum(['IDR', 'USD', 'SGD', 'EUR']).default('IDR'),
  kind: z.enum(['Bank', 'Cash', 'E-Wallet', 'Virtual Account']).default('Bank'),
  openingBalance: z.number().nonnegative('Saldo awal tidak boleh negatif').default(0),
  status: recordStatusSchema.default('Active'),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

export const bankAccountDefaults: BankAccountFormValues = {
  name: '',
  accountNumber: '',
  bankName: '',
  branch: '',
  holderName: '',
  glAccountId: '',
  currency: 'IDR',
  kind: 'Bank',
  openingBalance: 0,
  status: 'Active',
};

export type BankAccountFormInput = z.input<typeof bankAccountSchema>;
