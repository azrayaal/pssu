import type {
  Account,
  AuditLog,
  BankAccount,
  CashTransaction,
  Company,
  Customer,
  Expense,
  ExpenseCategory,
  Invoice,
  JournalEntry,
  PurchaseInvoice,
  PurchaseOrder,
  Role,
  User,
  Vendor,
} from '@/types';
import { buildAccounts } from './chart-of-accounts';
import { PURCHASE_CATALOG } from './catalog';
import {
  BANK_ACCOUNTS,
  COMPANIES,
  CURRENT_USER,
  CUSTOMERS,
  EXPENSE_CATEGORIES,
  ROLES,
  USERS,
  VENDORS,
} from './reference';
import { buildExpenses, buildInvoices, buildPurchaseInvoices, buildPurchaseOrders } from './documents';
import { buildLedger, registerPurchaseAccounts } from './ledger';
import { buildAuditLogs } from './audit';
import { TODAY } from '@/utils/date';

export interface MockDatabase {
  companies: Company[];
  activeCompanyId: string;
  currentUser: User;
  accounts: Account[];
  journals: JournalEntry[];
  customers: Customer[];
  invoices: Invoice[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  purchaseInvoices: PurchaseInvoice[];
  bankAccounts: BankAccount[];
  cashTransactions: CashTransaction[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  users: User[];
  roles: Role[];
  auditLogs: AuditLog[];
}

export function createDatabase(): MockDatabase {
  registerPurchaseAccounts(PURCHASE_CATALOG);

  const baseAccounts = buildAccounts();
  const invoices = buildInvoices();
  const purchaseOrders = buildPurchaseOrders();
  const purchaseInvoices = buildPurchaseInvoices(purchaseOrders);
  const expenses = buildExpenses();

  const ledger = buildLedger({
    accounts: baseAccounts,
    invoices,
    bills: purchaseInvoices,
    expenses,
  });

  const customers = CUSTOMERS.map((customer) => {
    const own = invoices.filter((invoice) => invoice.customerId === customer.id);
    const billable = own.filter((invoice) => invoice.status !== 'Draft' && invoice.status !== 'Cancelled');
    return {
      ...customer,
      totalBilled: billable.reduce((sum, invoice) => sum + invoice.total, 0),
      outstandingBalance: billable.reduce((sum, invoice) => sum + invoice.outstanding, 0),
    };
  });

  const vendors = VENDORS.map((vendor) => {
    const own = purchaseInvoices.filter((bill) => bill.vendorId === vendor.id);
    return {
      ...vendor,
      totalPurchased: own.reduce((sum, bill) => sum + bill.total, 0),
      outstandingBalance: own.reduce((sum, bill) => sum + bill.outstanding, 0),
    };
  });

  const accountByCode = new Map(ledger.accounts.map((account) => [account.code, account]));
  const bankAccounts = BANK_ACCOUNTS.map((bank) => ({
    ...bank,
    currentBalance: accountByCode.get(bank.glAccountCode)?.balance ?? bank.openingBalance,
  }));

  const currentMonthPrefix = TODAY.slice(0, 7);
  const expenseCategories = EXPENSE_CATEGORIES.map((category) => ({
    ...category,
    spentThisMonth: expenses
      .filter(
        (expense) =>
          expense.categoryId === category.id &&
          expense.date.startsWith(currentMonthPrefix) &&
          expense.status !== 'Rejected' &&
          expense.status !== 'Draft',
      )
      .reduce((sum, expense) => sum + expense.total, 0),
  }));

  const roles = ROLES.map((role) => ({
    ...role,
    userCount: USERS.filter((user) => user.roleId === role.id).length,
  }));

  return {
    companies: COMPANIES,
    activeCompanyId: COMPANIES[0]!.id,
    currentUser: CURRENT_USER,
    accounts: ledger.accounts,
    journals: ledger.journals,
    customers,
    invoices,
    vendors,
    purchaseOrders,
    purchaseInvoices,
    bankAccounts,
    cashTransactions: ledger.cashTransactions,
    expenses,
    expenseCategories,
    users: USERS,
    roles,
    auditLogs: buildAuditLogs({ invoices, bills: purchaseInvoices, expenses, journals: ledger.journals }),
  };
}
