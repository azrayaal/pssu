import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';
import type {
  AgingBucketSet,
  DashboardData,
  MetricSnapshot,
  MonthlySeriesPoint,
  OutstandingInvoiceRow,
  RecentTransaction,
  UpcomingPaymentRow,
} from '@/types';
import { TODAY, daysBetween } from '@/utils/date';
import type { MockDatabase } from '../seed';
import { readString } from '../query';
import { route, type Route } from '../router';
import { leafAccounts, movementBetween, signedBalance } from './reports';
import { addToBucket } from './sales';

function snapshot(value: number, previousValue: number): MetricSnapshot {
  const changePercent = previousValue === 0 ? 0 : ((value - previousValue) / Math.abs(previousValue)) * 100;
  return {
    value,
    previousValue,
    changePercent,
    direction: Math.abs(changePercent) < 0.5 ? 'flat' : changePercent > 0 ? 'up' : 'down',
  };
}

const CASH_CODES = ['1-1101', '1-1102', '1-1201', '1-1202', '1-1203', '1-1204'];

function periodTotals(db: MockDatabase, from: string, to: string): { revenue: number; expenses: number } {
  const movement = movementBetween(db, from, to);
  const leaves = leafAccounts(db);
  let revenue = 0;
  let expenses = 0;
  for (const account of leaves) {
    const amount = signedBalance(account, movement.get(account.id) ?? 0);
    if (account.type === 'Revenue') revenue += amount;
    if (account.type === 'Expense') expenses += amount;
  }
  return { revenue, expenses };
}

