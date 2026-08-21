import type {
  BankAccount,
  Company,
  Customer,
  ExpenseCategory,
  PermissionAction,
  PermissionMatrix,
  Role,
  User,
  Vendor,
} from '@/types';
import { PERMISSION_MODULES } from '@/types';
import { createRng, padNumber } from './rng';
import { initialsOf } from '@/utils/format';

const rng = createRng(20260821);

export const COMPANIES: Company[] = [
  {
    id: 'co-pssu',
    name: 'PT PSSU Indonesia',
    legalName: 'PT Prima Sarana Sistem Utama',
    taxId: '01.234.567.8-045.000',
    initials: 'PS',
    currency: 'IDR',
    fiscalYearStart: '01-01',
    address: 'Gedung Cyber 2 Lantai 18, Jl. H. R. Rasuna Said Blok X-5',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12950',
    phone: '021-5793-4400',
    email: 'finance@pssu.co.id',
    website: 'www.pssu.co.id',
  },
  {
    id: 'co-nusantara',
    name: 'PT Nusantara Digital',
    legalName: 'PT Nusantara Digital Teknologi',
    taxId: '02.887.145.3-092.000',
    initials: 'ND',
    currency: 'IDR',
    fiscalYearStart: '01-01',
    address: 'Jl. Gatot Subroto Kav. 27, Menara Global Lantai 9',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12950',
    phone: '021-5290-1188',
    email: 'akunting@nusantaradigital.co.id',
    website: 'www.nusantaradigital.co.id',
  },
  {
    id: 'co-sinar',
    name: 'PT Sinar Abadi',
    legalName: 'PT Sinar Abadi Sejahtera',
    taxId: '03.442.910.7-411.000',
    initials: 'SA',
    currency: 'IDR',
    fiscalYearStart: '01-01',
    address: 'Kawasan Industri Rungkut, Jl. Rungkut Industri III No. 42',
    city: 'Surabaya',
    province: 'Jawa Timur',
    postalCode: '60293',
    phone: '031-8439-2200',
    email: 'keuangan@sinarabadi.co.id',
    website: 'www.sinarabadi.co.id',
  },
];

function buildMatrix(preset: 'full' | 'finance' | 'accounting' | 'sales' | 'readonly'): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  const grant = (actions: PermissionAction[]): Record<PermissionAction, boolean> => ({
    view: actions.includes('view'),
    create: actions.includes('create'),
    edit: actions.includes('edit'),
    delete: actions.includes('delete'),
    approve: actions.includes('approve'),
    export: actions.includes('export'),
  });

  for (const module of PERMISSION_MODULES) {
    if (preset === 'full') {
      matrix[module] = grant(['view', 'create', 'edit', 'delete', 'approve', 'export']);
      continue;
    }
    if (preset === 'readonly') {
      matrix[module] = grant(module === 'Reports' ? ['view', 'export'] : ['view']);
      continue;
    }
    if (preset === 'finance') {
      const admin = module === 'Users & Roles' || module === 'Company Settings';
      matrix[module] = admin
        ? grant(['view'])
        : grant(['view', 'create', 'edit', 'approve', 'export']);
      continue;
    }
    if (preset === 'accounting') {
      const admin = module === 'Users & Roles' || module === 'Company Settings';
      matrix[module] = admin ? grant([]) : grant(['view', 'create', 'edit', 'export']);
      continue;
    }
    const salesScope = ['Dashboard', 'Customers', 'Sales Invoices', 'Reports'];
    matrix[module] = salesScope.includes(module)
      ? grant(['view', 'create', 'edit', 'export'])
      : grant([]);
  }
  return matrix;
}

