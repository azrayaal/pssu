export interface SalesCatalogItem {
  description: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
  revenueAccount: string;
  cogsRatio: number;
}

export const SALES_CATALOG: SalesCatalogItem[] = [
  { description: 'Implementasi Modul Akuntansi ERP', unit: 'Paket', minPrice: 85_000_000, maxPrice: 240_000_000, revenueAccount: '4-1000', cogsRatio: 0.42 },
  { description: 'Jasa Konsultasi Proses Bisnis Keuangan', unit: 'Man-day', minPrice: 4_500_000, maxPrice: 9_500_000, revenueAccount: '4-1000', cogsRatio: 0.38 },
  { description: 'Lisensi PSSU Core (per pengguna / tahun)', unit: 'Lisensi', minPrice: 3_200_000, maxPrice: 6_800_000, revenueAccount: '4-1200', cogsRatio: 0.18 },
  { description: 'Lisensi Modul Konsolidasi Multi Entitas', unit: 'Lisensi', minPrice: 12_000_000, maxPrice: 28_000_000, revenueAccount: '4-1200', cogsRatio: 0.2 },
  { description: 'Kontrak Pemeliharaan Sistem Tahunan', unit: 'Tahun', minPrice: 45_000_000, maxPrice: 160_000_000, revenueAccount: '4-1300', cogsRatio: 0.35 },
  { description: 'Pelatihan Pengguna Aplikasi Keuangan', unit: 'Batch', minPrice: 12_000_000, maxPrice: 35_000_000, revenueAccount: '4-1000', cogsRatio: 0.4 },
  { description: 'Pengadaan Server Aplikasi Rack Mount', unit: 'Unit', minPrice: 68_000_000, maxPrice: 145_000_000, revenueAccount: '4-1100', cogsRatio: 0.72 },
  { description: 'Pengadaan Perangkat Jaringan Enterprise', unit: 'Unit', minPrice: 22_000_000, maxPrice: 78_000_000, revenueAccount: '4-1100', cogsRatio: 0.7 },
  { description: 'Integrasi Host-to-Host Perbankan', unit: 'Paket', minPrice: 55_000_000, maxPrice: 130_000_000, revenueAccount: '4-1000', cogsRatio: 0.45 },
  { description: 'Kustomisasi Laporan Keuangan Regulator', unit: 'Paket', minPrice: 28_000_000, maxPrice: 92_000_000, revenueAccount: '4-1000', cogsRatio: 0.4 },
  { description: 'Migrasi Data Historis Buku Besar', unit: 'Paket', minPrice: 35_000_000, maxPrice: 88_000_000, revenueAccount: '4-1000', cogsRatio: 0.36 },
  { description: 'Dukungan Teknis Prioritas 24/7', unit: 'Bulan', minPrice: 8_500_000, maxPrice: 24_000_000, revenueAccount: '4-1300', cogsRatio: 0.34 },
];

export interface PurchaseCatalogItem {
  description: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
  expenseAccount: string;
  vendorCategory: 'Goods' | 'Services' | 'Logistics' | 'Utilities' | 'Professional';
}