function buildDashboard(db: MockDatabase, months: number): DashboardData {
  const end = parseISO(TODAY);
  const periodStart = format(startOfMonth(subMonths(end, months - 1)), 'yyyy-MM-dd');
  const previousStart = format(startOfMonth(subMonths(end, months * 2 - 1)), 'yyyy-MM-dd');
  const previousEnd = format(subDays(parseISO(periodStart), 1), 'yyyy-MM-dd');

  const current = periodTotals(db, periodStart, TODAY);
  const previous = periodTotals(db, previousStart, previousEnd);

  const cashBalance = db.accounts
    .filter((account) => CASH_CODES.includes(account.code))
    .reduce((sum, account) => sum + account.balance, 0);
  const cashPrevious = (() => {
    const movement = movementBetween(db, undefined, format(subMonths(end, 1), 'yyyy-MM-dd'));
    return db.accounts
      .filter((account) => CASH_CODES.includes(account.code))
      .reduce((sum, account) => sum + (movement.get(account.id) ?? 0), 0);
  })();

  const receivable = db.invoices
    .filter((invoice) => invoice.status !== 'Draft' && invoice.status !== 'Cancelled')
    .reduce((sum, invoice) => sum + invoice.outstanding, 0);
  const payable = db.purchaseInvoices.reduce((sum, bill) => sum + bill.outstanding, 0);

  const monthly: MonthlySeriesPoint[] = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const monthStart = startOfMonth(subMonths(end, index));
    const monthEndDate = format(endOfMonth(monthStart), 'yyyy-MM-dd');
    const from = format(monthStart, 'yyyy-MM-dd');
    const to = monthEndDate > TODAY ? TODAY : monthEndDate;
    const totals = periodTotals(db, from, to);
    const key = format(monthStart, 'yyyy-MM');
    const cash = db.cashTransactions.filter((transaction) => transaction.date.startsWith(key));
    const cashIn = cash
      .filter((transaction) => transaction.type === 'Income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const cashOut = cash
      .filter((transaction) => transaction.type === 'Expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    monthly.push({
      month: format(monthStart, 'MMM yy'),
      revenue: totals.revenue,
      expenses: totals.expenses,
      netProfit: totals.revenue - totals.expenses,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
    });
  }

  const emptyBuckets = (): AgingBucketSet => ({
    current: 0,
    d1to30: 0,
    d31to60: 0,
    d61to90: 0,
    d90plus: 0,
    total: 0,
  });

  const arAging = emptyBuckets();
  db.invoices
    .filter(
      (invoice) => invoice.outstanding > 0 && invoice.status !== 'Draft' && invoice.status !== 'Cancelled',
    )
    .forEach((invoice) => addToBucket(arAging, invoice.dueDate, invoice.outstanding));

  const apAging = emptyBuckets();
  db.purchaseInvoices
    .filter((bill) => bill.outstanding > 0)
    .forEach((bill) => addToBucket(apAging, bill.dueDate, bill.outstanding));

  const recentTransactions: RecentTransaction[] = db.cashTransactions
    .slice()
    .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : a.date < b.date ? 1 : -1))
    .slice(0, 12)
    .map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      reference: transaction.reference,
      description: transaction.description,
      party: transaction.bankAccountName,
      account: transaction.counterAccountName,
      type: transaction.type,
      amount: transaction.amount,
    }));

  const outstandingInvoices: OutstandingInvoiceRow[] = db.invoices
    .filter(
      (invoice) => invoice.outstanding > 0 && invoice.status !== 'Draft' && invoice.status !== 'Cancelled',
    )
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 10)
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      customerName: invoice.customerName,
      dueDate: invoice.dueDate,
      total: invoice.total,
      outstanding: invoice.outstanding,
      daysOverdue: Math.max(0, daysBetween(invoice.dueDate, TODAY)),
      status: invoice.status,
    }));

  const upcomingPayments: UpcomingPaymentRow[] = db.purchaseInvoices
    .filter((bill) => bill.outstanding > 0)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 10)
    .map((bill) => ({
      id: bill.id,
      number: bill.number,
      vendorName: bill.vendorName,
      dueDate: bill.dueDate,
      total: bill.total,
      outstanding: bill.outstanding,
      daysUntilDue: daysBetween(TODAY, bill.dueDate),
      status: bill.status,
    }));

  const cumulative = movementBetween(db, undefined, TODAY);
  const leaves = leafAccounts(db);
  const sumWhere = (predicate: (code: string) => boolean): number =>
    leaves
      .filter((account) => predicate(account.code))
      .reduce((sum, account) => sum + signedBalance(account, cumulative.get(account.id) ?? 0), 0);

  const currentAssets = leaves
    .filter((account) => account.subtype === 'Current Asset')
    .reduce((sum, account) => sum + signedBalance(account, cumulative.get(account.id) ?? 0), 0);
  const currentLiabilities = leaves
    .filter((account) => account.subtype === 'Current Liability')
    .reduce((sum, account) => sum + signedBalance(account, cumulative.get(account.id) ?? 0), 0);
  const inventory = sumWhere((code) => code === '1-1400');

  const cogs = leaves
    .filter((account) => account.subtype === 'Cost of Goods Sold')
    .reduce((sum, account) => {
      const movement = movementBetween(db, periodStart, TODAY);
      return sum + signedBalance(account, movement.get(account.id) ?? 0);
    }, 0);

  const grossProfit = current.revenue - cogs;
  const netProfit = current.revenue - current.expenses;
  const monthsElapsed = Math.max(1, months);

  return {
    metrics: {
      totalRevenue: snapshot(current.revenue, previous.revenue),
      totalExpenses: snapshot(current.expenses, previous.expenses),
      netProfit: snapshot(netProfit, previous.revenue - previous.expenses),
      cashBalance: snapshot(cashBalance, cashPrevious),
      accountsReceivable: snapshot(receivable, receivable * 0.92),
      accountsPayable: snapshot(payable, payable * 1.08),
    },
    monthly,
    arAging,
    apAging,
    recentTransactions,
    outstandingInvoices,
    upcomingPayments,
    summary: {
      grossProfitMargin: current.revenue === 0 ? 0 : (grossProfit / current.revenue) * 100,
      netProfitMargin: current.revenue === 0 ? 0 : (netProfit / current.revenue) * 100,
      currentRatio: currentLiabilities === 0 ? 0 : currentAssets / currentLiabilities,
      quickRatio: currentLiabilities === 0 ? 0 : (currentAssets - inventory) / currentLiabilities,
      receivableDays: current.revenue === 0 ? 0 : (receivable / current.revenue) * monthsElapsed * 30,
      payableDays: current.expenses === 0 ? 0 : (payable / current.expenses) * monthsElapsed * 30,
      workingCapital: currentAssets - currentLiabilities,
      burnRate: current.expenses / monthsElapsed,
    },
    periodLabel: `${format(parseISO(periodStart), 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`,
  };
}

