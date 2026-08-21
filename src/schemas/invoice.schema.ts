import { z } from 'zod';
import { INVOICE_STATUSES } from '@/types';
import { isoDateSchema, optionalString } from './common.schema';

export const lineItemSchema = z.object({
  id: z.string().optional().default(''),
  description: z.string().trim().min(3, 'Deskripsi item wajib diisi').max(160),
  quantity: z.number().positive('Kuantitas harus lebih besar dari nol'),
  unit: z.string().trim().min(1, 'Satuan wajib diisi'),
  unitPrice: z.number().nonnegative('Harga satuan tidak boleh negatif'),
  discountPercent: z.number().min(0, 'Diskon minimal 0%').max(100, 'Diskon maksimal 100%').default(0),
  taxPercent: z.number().min(0, 'Pajak minimal 0%').max(100, 'Pajak maksimal 100%').default(11),
  amount: z.number().default(0),
});

export const invoiceSchema = z
  .object({
    customerId: z.string().min(1, 'Pelanggan wajib dipilih'),
    date: isoDateSchema,
    dueDate: isoDateSchema,
    reference: optionalString,
    terms: optionalString,
    notes: optionalString,
    status: z.enum(INVOICE_STATUSES).default('Draft'),
    items: z.array(lineItemSchema).min(1, 'Faktur memerlukan minimal satu item'),
  })
  .refine((values) => values.dueDate >= values.date, {
    message: 'Tanggal jatuh tempo tidak boleh mendahului tanggal faktur',
    path: ['dueDate'],
  });

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type LineItemFormValues = z.infer<typeof lineItemSchema>;

export const emptyLineItem: LineItemFormValues = {
  id: '',
  description: '',
  quantity: 1,
  unit: 'Paket',
  unitPrice: 0,
  discountPercent: 0,
  taxPercent: 11,
  amount: 0,
};

export type InvoiceFormInput = z.input<typeof invoiceSchema>;
export type LineItemFormInput = z.input<typeof lineItemSchema>;
