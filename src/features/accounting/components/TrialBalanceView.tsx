import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scale } from 'lucide-react';
import type { AccountType, DateRange, TrialBalanceRow } from '@/types';
import { ACCOUNT_TYPES } from '@/types';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Checkbox, SelectInput } from '@/components/ui/Field';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { EmptyState, TableSkeleton } from '@/components/ui/States';
import { ErrorState } from '@/components/ui/States';
import { ReportToolbar } from '@/components/reports/ReportToolbar';
import { ReportHeading } from '@/components/reports/ReportHeading';
import { formatCurrency } from '@/utils/format';
import { describeRange, resolvePeriod, type PeriodPresetKey } from '@/utils/date';
import { exportToCsv, exportToExcel, printDocument } from '@/utils/export';

export function TrialBalanceView({ linkToLedger = true }: { linkToLedger?: boolean }) {
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('year-to-date');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('year-to-date'));
  const [typeFilter, setTypeFilter] = useState<AccountType | ''>('');
  const [includeZero, setIncludeZero] = useState(false);

  const params = useMemo(
    () => ({ from: range.from, to: range.to, includeZero: String(includeZero) }),
    [range, includeZero],
  );

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.trialBalance(params),
    queryFn: () => accountingService.trialBalance(params),
  });

  const rows = useMemo(
    () => (data?.rows ?? []).filter((row) => (typeFilter ? row.type === typeFilter : true)),
    [data, typeFilter],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (accumulator, row) => ({
          debit: accumulator.debit + row.debit,
          credit: accumulator.credit + row.credit,
        }),
        { debit: 0, credit: 0 },
      ),
    [rows],
  );

  const balanced = Math.abs(totals.debit - totals.credit) < 1;
  const periodLabel = describeRange(range);

  const exportColumns = [
    { header: 'Kode Akun', value: (row: TrialBalanceRow) => row.code },
    { header: 'Nama Akun', value: (row: TrialBalanceRow) => row.name },
    { header: 'Tipe', value: (row: TrialBalanceRow) => row.type },
    { header: 'Debit', value: (row: TrialBalanceRow) => row.debit },
    { header: 'Kredit', value: (row: TrialBalanceRow) => row.credit },
  ];

  return (
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
          exportToExcel('neraca-saldo', exportColumns, rows, {
            title: 'Neraca Saldo',
            subtitle: `PT PTSU Indonesia — ${periodLabel}`,
          });
          toast.success('Ekspor selesai', 'Berkas Excel neraca saldo telah diunduh.');
        }}
        disabled={!rows.length}
        extra={
          <button
            type="button"
            disabled={!rows.length}
            onClick={() => {
              exportToCsv('neraca-saldo', exportColumns, rows);
              toast.success('Ekspor selesai', 'Berkas CSV neraca saldo telah diunduh.');
            }}
            className="h-9 rounded-md border border-ink-300 px-3.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-400"
          >
            CSV
          </button>
        }
        filters={
          <>
            <DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />
            <SelectInput
              className="w-40"
              aria-label="Filter tipe akun"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as AccountType | '')}
            >
              <option value="">Semua tipe akun</option>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
            <Checkbox
              label="Tampilkan akun bersaldo nol"
              checked={includeZero}
              onChange={(event) => setIncludeZero(event.target.checked)}
            />
          </>
        }
      />

      <ReportHeading title="Neraca Saldo" periodLabel={`Periode ${periodLabel}`} />

      <SummaryBar
        items={[
          { label: 'Jumlah Akun', value: rows.length },
          { label: 'Total Debit', value: formatCurrency(totals.debit) },
          { label: 'Total Kredit', value: formatCurrency(totals.credit) },
          {
            label: 'Selisih',
            value: formatCurrency(totals.debit - totals.credit),
            tone: balanced ? 'positive' : 'negative',
          },
        ]}
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isPending ? (
        <TableSkeleton rows={12} columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Scale className="size-5" />}
          title="Tidak ada saldo pada periode ini"
          description="Perluas rentang tanggal atau tampilkan akun bersaldo nol untuk melihat seluruh akun."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead className="bg-ink-50">
              <tr className="border-b border-ink-200">
                <th className="w-32 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Kode Akun
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Nama Akun
                </th>
                <th className="hidden w-32 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500 lg:table-cell">
                  Tipe
                </th>
                <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Debit
                </th>
                <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Kredit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((row) => (
                <tr key={row.accountId} className="hover:bg-ink-50">
                  <td className="tabular px-4 py-2 font-medium text-ink-800">
                    {linkToLedger ? (
                      <Link
                        to={`/accounting/general-ledger?accountId=${row.accountId}`}
                        className="text-brand-700 hover:underline"
                      >
                        {row.code}
                      </Link>
                    ) : (
                      row.code
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink-700">{row.name}</td>
                  <td className="hidden px-4 py-2 lg:table-cell">
                    <Badge tone="muted">{row.type}</Badge>
                  </td>
                  <td className="tabular px-4 py-2 text-right text-ink-900">
                    {row.debit > 0 ? formatCurrency(row.debit, 'IDR', { withSymbol: false }) : '—'}
                  </td>
                  <td className="tabular px-4 py-2 text-right text-ink-900">
                    {row.credit > 0 ? formatCurrency(row.credit, 'IDR', { withSymbol: false }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink-300 bg-ink-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-[13px] font-semibold text-ink-700">
                  Total
                </td>
                <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                  {formatCurrency(totals.debit, 'IDR', { withSymbol: false })}
                </td>
                <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                  {formatCurrency(totals.credit, 'IDR', { withSymbol: false })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-ink-200 px-4 py-3">
        <p className="text-[13px] text-ink-500">
          Neraca saldo disusun dari seluruh jurnal berstatus diposting pada periode {periodLabel}.
        </p>
        <Badge tone={balanced ? 'positive' : 'negative'}>{balanced ? 'Seimbang' : 'Tidak seimbang'}</Badge>
      </div>
    </Panel>
  );
}
