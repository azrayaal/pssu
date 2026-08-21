import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Building2,
  ClipboardList,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';

export interface NavLeaf {
  label: string;
  path: string;
  /** Additional path prefixes that should keep this item highlighted. */
  matchPaths?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  children?: NavLeaf[];
}

export const NAVIGATION: NavGroup[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    id: 'accounting',
    label: 'Akuntansi',
    icon: BookOpen,
    children: [
      { label: 'Bagan Akun', path: '/accounting/chart-of-accounts' },
      { label: 'Jurnal Umum', path: '/accounting/journal-entries' },
      { label: 'Buku Besar', path: '/accounting/general-ledger' },
      { label: 'Neraca Saldo', path: '/accounting/trial-balance' },
    ],
  },
  {
    id: 'sales',
    label: 'Penjualan',
    icon: Receipt,
    children: [
      { label: 'Pelanggan', path: '/sales/customers' },
      { label: 'Faktur Penjualan', path: '/sales/invoices' },
      { label: 'Piutang Usaha', path: '/sales/receivables' },
    ],
  },
  {
    id: 'purchase',
    label: 'Pembelian',
    icon: ShoppingCart,
    children: [
      { label: 'Pemasok', path: '/purchase/vendors' },
      { label: 'Pesanan Pembelian', path: '/purchase/orders' },
      { label: 'Faktur Pembelian', path: '/purchase/invoices' },
      { label: 'Utang Usaha', path: '/purchase/payables' },
    ],
  },
  {
    id: 'cash-bank',
    label: 'Kas & Bank',
    icon: Wallet,
    children: [
      { label: 'Rekening', path: '/cash-bank/accounts' },
      { label: 'Transaksi', path: '/cash-bank/transactions' },
      { label: 'Rekonsiliasi Bank', path: '/cash-bank/reconciliation' },
    ],
  },
  {
    id: 'expenses',
    label: 'Biaya',
    icon: CreditCard,
    children: [
      { label: 'Daftar Biaya', path: '/expenses' },
      { label: 'Kategori Biaya', path: '/expenses/categories' },
    ],
  },
  {
    id: 'reports',
    label: 'Laporan',
    icon: FileBarChart,
    children: [
      { label: 'Laba Rugi', path: '/reports/profit-loss' },
      { label: 'Neraca', path: '/reports/balance-sheet' },
      { label: 'Arus Kas', path: '/reports/cash-flow' },
      { label: 'Neraca Saldo', path: '/reports/trial-balance' },
      { label: 'Umur Piutang', path: '/reports/ar-aging' },
      { label: 'Umur Utang', path: '/reports/ap-aging' },
      { label: 'Laporan Penjualan', path: '/reports/sales' },
      { label: 'Laporan Pembelian', path: '/reports/purchase' },
      { label: 'Laporan Biaya', path: '/reports/expense' },
    ],
  },
  {
    id: 'administration',
    label: 'Administrasi',
    icon: Users,
    children: [
      { label: 'Pengguna', path: '/administration/users' },
      { label: 'Peran & Hak Akses', path: '/administration/roles' },
      { label: 'Jejak Audit', path: '/administration/audit-trail' },
      { label: 'Pengaturan Perusahaan', path: '/administration/company' },
    ],
  },
];

export const BREADCRUMB_LABELS: Record<string, string> = {
  '': 'Dashboard',
  accounting: 'Akuntansi',
  'chart-of-accounts': 'Bagan Akun',
  'journal-entries': 'Jurnal Umum',
  'general-ledger': 'Buku Besar',
  'trial-balance': 'Neraca Saldo',
  sales: 'Penjualan',
  customers: 'Pelanggan',
  invoices: 'Faktur',
  receivables: 'Piutang Usaha',
  purchase: 'Pembelian',
  vendors: 'Pemasok',
  orders: 'Pesanan Pembelian',
  payables: 'Utang Usaha',
  'cash-bank': 'Kas & Bank',
  accounts: 'Rekening',
  transactions: 'Transaksi',
  reconciliation: 'Rekonsiliasi Bank',
  expenses: 'Biaya',
  categories: 'Kategori Biaya',
  reports: 'Laporan',
  'profit-loss': 'Laba Rugi',
  'balance-sheet': 'Neraca',
  'cash-flow': 'Arus Kas',
  'ar-aging': 'Umur Piutang',
  'ap-aging': 'Umur Utang',
  expense: 'Laporan Biaya',
  administration: 'Administrasi',
  users: 'Pengguna',
  roles: 'Peran & Hak Akses',
  'audit-trail': 'Jejak Audit',
  company: 'Pengaturan Perusahaan',
  new: 'Baru',
  edit: 'Ubah',
};

export const MODULE_ICONS: Record<string, LucideIcon> = {
  accounting: BookOpen,
  sales: Receipt,
  purchase: ShoppingCart,
  'cash-bank': Wallet,
  expenses: CreditCard,
  reports: FileBarChart,
  administration: Building2,
  journal: ClipboardList,
};
