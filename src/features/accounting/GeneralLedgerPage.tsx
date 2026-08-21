import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search } from 'lucide-react';
import type { DateRange, LedgerEntry } from '@/types';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { SelectInput, TextInput } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { ReportToolbar } from '@/components/reports/ReportToolbar';
import { ReportHeading } from '@/components/reports/ReportHeading';
import { formatCurrency } from '@/utils/format';
import { describeRange, formatDate, resolvePeriod, type PeriodPresetKey } from '@/utils/date';
import { exportToCsv, exportToExcel, printDocument } from '@/utils/export';

export default function GeneralLedgerPage() {
  useDocumentTitle('Buku Besar');
  const [searchParams, setSearchParams] = useSearchParams();
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('year-to-date');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('year-to-date'));
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: accountOptions } = useQuery({
    queryKey: queryKeys.accounts.options,
    queryFn: () => accountingService.accountOptions(),
  });

  const accountId = searchParams.get('accountId') ?? accountOptions?.[0]?.value ?? '';

  const params = useMemo(
    () => ({ accountId, from: range.from, to: range.to, search: debouncedSearch }),
    [accountId, range, debouncedSearch],
  );

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.generalLedger(params),
    queryFn: () => accountingService.generalLedger(params),
    enabled: Boolean(accountId),
  });

  const columns: Column<LedgerEntry>[] = [
    {
      id: 'date',
      header: 'Tanggal',
      width: '8rem',
      cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span>,
    },
    {
      id: 'journal',
      header: 'Nomor Jurnal',
      width: '11.5rem',
      cell: (row) => (
        <Link to={`/accounting/journal-entries/${row.journalId}`} className="tabular font-medium text-brand-700 hover:underline">
          {row.journalNumber}
        </Link>
      ),
    },
    {
      id: 'reference',
      header: 'Referensi',
      hideBelow: 'lg',
      width: '11.5rem',
      cell: (row) => <span className="tabular text-ink-600">{row.reference}</span>,
    },
    {
      id: 'description',
      header: 'Keterangan',
      minWidth: '20rem',
      cell: (row) => <span className="line-clamp-1 text-ink-700">{row.description}</span>,
    },
    {
      id: 'source',
      header: 'Sumber',
      hideBelow: 'xl',
      width: '9.5rem',
      cell: (row) => <Badge tone="muted">{row.source}</Badge>,
    },
    {
      id: 'debit',
      header: 'Debit',
      align: 'right',
      width: '9.5rem',
      cell: (row) => (row.debit > 0 ? formatCurrency(row.debit, 'IDR', { withSymbol: false }) : '—'),
    },
    {
      id: 'credit',
      header: 'Kredit',
      align: 'right',
      width: '9.5rem',
      cell: (row) => (row.credit > 0 ? formatCurrency(row.credit, 'IDR', { withSymbol: false }) : '—'),
    },
    {
      id: 'balance',
      header: 'Saldo',
      align: 'right',
      width: '11.5rem',
      cell: (row) => (
        <span className={row.runningBalance < 0 ? 'font-medium text-negative-700' : 'font-medium text-ink-900'}>
          {formatCurrency(row.runningBalance, 'IDR', { withSymbol: false })}
        </span>
      ),
    },
  ];

  const exportColumns = [
    { header: 'Tanggal', value: (row: LedgerEntry) => row.date },
    { header: 'Nomor Jurnal', value: (row: LedgerEntry) => row.journalNumber },
    { header: 'Referensi', value: (row: LedgerEntry) => row.reference },
    { header: 'Keterangan', value: (row: LedgerEntry) => row.description },
    { header: 'Sumber', value: (row: LedgerEntry) => row.source },
    { header: 'Debit', value: (row: LedgerEntry) => row.debit },
    { header: 'Kredit', value: (row: LedgerEntry) => row.credit },
    { header: 'Saldo Berjalan', value: (row: LedgerEntry) => row.runningBalance },
  ];

  const fileName = `buku-besar-${data?.accountCode ?? 'akun'}`;
  const subtitle = data ? `${data.accountCode} · ${data.accountName} — ${describeRange(range)}` : '';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buku Besar"
        description="Rincian mutasi setiap akun beserta saldo berjalan pada periode yang dipilih."
      />

      <Panel>
        <ReportToolbar
          refreshing={isFetching}
          onRefresh={() => refetch()}
          onPrint={printDocument}
          onExportPdf={() => {
            printDocument();
            toast.info('Cetak ke PDF', 'Pilih "Save as PDF" pada dialog cetak untuk menyimpan berkas.');
          }}
          onExportExcel={() => {
            exportToExcel(fileName, exportColumns, data?.entries ?? [], {
              title: 'Buku Besar',
              subtitle,
            });
            toast.success('Ekspor selesai', 'Berkas Excel buku besar telah diunduh.');
          }}
          disabled={!data?.entries.length}
          extra={
            <button
              type="button"
              onClick={() => {
                exportToCsv(fileName, exportColumns, data?.entries ?? []);
                toast.success('Ekspor selesai', 'Berkas CSV buku besar telah diunduh.');
              }}
              disabled={!data?.entries.length}
              className="h-9 rounded-md border border-ink-300 px-3.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-400"
            >
              CSV
            </button>
          }
          filters={
            <>
              <SelectInput
                className="w-full sm:w-80"
                aria-label="Pilih akun"
                value={accountId}
                onChange={(event) =>
                  setSearchParams((current) => {
                    const next = new URLSearchParams(current);
                    next.set('accountId', event.target.value);
                    return next;
                  })
                }
              >
                {(accountOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>

              <DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />

              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
                <TextInput
                  className="pl-9"
                  placeholder="Cari transaksi"
                  aria-label="Cari transaksi buku besar"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </>
          }
        />

        <ReportHeading title="Buku Besar" periodLabel={subtitle} />

        {data ? (
          <SummaryBar
            className="lg:grid-cols-5"
            items={[
              { label: 'Akun', value: <span className="text-[13px]">{`${data.accountCode} · ${data.accountName}`}</span> },
              { label: 'Saldo Awal', value: formatCurrency(data.openingBalance) },
              { label: 'Total Debit', value: formatCurrency(data.totalDebit) },
              { label: 'Total Kredit', value: formatCurrency(data.totalCredit) },
              {
                label: 'Saldo Akhir',
                value: formatCurrency(data.closingBalance),
                tone: data.closingBalance < 0 ? 'negative' : 'neutral',
              },
            ]}
          />
        ) : null}

        <DataTable
          columns={columns}
          rows={data?.entries ?? []}
          rowKey={(row) => row.id}
          loading={isPending}
          error={isError ? new Error('Buku besar tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          emptyIcon={<BookOpen className="size-5" />}
          emptyTitle="Tidak ada mutasi pada periode ini"
          emptyDescription="Pilih akun lain atau perluas rentang tanggal untuk menampilkan transaksi."
        />
      </Panel>

      <PanelHeader
        className="rounded-md border border-ink-200 bg-white shadow-panel"
        compact
        title="Catatan"
        description="Saldo berjalan dihitung dari saldo awal periode ditambah seluruh mutasi yang telah diposting, mengikuti sifat saldo normal akun."
      />
    </div>
  );
}
