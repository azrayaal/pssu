import type { AuditStamp, ID, ISODate } from './common';
import type { RecordStatus } from './accounting';

export const INVOICE_STATUSES = [
  'Draft',
  'Sent',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface Customer extends AuditStamp {
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
  creditLimit: number;
  outstandingBalance: number;
  totalBilled: number;
  status: RecordStatus;
  category: 'Corporate' | 'Government' | 'Retail' | 'Distributor';
  notes: string;
}

export interface InvoiceItem {
  id: ID;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  amount: number;
}

export interface InvoicePayment {
  id: ID;
  date: ISODate;
  amount: number;
  method: 'Bank Transfer' | 'Cash' | 'Cheque' | 'Virtual Account';
  accountName: string;
  reference: string;
}

export interface Invoice extends AuditStamp {
  id: ID;
  number: string;
  customerId: ID;
  customerName: string;
  date: ISODate;
  dueDate: ISODate;
  reference: string;
  terms: string;
  notes: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  outstanding: number;
  status: InvoiceStatus;
  payments: InvoicePayment[];
}

export interface AgingBucketSet {
  current: number;
  d1to30: number;
  d31to60: number;
  d61to90: number;
  d90plus: number;
  total: number;
}

export interface ArAgingRow extends AgingBucketSet {
  partyId: ID;
  partyCode: string;
  partyName: string;
  invoiceCount: number;
  oldestInvoiceDays: number;
}

export interface ArAgingReport {
  asOf: ISODate;
  rows: ArAgingRow[];
  totals: AgingBucketSet;
}
