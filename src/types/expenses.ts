import type { AuditStamp, ID, ISODate } from './common';
import type { RecordStatus } from './accounting';

export type ExpenseStatus = 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Rejected';

export interface ExpenseCategory extends AuditStamp {
  id: ID;
  code: string;
  name: string;
  glAccountId: ID;
  glAccountCode: string;
  glAccountName: string;
  monthlyBudget: number;
  spentThisMonth: number;
  status: RecordStatus;
  description: string;
}

export interface ExpenseAttachment {
  id: ID;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: ISODate;
}

export interface Expense extends AuditStamp {
  id: ID;
  number: string;
  date: ISODate;
  categoryId: ID;
  categoryName: string;
  description: string;
  amount: number;
  taxAmount: number;
  total: number;
  paymentAccountId: ID;
  paymentAccountName: string;
  vendorName: string;
  reference: string;
  status: ExpenseStatus;
  notes: string;
  attachments: ExpenseAttachment[];
  submittedBy: string;
  approvedBy: string | null;
}
