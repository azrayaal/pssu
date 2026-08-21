# PTSU Accounting

Frontend untuk platform manajemen keuangan dan akuntansi PT PTSU Indonesia. Dibangun dengan
React, TypeScript, Vite, dan Tailwind CSS. Seluruh data saat ini dilayani oleh mock server
yang berjalan di browser, dengan lapisan transport yang dapat ditukar ke REST API tanpa
mengubah satu pun komponen UI.

## Menjalankan aplikasi

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # jalankan hasil build
```

## Deployment (Vercel)

`vercel.json` sudah disiapkan dan tidak memerlukan konfigurasi tambahan di dashboard:

- **Rewrite SPA** mengarahkan seluruh path ke `index.html`, sehingga membuka atau me-refresh
  rute seperti `/reports/profit-loss` tidak lagi menghasilkan 404. Pola `/((?!assets/).*)`
  sengaja mengecualikan `assets/` agar berkas JavaScript yang benar-benar hilang tetap
  menghasilkan 404 dan bukan HTML, sehingga galat `Unexpected token '<'` akibat `index.html`
  basi yang menunjuk chunk lama tidak terjadi.
- **Header cache**: berkas di `assets/` bernama hash sehingga aman di-cache permanen, sedangkan
  `index.html` selalu divalidasi ulang agar deploy baru langsung terpakai.

Tanpa variabel lingkungan apa pun, aplikasi berjalan dengan mock server. Untuk menyambungkan
backend, set `VITE_API_MODE=rest` dan `VITE_API_BASE_URL` pada Environment Variables Vercel.

## Stack

| Lapisan | Teknologi |
| --- | --- |
| UI | React 19, TypeScript (strict), Tailwind CSS v4 |
| Routing | React Router 7 (lazy route per halaman) |
| Server state | TanStack Query v5 |
| UI state | Zustand (persist) |
| Form | React Hook Form + Zod v4 |
| Grafik | Recharts 3 |
| Ikon | Lucide React |

## Struktur direktori

```text
src/
├── app/            Router, provider, konfigurasi navigasi, error boundary
├── components/
│   ├── ui/         Primitif desain (Button, Field, Modal, Drawer, Badge, Toaster, ...)
│   ├── layout/     AppShell, Sidebar, Topbar, Breadcrumbs, GlobalSearch, MobileNav
│   ├── forms/      FormSection, FormActions, LineItemsEditor
│   ├── tables/     DataTable generik, TableToolbar, RowActions
│   ├── charts/     Token warna tervalidasi, tooltip, legend, grafik keuangan
│   └── reports/    ReportToolbar, StatementTable, AgingReportView, ReportHeading
├── features/       Satu folder per modul bisnis, berisi halaman dan komponennya
├── hooks/          useTableQuery, useConfirm, useDebouncedValue, useMediaQuery
├── lib/            api-client, transport HTTP, query client, query keys, bootstrap
├── services/       Modul service per domain (satu-satunya pemanggil apiClient)
├── stores/         Zustand: UI, toast, konteks perusahaan
├── schemas/        Skema Zod untuk seluruh form
├── types/          Tipe domain akuntansi
├── mocks/          Seed data, mesin buku besar, router, dan handler mock
└── utils/          Format mata uang dan tanggal, ekspor CSV/Excel/cetak
```

## Arsitektur data

Seluruh angka pada aplikasi berasal dari satu buku besar berpasangan yang dihasilkan
`src/mocks/seed`. Dokumen sumber (faktur penjualan, pesanan pembelian, tagihan pemasok,
pengajuan biaya) dibuat lebih dulu, kemudian `seed/ledger.ts` menurunkan jurnal dari dokumen
tersebut ditambah entri berulang: penggajian, penyusutan, angsuran pinjaman, penyetoran PPN,
pengisian kas kecil, pemindahbukuan hasil penagihan, pembagian dividen, dan belanja modal.

Konsekuensinya:

- Setiap jurnal seimbang; total debit sama dengan total kredit.
- Saldo akun 1-1300 (Piutang Usaha) sama persis dengan total sisa tagihan seluruh pelanggan.
- Saldo akun 2-1100 (Utang Usaha) sama persis dengan total sisa utang seluruh pemasok.
- Neraca seimbang: Aset = Kewajiban + Ekuitas + Laba Tahun Berjalan.
- Neraca saldo, buku besar, laba rugi, neraca, dan arus kas dihitung ulang dari jurnal pada
  saat permintaan, bukan dari angka yang ditulis manual.

Periode data mencakup Juli 2024 sampai Agustus 2026 sehingga perbandingan tahun sebelumnya
pada laporan laba rugi memiliki data pembanding yang utuh.

## Mengganti mock dengan REST API

UI tidak pernah memanggil `fetch` secara langsung. Alurnya:

```text
Halaman → hook TanStack Query → services/*.service.ts → lib/api-client.ts → Transport
```

`Transport` adalah antarmuka dengan satu method:

```ts
interface Transport {
  request<T>(request: ApiRequest): Promise<T>;
}
```

`src/lib/bootstrap.ts` memilih implementasinya berdasarkan variabel lingkungan:

```bash
# .env
VITE_API_MODE=rest
VITE_API_BASE_URL=https://api.ptsu.co.id/v1
```

Dengan nilai tersebut, `createHttpTransport()` aktif dan seluruh pemanggilan service langsung
menuju backend. Tidak ada perubahan pada komponen, hook, atau service. Modul `src/mocks`
menjadi kode mati dan otomatis tidak ikut ter-bundle karena hanya diimpor secara dinamis.

Backend cukup menyediakan endpoint dengan path dan bentuk respons yang sama seperti yang
didefinisikan pada `src/mocks/handlers/*`. Daftar lengkapnya dapat dibaca dari tabel rute pada
`src/mocks/server.ts`.

### Kontrak yang perlu dipenuhi backend

| Bentuk | Digunakan oleh |
| --- | --- |
| `{ data, page, pageSize, total, totalPages }` | seluruh endpoint daftar |
| `{ value, label, description? }[]` | endpoint `*/options` untuk dropdown |
| `{ message, code, errors? }` dengan status 4xx/5xx | penanganan galat dan galat per-field |

`ApiError` memetakan `errors` ke `form.setError()` sehingga pesan validasi dari server
langsung muncul pada field terkait.

## Catatan implementasi

- **Tabel.** `DataTable` generik menangani sorting, kolom responsif, status muat, kosong, dan
  galat. State tabel disimpan pada query string melalui `useTableQuery`, sehingga hasil
  pencarian dan filter dapat dibagikan lewat tautan dan tombol kembali browser berfungsi.
- **Form.** Seluruh form memakai React Hook Form dengan resolver Zod. Tipe form dipisah antara
  input (`z.input`) dan output (`z.output`) agar nilai default pada skema tetap type-safe.
- **Jurnal.** Form jurnal umum menolak penyimpanan selama total debit dan kredit belum
  seimbang, dan mengosongkan sisi berlawanan saat salah satu kolom diisi.
- **Grafik.** Palet warna divalidasi terhadap keterbacaan penyandang buta warna dan kontras
  pada permukaan putih. Setiap grafik dengan dua seri atau lebih selalu menampilkan legenda.
- **Cetak.** Kelas `print-hidden` dan `print-region` mengatur tata letak cetak; setiap laporan
  memiliki kop dokumen yang hanya muncul pada hasil cetak.
# ptsu
