import type { QueryParams } from '@/types';

export const queryKeys = {
  dashboard: (period: string) => ['dashboard', period] as const,

  accounts: {
    all: ['accounts'] as const,
    list: (params: QueryParams) => ['accounts', 'list', params] as const,
    options: ['accounts', 'options'] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
  },
  journals: {
    all: ['journals'] as const,
    list: (params: QueryParams) => ['journals', 'list', params] as const,
    detail: (id: string) => ['journals', 'detail', id] as const,
  },
  generalLedger: (params: QueryParams) => ['general-ledger', params] as const,
  trialBalance: (params: QueryParams) => ['trial-balance', params] as const,

  customers: {
    all: ['customers'] as const,
    list: (params: QueryParams) => ['customers', 'list', params] as const,
    options: ['customers', 'options'] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    transactions: (id: string) => ['customers', 'transactions', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params: QueryParams) => ['invoices', 'list', params] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
  arAging: (params: QueryParams) => ['ar-aging', params] as const,

  vendors: {
    all: ['vendors'] as const,
    list: (params: QueryParams) => ['vendors', 'list', params] as const,
    options: ['vendors', 'options'] as const,
    detail: (id: string) => ['vendors', 'detail', id] as const,
    transactions: (id: string) => ['vendors', 'transactions', id] as const,
  },
  purchaseOrders: {
    all: ['purchase-orders'] as const,
    list: (params: QueryParams) => ['purchase-orders', 'list', params] as const,
    detail: (id: string) => ['purchase-orders', 'detail', id] as const,
  },
  purchaseInvoices: {
    all: ['purchase-invoices'] as const,
    list: (params: QueryParams) => ['purchase-invoices', 'list', params] as const,
    detail: (id: string) => ['purchase-invoices', 'detail', id] as const,
  },
  apAging: (params: QueryParams) => ['ap-aging', params] as const,

  bankAccounts: {
    all: ['bank-accounts'] as const,
    list: (params: QueryParams) => ['bank-accounts', 'list', params] as const,
    options: ['bank-accounts', 'options'] as const,
    detail: (id: string) => ['bank-accounts', 'detail', id] as const,
  },
  cashTransactions: {
    all: ['cash-transactions'] as const,
    list: (params: QueryParams) => ['cash-transactions', 'list', params] as const,
  },
  reconciliation: {
    all: ['reconciliation'] as const,
    session: (params: QueryParams) => ['reconciliation', 'session', params] as const,
  },

  expenses: {
    all: ['expenses'] as const,
    list: (params: QueryParams) => ['expenses', 'list', params] as const,
    detail: (id: string) => ['expenses', 'detail', id] as const,
  },
  expenseCategories: {
    all: ['expense-categories'] as const,
    list: (params: QueryParams) => ['expense-categories', 'list', params] as const,
    options: ['expense-categories', 'options'] as const,
  },

  reports: {
    profitLoss: (params: QueryParams) => ['reports', 'profit-loss', params] as const,
    balanceSheet: (params: QueryParams) => ['reports', 'balance-sheet', params] as const,
    cashFlow: (params: QueryParams) => ['reports', 'cash-flow', params] as const,
    sales: (params: QueryParams) => ['reports', 'sales', params] as const,
    purchase: (params: QueryParams) => ['reports', 'purchase', params] as const,
    expense: (params: QueryParams) => ['reports', 'expense', params] as const,
  },

  users: {
    all: ['users'] as const,
    list: (params: QueryParams) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: ['roles', 'list'] as const,
    detail: (id: string) => ['roles', 'detail', id] as const,
  },
  auditLogs: (params: QueryParams) => ['audit-logs', params] as const,
  company: ['company'] as const,
  search: (term: string) => ['global-search', term] as const,
  notifications: ['notifications'] as const,
};
