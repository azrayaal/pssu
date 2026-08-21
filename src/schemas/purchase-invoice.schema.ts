import { z } from 'zod';
import { BILL_STATUSES } from '@/types';
import { isoDateSchema, optionalString } from './common.schema';
import { lineItemSchema } from './invoice.schema';

export const purchaseInvoiceSchema = z
  .object({
    vendorId: z.string().min(1, 'Pemasok wajib dipilih'),
    vendorInvoiceNumber: z.string().trim().min(1, 'Nomor faktur pemasok wajib diisi').max(60),
    purchaseOrderId: z.string().nullable().default(null),
    date: isoDateSchema,
    dueDate: isoDateSchema,
    reference: optionalString,
    notes: optionalString,
    status: z.enum(BILL_STATUSES).default('Draft'),
    items: z.array(lineItemSchema).min(1, 'Faktur memerlukan minimal satu item'),
  })
  .refine((values) => values.dueDate >= values.date, {
    message: 'Tanggal jatuh tempo tidak boleh mendahului tanggal faktur',
    path: ['dueDate'],
  });

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceSchema>;

export type PurchaseInvoiceFormInput = z.input<typeof purchaseInvoiceSchema>;
