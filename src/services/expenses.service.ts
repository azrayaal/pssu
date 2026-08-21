import { apiClient } from '@/lib/api-client';
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  Paginated,
  QueryParams,
  RecordStatus,
  SelectOption,
} from '@/types';
import type { ExpenseFormValues } from '@/schemas/expense.schema';
import type { ExpenseCategoryFormValues } from '@/schemas/expense-category.schema';

export interface ExpenseSummary {
  count: number;
  pendingApproval: number;
  pendingValue: number;
  monthTotal: number;
  monthBudget: number;
  yearTotal: number;
}

export type ExpensePage = Paginated<Expense> & { filteredTotal: number };

export const expensesService = {
  list: (params: QueryParams) => apiClient.get<ExpensePage>('/expenses', { params }),
  summary: () => apiClient.get<ExpenseSummary>('/expenses/summary'),
  get: (id: string) => apiClient.get<Expense>(`/expenses/${id}`),
  create: (payload: ExpenseFormValues) => apiClient.post<Expense>('/expenses', payload),
  update: (id: string, payload: ExpenseFormValues) => apiClient.put<Expense>(`/expenses/${id}`, payload),
  setStatus: (id: string, status: ExpenseStatus) =>
    apiClient.patch<Expense>(`/expenses/${id}/status`, { status }),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/expenses/${id}`),

  listCategories: (params: QueryParams) =>
    apiClient.get<Paginated<ExpenseCategory>>('/expense-categories', { params }),
  categoryOptions: () => apiClient.get<SelectOption[]>('/expense-categories/options'),
  createCategory: (payload: ExpenseCategoryFormValues) =>
    apiClient.post<ExpenseCategory>('/expense-categories', payload),
  updateCategory: (id: string, payload: ExpenseCategoryFormValues) =>
    apiClient.put<ExpenseCategory>(`/expense-categories/${id}`, payload),
  setCategoryStatus: (id: string, status: RecordStatus) =>
    apiClient.patch<ExpenseCategory>(`/expense-categories/${id}/status`, { status }),
  removeCategory: (id: string) => apiClient.delete<{ success: boolean }>(`/expense-categories/${id}`),
};
