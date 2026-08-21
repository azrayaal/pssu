import { addMonths, format, parseISO, startOfMonth, subYears } from 'date-fns';
import type {
  Account,
  BalanceSheetReport,
  CashFlowReport,
  ExpenseReport,
  ExpenseReportRow,
  ProfitLossReport,
  PurchaseReport,
  PurchaseReportRow,
  ReportLine,
  SalesReport,
  SalesReportRow,
} from '@/types';
import { TODAY } from '@/utils/date';
import type { MockDatabase } from '../seed';
import { readString } from '../query';
import { route, type Route } from '../router';

/** Net debit-minus-credit movement per account id within a window. */
function movementBetween(db: MockDatabase, from: string | undefined, to: string): Map<string, number> {
  const movement = new Map<string, number>();
  for (const journal of db.journals) {
    if (journal.status !== 'Posted') continue;
    if (journal.date > to) continue;
    if (from && journal.date < from) continue;
    for (const line of journal.lines) {
      movement.set(line.accountId, (movement.get(line.accountId) ?? 0) + line.debit - line.credit);
    }
  }
  return movement;
}

function leafAccounts(db: MockDatabase): Account[] {
  return db.accounts.filter((account) => !db.accounts.some((child) => child.parentCode === account.code));
}

function signedBalance(account: Account, netDebit: number): number {
  return account.normalBalance === 'Debit' ? netDebit : -netDebit;
}

/** Finance teams compare against the same period one year earlier, not the preceding span. */
function previousPeriod(from: string, to: string): { from: string; to: string } {
  return {
    from: format(subYears(parseISO(from), 1), 'yyyy-MM-dd'),
    to: format(subYears(parseISO(to), 1), 'yyyy-MM-dd'),
  };
}

function buildProfitLoss(db: MockDatabase, from: string, to: string, comparative: boolean): ProfitLossReport {
  const current = movementBetween(db, from, to);
  const previousRange = previousPeriod(from, to);
  const previous = comparative ? movementBetween(db, previousRange.from, previousRange.to) : null;
  const leaves = leafAccounts(db);

  const lines: ReportLine[] = [];
  let idCounter = 0;
  const nextId = (): string => `pl-${(idCounter += 1)}`;

  const collect = (predicate: (account: Account) => boolean): { total: number; comparative: number; items: ReportLine[] } => {
    const items: ReportLine[] = [];
    let total = 0;
    let comparativeTotal = 0;
    for (const account of leaves.filter(predicate).sort((a, b) => a.code.localeCompare(b.code))) {
      const amount = signedBalance(account, current.get(account.id) ?? 0);
      const previousAmount = previous ? signedBalance(account, previous.get(account.id) ?? 0) : undefined;
      if (amount === 0 && !previousAmount) continue;
      total += amount;
      comparativeTotal += previousAmount ?? 0;
      items.push({
        id: nextId(),
        label: account.name,
        code: account.code,
        amount,
        comparativeAmount: previousAmount,
        level: 1,
        kind: 'item',
      });
    }
    return { total, comparative: comparativeTotal, items };
  };

  const pushSection = (label: string): void => {
    lines.push({ id: nextId(), label, amount: 0, level: 0, kind: 'section' });
  };
  const pushSubtotal = (label: string, amount: number, comparativeAmount: number): void => {
    lines.push({ id: nextId(), label, amount, comparativeAmount, level: 0, kind: 'subtotal' });
  };
  const pushTotal = (label: string, amount: number, comparativeAmount: number): void => {
    lines.push({ id: nextId(), label, amount, comparativeAmount, level: 0, kind: 'total', emphasis: true });
  };

  pushSection('Pendapatan Usaha');
  const revenue = collect((account) => account.type === 'Revenue' && account.subtype === 'Operating Revenue');
  lines.push(...revenue.items);
  pushSubtotal('Total Pendapatan Usaha', revenue.total, revenue.comparative);

  pushSection('Harga Pokok Penjualan');
  const cogs = collect((account) => account.subtype === 'Cost of Goods Sold');
  lines.push(...cogs.items);
  pushSubtotal('Total Harga Pokok Penjualan', cogs.total, cogs.comparative);

  pushTotal('Laba Kotor', revenue.total - cogs.total, revenue.comparative - cogs.comparative);

  pushSection('Beban Operasional');
  const opex = collect((account) => account.subtype === 'Operating Expense');
  lines.push(...opex.items);
  pushSubtotal('Total Beban Operasional', opex.total, opex.comparative);

  const operatingProfit = revenue.total - cogs.total - opex.total;
  pushTotal('Laba Usaha', operatingProfit, revenue.comparative - cogs.comparative - opex.comparative);

  pushSection('Pendapatan dan Beban Lain-lain');
  const otherIncome = collect((account) => account.type === 'Revenue' && account.subtype === 'Other Revenue');
  lines.push(...otherIncome.items);
  const otherExpense = collect((account) => account.subtype === 'Other Expense');
  lines.push(...otherExpense.items);
  pushSubtotal(
    'Total Pendapatan (Beban) Lain-lain',
    otherIncome.total - otherExpense.total,
    otherIncome.comparative - otherExpense.comparative,
  );

  const netProfit = operatingProfit + otherIncome.total - otherExpense.total;
  pushTotal(
    'Laba Bersih Sebelum Pajak',
    netProfit,
    revenue.comparative - cogs.comparative - opex.comparative + otherIncome.comparative - otherExpense.comparative,
  );

  return {
    period: { from, to },
    comparativePeriod: comparative ? previousRange : null,
    lines,
    revenue: revenue.total,
    costOfSales: cogs.total,
    grossProfit: revenue.total - cogs.total,
    operatingExpenses: opex.total,
    operatingProfit,
    otherIncome: otherIncome.total,
    otherExpense: otherExpense.total,
    netProfit,
  };
}

