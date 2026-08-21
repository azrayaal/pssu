import type { AuditStamp, CurrencyCode, ID, ISODate } from './common';
import type { RecordStatus } from './accounting';

export type BankAccountKind = 'Bank' | 'Cash' | 'E-Wallet' | 'Virtual Account';

export interface BankAccount extends AuditStamp {
  id: ID;
  name: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  holderName: string;
  glAccountId: ID;
  glAccountCode: string;
  currency: CurrencyCode;
  openingBalance: number;
  currentBalance: number;
  kind: BankAccountKind;
  status: RecordStatus;
}

export type CashTransactionType = 'Income' | 'Expense' | 'Transfer';

export interface CashTransaction {
  id: ID;
  date: ISODate;
  reference: string;
  description: string;
  bankAccountId: ID;
  bankAccountName: string;
  counterAccountId: ID;
  counterAccountName: string;
  type: CashTransactionType;
  amount: number;
  runningBalance: number;
  reconciled: boolean;
  transferToAccountId: ID | null;
  transferToAccountName: string | null;
  createdBy: string;
}

export interface StatementLine {
  id: ID;
  date: ISODate;
  description: string;
  reference: string;
  debit: number;
  credit: number;
}

export interface ReconciliationMatch {
  id: ID;
  statementLine: StatementLine;
  transaction: CashTransaction;
  matchedAt: ISODate;
  confidence: 'Exact' | 'Suggested';
}

export interface ReconciliationSession {
  id: ID;
  bankAccountId: ID;
  bankAccountName: string;
  periodFrom: ISODate;
  periodTo: ISODate;
  statementBalance: number;
  systemBalance: number;
  difference: number;
  status: 'In Progress' | 'Completed';
  matched: ReconciliationMatch[];
  unmatchedStatementLines: StatementLine[];
  unmatchedTransactions: CashTransaction[];
}
