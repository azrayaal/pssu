import { apiClient } from '@/lib/api-client';
import type {
  Account,
  AccountType,
  GeneralLedgerResult,
  JournalEntry,
  Paginated,
  QueryParams,
  RecordStatus,
  SelectOption,
  TrialBalanceResult,
} from '@/types';
import type { AccountFormValues } from '@/schemas/account.schema';
import type { JournalFormValues } from '@/schemas/journal.schema';

export interface AccountSummary {
  total: number;
  active: number;
  inactive: number;
  byType: { type: AccountType; count: number; balance: number }[];
}

export interface AccountDetail {
  account: Account;
  children: Account[];
  movements: {
    id: string;
    date: string;
    journalId: string;
    journalNumber: string;
    memo: string;
    debit: number;
    credit: number;
  }[];
}

export interface JournalSummary {
  total: number;
  draft: number;
  posted: number;
  void: number;
  thisMonthCount: number;
  thisMonthValue: number;
}

export const accountingService = {
  listAccounts: (params: QueryParams) => apiClient.get<Paginated<Account>>('/accounts', { params }),
  accountOptions: (params: QueryParams = {}) => apiClient.get<SelectOption[]>('/accounts/options', { params }),
  accountSummary: () => apiClient.get<AccountSummary>('/accounts/summary'),
  getAccount: (id: string) => apiClient.get<AccountDetail>(`/accounts/${id}`),
  createAccount: (payload: AccountFormValues) => apiClient.post<Account>('/accounts', payload),
  updateAccount: (id: string, payload: AccountFormValues) => apiClient.put<Account>(`/accounts/${id}`, payload),
  setAccountStatus: (id: string, status: RecordStatus) =>
    apiClient.patch<Account>(`/accounts/${id}/status`, { status }),
  deleteAccount: (id: string) => apiClient.delete<{ success: boolean }>(`/accounts/${id}`),

  listJournals: (params: QueryParams) => apiClient.get<Paginated<JournalEntry>>('/journals', { params }),
  journalSummary: () => apiClient.get<JournalSummary>('/journals/summary'),
  getJournal: (id: string) => apiClient.get<JournalEntry>(`/journals/${id}`),
  createJournal: (payload: JournalFormValues) => apiClient.post<JournalEntry>('/journals', payload),
  updateJournal: (id: string, payload: JournalFormValues) =>
    apiClient.put<JournalEntry>(`/journals/${id}`, payload),
  postJournal: (id: string) => apiClient.patch<JournalEntry>(`/journals/${id}/post`),
  voidJournal: (id: string) => apiClient.patch<JournalEntry>(`/journals/${id}/void`),
  deleteJournal: (id: string) => apiClient.delete<{ success: boolean }>(`/journals/${id}`),

  generalLedger: (params: QueryParams) => apiClient.get<GeneralLedgerResult>('/general-ledger', { params }),
  trialBalance: (params: QueryParams) => apiClient.get<TrialBalanceResult>('/trial-balance', { params }),
};
