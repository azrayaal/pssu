import { apiClient } from '@/lib/api-client';
import type {
  BankAccount,
  CashTransaction,
  Paginated,
  QueryParams,
  ReconciliationSession,
  RecordStatus,
  SelectOption,
} from '@/types';
import type { BankAccountFormValues } from '@/schemas/bank-account.schema';
import type { CashTransactionFormValues } from '@/schemas/cash-transaction.schema';

export interface BankAccountSummary {
  accountCount: number;
  totalBalance: number;
  bankBalance: number;
  cashBalance: number;
  monthInflow: number;
  monthOutflow: number;
}

export type CashTransactionPage = Paginated<CashTransaction> & {
  totals: { income: number; expense: number; transfer: number };
};

export const cashBankService = {
  listAccounts: (params: QueryParams) => apiClient.get<Paginated<BankAccount>>('/bank-accounts', { params }),
  accountOptions: () => apiClient.get<SelectOption[]>('/bank-accounts/options'),
  summary: () => apiClient.get<BankAccountSummary>('/bank-accounts/summary'),
  getAccount: (id: string) => apiClient.get<BankAccount>(`/bank-accounts/${id}`),
  createAccount: (payload: BankAccountFormValues) => apiClient.post<BankAccount>('/bank-accounts', payload),
  updateAccount: (id: string, payload: BankAccountFormValues) =>
    apiClient.put<BankAccount>(`/bank-accounts/${id}`, payload),
  setAccountStatus: (id: string, status: RecordStatus) =>
    apiClient.patch<BankAccount>(`/bank-accounts/${id}/status`, { status }),

  listTransactions: (params: QueryParams) =>
    apiClient.get<CashTransactionPage>('/cash-transactions', { params }),
  createTransaction: (payload: CashTransactionFormValues) =>
    apiClient.post<CashTransaction>('/cash-transactions', payload),
  setReconciled: (id: string, reconciled: boolean) =>
    apiClient.patch<CashTransaction>(`/cash-transactions/${id}/reconcile`, { reconciled }),

  reconciliation: (params: QueryParams) => apiClient.get<ReconciliationSession>('/reconciliation', { params }),
};
