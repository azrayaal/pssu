import type { DateRange, ISODate } from './common';

export interface ReportLine {
  id: string;
  label: string;
  code?: string;
  amount: number;
  comparativeAmount?: number;
  level: number;
  kind: 'section' | 'item' | 'subtotal' | 'total';
  emphasis?: boolean;
}

export interface ProfitLossReport {
  period: DateRange;
  comparativePeriod: DateRange | null;
  lines: ReportLine[];
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  otherIncome: number;
  otherExpense: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  asOf: ISODate;
  comparativeAsOf: ISODate | null;
  assetLines: ReportLine[];
  liabilityLines: ReportLine[];
  equityLines: ReportLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
}

export interface CashFlowReport {
  period: DateRange;
  operating: ReportLine[];
  investing: ReportLine[];
  financing: ReportLine[];
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChange: number;
  openingCash: number;
  closingCash: number;
}

export interface SalesReportRow {
  id: string;
  customerName: string;
  invoiceCount: number;
  gross: number;
  discount: number;
  tax: number;
  net: number;
  collected: number;
  outstanding: number;
}

export interface SalesReport {
  period: DateRange;
  rows: SalesReportRow[];
  totals: Omit<SalesReportRow, 'id' | 'customerName'>;
  monthly: { month: string; net: number; collected: number }[];
}

export interface PurchaseReportRow {
  id: string;
  vendorName: string;
  billCount: number;
  gross: number;
  discount: number;
  tax: number;
  net: number;
  paid: number;
  outstanding: number;
}

export interface PurchaseReport {
  period: DateRange;
  rows: PurchaseReportRow[];
  totals: Omit<PurchaseReportRow, 'id' | 'vendorName'>;
  monthly: { month: string; net: number; paid: number }[];
}

export interface ExpenseReportRow {
  id: string;
  categoryName: string;
  transactionCount: number;
  amount: number;
  budget: number;
  variance: number;
  variancePercent: number;
  shareOfTotal: number;
}

export interface ExpenseReport {
  period: DateRange;
  rows: ExpenseReportRow[];
  total: number;
  totalBudget: number;
  monthly: { month: string; amount: number }[];
}