export const ROLES: Role[] = [
  {
    id: 'role-admin',
    name: 'Administrator',
    description: 'Akses penuh terhadap seluruh modul, konfigurasi sistem, dan manajemen pengguna.',
    userCount: 2,
    isSystem: true,
    permissions: buildMatrix('full'),
    createdAt: '2025-07-01T02:00:00.000Z',
    createdBy: 'Sistem',
    updatedAt: '2026-05-14T04:12:00.000Z',
    updatedBy: 'Rahmat Hidayat',
  },
  {
    id: 'role-finance-manager',
    name: 'Finance Manager',
    description: 'Menyetujui jurnal, faktur, dan pembayaran. Tidak dapat mengubah pengaturan sistem.',
    userCount: 3,
    isSystem: false,
    permissions: buildMatrix('finance'),
    createdAt: '2025-07-01T02:00:00.000Z',
    createdBy: 'Sistem',
    updatedAt: '2026-06-02T07:35:00.000Z',
    updatedBy: 'Rahmat Hidayat',
  },
  {
    id: 'role-accountant',
    name: 'Accountant',
    description: 'Melakukan input jurnal, rekonsiliasi, dan penyusunan laporan keuangan.',
    userCount: 4,
    isSystem: false,
    permissions: buildMatrix('accounting'),
    createdAt: '2025-07-01T02:00:00.000Z',
    createdBy: 'Sistem',
    updatedAt: '2026-04-19T03:20:00.000Z',
    updatedBy: 'Dewi Kartika',
  },
  {
    id: 'role-sales-admin',
    name: 'Sales Administrator',
    description: 'Mengelola data pelanggan dan penerbitan faktur penjualan.',
    userCount: 3,
    isSystem: false,
    permissions: buildMatrix('sales'),
    createdAt: '2025-08-11T02:00:00.000Z',
    createdBy: 'Rahmat Hidayat',
    updatedAt: '2026-02-27T06:44:00.000Z',
    updatedBy: 'Rahmat Hidayat',
  },
  {
    id: 'role-auditor',
    name: 'Auditor',
    description: 'Akses baca dan ekspor laporan untuk keperluan audit internal maupun eksternal.',
    userCount: 2,
    isSystem: false,
    permissions: buildMatrix('readonly'),
    createdAt: '2025-09-03T02:00:00.000Z',
    createdBy: 'Rahmat Hidayat',
    updatedAt: '2026-01-15T08:10:00.000Z',
    updatedBy: 'Rahmat Hidayat',
  },
];