function buildBalanceSheet(db: MockDatabase, asOf: string, comparativeAsOf: string | null): BalanceSheetReport {
  const cumulative = movementBetween(db, undefined, asOf);
  const comparative = comparativeAsOf ? movementBetween(db, undefined, comparativeAsOf) : null;
  const leaves = leafAccounts(db);
  let idCounter = 0;
  const nextId = (): string => `bs-${(idCounter += 1)}`;

  const section = (
    label: string,
    predicate: (account: Account) => boolean,
  ): { lines: ReportLine[]; total: number } => {
    const lines: ReportLine[] = [{ id: nextId(), label, amount: 0, level: 0, kind: 'section' }];
    let total = 0;
    for (const account of leaves.filter(predicate).sort((a, b) => a.code.localeCompare(b.code))) {
      const amount = signedBalance(account, cumulative.get(account.id) ?? 0);
      const previousAmount = comparative ? signedBalance(account, comparative.get(account.id) ?? 0) : undefined;
      if (amount === 0 && !previousAmount) continue;
      total += amount;
      lines.push({
        id: nextId(),
        label: account.name,
        code: account.code,
        amount,
        comparativeAmount: previousAmount,
        level: 1,
        kind: 'item',
      });
    }
    lines.push({ id: nextId(), label: `Total ${label}`, amount: total, level: 0, kind: 'subtotal' });
    return { lines, total };
  };

  const currentAssets = section('Aset Lancar', (account) => account.subtype === 'Current Asset');
  const fixedAssets = section('Aset Tetap', (account) => account.subtype === 'Fixed Asset');
  const otherAssets = section('Aset Lainnya', (account) => account.subtype === 'Other Asset');
  const currentLiabilities = section('Kewajiban Lancar', (account) => account.subtype === 'Current Liability');
  const longTermLiabilities = section('Kewajiban Jangka Panjang', (account) => account.subtype === 'Long Term Liability');

  const equityLeaves = leaves.filter((account) => account.type === 'Equity');
  const equityLines: ReportLine[] = [{ id: nextId(), label: 'Ekuitas', amount: 0, level: 0, kind: 'section' }];
  let equityTotal = 0;
  for (const account of equityLeaves.sort((a, b) => a.code.localeCompare(b.code))) {
    if (account.code === '3-3000') continue;
    const amount = signedBalance(account, cumulative.get(account.id) ?? 0);
    if (amount === 0) continue;
    equityTotal += amount;
    equityLines.push({
      id: nextId(),
      label: account.name,
      code: account.code,
      amount,
      comparativeAmount: comparative ? signedBalance(account, comparative.get(account.id) ?? 0) : undefined,
      level: 1,
      kind: 'item',
    });
  }

  const fiscalYearStart = `${asOf.slice(0, 4)}-01-01`;
  const yearMovement = movementBetween(db, fiscalYearStart, asOf);
  const currentEarnings = leaves
    .filter((account) => account.type === 'Revenue' || account.type === 'Expense')
    .reduce((sum, account) => {
      const amount = signedBalance(account, yearMovement.get(account.id) ?? 0);
      return account.type === 'Revenue' ? sum + amount : sum - amount;
    }, 0);

  const priorEarnings = leaves
    .filter((account) => account.type === 'Revenue' || account.type === 'Expense')
    .reduce((sum, account) => {
      const total = signedBalance(account, cumulative.get(account.id) ?? 0);
      const thisYear = signedBalance(account, yearMovement.get(account.id) ?? 0);
      const prior = total - thisYear;
      return account.type === 'Revenue' ? sum + prior : sum - prior;
    }, 0);

  if (priorEarnings !== 0) {
    equityTotal += priorEarnings;
    equityLines.push({
      id: nextId(),
      label: 'Laba Ditahan Periode Sebelumnya',
      code: '3-2100',
      amount: priorEarnings,
      level: 1,
      kind: 'item',
    });
  }

  equityTotal += currentEarnings;
  equityLines.push({
    id: nextId(),
    label: 'Laba Tahun Berjalan',
    code: '3-3000',
    amount: currentEarnings,
    level: 1,
    kind: 'item',
  });
  equityLines.push({ id: nextId(), label: 'Total Ekuitas', amount: equityTotal, level: 0, kind: 'subtotal' });

  const totalAssets = currentAssets.total + fixedAssets.total + otherAssets.total;
  const totalLiabilities = currentLiabilities.total + longTermLiabilities.total;

  return {
    asOf,
    comparativeAsOf,
    assetLines: [
      ...currentAssets.lines,
      ...fixedAssets.lines,
      ...otherAssets.lines,
      { id: nextId(), label: 'TOTAL ASET', amount: totalAssets, level: 0, kind: 'total', emphasis: true },
    ],
    liabilityLines: [
      ...currentLiabilities.lines,
      ...longTermLiabilities.lines,
      { id: nextId(), label: 'TOTAL KEWAJIBAN', amount: totalLiabilities, level: 0, kind: 'total', emphasis: true },
    ],
    equityLines: [
      ...equityLines,
      {
        id: nextId(),
        label: 'TOTAL KEWAJIBAN DAN EKUITAS',
        amount: totalLiabilities + equityTotal,
        level: 0,
        kind: 'total',
        emphasis: true,
      },
    ],
    totalAssets,
    totalLiabilities,
    totalEquity: equityTotal,
    balanced: Math.abs(totalAssets - (totalLiabilities + equityTotal)) < 1,
  };
}

