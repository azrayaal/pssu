import type { ISODate } from './common';
import type { AgingBucketSet } from './sales';

export interface MetricSnapshot {
  value: number;
  previousValue: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
}

export interface DashboardMetrics {
  totalRevenue: MetricSnapshot;
  totalExpenses: MetricSnapshot;
  netProfit: MetricSnapshot;
  cashBalance: MetricSnapshot;
  accountsReceivable: MetricSnapshot;
  accountsPayable: MetricSnapshot;
}

export interface MonthlySeriesPoint {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  cashIn: number;
  cashOut: number;
  netCash: number;
}

export interface RecentTransaction {
  id: string;
  date: ISODate;
  reference: string;
  description: string;
  party: string;
  account: string;
  type: 'Income' | 'Expense' | 'Transfer' | 'Journal';
  amount: number;
}

export interface OutstandingInvoiceRow {
  id: string;
  number: string;
  customerName: string;
  dueDate: ISODate;
  total: number;
  outstanding: number;
  daysOverdue: number;
  status: string;
}

export interface UpcomingPaymentRow {
  id: string;
  number: string;
  vendorName: string;
  dueDate: ISODate;
  total: number;
  outstanding: number;
  daysUntilDue: number;
  status: string;
}

export interface FinancialSummary {
  grossProfitMargin: number;
  netProfitMargin: number;
  currentRatio: number;
  quickRatio: number;
  receivableDays: number;
  payableDays: number;
  workingCapital: number;
  burnRate: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  monthly: MonthlySeriesPoint[];
  arAging: AgingBucketSet;
  apAging: AgingBucketSet;
  recentTransactions: RecentTransaction[];
  outstandingInvoices: OutstandingInvoiceRow[];
  upcomingPayments: UpcomingPaymentRow[];
  summary: FinancialSummary;
  periodLabel: string;
}