const USER_SEEDS: {
  name: string;
  email: string;
  role: string;
  department: string;
  jobTitle: string;
  status?: 'Inactive';
  lastLogin: string | null;
}[] = [
  { name: 'Rahmat Hidayat', email: 'rahmat.hidayat@pssu.co.id', role: 'role-admin', department: 'Teknologi Informasi', jobTitle: 'IT Manager', lastLogin: '2026-08-21T01:42:00.000Z' },
  { name: 'Dewi Kartika Sari', email: 'dewi.kartika@pssu.co.id', role: 'role-finance-manager', department: 'Keuangan', jobTitle: 'Finance Manager', lastLogin: '2026-08-21T00:58:00.000Z' },
  { name: 'Bambang Prasetyo', email: 'bambang.prasetyo@pssu.co.id', role: 'role-accountant', department: 'Akuntansi', jobTitle: 'Senior Accountant', lastLogin: '2026-08-20T09:15:00.000Z' },
  { name: 'Siti Nurhaliza', email: 'siti.nurhaliza@pssu.co.id', role: 'role-accountant', department: 'Akuntansi', jobTitle: 'Accounting Staff', lastLogin: '2026-08-20T07:22:00.000Z' },
  { name: 'Andi Wijaya', email: 'andi.wijaya@pssu.co.id', role: 'role-sales-admin', department: 'Penjualan', jobTitle: 'Sales Admin Supervisor', lastLogin: '2026-08-19T10:04:00.000Z' },
  { name: 'Maya Puspita', email: 'maya.puspita@pssu.co.id', role: 'role-sales-admin', department: 'Penjualan', jobTitle: 'Sales Administrator', lastLogin: '2026-08-18T04:31:00.000Z' },
  { name: 'Hendra Gunawan', email: 'hendra.gunawan@pssu.co.id', role: 'role-finance-manager', department: 'Keuangan', jobTitle: 'Treasury Officer', lastLogin: '2026-08-21T02:11:00.000Z' },
  { name: 'Ratna Dewi', email: 'ratna.dewi@pssu.co.id', role: 'role-accountant', department: 'Akuntansi', jobTitle: 'Tax Officer', lastLogin: '2026-08-17T08:47:00.000Z' },
  { name: 'Fajar Nugroho', email: 'fajar.nugroho@pssu.co.id', role: 'role-auditor', department: 'Audit Internal', jobTitle: 'Internal Auditor', lastLogin: '2026-08-14T03:05:00.000Z' },
  { name: 'Lestari Handayani', email: 'lestari.handayani@pssu.co.id', role: 'role-auditor', department: 'Audit Internal', jobTitle: 'Audit Supervisor', lastLogin: '2026-07-30T06:19:00.000Z' },
  { name: 'Yusuf Maulana', email: 'yusuf.maulana@pssu.co.id', role: 'role-sales-admin', department: 'Penjualan', jobTitle: 'Account Executive', status: 'Inactive', lastLogin: '2026-03-11T02:55:00.000Z' },
  { name: 'Nadia Safitri', email: 'nadia.safitri@pssu.co.id', role: 'role-admin', department: 'Teknologi Informasi', jobTitle: 'System Administrator', lastLogin: '2026-08-20T23:40:00.000Z' },
  { name: 'Iwan Setiawan', email: 'iwan.setiawan@pssu.co.id', role: 'role-finance-manager', department: 'Keuangan', jobTitle: 'Budget Controller', lastLogin: '2026-08-19T05:26:00.000Z' },
  { name: 'Putri Ayu Lestari', email: 'putri.ayu@pssu.co.id', role: 'role-accountant', department: 'Akuntansi', jobTitle: 'AP Officer', lastLogin: '2026-08-21T01:03:00.000Z' },
];

export const USERS: User[] = USER_SEEDS.map((seed, index) => {
  const role = ROLES.find((item) => item.id === seed.role)!;
  return {
    id: `usr-${padNumber(index + 1, 3)}`,
    name: seed.name,
    email: seed.email,
    phone: `08${rng.int(11, 89)}-${rng.int(1000, 9999)}-${rng.int(1000, 9999)}`,
    roleId: role.id,
    roleName: role.name,
    department: seed.department,
    jobTitle: seed.jobTitle,
    status: seed.status ?? 'Active',
    lastLoginAt: seed.lastLogin,
    initials: initialsOf(seed.name),
    createdAt: '2025-07-01T02:00:00.000Z',
    createdBy: 'Sistem',
    updatedAt: '2026-06-18T04:00:00.000Z',
    updatedBy: 'Rahmat Hidayat',
  } satisfies User;
});

export const CURRENT_USER = USERS[1]!;

