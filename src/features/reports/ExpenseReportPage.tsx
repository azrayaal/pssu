import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DateRange, ExpenseReportRow } from '@/types';
import { reportsService } from '@/services/reports.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import { ReportToolbar } from '@/components/reports/ReportToolbar';
import { ReportHeading } from '@/components/reports/ReportHeading';
import { TrendChart } from '@/components/charts/FinancialCharts';
import { SERIES } from '@/components/charts/theme';
import { formatCurrency, formatPercent } from '@/utils/format';
import { describeRange, resolvePeriod, type PeriodPresetKey } from '@/utils/date';
import { exportToExcel, printDocument } from '@/utils/export';
import { cn } from '@/lib/cn';

export default function ExpenseReportPage() {
  useDocumentTitle('Laporan Biaya');
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('year-to-date');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('year-to-date'));

  const params = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reports.expense(params),
    queryFn: () => reportsService.expense(params),
  });

  const periodLabel = describeRange(range);
  const budgetUsage = data && data.totalBudget > 0 ? (data.total / data.totalBudget) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Biaya"
        description="Realisasi biaya operasional per kategori dibandingkan dengan anggaran periode berjalan."
      />

      <Panel>
        <PanelHeader title="Tren Biaya Bulanan" description={`Periode ${periodLabel}`} />
        <PanelBody>
          {data ? (
            <TrendChart
              data={data.monthly as unknown as Record<string, string | number>[]}
              seriesKeys={[{ key: 'amount', label: 'Realisasi biaya', color: SERIES.secondary }]}
            />
          ) : (
            <TableSkeleton rows={4} columns={3} />
          )}
        </PanelBody>
      </Panel>

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
            exportToExcel(
              'laporan-biaya',
              [
                { header: 'Kategori', value: (row: ExpenseReportRow) => row.categoryName },
                { header: 'Jumlah Transaksi', value: (row: ExpenseReportRow) => row.transactionCount },
                { header: 'Realisasi', value: (row: ExpenseReportRow) => row.amount },
                { header: 'Anggaran', value: (row: ExpenseReportRow) => row.budget },
                { header: 'Selisih', value: (row: ExpenseReportRow) => row.variance },
                { header: 'Kontribusi (%)', value: (row: ExpenseReportRow) => row.shareOfTotal.toFixed(1) },
              ],
              data?.rows ?? [],
              { title: 'Laporan Biaya', subtitle: `PT PSSU Indonesia — ${periodLabel}` },
            );
            toast.success('Ekspor selesai', 'Berkas Excel laporan biaya telah diunduh.');
          }}
          disabled={!data?.rows.length}
          filters={<DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />}
        />

        <ReportHeading title="Laporan Biaya" periodLabel={`Periode ${periodLabel}`} />

        {data ? (
          <SummaryBar
            className="lg:grid-cols-4"
            items={[
              { label: 'Total Realisasi', value: formatCurrency(data.total) },
              { label: 'Total Anggaran', value: formatCurrency(data.totalBudget) },
              {
                label: 'Selisih Anggaran',
                value: formatCurrency(data.totalBudget - data.total),
                tone: data.totalBudget - data.total >= 0 ? 'positive' : 'negative',
              },
              {
                label: 'Serapan Anggaran',
                value: formatPercent(budgetUsage),
                tone: budgetUsage > 100 ? 'negative' : budgetUsage > 85 ? 'caution' : 'positive',
              },
            ]}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton rows={10} columns={6} />
        ) : !data.rows.length ? (
          <EmptyState title="Tidak ada biaya" description="Belum ada realisasi biaya pada periode yang dipilih." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[54rem] border-collapse text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-ink-200">
                  <th className="min-w-[16rem] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Kategori</th>
                  <th className="w-24 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Transaksi</th>
                  <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Realisasi</th>
                  <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Anggaran</th>
                  <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Selisih</th>
                  <th className="w-32 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Kontribusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ink-50">
                    <td className="px-4 py-2 text-ink-800">{row.categoryName}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-600">{row.transactionCount}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right font-medium text-ink-900">{formatCurrency(row.amount, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-600">{formatCurrency(row.budget, 'IDR', { withSymbol: false })}</td>
                    <td className={cn('tabular whitespace-nowrap px-4 py-2 text-right font-medium', row.variance >= 0 ? 'text-positive-700' : 'text-negative-700')}>
                      {formatCurrency(row.variance, 'IDR', { withSymbol: false })}
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-600">{formatPercent(row.shareOfTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                <tr>
                  <td className="px-4 py-3 text-[13px] font-semibold text-ink-700">Total</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                    {data.rows.reduce((sum, row) => sum + row.transactionCount, 0)}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.total, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totalBudget, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totalBudget - data.total, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">100,0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