const CASH_CODES = ['1-1101', '1-1102', '1-1201', '1-1202', '1-1203', '1-1204'];

type CashFlowBucket = 'operating' | 'investing' | 'financing';

function classifyCounterAccount(code: string): { bucket: CashFlowBucket; label: string } {
  if (code.startsWith('1-2') || code === '1-3000') {
    return { bucket: 'investing', label: 'Perolehan dan pelepasan aset tetap' };
  }
  if (code === '2-2100' || code === '2-2200') {
    return { bucket: 'financing', label: 'Penerimaan dan pembayaran pinjaman' };
  }
  if (code.startsWith('3-')) {
    return { bucket: 'financing', label: 'Setoran modal dan pembagian dividen' };
  }
  if (code === '1-1300') return { bucket: 'operating', label: 'Penerimaan dari pelanggan' };
  if (code === '2-1100') return { bucket: 'operating', label: 'Pembayaran kepada pemasok' };
  if (code === '6-1000' || code === '2-1200') return { bucket: 'operating', label: 'Pembayaran gaji dan tunjangan' };
  if (code.startsWith('2-13') || code === '2-1400' || code === '1-1600') {
    return { bucket: 'operating', label: 'Pembayaran pajak' };
  }
  if (code === '1-1400') return { bucket: 'operating', label: 'Pembelian persediaan' };
  if (code === '4-9100') return { bucket: 'operating', label: 'Penerimaan bunga bank' };
  if (code === '6-9100') return { bucket: 'operating', label: 'Pembayaran bunga pinjaman' };
  return { bucket: 'operating', label: 'Pembayaran beban operasional lainnya' };
}