const CUSTOMER_SEEDS: { name: string; legal: string; city: string; province: string; category: Customer['category']; term: number; credit: number }[] = [
  { name: 'PT Nusantara Digital', legal: 'PT Nusantara Digital Teknologi', city: 'Jakarta Selatan', province: 'DKI Jakarta', category: 'Corporate', term: 30, credit: 2_500_000_000 },
  { name: 'PT Sinar Abadi', legal: 'PT Sinar Abadi Sejahtera', city: 'Surabaya', province: 'Jawa Timur', category: 'Corporate', term: 45, credit: 1_800_000_000 },
  { name: 'PT Cipta Karya Mandiri', legal: 'PT Cipta Karya Mandiri Persada', city: 'Bandung', province: 'Jawa Barat', category: 'Corporate', term: 30, credit: 1_200_000_000 },
  { name: 'CV Berkah Jaya Teknik', legal: 'CV Berkah Jaya Teknik', city: 'Semarang', province: 'Jawa Tengah', category: 'Distributor', term: 14, credit: 450_000_000 },
  { name: 'PT Anugerah Logistik', legal: 'PT Anugerah Logistik Nusantara', city: 'Bekasi', province: 'Jawa Barat', category: 'Corporate', term: 30, credit: 900_000_000 },
  { name: 'Dinas Komunikasi dan Informatika DKI', legal: 'Pemerintah Provinsi DKI Jakarta', city: 'Jakarta Pusat', province: 'DKI Jakarta', category: 'Government', term: 60, credit: 3_000_000_000 },
  { name: 'PT Garuda Sentosa Perkasa', legal: 'PT Garuda Sentosa Perkasa', city: 'Tangerang', province: 'Banten', category: 'Corporate', term: 30, credit: 1_500_000_000 },
  { name: 'PT Mitra Sejahtera Utama', legal: 'PT Mitra Sejahtera Utama', city: 'Medan', province: 'Sumatera Utara', category: 'Distributor', term: 21, credit: 700_000_000 },
  { name: 'PT Bumi Persada Energi', legal: 'PT Bumi Persada Energi', city: 'Balikpapan', province: 'Kalimantan Timur', category: 'Corporate', term: 45, credit: 2_100_000_000 },
  { name: 'CV Karya Mulia Sentosa', legal: 'CV Karya Mulia Sentosa', city: 'Yogyakarta', province: 'DI Yogyakarta', category: 'Retail', term: 14, credit: 250_000_000 },
  { name: 'PT Samudera Biru Line', legal: 'PT Samudera Biru Line', city: 'Makassar', province: 'Sulawesi Selatan', category: 'Corporate', term: 30, credit: 1_100_000_000 },
  { name: 'Badan Pengelola Keuangan Daerah Jabar', legal: 'Pemerintah Provinsi Jawa Barat', city: 'Bandung', province: 'Jawa Barat', category: 'Government', term: 60, credit: 2_800_000_000 },
  { name: 'PT Trimitra Solusi Informatika', legal: 'PT Trimitra Solusi Informatika', city: 'Jakarta Barat', province: 'DKI Jakarta', category: 'Corporate', term: 30, credit: 1_350_000_000 },
  { name: 'PT Wahana Prima Sentosa', legal: 'PT Wahana Prima Sentosa', city: 'Surabaya', province: 'Jawa Timur', category: 'Distributor', term: 21, credit: 600_000_000 },
  { name: 'CV Duta Teknologi Nusantara', legal: 'CV Duta Teknologi Nusantara', city: 'Malang', province: 'Jawa Timur', category: 'Retail', term: 14, credit: 300_000_000 },
  { name: 'PT Indo Kreasi Global', legal: 'PT Indo Kreasi Global', city: 'Denpasar', province: 'Bali', category: 'Corporate', term: 30, credit: 850_000_000 },
  { name: 'PT Sentra Medika Utama', legal: 'PT Sentra Medika Utama', city: 'Jakarta Timur', province: 'DKI Jakarta', category: 'Corporate', term: 45, credit: 1_650_000_000 },
  { name: 'PT Agro Lestari Indonesia', legal: 'PT Agro Lestari Indonesia', city: 'Lampung', province: 'Lampung', category: 'Corporate', term: 30, credit: 950_000_000 },
  { name: 'CV Mandiri Teknik Perkasa', legal: 'CV Mandiri Teknik Perkasa', city: 'Solo', province: 'Jawa Tengah', category: 'Retail', term: 14, credit: 200_000_000 },
  { name: 'PT Bintang Timur Cemerlang', legal: 'PT Bintang Timur Cemerlang', city: 'Batam', province: 'Kepulauan Riau', category: 'Distributor', term: 21, credit: 780_000_000 },
  { name: 'PT Harmoni Data Prima', legal: 'PT Harmoni Data Prima', city: 'Jakarta Utara', province: 'DKI Jakarta', category: 'Corporate', term: 30, credit: 1_450_000_000 },
  { name: 'PT Cahaya Purnama Abadi', legal: 'PT Cahaya Purnama Abadi', city: 'Palembang', province: 'Sumatera Selatan', category: 'Corporate', term: 45, credit: 1_050_000_000 },
];

