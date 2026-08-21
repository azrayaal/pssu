import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import type {
  Account,
  CashTransaction,
  Expense,
  Invoice,
  JournalEntry,
  JournalLine,
  JournalSource,
  JournalStatus,
  PurchaseInvoice,
} from '@/types';
import { createRng, padNumber } from './rng';
import { BANK_ACCOUNTS, EXPENSE_CATEGORIES, USERS } from './reference';
import { SALES_CATALOG } from './catalog';
import { MONTH_SLOTS, PERIOD_START } from './documents';
import { TODAY } from '@/utils/date';

const AR = '1-1300';
const AP = '2-1100';
const VAT_OUT = '2-1400';
const VAT_IN = '1-1600';
const INVENTORY = '1-1400';
const COGS_GOODS = '5-1000';
const COGS_SERVICE = '5-1100';
const ACCRUED = '2-1600';

interface DraftLine {
  code: string;
  description: string;
  debit: number;
  credit: number;
}

interface DraftJournal {
  date: string;
  source: JournalSource;
  reference: string;
  memo: string;
  status: JournalStatus;
  lines: DraftLine[];
  createdBy: string;
}

class JournalCollector {
  private readonly entries: DraftJournal[] = [];

  add(entry: DraftJournal): void {
    const debit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const credit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    const diff = debit - credit;
    if (diff !== 0 && entry.lines.length > 0) {
      // Absorb rounding differences of a few rupiah on the last line.
      const last = entry.lines[entry.lines.length - 1]!;
      if (last.credit > 0) last.credit += diff;
      else last.debit -= diff;
    }
    this.entries.push(entry);
  }

  all(): DraftJournal[] {
    return this.entries;
  }
}

const revenueAccountFor = (description: string): string =>
  SALES_CATALOG.find((entry) => entry.description === description)?.revenueAccount ?? '4-1000';

const cogsProfileFor = (description: string): { ratio: number; account: string } => {
  const item = SALES_CATALOG.find((entry) => entry.description === description);
  const revenue = item?.revenueAccount ?? '4-1000';
  return {
    ratio: item?.cogsRatio ?? 0.4,
    account: revenue === '4-1100' ? COGS_GOODS : COGS_SERVICE,
  };
};

const bankGlFor = (accountName: string): string =>
  BANK_ACCOUNTS.find((entry) => entry.name === accountName)?.glAccountCode ?? '1-1201';

export interface LedgerInput {
  accounts: Account[];
  invoices: Invoice[];
  bills: PurchaseInvoice[];
  expenses: Expense[];
}

export interface LedgerOutput {
  journals: JournalEntry[];
  accounts: Account[];
  cashTransactions: CashTransaction[];
}

