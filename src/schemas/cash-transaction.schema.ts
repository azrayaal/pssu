import { z } from 'zod';
import { isoDateSchema } from './common.schema';

export const cashTransactionSchema = z
  .object({
    date: isoDateSchema,
    type: z.enum(['Income', 'Expense', 'Transfer']),
    bankAccountId: z.string().min(1, 'Rekening wajib dipilih'),
    counterAccountId: z.string().default(''),
    transferToAccountId: z.string().default(''),
    amount: z.number().positive('Nilai transaksi harus lebih besar dari nol'),
    reference: z.string().trim().min(1, 'Nomor referensi wajib diisi').max(60),
    description: z.string().trim().min(5, 'Keterangan minimal 5 karakter').max(160),
  })
  .refine((values) => values.type === 'Transfer' || values.counterAccountId.length > 0, {
    message: 'Akun lawan wajib dipilih',
    path: ['counterAccountId'],
  })
  .refine((values) => values.type !== 'Transfer' || values.transferToAccountId.length > 0, {
    message: 'Rekening tujuan wajib dipilih',
    path: ['transferToAccountId'],
  })
  .refine((values) => values.transferToAccountId !== values.bankAccountId, {
    message: 'Rekening tujuan harus berbeda dari rekening asal',
    path: ['transferToAccountId'],
  });

export type CashTransactionFormValues = z.infer<typeof cashTransactionSchema>;

export type CashTransactionFormInput = z.input<typeof cashTransactionSchema>;