const STREETS = [
  'Jl. Jenderal Sudirman Kav. 52',
  'Jl. M. H. Thamrin No. 28',
  'Jl. Ahmad Yani No. 117',
  'Jl. Diponegoro No. 65',
  'Jl. Pemuda No. 143',
  'Jl. Gajah Mada No. 88',
  'Jl. Raya Darmo No. 210',
  'Jl. Asia Afrika No. 19',
];

const FIRST_NAMES = ['Agus', 'Rina', 'Doni', 'Sri', 'Eko', 'Wulan', 'Bayu', 'Indah', 'Rizky', 'Tuti', 'Hasan', 'Mira'];
const LAST_NAMES = ['Santoso', 'Wibowo', 'Halim', 'Pratama', 'Suryana', 'Kurniawan', 'Anggraini', 'Firmansyah', 'Rahayu', 'Saputra'];

function contactName(): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function domainOf(name: string): string {
  return `${name
    .replace(/^(PT|CV|Dinas|Badan)\s+/i, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '')
    .slice(0, 16)}.co.id`;
}

export const CUSTOMERS: Customer[] = CUSTOMER_SEEDS.map((seed, index) => ({
  id: `cust-${padNumber(index + 1, 3)}`,
  code: `CUST-${padNumber(index + 1, 4)}`,
  name: seed.name,
  legalName: seed.legal,
  taxId: `${padNumber(rng.int(1, 89), 2)}.${padNumber(rng.int(100, 999), 3)}.${padNumber(rng.int(100, 999), 3)}.${rng.int(1, 9)}-${padNumber(rng.int(1, 999), 3)}.000`,
  email: `finance@${domainOf(seed.name)}`,
  phone: `0${rng.int(21, 61)}-${rng.int(3000, 9999)}-${rng.int(1000, 9999)}`,
  contactPerson: contactName(),
  address: rng.pick(STREETS),
  city: seed.city,
  province: seed.province,
  postalCode: String(rng.int(10110, 80361)),
  paymentTermDays: seed.term,
  creditLimit: seed.credit,
  outstandingBalance: 0,
  totalBilled: 0,
  status: index === 18 ? 'Inactive' : 'Active',
  category: seed.category,
  notes: '',
  createdAt: '2025-07-05T03:00:00.000Z',
  createdBy: 'Andi Wijaya',
  updatedAt: '2026-07-12T05:00:00.000Z',
  updatedBy: 'Maya Puspita',
}));

