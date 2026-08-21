import type { Account, AccountSubtype, AccountType, NormalBalance } from '@/types';

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  parent: string | null;
  opening: number;
  isSystem?: boolean;
  inactive?: boolean;
  description?: string;
}

const NORMAL_BALANCE: Record<AccountType, NormalBalance> = {
  Asset: 'Debit',
  Expense: 'Debit',
  Liability: 'Credit',
  Equity: 'Credit',
  Revenue: 'Credit',
};

/** Opening balances are stated as at 01 Jul 2024 and must net to zero. */
export const ACCOUNT_SEEDS: AccountSeed[] = [
  { code: '1-0000', name: 'Aset', type: 'Asset', subtype: 'Current Asset', parent: null, opening: 0, isSystem: true, description: 'Kelompok induk seluruh aset perusahaan' },
  { code: '1-1000', name: 'Aset Lancar', type: 'Asset', subtype: 'Current Asset', parent: '1-0000', opening: 0, isSystem: true },
  { code: '1-1100', name: 'Kas', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: 0, isSystem: true },
  { code: '1-1101', name: 'Kas Kecil', type: 'Asset', subtype: 'Current Asset', parent: '1-1100', opening: 25_000_000 },
  { code: '1-1102', name: 'Kas Besar', type: 'Asset', subtype: 'Current Asset', parent: '1-1100', opening: 180_000_000 },
  { code: '1-1200', name: 'Bank', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: 0, isSystem: true },
  { code: '1-1201', name: 'Bank Mandiri - Operasional', type: 'Asset', subtype: 'Current Asset', parent: '1-1200', opening: 1_450_000_000 },
  { code: '1-1202', name: 'Bank Central Asia - Penerimaan', type: 'Asset', subtype: 'Current Asset', parent: '1-1200', opening: 980_000_000 },
  { code: '1-1203', name: 'Bank Negara Indonesia - Payroll', type: 'Asset', subtype: 'Current Asset', parent: '1-1200', opening: 420_000_000 },
  { code: '1-1204', name: 'Bank Rakyat Indonesia - Cadangan', type: 'Asset', subtype: 'Current Asset', parent: '1-1200', opening: 310_000_000 },
  { code: '1-1300', name: 'Piutang Usaha', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: 0, isSystem: true, description: 'Kontrol piutang dagang, dibentuk otomatis dari faktur penjualan' },
  { code: '1-1310', name: 'Cadangan Kerugian Piutang', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: -85_000_000 },
  { code: '1-1400', name: 'Persediaan Barang Dagang', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: 640_000_000 },
  { code: '1-1500', name: 'Uang Muka Pembelian', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: 125_000_000 },
  { code: '1-1600', name: 'PPN Masukan', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: 0, isSystem: true },
  { code: '1-1700', name: 'Biaya Dibayar di Muka', type: 'Asset', subtype: 'Current Asset', parent: '1-1000', opening: 210_000_000 },
  { code: '1-2000', name: 'Aset Tetap', type: 'Asset', subtype: 'Fixed Asset', parent: '1-0000', opening: 0, isSystem: true },
  { code: '1-2100', name: 'Tanah', type: 'Asset', subtype: 'Fixed Asset', parent: '1-2000', opening: 3_200_000_000 },
  { code: '1-2200', name: 'Bangunan', type: 'Asset', subtype: 'Fixed Asset', parent: '1-2000', opening: 2_400_000_000 },
  { code: '1-2210', name: 'Akumulasi Penyusutan Bangunan', type: 'Asset', subtype: 'Fixed Asset', parent: '1-2000', opening: -480_000_000 },
  { code: '1-2300', name: 'Kendaraan Operasional', type: 'Asset', subtype: 'Fixed Asset', parent: '1-2000', opening: 1_150_000_000 },
  { code: '1-2310', name: 'Akumulasi Penyusutan Kendaraan', type: 'Asset', subtype: 'Fixed Asset', parent: '1-2000', opening: -395_000_000 },
  { code: '1-2400', name: 'Peralatan Kantor', type: 'Asset', subtype: 'Fixed Asset', parent: '1-2000', opening: 780_000_000 },
  { code: '1-2410', name: 'Akumulasi Penyusutan Peralatan', type: 'Asset', subtype: 'Fixed Asset', parent: '1-2000', opening: -265_000_000 },
  { code: '1-3000', name: 'Aset Tidak Berwujud', type: 'Asset', subtype: 'Other Asset', parent: '1-0000', opening: 340_000_000 },

  { code: '2-0000', name: 'Kewajiban', type: 'Liability', subtype: 'Current Liability', parent: null, opening: 0, isSystem: true },
  { code: '2-1000', name: 'Kewajiban Lancar', type: 'Liability', subtype: 'Current Liability', parent: '2-0000', opening: 0, isSystem: true },
  { code: '2-1100', name: 'Utang Usaha', type: 'Liability', subtype: 'Current Liability', parent: '2-1000', opening: 0, isSystem: true, description: 'Kontrol utang dagang, dibentuk otomatis dari faktur pembelian' },
  { code: '2-1200', name: 'Utang Gaji', type: 'Liability', subtype: 'Current Liability', parent: '2-1000', opening: 185_000_000 },
  { code: '2-1300', name: 'Utang PPh Pasal 21', type: 'Liability', subtype: 'Current Liability', parent: '2-1000', opening: 47_500_000 },
  { code: '2-1310', name: 'Utang PPh Pasal 23', type: 'Liability', subtype: 'Current Liability', parent: '2-1000', opening: 22_000_000 },
  { code: '2-1400', name: 'PPN Keluaran', type: 'Liability', subtype: 'Current Liability', parent: '2-1000', opening: 0, isSystem: true },
  { code: '2-1500', name: 'Uang Muka Penjualan', type: 'Liability', subtype: 'Current Liability', parent: '2-1000', opening: 165_000_000 },
  { code: '2-1600', name: 'Biaya Yang Masih Harus Dibayar', type: 'Liability', subtype: 'Current Liability', parent: '2-1000', opening: 93_500_000 },
  { code: '2-2000', name: 'Kewajiban Jangka Panjang', type: 'Liability', subtype: 'Long Term Liability', parent: '2-0000', opening: 0, isSystem: true },
  { code: '2-2100', name: 'Utang Bank Jangka Panjang', type: 'Liability', subtype: 'Long Term Liability', parent: '2-2000', opening: 1_800_000_000 },
  { code: '2-2200', name: 'Utang Sewa Pembiayaan', type: 'Liability', subtype: 'Long Term Liability', parent: '2-2000', opening: 420_000_000 },

  { code: '3-0000', name: 'Ekuitas', type: 'Equity', subtype: 'Equity', parent: null, opening: 0, isSystem: true },
  { code: '3-1000', name: 'Modal Disetor', type: 'Equity', subtype: 'Equity', parent: '3-0000', opening: 5_000_000_000 },
  { code: '3-2000', name: 'Laba Ditahan', type: 'Equity', subtype: 'Equity', parent: '3-0000', opening: 3_492_000_000 },
  { code: '3-3000', name: 'Laba Tahun Berjalan', type: 'Equity', subtype: 'Equity', parent: '3-0000', opening: 0, isSystem: true },
  { code: '3-4000', name: 'Prive dan Dividen', type: 'Equity', subtype: 'Equity', parent: '3-0000', opening: -240_000_000 },

  { code: '4-0000', name: 'Pendapatan', type: 'Revenue', subtype: 'Operating Revenue', parent: null, opening: 0, isSystem: true },
  { code: '4-1000', name: 'Pendapatan Jasa Konsultasi', type: 'Revenue', subtype: 'Operating Revenue', parent: '4-0000', opening: 0 },
  { code: '4-1100', name: 'Pendapatan Penjualan Barang', type: 'Revenue', subtype: 'Operating Revenue', parent: '4-0000', opening: 0 },
  { code: '4-1200', name: 'Pendapatan Lisensi Perangkat Lunak', type: 'Revenue', subtype: 'Operating Revenue', parent: '4-0000', opening: 0 },
  { code: '4-1300', name: 'Pendapatan Pemeliharaan Sistem', type: 'Revenue', subtype: 'Operating Revenue', parent: '4-0000', opening: 0 },
  { code: '4-9000', name: 'Pendapatan Lain-lain', type: 'Revenue', subtype: 'Other Revenue', parent: '4-0000', opening: 0 },
  { code: '4-9100', name: 'Pendapatan Bunga Bank', type: 'Revenue', subtype: 'Other Revenue', parent: '4-0000', opening: 0 },

  { code: '5-0000', name: 'Harga Pokok Penjualan', type: 'Expense', subtype: 'Cost of Goods Sold', parent: null, opening: 0, isSystem: true },
  { code: '5-1000', name: 'Harga Pokok Barang Terjual', type: 'Expense', subtype: 'Cost of Goods Sold', parent: '5-0000', opening: 0 },
  { code: '5-1100', name: 'Biaya Proyek Langsung', type: 'Expense', subtype: 'Cost of Goods Sold', parent: '5-0000', opening: 0 },
  { code: '5-1200', name: 'Biaya Subkontraktor', type: 'Expense', subtype: 'Cost of Goods Sold', parent: '5-0000', opening: 0 },

  { code: '6-0000', name: 'Beban Operasional', type: 'Expense', subtype: 'Operating Expense', parent: null, opening: 0, isSystem: true },
  { code: '6-1000', name: 'Beban Gaji dan Tunjangan', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1100', name: 'Beban Sewa Kantor', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1200', name: 'Beban Listrik, Air dan Gas', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1300', name: 'Beban Telepon dan Internet', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1400', name: 'Beban Perjalanan Dinas', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1500', name: 'Beban Perlengkapan Kantor', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1600', name: 'Beban Pemasaran dan Promosi', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1700', name: 'Beban Penyusutan', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1800', name: 'Beban Jasa Profesional', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-1900', name: 'Beban Pemeliharaan dan Perbaikan', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-2000', name: 'Beban Asuransi', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-2100', name: 'Beban Pelatihan Karyawan', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-2200', name: 'Beban Transportasi dan Pengiriman', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0 },
  { code: '6-2300', name: 'Beban Konsumsi dan Rapat', type: 'Expense', subtype: 'Operating Expense', parent: '6-0000', opening: 0, inactive: true },
  { code: '6-9000', name: 'Beban Administrasi Bank', type: 'Expense', subtype: 'Other Expense', parent: '6-0000', opening: 0 },
  { code: '6-9100', name: 'Beban Bunga Pinjaman', type: 'Expense', subtype: 'Other Expense', parent: '6-0000', opening: 0 },
  { code: '6-9200', name: 'Beban Selisih Kurs', type: 'Expense', subtype: 'Other Expense', parent: '6-0000', opening: 0, inactive: true },
];