function buildCashFlow(db: MockDatabase, from: string, to: string): CashFlowReport {
  const cashAccountIds = new Set(
    db.accounts.filter((account) => CASH_CODES.includes(account.code)).map((account) => account.id),
  );

  const buckets: Record<CashFlowBucket, Map<string, number>> = {
    operating: new Map(),
    investing: new Map(),
    financing: new Map(),
  };

  let openingCash = 0;
  let periodChange = 0;

  for (const journal of db.journals) {
    if (journal.status !== 'Posted') continue;
    if (journal.date > to) continue;

    const cashLines = journal.lines.filter((line) => cashAccountIds.has(line.accountId));
    if (!cashLines.length) continue;
    const netCash = cashLines.reduce((sum, line) => sum + line.debit - line.credit, 0);

    if (journal.date < from) {
      openingCash += netCash;
      continue;
    }

    periodChange += netCash;
    const counterLines = journal.lines.filter((line) => !cashAccountIds.has(line.accountId));
    const counterTotal = counterLines.reduce((sum, line) => sum + Math.abs(line.debit - line.credit), 0) || 1;

    for (const line of counterLines) {
      const weight = Math.abs(line.debit - line.credit) / counterTotal;
      const { bucket, label } = classifyCounterAccount(line.accountCode);
      buckets[bucket].set(label, (buckets[bucket].get(label) ?? 0) + netCash * weight);
    }
  }

  let idCounter = 0;
  const toLines = (map: Map<string, number>, prefix: string): ReportLine[] =>
    [...map.entries()]
      .filter(([, amount]) => Math.round(amount) !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .map(([label, amount]) => ({
        id: `${prefix}-${(idCounter += 1)}`,
        label,
        amount: Math.round(amount),
        level: 1,
        kind: 'item' as const,
      }));

  const operating = toLines(buckets.operating, 'cf-op');
  const investing = toLines(buckets.investing, 'cf-in');
  const financing = toLines(buckets.financing, 'cf-fi');

  const netOperating = operating.reduce((sum, line) => sum + line.amount, 0);
  const netInvesting = investing.reduce((sum, line) => sum + line.amount, 0);
  const netFinancing = financing.reduce((sum, line) => sum + line.amount, 0);

  return {
    period: { from, to },
    operating,
    investing,
    financing,
    netOperating,
    netInvesting,
    netFinancing,
    netChange: Math.round(periodChange),
    openingCash: Math.round(openingCash),
    closingCash: Math.round(openingCash + periodChange),
  };
}

function monthKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  let cursor = startOfMonth(parseISO(from));
  const end = parseISO(to);
  while (cursor <= end) {
    keys.push(format(cursor, 'yyyy-MM'));
    cursor = addMonths(cursor, 1);
  }
  return keys;
}

function buildSalesReport(db: MockDatabase, from: string, to: string): SalesReport {
  const invoices = db.invoices.filter(
    (invoice) =>
      invoice.date >= from &&
      invoice.date <= to &&
      invoice.status !== 'Draft' &&
      invoice.status !== 'Cancelled',
  );

  const byCustomer = new Map<string, SalesReportRow>();
  for (const invoice of invoices) {
    const row = byCustomer.get(invoice.customerId) ?? {
      id: invoice.customerId,
      customerName: invoice.customerName,
      invoiceCount: 0,
      gross: 0,
      discount: 0,
      tax: 0,
      net: 0,
      collected: 0,
      outstanding: 0,
    };
    row.invoiceCount += 1;
    row.gross += invoice.subtotal;
    row.discount += invoice.discountTotal;
    row.tax += invoice.taxTotal;
    row.net += invoice.total;
    row.collected += invoice.paidAmount;
    row.outstanding += invoice.outstanding;
    byCustomer.set(invoice.customerId, row);
  }

  const rows = [...byCustomer.values()].sort((a, b) => b.net - a.net);
  const totals = rows.reduce(
    (accumulator, row) => ({
      invoiceCount: accumulator.invoiceCount + row.invoiceCount,
      gross: accumulator.gross + row.gross,
      discount: accumulator.discount + row.discount,
      tax: accumulator.tax + row.tax,
      net: accumulator.net + row.net,
      collected: accumulator.collected + row.collected,
      outstanding: accumulator.outstanding + row.outstanding,
    }),
    { invoiceCount: 0, gross: 0, discount: 0, tax: 0, net: 0, collected: 0, outstanding: 0 },
  );

  const monthly = monthKeys(from, to).map((key) => {
    const scoped = invoices.filter((invoice) => invoice.date.startsWith(key));
    return {
      month: format(parseISO(`${key}-01`), 'MMM yy'),
      net: scoped.reduce((sum, invoice) => sum + invoice.total, 0),
      collected: scoped.reduce((sum, invoice) => sum + invoice.paidAmount, 0),
    };
  });

  return { period: { from, to }, rows, totals, monthly };
}