const VENDOR_SEEDS: { name: string; legal: string; city: string; province: string; category: Vendor['category']; term: number; bank: string }[] = [
  { name: 'PT Sumber Rejeki Utama', legal: 'PT Sumber Rejeki Utama', city: 'Jakarta Barat', province: 'DKI Jakarta', category: 'Goods', term: 30, bank: 'Bank Mandiri' },
  { name: 'PT Teknologi Andalan Nusantara', legal: 'PT Teknologi Andalan Nusantara', city: 'Jakarta Selatan', province: 'DKI Jakarta', category: 'Services', term: 30, bank: 'Bank Central Asia' },
  { name: 'CV Cahaya Elektrindo', legal: 'CV Cahaya Elektrindo', city: 'Tangerang', province: 'Banten', category: 'Goods', term: 21, bank: 'Bank Negara Indonesia' },
  { name: 'PT Logistik Cepat Indonesia', legal: 'PT Logistik Cepat Indonesia', city: 'Bekasi', province: 'Jawa Barat', category: 'Logistics', term: 14, bank: 'Bank Rakyat Indonesia' },
  { name: 'PT Perkasa Konsultan Pajak', legal: 'PT Perkasa Konsultan Pajak', city: 'Jakarta Pusat', province: 'DKI Jakarta', category: 'Professional', term: 30, bank: 'Bank Mandiri' },
  { name: 'PT PLN (Persero) Area Jakarta', legal: 'PT Perusahaan Listrik Negara (Persero)', city: 'Jakarta Selatan', province: 'DKI Jakarta', category: 'Utilities', term: 20, bank: 'Bank Mandiri' },
  { name: 'PT Telekomunikasi Indonesia', legal: 'PT Telkom Indonesia (Persero) Tbk', city: 'Bandung', province: 'Jawa Barat', category: 'Utilities', term: 20, bank: 'Bank Mandiri' },
  { name: 'CV Grafika Mandiri Press', legal: 'CV Grafika Mandiri Press', city: 'Jakarta Timur', province: 'DKI Jakarta', category: 'Goods', term: 14, bank: 'Bank Central Asia' },
  { name: 'PT Sentosa Properti Manajemen', legal: 'PT Sentosa Properti Manajemen', city: 'Jakarta Selatan', province: 'DKI Jakarta', category: 'Services', term: 30, bank: 'Bank Central Asia' },
  { name: 'PT Armada Trans Nusantara', legal: 'PT Armada Trans Nusantara', city: 'Surabaya', province: 'Jawa Timur', category: 'Logistics', term: 21, bank: 'Bank Negara Indonesia' },
  { name: 'PT Karya Hukum Bersama', legal: 'PT Karya Hukum Bersama', city: 'Jakarta Pusat', province: 'DKI Jakarta', category: 'Professional', term: 30, bank: 'Bank Mandiri' },
  { name: 'CV Mitra Komputindo', legal: 'CV Mitra Komputindo', city: 'Depok', province: 'Jawa Barat', category: 'Goods', term: 14, bank: 'Bank Rakyat Indonesia' },
  { name: 'PT Asuransi Jaya Proteksi', legal: 'PT Asuransi Jaya Proteksi', city: 'Jakarta Selatan', province: 'DKI Jakarta', category: 'Services', term: 30, bank: 'Bank Central Asia' },
  { name: 'PT Global Training Center', legal: 'PT Global Training Center', city: 'Jakarta Selatan', province: 'DKI Jakarta', category: 'Professional', term: 21, bank: 'Bank Mandiri' },
  { name: 'CV Sinar Purnama Supply', legal: 'CV Sinar Purnama Supply', city: 'Bogor', province: 'Jawa Barat', category: 'Goods', term: 14, bank: 'Bank Negara Indonesia' },
  { name: 'PT Nusa Media Kreatif', legal: 'PT Nusa Media Kreatif', city: 'Jakarta Barat', province: 'DKI Jakarta', category: 'Services', term: 30, bank: 'Bank Central Asia' },
  { name: 'PT Aneka Gas Industri', legal: 'PT Aneka Gas Industri Tbk', city: 'Jakarta Timur', province: 'DKI Jakarta', category: 'Utilities', term: 20, bank: 'Bank Mandiri' },
  { name: 'CV Prima Servis Kendaraan', legal: 'CV Prima Servis Kendaraan', city: 'Jakarta Selatan', province: 'DKI Jakarta', category: 'Services', term: 14, bank: 'Bank Rakyat Indonesia' },
];