export const dashboardRoutes: Route[] = [
  route('GET', '/dashboard', ({ db, query }) => {
    const period = readString(query, 'period') ?? '12m';
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    return buildDashboard(db, months);
  }),

  route('GET', '/search', ({ db, query }) => {
    const term = (readString(query, 'q') ?? '').trim().toLowerCase();
    if (term.length < 2) return { groups: [] };

    const limit = 5;
    const contains = (value: string): boolean => value.toLowerCase().includes(term);

    const groups = [
      {
        label: 'Faktur Penjualan',
        items: db.invoices
          .filter((invoice) => contains(invoice.number) || contains(invoice.customerName))
          .slice(0, limit)
          .map((invoice) => ({
            id: invoice.id,
            title: invoice.number,
            subtitle: invoice.customerName,
            path: `/sales/invoices/${invoice.id}`,
          })),
      },
      {
        label: 'Pelanggan',
        items: db.customers
          .filter((customer) => contains(customer.name) || contains(customer.code))
          .slice(0, limit)
          .map((customer) => ({
            id: customer.id,
            title: customer.name,
            subtitle: customer.code,
            path: `/sales/customers/${customer.id}`,
          })),
      },
      {
        label: 'Pemasok',
        items: db.vendors
          .filter((vendor) => contains(vendor.name) || contains(vendor.code))
          .slice(0, limit)
          .map((vendor) => ({
            id: vendor.id,
            title: vendor.name,
            subtitle: vendor.code,
            path: `/purchase/vendors/${vendor.id}`,
          })),
      },
      {
        label: 'Akun',
        items: db.accounts
          .filter((account) => contains(account.name) || contains(account.code))
          .slice(0, limit)
          .map((account) => ({
            id: account.id,
            title: `${account.code} · ${account.name}`,
            subtitle: account.type,
            path: `/accounting/chart-of-accounts?search=${encodeURIComponent(account.code)}`,
          })),
      },
      {
        label: 'Jurnal',
        items: db.journals
          .filter((journal) => contains(journal.number) || contains(journal.memo))
          .slice(0, limit)
          .map((journal) => ({
            id: journal.id,
            title: journal.number,
            subtitle: journal.memo,
            path: `/accounting/journal-entries/${journal.id}`,
          })),
      },
    ].filter((group) => group.items.length > 0);

    return { groups };
  }),

  route('GET', '/notifications', ({ db }) => {
    const overdueInvoices = db.invoices.filter((invoice) => invoice.status === 'Overdue');
    const overdueBills = db.purchaseInvoices.filter((bill) => bill.status === 'Overdue');
    const draftJournals = db.journals.filter((journal) => journal.status === 'Draft');
    const pendingExpenses = db.expenses.filter((expense) => expense.status === 'Submitted');
    const pendingOrders = db.purchaseOrders.filter((order) => order.status === 'Awaiting Approval');

    const items = [
      {
        id: 'notif-ar',
        title: `${overdueInvoices.length} faktur penjualan jatuh tempo`,
        description: `Total ${overdueInvoices.reduce((sum, invoice) => sum + invoice.outstanding, 0).toLocaleString('id-ID')} belum tertagih`,
        severity: 'critical' as const,
        path: '/sales/invoices?status=Overdue',
        timestamp: `${TODAY}T02:15:00.000Z`,
      },
      {
        id: 'notif-ap',
        title: `${overdueBills.length} tagihan pemasok terlambat dibayar`,
        description: `Total ${overdueBills.reduce((sum, bill) => sum + bill.outstanding, 0).toLocaleString('id-ID')} perlu segera diselesaikan`,
        severity: 'warning' as const,
        path: '/purchase/purchase-invoices?status=Overdue',
        timestamp: `${TODAY}T01:40:00.000Z`,
      },
      {
        id: 'notif-journal',
        title: `${draftJournals.length} jurnal masih berstatus draft`,
        description: 'Jurnal belum diposting ke buku besar periode berjalan',
        severity: 'info' as const,
        path: '/accounting/journal-entries?status=Draft',
        timestamp: `${TODAY}T00:55:00.000Z`,
      },
      {
        id: 'notif-expense',
        title: `${pendingExpenses.length} pengajuan biaya menunggu persetujuan`,
        description: `Total ${pendingExpenses.reduce((sum, expense) => sum + expense.total, 0).toLocaleString('id-ID')} menunggu review`,
        severity: 'info' as const,
        path: '/expenses?status=Submitted',
        timestamp: `${TODAY}T00:20:00.000Z`,
      },
      {
        id: 'notif-po',
        title: `${pendingOrders.length} pesanan pembelian menunggu approval`,
        description: 'Persetujuan diperlukan sebelum pesanan dikirim ke pemasok',
        severity: 'info' as const,
        path: '/purchase/purchase-orders?status=Awaiting+Approval',
        timestamp: `${TODAY}T00:05:00.000Z`,
      },
    ].filter((item) => !item.title.startsWith('0 '));

    return { items, unreadCount: items.length };
  }),
];
