import type { AuditStamp, ID, ISODate } from './common';
import type { RecordStatus } from './accounting';
import type { AgingBucketSet } from './sales';

export const PURCHASE_ORDER_STATUSES = [
  'Draft',
  'Awaiting Approval',
  'Approved',
  'Partially Received',
  'Received',
  'Closed',
  'Cancelled',
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const BILL_STATUSES = [
  'Draft',
  'Awaiting Payment',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled',
] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export interface Vendor extends AuditStamp {
  id: ID;
  code: string;
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  contactPerson: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  paymentTermDays: number;
  bankName: string;
  bankAccount: string;
  outstandingBalance: number;
  totalPurchased: number;
  status: RecordStatus;
  category: 'Goods' | 'Services' | 'Logistics' | 'Utilities' | 'Professional';
  notes: string;
}

export interface PurchaseLineItem {
  id: ID;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  amount: number;
}

export interface PurchaseOrder extends AuditStamp {
  id: ID;
  number: string;
  vendorId: ID;
  vendorName: string;
  date: ISODate;
  expectedDate: ISODate;
  reference: string;
  notes: string;
  items: PurchaseLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  receivedPercent: number;
  status: PurchaseOrderStatus;
  approvedBy: string | null;
  approvedAt: ISODate | null;
}

export interface BillPayment {
  id: ID;
  date: ISODate;
  amount: number;
  method: 'Bank Transfer' | 'Cash' | 'Cheque';
  accountName: string;
  reference: string;
}

export interface PurchaseInvoice extends AuditStamp {
  id: ID;
  number: string;
  vendorInvoiceNumber: string;
  vendorId: ID;
  vendorName: string;
  purchaseOrderId: ID | null;
  purchaseOrderNumber: string | null;
  date: ISODate;
  dueDate: ISODate;
  reference: string;
  notes: string;
  items: PurchaseLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  outstanding: number;
  status: BillStatus;
  payments: BillPayment[];
}

export interface ApAgingRow extends AgingBucketSet {
  partyId: ID;
  partyCode: string;
  partyName: string;
  billCount: number;
  oldestBillDays: number;
}

export interface ApAgingReport {
  asOf: ISODate;
  rows: ApAgingRow[];
  totals: AgingBucketSet;
}
