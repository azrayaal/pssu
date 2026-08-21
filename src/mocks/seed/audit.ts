import { format, parseISO, subDays, subHours, subMinutes } from 'date-fns';
import type { AuditAction, AuditLog, Expense, Invoice, JournalEntry, PurchaseInvoice } from '@/types';
import { createRng, padNumber } from './rng';
import { USERS } from './reference';
import { TODAY } from '@/utils/date';

const IP_POOL = [
  '103.28.14.22',
  '103.28.14.45',
  '182.253.77.109',
  '36.72.214.8',
  '110.138.90.201',
  '202.80.216.14',
  '116.206.11.37',
];

const USER_AGENTS = [
  'Chrome 138 on Windows 11',
  'Chrome 138 on macOS 15',
  'Edge 138 on Windows 11',
  'Safari 19 on macOS 15',
  'Firefox 141 on Ubuntu 24.04',
];

interface AuditInput {
  invoices: Invoice[];
  bills: PurchaseInvoice[];
  expenses: Expense[];
  journals: JournalEntry[];
}

export function buildAuditLogs({ invoices, bills, expenses, journals }: AuditInput): AuditLog[] {
  const rng = createRng(660214);
  const logs: AuditLog[] = [];
  let sequence = 0;

  const push = (
    timestamp: string,
    action: AuditAction,
    module: string,
    reference: string,
    description: string,
    userName: string,
  ): void => {
    sequence += 1;
    const user = USERS.find((entry) => entry.name === userName) ?? USERS[0]!;
    logs.push({
      id: `audit-${padNumber(sequence, 5)}`,
      timestamp,
      userId: user.id,
      userName: user.name,
      action,
      module,
      reference,
      description,
      ipAddress: rng.pick(IP_POOL),
      userAgent: rng.pick(USER_AGENTS),
    });
  };

  const recentInvoices = invoices.slice(0, 60);
  for (const invoice of recentInvoices) {
    push(
      `${invoice.date}T${padNumber(rng.int(1, 9), 2)}:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
      'Create',
      'Sales Invoices',
      invoice.number,
      `Menerbitkan faktur penjualan senilai ${invoice.total.toLocaleString('id-ID')} untuk ${invoice.customerName}`,
      invoice.createdBy,
    );
    if (invoice.payments.length) {
      const payment = invoice.payments[0]!;
      push(
        `${payment.date}T${padNumber(rng.int(1, 9), 2)}:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
        'Update',
        'Sales Invoices',
        invoice.number,
        `Mencatat penerimaan pembayaran ${payment.amount.toLocaleString('id-ID')} melalui ${payment.accountName}`,
        'Hendra Gunawan',
      );
    }
  }

  for (const bill of bills.slice(0, 45)) {
    push(
      `${bill.date}T${padNumber(rng.int(1, 9), 2)}:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
      'Create',
      'Purchase Invoices',
      bill.number,
      `Mencatat faktur pembelian dari ${bill.vendorName} senilai ${bill.total.toLocaleString('id-ID')}`,
      bill.createdBy,
    );
  }

  for (const expense of expenses.slice(0, 50)) {
    push(
      `${expense.date}T${padNumber(rng.int(1, 9), 2)}:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
      expense.status === 'Approved' || expense.status === 'Paid' ? 'Approve' : 'Create',
      'Expenses',
      expense.number,
      `${expense.status === 'Paid' ? 'Menyetujui dan membayar' : 'Mengajukan'} biaya ${expense.categoryName.toLowerCase()} senilai ${expense.total.toLocaleString('id-ID')}`,
      expense.status === 'Paid' ? (expense.approvedBy ?? expense.submittedBy) : expense.submittedBy,
    );
  }

  for (const journal of journals.slice(-70)) {
    push(
      `${journal.date}T${padNumber(rng.int(1, 9), 2)}:${padNumber(rng.int(0, 59), 2)}:00.000Z`,
      journal.status === 'Posted' ? 'Post' : journal.status === 'Void' ? 'Void' : 'Create',
      'Journal Entries',
      journal.number,
      journal.memo,
      journal.createdBy,
    );
  }

  const base = parseISO(`${TODAY}T09:00:00.000Z`);
  for (let i = 0; i < 40; i += 1) {
    const user = rng.pick(USERS.filter((entry) => entry.status === 'Active'));
    const at = subMinutes(subHours(subDays(base, rng.int(0, 12)), rng.int(0, 10)), rng.int(0, 59));
    push(
      `${format(at, "yyyy-MM-dd'T'HH:mm:ss")}.000Z`,
      rng.weighted([
        { value: 'Login' as AuditAction, weight: 42 },
        { value: 'Logout' as AuditAction, weight: 24 },
        { value: 'Export' as AuditAction, weight: 22 },
        { value: 'Update' as AuditAction, weight: 12 },
      ]),
      rng.pick(['Reports', 'Dashboard', 'Chart of Accounts', 'Users & Roles', 'General Ledger']),
      `SESSION-${padNumber(rng.int(1, 9999), 5)}`,
      rng.pick([
        'Masuk ke aplikasi melalui autentikasi kata sandi',
        'Keluar dari aplikasi',
        'Mengunduh laporan laba rugi dalam format Excel',
        'Mengunduh neraca dalam format PDF',
        'Mengubah pengaturan tampilan kolom tabel',
        'Membuka rekap buku besar akun 1-1300',
      ]),
      user.name,
    );
  }

  return logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