export function buildAccounts(): Account[] {
  const byCode = new Map<string, AccountSeed>();
  ACCOUNT_SEEDS.forEach((seed) => byCode.set(seed.code, seed));

  const levelOf = (seed: AccountSeed): number => {
    let level = 0;
    let cursor = seed.parent;
    while (cursor) {
      level += 1;
      cursor = byCode.get(cursor)?.parent ?? null;
    }
    return level;
  };

  return ACCOUNT_SEEDS.map((seed, index) => {
    const parent = seed.parent ? byCode.get(seed.parent) : undefined;
    return {
      id: `acc-${seed.code}`,
      code: seed.code,
      name: seed.name,
      type: seed.type,
      subtype: seed.subtype,
      parentId: parent ? `acc-${parent.code}` : null,
      parentCode: parent?.code ?? null,
      parentName: parent?.name ?? null,
      normalBalance: NORMAL_BALANCE[seed.type],
      balance: 0,
      openingBalance: seed.opening,
      status: seed.inactive ? 'Inactive' : 'Active',
      isSystem: Boolean(seed.isSystem),
      description: seed.description ?? '',
      level: levelOf(seed),
      createdAt: '2024-07-01T08:00:00.000Z',
      createdBy: 'Sistem',
      updatedAt: `2024-07-0${(index % 8) + 1}T08:00:00.000Z`,
      updatedBy: 'Sistem',
    } satisfies Account;
  });
}