export const VENDORS: Vendor[] = VENDOR_SEEDS.map((seed, index) => ({
  id: `vend-${padNumber(index + 1, 3)}`,
  code: `VEND-${padNumber(index + 1, 4)}`,
  name: seed.name,
  legalName: seed.legal,
  taxId: `${padNumber(rng.int(1, 89), 2)}.${padNumber(rng.int(100, 999), 3)}.${padNumber(rng.int(100, 999), 3)}.${rng.int(1, 9)}-${padNumber(rng.int(1, 999), 3)}.000`,
  email: `billing@${domainOf(seed.name)}`,
  phone: `0${rng.int(21, 61)}-${rng.int(3000, 9999)}-${rng.int(1000, 9999)}`,
  contactPerson: contactName(),
  address: rng.pick(STREETS),
  city: seed.city,
  province: seed.province,
  postalCode: String(rng.int(10110, 80361)),
  paymentTermDays: seed.term,
  bankName: seed.bank,
  bankAccount: `${rng.int(100, 999)}-${rng.int(10, 99)}-${rng.int(100000, 999999)}`,
  outstandingBalance: 0,
  totalPurchased: 0,
  status: index === 17 ? 'Inactive' : 'Active',
  category: seed.category,
  notes: '',
  createdAt: '2025-07-05T03:00:00.000Z',
  createdBy: 'Putri Ayu Lestari',
  updatedAt: '2026-06-28T05:00:00.000Z',
  updatedBy: 'Putri Ayu Lestari',
}));

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-001', name: 'Bank Mandiri - Operasional', accountNumber: '123-00-9876543-2', bankName: 'Bank Mandiri',
    branch: 'KCP Jakarta Rasuna Said', holderName: 'PT Prima Sarana Sistem Utama', glAccountId: 'acc-1-1201', glAccountCode: '1-1201',
    currency: 'IDR', openingBalance: 1_450_000_000, currentBalance: 0, kind: 'Bank', status: 'Active',
    createdAt: '2025-07-01T02:00:00.000Z', createdBy: 'Sistem', updatedAt: '2026-08-01T02:00:00.000Z', updatedBy: 'Hendra Gunawan',
  },
  {
    id: 'bank-002', name: 'Bank Central Asia - Penerimaan', accountNumber: '548-011-2233', bankName: 'Bank Central Asia',
    branch: 'KCU Sudirman', holderName: 'PT Prima Sarana Sistem Utama', glAccountId: 'acc-1-1202', glAccountCode: '1-1202',
    currency: 'IDR', openingBalance: 980_000_000, currentBalance: 0, kind: 'Bank', status: 'Active',
    createdAt: '2025-07-01T02:00:00.000Z', createdBy: 'Sistem', updatedAt: '2026-08-01T02:00:00.000Z', updatedBy: 'Hendra Gunawan',
  },
  {
    id: 'bank-003', name: 'Bank Negara Indonesia - Payroll', accountNumber: '077-123-4455', bankName: 'Bank Negara Indonesia',
    branch: 'KCP Kuningan', holderName: 'PT Prima Sarana Sistem Utama', glAccountId: 'acc-1-1203', glAccountCode: '1-1203',
    currency: 'IDR', openingBalance: 420_000_000, currentBalance: 0, kind: 'Bank', status: 'Active',
    createdAt: '2025-07-01T02:00:00.000Z', createdBy: 'Sistem', updatedAt: '2026-08-01T02:00:00.000Z', updatedBy: 'Hendra Gunawan',
  },
  {
    id: 'bank-004', name: 'Bank Rakyat Indonesia - Cadangan', accountNumber: '002-105-6789-501', bankName: 'Bank Rakyat Indonesia',
    branch: 'KCP Setiabudi', holderName: 'PT Prima Sarana Sistem Utama', glAccountId: 'acc-1-1204', glAccountCode: '1-1204',
    currency: 'IDR', openingBalance: 310_000_000, currentBalance: 0, kind: 'Bank', status: 'Active',
    createdAt: '2025-07-01T02:00:00.000Z', createdBy: 'Sistem', updatedAt: '2026-08-01T02:00:00.000Z', updatedBy: 'Hendra Gunawan',
  },
  {
    id: 'bank-005', name: 'Kas Besar Kantor Pusat', accountNumber: 'KAS-BESAR-01', bankName: 'Kas Internal',
    branch: 'Kantor Pusat', holderName: 'PT Prima Sarana Sistem Utama', glAccountId: 'acc-1-1102', glAccountCode: '1-1102',
    currency: 'IDR', openingBalance: 180_000_000, currentBalance: 0, kind: 'Cash', status: 'Active',
    createdAt: '2025-07-01T02:00:00.000Z', createdBy: 'Sistem', updatedAt: '2026-08-01T02:00:00.000Z', updatedBy: 'Siti Nurhaliza',
  },
  {
    id: 'bank-006', name: 'Kas Kecil Operasional', accountNumber: 'KAS-KECIL-01', bankName: 'Kas Internal',
    branch: 'Kantor Pusat', holderName: 'PT Prima Sarana Sistem Utama', glAccountId: 'acc-1-1101', glAccountCode: '1-1101',
    currency: 'IDR', openingBalance: 25_000_000, currentBalance: 0, kind: 'Cash', status: 'Active',
    createdAt: '2025-07-01T02:00:00.000Z', createdBy: 'Sistem', updatedAt: '2026-08-01T02:00:00.000Z', updatedBy: 'Siti Nurhaliza',
  },
];

