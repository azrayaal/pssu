import { z } from 'zod';
import { isoDateSchema } from './common.schema';

export const paymentSchema = z.object({
  date: isoDateSchema,
  amount: z.number().positive('Nilai pembayaran harus lebih besar dari nol'),
  method: z.enum(['Bank Transfer', 'Cash', 'Cheque', 'Virtual Account']),
  accountName: z.string().min(1, 'Rekening tujuan wajib dipilih'),
  reference: z.string().trim().min(1, 'Nomor referensi wajib diisi').max(60),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export type PaymentFormInput = z.input<typeof paymentSchema>;