export const PURCHASE_CATALOG: PurchaseCatalogItem[] = [
  { description: 'Sewa Ruang Kantor Lantai 18 Cyber 2', unit: 'Bulan', minPrice: 145_000_000, maxPrice: 195_000_000, expenseAccount: '6-1100', vendorCategory: 'Services' },
  { description: 'Langganan Internet Dedicated 200 Mbps', unit: 'Bulan', minPrice: 18_000_000, maxPrice: 26_000_000, expenseAccount: '6-1300', vendorCategory: 'Utilities' },
  { description: 'Tagihan Listrik Kantor Pusat', unit: 'Bulan', minPrice: 38_000_000, maxPrice: 62_000_000, expenseAccount: '6-1200', vendorCategory: 'Utilities' },
  { description: 'Jasa Subkontraktor Pengembangan Modul', unit: 'Man-day', minPrice: 3_200_000, maxPrice: 7_500_000, expenseAccount: '5-1200', vendorCategory: 'Services' },
  { description: 'Pengadaan Notebook Kerja Karyawan', unit: 'Unit', minPrice: 14_500_000, maxPrice: 32_000_000, expenseAccount: '6-1500', vendorCategory: 'Goods' },
  { description: 'Pengadaan Perangkat Jaringan untuk Dijual', unit: 'Unit', minPrice: 16_000_000, maxPrice: 54_000_000, expenseAccount: '1-1400', vendorCategory: 'Goods' },
  { description: 'Jasa Konsultan Pajak dan Kepatuhan', unit: 'Bulan', minPrice: 22_000_000, maxPrice: 48_000_000, expenseAccount: '6-1800', vendorCategory: 'Professional' },
  { description: 'Jasa Bantuan Hukum Korporasi', unit: 'Paket', minPrice: 18_000_000, maxPrice: 65_000_000, expenseAccount: '6-1800', vendorCategory: 'Professional' },
  { description: 'Premi Asuransi Aset dan Kendaraan', unit: 'Polis', minPrice: 24_000_000, maxPrice: 52_000_000, expenseAccount: '6-2000', vendorCategory: 'Services' },
  { description: 'Jasa Pengiriman Perangkat ke Klien', unit: 'Pengiriman', minPrice: 2_500_000, maxPrice: 12_000_000, expenseAccount: '6-2200', vendorCategory: 'Logistics' },
  { description: 'Media Placement Digital dan Cetak', unit: 'Kampanye', minPrice: 28_000_000, maxPrice: 95_000_000, expenseAccount: '6-1600', vendorCategory: 'Services' },
  { description: 'Servis Berkala Kendaraan Operasional', unit: 'Unit', minPrice: 3_800_000, maxPrice: 14_000_000, expenseAccount: '6-1900', vendorCategory: 'Services' },
  { description: 'Pelatihan Sertifikasi Profesional Staf', unit: 'Peserta', minPrice: 6_500_000, maxPrice: 18_000_000, expenseAccount: '6-2100', vendorCategory: 'Professional' },
  { description: 'Pengadaan Alat Tulis dan Perlengkapan', unit: 'Paket', minPrice: 4_200_000, maxPrice: 15_000_000, expenseAccount: '6-1500', vendorCategory: 'Goods' },
  { description: 'Cetak Dokumen dan Material Presentasi', unit: 'Paket', minPrice: 3_500_000, maxPrice: 16_000_000, expenseAccount: '6-1600', vendorCategory: 'Goods' },
];

export const EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  'EXC-01': ['Sewa ruang kantor bulan berjalan', 'Service charge gedung kantor pusat'],
  'EXC-02': ['Pembayaran tagihan listrik PLN', 'Tagihan air PAM dan gas kantor'],
  'EXC-03': ['Tagihan internet dedicated kantor', 'Tagihan telepon dan paket data korporat'],
  'EXC-04': ['Perjalanan dinas implementasi klien Surabaya', 'Akomodasi tim proyek Bandung', 'Tiket penerbangan tim pre-sales Makassar'],
  'EXC-05': ['Pembelian alat tulis kantor', 'Pengadaan tinta dan kertas printer', 'Perlengkapan pantry kantor'],
  'EXC-06': ['Kampanye digital marketing kuartalan', 'Sponsorship seminar keuangan', 'Produksi materi promosi produk'],
  'EXC-07': ['Retainer konsultan pajak bulanan', 'Jasa audit laporan keuangan', 'Jasa notaris perubahan akta'],
  'EXC-08': ['Pemeliharaan AC dan instalasi kantor', 'Perbaikan perangkat kerja karyawan', 'Servis genset kantor pusat'],
  'EXC-09': ['Premi asuransi kesehatan karyawan', 'Premi asuransi kendaraan operasional'],
  'EXC-10': ['Pelatihan sertifikasi akuntansi staf', 'Workshop implementasi PSAK terbaru'],
  'EXC-11': ['Pengiriman dokumen ke klien', 'Biaya kurir perangkat implementasi', 'Sewa kendaraan operasional proyek'],
  'EXC-12': ['Biaya administrasi rekening bank', 'Biaya transfer antar bank'],
  'EXC-13': ['Konsumsi rapat manajemen', 'Konsumsi pelatihan internal'],
};
