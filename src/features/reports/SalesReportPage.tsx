import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DateRange, SalesReportRow } from '@/types';
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

export default function SalesReportPage() {
  useDocumentTitle('Laporan Penjualan');
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('year-to-date');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('year-to-date'));

  const params = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reports.sales(params),
    queryFn: () => reportsService.sales(params),
  });

  const periodLabel = describeRange(range);
  const collectionRate = data && data.totals.net > 0 ? (data.totals.collected / data.totals.net) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Penjualan"
        description="Rekapitulasi penjualan per pelanggan beserta realisasi penagihan pada periode terpilih."
      />

      <Panel>
        <PanelHeader title="Tren Penjualan Bulanan" description={`Periode ${periodLabel}`} />
        <PanelBody>
          {data ? (
            <TrendChart
              data={data.monthly as unknown as Record<string, string | number>[]}
              seriesKeys={[
                { key: 'net', label: 'Nilai penjualan', color: SERIES.primary },
                { key: 'collected', label: 'Realisasi penerimaan', color: SERIES.tertiary },
              ]}
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
              'laporan-penjualan',
              [
                { header: 'Pelanggan', value: (row: SalesReportRow) => row.customerName },
                { header: 'Jumlah Faktur', value: (row: SalesReportRow) => row.invoiceCount },
                { header: 'Bruto', value: (row: SalesReportRow) => row.gross },
                { header: 'Diskon', value: (row: SalesReportRow) => row.discount },
                { header: 'PPN', value: (row: SalesReportRow) => row.tax },
                { header: 'Nilai Faktur', value: (row: SalesReportRow) => row.net },
                { header: 'Diterima', value: (row: SalesReportRow) => row.collected },
                { header: 'Sisa Piutang', value: (row: SalesReportRow) => row.outstanding },
              ],
              data?.rows ?? [],
              { title: 'Laporan Penjualan', subtitle: `PT PTSU Indonesia — ${periodLabel}` },
            );
            toast.success('Ekspor selesai', 'Berkas Excel laporan penjualan telah diunduh.');
          }}
          disabled={!data?.rows.length}
          filters={<DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />}
        />

        <ReportHeading title="Laporan Penjualan" periodLabel={`Periode ${periodLabel}`} />

        {data ? (
          <SummaryBar
            className="lg:grid-cols-5"
            items={[
              { label: 'Jumlah Faktur', value: data.totals.invoiceCount },
              { label: 'Nilai Penjualan', value: formatCurrency(data.totals.net) },
              { label: 'Sudah Diterima', value: formatCurrency(data.totals.collected), tone: 'positive' },
              { label: 'Sisa Piutang', value: formatCurrency(data.totals.outstanding) },
              { label: 'Tingkat Penagihan', value: formatPercent(collectionRate), tone: collectionRate > 80 ? 'positive' : 'caution' },
            ]}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton rows={10} columns={8} />
        ) : !data.rows.length ? (
          <EmptyState title="Tidak ada penjualan" description="Belum ada faktur penjualan pada periode yang dipilih." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] border-collapse text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-ink-200">
                  <th className="min-w-[16rem] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Pelanggan</th>
                  <th className="w-20 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Faktur</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Bruto</th>
                  <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Diskon</th>
                  <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">PPN</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Nilai Faktur</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Diterima</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Sisa Piutang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ink-50">
                    <td className="px-4 py-2 text-ink-800">{row.customerName}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-600">{row.invoiceCount}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-700">{formatCurrency(row.gross, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-500">{row.discount > 0 ? formatCurrency(row.discount, 'IDR', { withSymbol: false }) : '—'}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-500">{formatCurrency(row.tax, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right font-medium text-ink-900">{formatCurrency(row.net, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-positive-700">{formatCurrency(row.collected, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-800">{row.outstanding > 0 ? formatCurrency(row.outstanding, 'IDR', { withSymbol: false }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                <tr>
                  <td className="px-4 py-3 text-[13px] font-semibold text-ink-700">Total</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{data.totals.invoiceCount}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.gross, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.discount, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.tax, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.net, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.collected, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.outstanding, 'IDR', { withSymbol: false })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