function buildPurchaseReport(db: MockDatabase, from: string, to: string): PurchaseReport {
  const bills = db.purchaseInvoices.filter(
    (bill) => bill.date >= from && bill.date <= to && bill.status !== 'Draft' && bill.status !== 'Cancelled',
  );

  const byVendor = new Map<string, PurchaseReportRow>();
  for (const bill of bills) {
    const row = byVendor.get(bill.vendorId) ?? {
      id: bill.vendorId,
      vendorName: bill.vendorName,
      billCount: 0,
      gross: 0,
      discount: 0,
      tax: 0,
      net: 0,
      paid: 0,
      outstanding: 0,
    };
    row.billCount += 1;
    row.gross += bill.subtotal;
    row.discount += bill.discountTotal;
    row.tax += bill.taxTotal;
    row.net += bill.total;
    row.paid += bill.paidAmount;
    row.outstanding += bill.outstanding;
    byVendor.set(bill.vendorId, row);
  }

  const rows = [...byVendor.values()].sort((a, b) => b.net - a.net);
  const totals = rows.reduce(
    (accumulator, row) => ({
      billCount: accumulator.billCount + row.billCount,
      gross: accumulator.gross + row.gross,
      discount: accumulator.discount + row.discount,
      tax: accumulator.tax + row.tax,
      net: accumulator.net + row.net,
      paid: accumulator.paid + row.paid,
      outstanding: accumulator.outstanding + row.outstanding,
    }),
    { billCount: 0, gross: 0, discount: 0, tax: 0, net: 0, paid: 0, outstanding: 0 },
  );

  const monthly = monthKeys(from, to).map((key) => {
    const scoped = bills.filter((bill) => bill.date.startsWith(key));
    return {
      month: format(parseISO(`${key}-01`), 'MMM yy'),
      net: scoped.reduce((sum, bill) => sum + bill.total, 0),
      paid: scoped.reduce((sum, bill) => sum + bill.paidAmount, 0),
    };
  });

  return { period: { from, to }, rows, totals, monthly };
}

function buildExpenseReport(db: MockDatabase, from: string, to: string): ExpenseReport {
  const expenses = db.expenses.filter(
    (expense) =>
      expense.date >= from && expense.date <= to && expense.status !== 'Rejected' && expense.status !== 'Draft',
  );
  const months = Math.max(1, monthKeys(from, to).length);
  const total = expenses.reduce((sum, expense) => sum + expense.total, 0);

  const rows: ExpenseReportRow[] = db.expenseCategories
    .map((category) => {
      const scoped = expenses.filter((expense) => expense.categoryId === category.id);
      const amount = scoped.reduce((sum, expense) => sum + expense.total, 0);
      const budget = category.monthlyBudget * months;
      return {
        id: category.id,
        categoryName: category.name,
        transactionCount: scoped.length,
        amount,
        budget,
        variance: budget - amount,
        variancePercent: budget === 0 ? 0 : ((budget - amount) / budget) * 100,
        shareOfTotal: total === 0 ? 0 : (amount / total) * 100,
      };
    })
    .filter((row) => row.transactionCount > 0)
    .sort((a, b) => b.amount - a.amount);

  const monthly = monthKeys(from, to).map((key) => ({
    month: format(parseISO(`${key}-01`), 'MMM yy'),
    amount: expenses
      .filter((expense) => expense.date.startsWith(key))
      .reduce((sum, expense) => sum + expense.total, 0),
  }));

  return {
    period: { from, to },
    rows,
    total,
    totalBudget: rows.reduce((sum, row) => sum + row.budget, 0),
    monthly,
  };
}

export const reportRoutes: Route[] = [
  route('GET', '/reports/profit-loss', ({ db, query }) =>
    buildProfitLoss(
      db,
      readString(query, 'from') ?? `${TODAY.slice(0, 4)}-01-01`,
      readString(query, 'to') ?? TODAY,
      readString(query, 'comparative') !== 'false',
    ),
  ),

  route('GET', '/reports/balance-sheet', ({ db, query }) =>
    buildBalanceSheet(
      db,
      readString(query, 'asOf') ?? TODAY,
      readString(query, 'comparative') === 'false' ? null : (readString(query, 'comparativeAsOf') ?? '2025-12-31'),
    ),
  ),

  route('GET', '/reports/cash-flow', ({ db, query }) =>
    buildCashFlow(db, readString(query, 'from') ?? `${TODAY.slice(0, 4)}-01-01`, readString(query, 'to') ?? TODAY),
  ),

  route('GET', '/reports/sales', ({ db, query }) =>
    buildSalesReport(db, readString(query, 'from') ?? `${TODAY.slice(0, 4)}-01-01`, readString(query, 'to') ?? TODAY),
  ),

  route('GET', '/reports/purchase', ({ db, query }) =>
    buildPurchaseReport(db, readString(query, 'from') ?? `${TODAY.slice(0, 4)}-01-01`, readString(query, 'to') ?? TODAY),
  ),

  route('GET', '/reports/expense', ({ db, query }) =>
    buildExpenseReport(db, readString(query, 'from') ?? `${TODAY.slice(0, 4)}-01-01`, readString(query, 'to') ?? TODAY),
  ),
];

export { buildProfitLoss, movementBetween, leafAccounts, signedBalance };
