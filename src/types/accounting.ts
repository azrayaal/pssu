import type { AuditStamp, ID, ISODate } from './common';

export const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_SUBTYPES = [
  'Current Asset',
  'Fixed Asset',
  'Other Asset',
  'Current Liability',
  'Long Term Liability',
  'Equity',
  'Operating Revenue',
  'Other Revenue',
  'Cost of Goods Sold',
  'Operating Expense',
  'Other Expense',
] as const;
export type AccountSubtype = (typeof ACCOUNT_SUBTYPES)[number];

export type NormalBalance = 'Debit' | 'Credit';

export type RecordStatus = 'Active' | 'Inactive';

export interface Account extends AuditStamp {
  id: ID;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  parentId: ID | null;
  parentCode: string | null;
  parentName: string | null;
  normalBalance: NormalBalance;
  balance: number;
  openingBalance: number;
  status: RecordStatus;
  isSystem: boolean;
  description: string;
  level: number;
}

export type JournalStatus = 'Draft' | 'Posted' | 'Void';

export type JournalSource =
  | 'Manual'
  | 'Sales Invoice'
  | 'Purchase Invoice'
  | 'Cash Receipt'
  | 'Cash Payment'
  | 'Expense'
  | 'Adjustment';

export interface JournalLine {
  id: ID;
  accountId: ID;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry extends AuditStamp {
  id: ID;
  number: string;
  date: ISODate;
  reference: string;
  memo: string;
  source: JournalSource;
  status: JournalStatus;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  postedAt: ISODate | null;
  postedBy: string | null;
}

export interface LedgerEntry {
  id: ID;
  date: ISODate;
  journalNumber: string;
  journalId: ID;
  reference: string;
  description: string;
  source: JournalSource;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerResult {
  accountId: ID;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
}

export interface TrialBalanceRow {
  accountId: ID;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  asOf: ISODate;
}
