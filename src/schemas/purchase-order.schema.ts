import { z } from 'zod';
import { PURCHASE_ORDER_STATUSES } from '@/types';
import { isoDateSchema, optionalString } from './common.schema';
import { lineItemSchema } from './invoice.schema';

export const purchaseOrderSchema = z
  .object({
    vendorId: z.string().min(1, 'Pemasok wajib dipilih'),
    date: isoDateSchema,
    expectedDate: isoDateSchema,
    reference: optionalString,
    notes: optionalString,
    status: z.enum(PURCHASE_ORDER_STATUSES).default('Draft'),
    items: z.array(lineItemSchema).min(1, 'Pesanan memerlukan minimal satu item'),
  })
  .refine((values) => values.expectedDate >= values.date, {
    message: 'Tanggal penerimaan tidak boleh mendahului tanggal pesanan',
    path: ['expectedDate'],
  });

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

export type PurchaseOrderFormInput = z.input<typeof purchaseOrderSchema>;
