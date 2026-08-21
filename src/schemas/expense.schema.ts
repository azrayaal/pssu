import { z } from 'zod';
import { isoDateSchema, optionalString } from './common.schema';

export const expenseAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  uploadedAt: z.string(),
});

export const expenseSchema = z.object({
  date: isoDateSchema,
  categoryId: z.string().min(1, 'Kategori biaya wajib dipilih'),
  description: z.string().trim().min(5, 'Keterangan minimal 5 karakter').max(160),
  amount: z.number().positive('Nilai biaya harus lebih besar dari nol'),
  taxAmount: z.number().nonnegative('Nilai pajak tidak boleh negatif').default(0),
  paymentAccountId: z.string().min(1, 'Akun pembayaran wajib dipilih'),
  vendorName: optionalString,
  reference: z.string().trim().min(1, 'Nomor referensi wajib diisi').max(60),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Paid', 'Rejected']).default('Draft'),
  notes: optionalString,
  attachments: z.array(expenseAttachmentSchema).default([]),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const expenseDefaults: ExpenseFormValues = {
  date: '',
  categoryId: '',
  description: '',
  amount: 0,
  taxAmount: 0,
  paymentAccountId: '',
  vendorName: '',
  reference: '',
  status: 'Draft',
  notes: '',
  attachments: [],
};

export type ExpenseFormInput = z.input<typeof expenseSchema>;