const CATEGORY_SEEDS: { code: string; name: string; gl: string; glName: string; budget: number; inactive?: boolean }[] = [
  { code: 'EXC-01', name: 'Sewa Kantor', gl: '6-1100', glName: 'Beban Sewa Kantor', budget: 185_000_000 },
  { code: 'EXC-02', name: 'Listrik, Air dan Gas', gl: '6-1200', glName: 'Beban Listrik, Air dan Gas', budget: 65_000_000 },
  { code: 'EXC-03', name: 'Telepon dan Internet', gl: '6-1300', glName: 'Beban Telepon dan Internet', budget: 42_000_000 },
  { code: 'EXC-04', name: 'Perjalanan Dinas', gl: '6-1400', glName: 'Beban Perjalanan Dinas', budget: 95_000_000 },
  { code: 'EXC-05', name: 'Perlengkapan Kantor', gl: '6-1500', glName: 'Beban Perlengkapan Kantor', budget: 38_000_000 },
  { code: 'EXC-06', name: 'Pemasaran dan Promosi', gl: '6-1600', glName: 'Beban Pemasaran dan Promosi', budget: 120_000_000 },
  { code: 'EXC-07', name: 'Jasa Profesional', gl: '6-1800', glName: 'Beban Jasa Profesional', budget: 88_000_000 },
  { code: 'EXC-08', name: 'Pemeliharaan dan Perbaikan', gl: '6-1900', glName: 'Beban Pemeliharaan dan Perbaikan', budget: 55_000_000 },
  { code: 'EXC-09', name: 'Asuransi', gl: '6-2000', glName: 'Beban Asuransi', budget: 46_000_000 },
  { code: 'EXC-10', name: 'Pelatihan Karyawan', gl: '6-2100', glName: 'Beban Pelatihan Karyawan', budget: 60_000_000 },
  { code: 'EXC-11', name: 'Transportasi dan Pengiriman', gl: '6-2200', glName: 'Beban Transportasi dan Pengiriman', budget: 72_000_000 },
  { code: 'EXC-12', name: 'Administrasi Bank', gl: '6-9000', glName: 'Beban Administrasi Bank', budget: 12_000_000 },
  { code: 'EXC-13', name: 'Konsumsi dan Rapat', gl: '6-2300', glName: 'Beban Konsumsi dan Rapat', budget: 18_000_000, inactive: true },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = CATEGORY_SEEDS.map((seed, index) => ({
  id: `excat-${padNumber(index + 1, 3)}`,
  code: seed.code,
  name: seed.name,
  glAccountId: `acc-${seed.gl}`,
  glAccountCode: seed.gl,
  glAccountName: seed.glName,
  monthlyBudget: seed.budget,
  spentThisMonth: 0,
  status: seed.inactive ? 'Inactive' : 'Active',
  description: `Pos biaya untuk ${seed.name.toLowerCase()} yang dibebankan ke akun ${seed.gl}.`,
  createdAt: '2025-07-01T02:00:00.000Z',
  createdBy: 'Sistem',
  updatedAt: '2026-05-20T02:00:00.000Z',
  updatedBy: 'Bambang Prasetyo',
}));
