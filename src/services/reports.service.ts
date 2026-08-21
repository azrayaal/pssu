import { apiClient } from '@/lib/api-client';
import type {
  BalanceSheetReport,
  CashFlowReport,
  ExpenseReport,
  ProfitLossReport,
  PurchaseReport,
  QueryParams,
  SalesReport,
} from '@/types';

export const reportsService = {
  profitLoss: (params: QueryParams) => apiClient.get<ProfitLossReport>('/reports/profit-loss', { params }),
  balanceSheet: (params: QueryParams) => apiClient.get<BalanceSheetReport>('/reports/balance-sheet', { params }),
  cashFlow: (params: QueryParams) => apiClient.get<CashFlowReport>('/reports/cash-flow', { params }),
  sales: (params: QueryParams) => apiClient.get<SalesReport>('/reports/sales', { params }),
  purchase: (params: QueryParams) => apiClient.get<PurchaseReport>('/reports/purchase', { params }),
  expense: (params: QueryParams) => apiClient.get<ExpenseReport>('/reports/expense', { params }),
};