export function buildLedger({ accounts, invoices, bills, expenses }: LedgerInput): LedgerOutput {
  const rng = createRng(313377);
  const collector = new JournalCollector();
  const accountByCode = new Map(accounts.map((account) => [account.code, account]));

  // 1. Opening balances as at the first day of the fiscal window.
  const openingLines: DraftLine[] = accounts
    .filter((account) => account.openingBalance !== 0)
    .map((account) => {
      const debitNormal = account.normalBalance === 'Debit';
      const value = account.openingBalance;
      const isDebit = debitNormal ? value > 0 : value < 0;
      return {
        code: account.code,
        description: 'Saldo awal periode',
        debit: isDebit ? Math.abs(value) : 0,
        credit: isDebit ? 0 : Math.abs(value),
      };
    });

  collector.add({
    date: PERIOD_START,
    source: 'Adjustment',
    reference: 'OB-2025',
    memo: 'Saldo awal buku besar per 01 Juli 2024',
    status: 'Posted',
    lines: openingLines,
    createdBy: 'Bambang Prasetyo',
  });

  // 2. Sales invoices and their receipts.
  for (const invoice of invoices) {
    if (invoice.status === 'Draft' || invoice.status === 'Cancelled') continue;

    const lines: DraftLine[] = [
      { code: AR, description: `Piutang ${invoice.customerName}`, debit: invoice.total, credit: 0 },
    ];

    const revenueByAccount = new Map<string, number>();
    for (const item of invoice.items) {
      const code = revenueAccountFor(item.description);
      revenueByAccount.set(code, (revenueByAccount.get(code) ?? 0) + item.amount);
    }
    for (const [code, amount] of revenueByAccount) {
      lines.push({ code, description: accountByCode.get(code)?.name ?? 'Pendapatan', debit: 0, credit: amount });
    }
    if (invoice.taxTotal > 0) {
      lines.push({ code: VAT_OUT, description: 'PPN Keluaran 11%', debit: 0, credit: invoice.taxTotal });
    }

    const cogsByAccount = new Map<string, number>();
    for (const item of invoice.items) {
      const profile = cogsProfileFor(item.description);
      const cost = Math.round(item.amount * profile.ratio);
      cogsByAccount.set(profile.account, (cogsByAccount.get(profile.account) ?? 0) + cost);
    }
    for (const [code, amount] of cogsByAccount) {
      lines.push({ code, description: 'Beban pokok atas penjualan', debit: amount, credit: 0 });
      lines.push({
        code: code === COGS_GOODS ? INVENTORY : ACCRUED,
        description: code === COGS_GOODS ? 'Pengurangan persediaan' : 'Akrual biaya pelaksanaan proyek',
        debit: 0,
        credit: amount,
      });
    }

    collector.add({
      date: invoice.date,
      source: 'Sales Invoice',
      reference: invoice.number,
      memo: `Faktur penjualan ${invoice.number} kepada ${invoice.customerName}`,
      status: 'Posted',
      lines,
      createdBy: invoice.createdBy,
    });

    for (const payment of invoice.payments) {
      collector.add({
        date: payment.date,
        source: 'Cash Receipt',
        reference: payment.reference,
        memo: `Penerimaan pembayaran ${invoice.number} dari ${invoice.customerName}`,
        status: 'Posted',
        createdBy: 'Hendra Gunawan',
        lines: [
          { code: bankGlFor(payment.accountName), description: payment.accountName, debit: payment.amount, credit: 0 },
          { code: AR, description: `Pelunasan piutang ${invoice.customerName}`, debit: 0, credit: payment.amount },
        ],
      });
    }
  }

  // 3. Purchase invoices and their payments.
  for (const bill of bills) {
    if (bill.status === 'Draft' || bill.status === 'Cancelled') continue;

    const lines: DraftLine[] = [];
    const costByAccount = new Map<string, number>();
    for (const item of bill.items) {
      const code = expenseAccountFor(item.description);
      costByAccount.set(code, (costByAccount.get(code) ?? 0) + item.amount);
    }
    for (const [code, amount] of costByAccount) {
      lines.push({ code, description: accountByCode.get(code)?.name ?? 'Beban', debit: amount, credit: 0 });
    }
    if (bill.taxTotal > 0) {
      lines.push({ code: VAT_IN, description: 'PPN Masukan 11%', debit: bill.taxTotal, credit: 0 });
    }
    lines.push({ code: AP, description: `Utang kepada ${bill.vendorName}`, debit: 0, credit: bill.total });

    collector.add({
      date: bill.date,
      source: 'Purchase Invoice',
      reference: bill.number,
      memo: `Faktur pembelian ${bill.number} dari ${bill.vendorName}`,
      status: 'Posted',
      lines,
      createdBy: bill.createdBy,
    });

    for (const payment of bill.payments) {
      collector.add({
        date: payment.date,
        source: 'Cash Payment',
        reference: payment.reference,
        memo: `Pembayaran ${bill.number} kepada ${bill.vendorName}`,
        status: 'Posted',
        createdBy: 'Hendra Gunawan',
        lines: [
          { code: AP, description: `Pelunasan utang ${bill.vendorName}`, debit: payment.amount, credit: 0 },
          { code: bankGlFor(payment.accountName), description: payment.accountName, debit: 0, credit: payment.amount },
        ],
      });
    }
  }

  // 4. Paid expense claims.
  for (const expense of expenses) {
    if (expense.status !== 'Paid') continue;
    const category = EXPENSE_CATEGORIES.find((entry) => entry.id === expense.categoryId);
    const lines: DraftLine[] = [
      {
        code: category?.glAccountCode ?? '6-1500',
        description: expense.description,
        debit: expense.amount,
        credit: 0,
      },
    ];
    if (expense.taxAmount > 0) {
      lines.push({ code: VAT_IN, description: 'PPN Masukan atas biaya', debit: expense.taxAmount, credit: 0 });
    }
    lines.push({
      code: bankGlFor(expense.paymentAccountName),
      description: expense.paymentAccountName,
      debit: 0,
      credit: expense.total,
    });

    collector.add({
      date: expense.date,
      source: 'Expense',
      reference: expense.number,
      memo: `${expense.description} (${expense.categoryName})`,
      status: 'Posted',
      lines,
      createdBy: expense.submittedBy,
    });
  }

  // 5. Recurring month-end entries: payroll, depreciation, financing and bank charges.
  const goodsCogsByMonth = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.status === 'Draft' || invoice.status === 'Cancelled') continue;
    const month = invoice.date.slice(0, 7);
    for (const item of invoice.items) {
      const profile = cogsProfileFor(item.description);
      if (profile.account !== COGS_GOODS) continue;
      goodsCogsByMonth.set(month, (goodsCogsByMonth.get(month) ?? 0) + Math.round(item.amount * profile.ratio));
    }
  }

  const collectionsByMonth = new Map<string, number>();
  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      if (payment.accountName !== 'Bank Central Asia - Penerimaan') continue;
      const month = payment.date.slice(0, 7);
      collectionsByMonth.set(month, (collectionsByMonth.get(month) ?? 0) + payment.amount);
    }
  }

  const accruedCostByMonth = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.status === 'Draft' || invoice.status === 'Cancelled') continue;
    const month = invoice.date.slice(0, 7);
    for (const item of invoice.items) {
      const profile = cogsProfileFor(item.description);
      if (profile.account === COGS_GOODS) continue;
      accruedCostByMonth.set(month, (accruedCostByMonth.get(month) ?? 0) + Math.round(item.amount * profile.ratio));
    }
  }

  const floatSpendByMonth = new Map<string, { petty: number; cashBox: number }>();
  for (const expense of expenses) {
    if (expense.status !== 'Paid') continue;
    const month = expense.date.slice(0, 7);
    const bucket = floatSpendByMonth.get(month) ?? { petty: 0, cashBox: 0 };
    if (expense.paymentAccountId === 'bank-006') bucket.petty += expense.total;
    if (expense.paymentAccountId === 'bank-005') bucket.cashBox += expense.total;
    floatSpendByMonth.set(month, bucket);
  }

  const firstMonth = startOfMonth(parseISO(PERIOD_START));
  for (const slot of MONTH_SLOTS) {
    const monthStart = addMonths(firstMonth, slot.index);
    const payrollDate = clampDate(format(new Date(monthStart.getFullYear(), monthStart.getMonth(), 25), 'yyyy-MM-dd'));
    const monthEnd = clampDate(format(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0), 'yyyy-MM-dd'));
    if (!payrollDate) continue;

    const grossPayroll = 985_000_000 + slot.index * 12_500_000 + rng.amount(-15_000_000, 25_000_000, 500_000);
    const pph21 = Math.round(grossPayroll * 0.048);
    const payrollFundingDate = clampDate(
      format(new Date(monthStart.getFullYear(), monthStart.getMonth(), 24), 'yyyy-MM-dd'),
    );
    if (payrollFundingDate) {
      collector.add({
        date: payrollFundingDate,
        source: 'Manual',
        reference: `FUND-${format(monthStart, 'yyyyMM')}`,
        memo: `Pemindahan dana penggajian ke rekening payroll ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Hendra Gunawan',
        lines: [
          { code: '1-1203', description: 'Bank Negara Indonesia - Payroll', debit: grossPayroll - pph21, credit: 0 },
          { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: grossPayroll - pph21 },
        ],
      });
    }
    collector.add({
      date: payrollDate,
      source: 'Manual',
      reference: `PAYROLL-${format(monthStart, 'yyyyMM')}`,
      memo: `Pembayaran gaji dan tunjangan periode ${format(monthStart, 'MMMM yyyy')}`,
      status: 'Posted',
      createdBy: 'Dewi Kartika Sari',
      lines: [
        { code: '6-1000', description: 'Gaji, tunjangan dan BPJS karyawan', debit: grossPayroll, credit: 0 },
        { code: '2-1300', description: 'Pemotongan PPh Pasal 21', debit: 0, credit: pph21 },
        { code: '1-1203', description: 'Bank Negara Indonesia - Payroll', debit: 0, credit: grossPayroll - pph21 },
      ],
    });

    const monthKey = format(monthStart, 'yyyy-MM');
    const monthOpen = clampDate(format(monthStart, 'yyyy-MM-dd'));
    const float = floatSpendByMonth.get(monthKey);
    if (monthOpen && float && float.petty + float.cashBox > 0) {
      const pettyTopUp = Math.ceil(float.petty / 500_000) * 500_000;
      const cashBoxTopUp = Math.ceil(float.cashBox / 1_000_000) * 1_000_000;
      const lines: DraftLine[] = [];
      if (pettyTopUp > 0) lines.push({ code: '1-1101', description: 'Pengisian kembali kas kecil', debit: pettyTopUp, credit: 0 });
      if (cashBoxTopUp > 0) lines.push({ code: '1-1102', description: 'Pengisian kembali kas besar', debit: cashBoxTopUp, credit: 0 });
      lines.push({ code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: pettyTopUp + cashBoxTopUp });
      collector.add({
        date: monthOpen,
        source: 'Manual',
        reference: `FLOAT-${format(monthStart, 'yyyyMM')}`,
        memo: `Pengisian dana kas operasional ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Siti Nurhaliza',
        lines,
      });
    }

    const accrued = accruedCostByMonth.get(monthKey);
    if (monthEnd && accrued && accrued > 0) {
      const settled = Math.round(accrued * 0.94);
      collector.add({
        date: monthEnd,
        source: 'Cash Payment',
        reference: `ACCR-${format(monthStart, 'yyyyMM')}`,
        memo: `Pelunasan biaya pelaksanaan proyek dan subkontraktor ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Hendra Gunawan',
        lines: [
          { code: ACCRUED, description: 'Pelunasan biaya proyek terutang', debit: settled, credit: 0 },
          { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: settled },
        ],
      });
    }

    const collections = collectionsByMonth.get(monthKey);
    if (monthEnd && collections && collections > 0) {
      const sweep = Math.round(collections * 0.98);
      collector.add({
        date: monthEnd,
        source: 'Manual',
        reference: `SWEEP-${format(monthStart, 'yyyyMM')}`,
        memo: `Pemindahbukuan hasil penagihan ke rekening operasional ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Hendra Gunawan',
        lines: [
          { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: sweep, credit: 0 },
          { code: '1-1202', description: 'Bank Central Asia - Penerimaan', debit: 0, credit: sweep },
        ],
      });
    }

    const restock = goodsCogsByMonth.get(monthKey);
    if (monthOpen && restock && restock > 0) {
      const purchase = Math.ceil((restock * 1.05) / 1_000_000) * 1_000_000;
      collector.add({
        date: monthOpen,
        source: 'Purchase Invoice',
        reference: `STOCK-${format(monthStart, 'yyyyMM')}`,
        memo: `Pengadaan persediaan barang dagang ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Putri Ayu Lestari',
        lines: [
          { code: INVENTORY, description: 'Penambahan persediaan barang dagang', debit: purchase, credit: 0 },
          { code: VAT_IN, description: 'PPN Masukan atas pembelian persediaan', debit: Math.round(purchase * 0.11), credit: 0 },
          { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: purchase + Math.round(purchase * 0.11) },
        ],
      });
    }

    if (monthEnd) {
      collector.add({
        date: monthEnd,
        source: 'Adjustment',
        reference: `DEPR-${format(monthStart, 'yyyyMM')}`,
        memo: `Penyusutan aset tetap ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Bambang Prasetyo',
        lines: [
          { code: '6-1700', description: 'Beban penyusutan bulan berjalan', debit: 43_500_000, credit: 0 },
          { code: '1-2210', description: 'Akumulasi penyusutan bangunan', debit: 0, credit: 10_000_000 },
          { code: '1-2310', description: 'Akumulasi penyusutan kendaraan', debit: 0, credit: 19_500_000 },
          { code: '1-2410', description: 'Akumulasi penyusutan peralatan', debit: 0, credit: 14_000_000 },
        ],
      });

      const interest = 14_800_000 - slot.index * 180_000;
      const principal = 45_000_000;
      collector.add({
        date: monthEnd,
        source: 'Cash Payment',
        reference: `LOAN-${format(monthStart, 'yyyyMM')}`,
        memo: `Angsuran pokok dan bunga pinjaman bank ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Hendra Gunawan',
        lines: [
          { code: '6-9100', description: 'Beban bunga pinjaman', debit: interest, credit: 0 },
          { code: '2-2100', description: 'Angsuran pokok utang bank', debit: principal, credit: 0 },
          { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: interest + principal },
        ],
      });

      const bankInterest = rng.amount(2_400_000, 6_800_000, 50_000);
      const bankCharge = rng.amount(850_000, 2_400_000, 50_000);
      collector.add({
        date: monthEnd,
        source: 'Manual',
        reference: `BANK-${format(monthStart, 'yyyyMM')}`,
        memo: `Jasa giro dan biaya administrasi bank ${format(monthStart, 'MMMM yyyy')}`,
        status: 'Posted',
        createdBy: 'Siti Nurhaliza',
        lines: [
          { code: '1-1202', description: 'Jasa giro Bank Central Asia', debit: bankInterest, credit: 0 },
          { code: '4-9100', description: 'Pendapatan bunga bank', debit: 0, credit: bankInterest },
          { code: '6-9000', description: 'Biaya administrasi rekening', debit: bankCharge, credit: 0 },
          { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: bankCharge },
        ],
      });

      if (slot.index % 6 === 5) {
        const dividend = rng.amount(900_000_000, 1_600_000_000, 50_000_000);
        collector.add({
          date: monthEnd,
          source: 'Cash Payment',
          reference: `DIV-${format(monthStart, 'yyyyMM')}`,
          memo: `Pembagian dividen kepada pemegang saham semester ${slot.index < 12 ? 'I' : 'II'}`,
          status: 'Posted',
          createdBy: 'Dewi Kartika Sari',
          lines: [
            { code: '3-4000', description: 'Pembagian dividen tunai', debit: dividend, credit: 0 },
            { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: dividend },
          ],
        });
      }

      if (slot.index % 12 === 8) {
        const capex = rng.amount(600_000_000, 1_100_000_000, 25_000_000);
        collector.add({
          date: monthEnd,
          source: 'Purchase Invoice',
          reference: `CAPEX-${format(monthStart, 'yyyyMM')}`,
          memo: 'Pengadaan peralatan kantor dan infrastruktur teknologi',
          status: 'Posted',
          createdBy: 'Iwan Setiawan',
          lines: [
            { code: '1-2400', description: 'Penambahan peralatan kantor', debit: capex, credit: 0 },
            { code: VAT_IN, description: 'PPN Masukan atas belanja modal', debit: Math.round(capex * 0.11), credit: 0 },
            { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: capex + Math.round(capex * 0.11) },
          ],
        });
      }

      if (slot.index % 3 === 2) {
        const transfer = rng.amount(300_000_000, 650_000_000, 25_000_000);
        collector.add({
          date: monthEnd,
          source: 'Manual',
          reference: `TRF-${format(monthStart, 'yyyyMM')}`,
          memo: 'Pemindahan dana ke rekening cadangan perusahaan',
          status: 'Posted',
          createdBy: 'Hendra Gunawan',
          lines: [
            { code: '1-1204', description: 'Bank Rakyat Indonesia - Cadangan', debit: transfer, credit: 0 },
            { code: '1-1201', description: 'Bank Mandiri - Operasional', debit: 0, credit: transfer },
          ],
        });
      }

      if (slot.index % 2 === 0) {
        const vatOut = rng.amount(180_000_000, 420_000_000, 1_000_000);
        collector.add({
          date: monthEnd,
          source: 'Cash Payment',
          reference: `PPN-${format(monthStart, 'yyyyMM')}`,
          memo: `Penyetoran PPN kurang bayar masa ${format(monthStart, 'MMMM yyyy')}`,
          status: 'Posted',
          createdBy: 'Ratna Dewi',
          lines: [
            { code: VAT_OUT, description: 'Kompensasi PPN keluaran', debit: vatOut, credit: 0 },
            { code: VAT_IN, description: 'Kompensasi PPN masukan', debit: 0, credit: Math.round(vatOut * 0.72) },
            { code: '1-1201', description: 'Setoran PPN ke kas negara', debit: 0, credit: Math.round(vatOut * 0.28) },
          ],
        });
      }
    }
  }

  // 6. A handful of manual entries left in draft or voided, for workflow realism.
  const manualSamples: { date: string; memo: string; status: JournalStatus; lines: DraftLine[] }[] = [
    {
      date: '2026-08-18',
      memo: 'Reklasifikasi biaya sewa dibayar di muka ke beban bulan berjalan',
      status: 'Draft',
      lines: [
        { code: '6-1100', description: 'Amortisasi sewa dibayar di muka', debit: 62_500_000, credit: 0 },
        { code: '1-1700', description: 'Biaya dibayar di muka', debit: 0, credit: 62_500_000 },
      ],
    },
    {
      date: '2026-08-19',
      memo: 'Pencadangan kerugian penurunan nilai piutang kuartal III',
      status: 'Draft',
      lines: [
        { code: '6-1800', description: 'Beban penyisihan piutang', debit: 48_000_000, credit: 0 },
        { code: '1-1310', description: 'Cadangan kerugian piutang', debit: 0, credit: 48_000_000 },
      ],
    },
    {
      date: '2026-08-20',
      memo: 'Koreksi pembebanan biaya perjalanan dinas divisi implementasi',
      status: 'Draft',
      lines: [
        { code: '6-1400', description: 'Beban perjalanan dinas', debit: 18_750_000, credit: 0 },
        { code: '6-1500', description: 'Koreksi pembebanan perlengkapan', debit: 0, credit: 18_750_000 },
      ],
    },
    {
      date: '2026-06-30',
      memo: 'Pembatalan jurnal ganda atas pembebanan asuransi aset',
      status: 'Void',
      lines: [
        { code: '6-2000', description: 'Beban asuransi', debit: 27_500_000, credit: 0 },
        { code: '1-1700', description: 'Biaya dibayar di muka', debit: 0, credit: 27_500_000 },
      ],
    },
  ];

  for (const sample of manualSamples) {
    collector.add({
      date: sample.date,
      source: sample.status === 'Void' ? 'Adjustment' : 'Manual',
      reference: `ADJ-${sample.date.replace(/-/g, '')}`,
      memo: sample.memo,
      status: sample.status,
      createdBy: rng.pick(USERS.filter((user) => user.roleId === 'role-accountant')).name,
      lines: sample.lines,
    });
  }

  // Materialise journals with sequential numbering in date order.
  const drafts = collector.all().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return 0;
  });

  const journals: JournalEntry[] = drafts.map((draft, index) => {
    const lines: JournalLine[] = draft.lines.map((line, lineIndex) => {
      const account = accountByCode.get(line.code);
      return {
        id: `je-${padNumber(index + 1, 5)}-${lineIndex + 1}`,
        accountId: account?.id ?? `acc-${line.code}`,
        accountCode: line.code,
        accountName: account?.name ?? line.code,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      };
    });
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    return {
      id: `je-${padNumber(index + 1, 5)}`,
      number: `JE-${draft.date.slice(0, 4)}-${padNumber(index + 1, 5)}`,
      date: draft.date,
      reference: draft.reference,
      memo: draft.memo,
      source: draft.source,
      status: draft.status,
      lines,
      totalDebit,
      totalCredit,
      postedAt: draft.status === 'Posted' ? `${draft.date}T09:00:00.000Z` : null,
      postedBy: draft.status === 'Posted' ? draft.createdBy : null,
      createdAt: `${draft.date}T04:00:00.000Z`,
      createdBy: draft.createdBy,
      updatedAt: `${draft.date}T09:00:00.000Z`,
      updatedBy: draft.createdBy,
    } satisfies JournalEntry;
  });

  // Roll posted journal lines into account balances.
  const movement = new Map<string, number>();
  for (const journal of journals) {
    if (journal.status !== 'Posted') continue;
    for (const line of journal.lines) {
      const account = accountByCode.get(line.accountCode);
      if (!account) continue;
      const sign = account.normalBalance === 'Debit' ? 1 : -1;
      movement.set(line.accountCode, (movement.get(line.accountCode) ?? 0) + sign * (line.debit - line.credit));
    }
  }

  const balancedAccounts = accounts.map((account) => ({
    ...account,
    balance: movement.get(account.code) ?? 0,
  }));

  // Roll parent accounts up from their children.
  const childrenOf = new Map<string, Account[]>();
  for (const account of balancedAccounts) {
    if (!account.parentCode) continue;
    const list = childrenOf.get(account.parentCode) ?? [];
    list.push(account);
    childrenOf.set(account.parentCode, list);
  }
  const rollUp = (account: Account): number => {
    const children = childrenOf.get(account.code) ?? [];
    if (!children.length) return account.balance;
    const total = children.reduce((sum, child) => sum + rollUp(child), 0) + account.balance;
    account.balance = total;
    return total;
  };
  balancedAccounts.filter((account) => !account.parentCode).forEach(rollUp);

  const cashTransactions = buildCashTransactions(journals, balancedAccounts);

  return { journals, accounts: balancedAccounts, cashTransactions };
}

function clampDate(value: string): string | null {
  if (value > TODAY) return null;
  return value;
}

function expenseAccountFor(description: string): string {
  const item = PURCHASE_ACCOUNT_MAP.get(description);
  return item ?? '6-1500';
}

const PURCHASE_ACCOUNT_MAP = new Map<string, string>();

export function registerPurchaseAccounts(entries: { description: string; expenseAccount: string }[]): void {
  entries.forEach((entry) => PURCHASE_ACCOUNT_MAP.set(entry.description, entry.expenseAccount));
}

function buildCashTransactions(journals: JournalEntry[], accounts: Account[]): CashTransaction[] {
  const bankByGl = new Map(BANK_ACCOUNTS.map((bank) => [bank.glAccountCode, bank]));
  const accountByCode = new Map(accounts.map((account) => [account.code, account]));
  const transactions: CashTransaction[] = [];
  const inflowById = new Map<string, boolean>();
  let sequence = 0;

  const ascending = [...journals]
    .filter((journal) => journal.status === 'Posted')
    .sort((a, b) => (a.date === b.date ? a.number.localeCompare(b.number) : a.date < b.date ? -1 : 1));

  for (const journal of ascending) {
    const cashLines = journal.lines.filter((line) => bankByGl.has(line.accountCode));
    if (!cashLines.length) continue;
    const nonCashLines = journal.lines.filter((line) => !bankByGl.has(line.accountCode));

    for (const line of cashLines) {
      sequence += 1;
      const id = `cash-${padNumber(sequence, 5)}`;
      const bank = bankByGl.get(line.accountCode)!;
      const isInflow = line.debit > 0;
      const isTransfer = cashLines.length > 1 && nonCashLines.length === 0;
      const counterLine =
        nonCashLines.find((entry) => (isInflow ? entry.credit > 0 : entry.debit > 0)) ?? nonCashLines[0];
      const otherCashLine = cashLines.find((entry) => entry.id !== line.id);
      const counterAccount = isTransfer
        ? accountByCode.get(otherCashLine?.accountCode ?? '')
        : accountByCode.get(counterLine?.accountCode ?? '');

      inflowById.set(id, isInflow);
      transactions.push({
        id,
        date: journal.date,
        reference: journal.reference,
        description: journal.memo,
        bankAccountId: bank.id,
        bankAccountName: bank.name,
        counterAccountId: counterAccount?.id ?? '',
        counterAccountName: counterAccount ? `${counterAccount.code} · ${counterAccount.name}` : '—',
        type: isTransfer ? 'Transfer' : isInflow ? 'Income' : 'Expense',
        amount: isInflow ? line.debit : line.credit,
        runningBalance: 0,
        reconciled: journal.date < '2026-07-01',
        transferToAccountId: isTransfer && otherCashLine ? (bankByGl.get(otherCashLine.accountCode)?.id ?? null) : null,
        transferToAccountName:
          isTransfer && otherCashLine ? (bankByGl.get(otherCashLine.accountCode)?.name ?? null) : null,
        createdBy: journal.createdBy,
      });
    }
  }

  for (const bank of BANK_ACCOUNTS) {
    let balance = bank.openingBalance;
    for (const transaction of transactions) {
      if (transaction.bankAccountId !== bank.id) continue;
      balance += inflowById.get(transaction.id) ? transaction.amount : -transaction.amount;
      transaction.runningBalance = balance;
    }
  }

  return transactions;
}
