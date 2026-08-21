import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DateRange, PurchaseReportRow } from '@/types';
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

export default function PurchaseReportPage() {
  useDocumentTitle('Laporan Pembelian');
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('year-to-date');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('year-to-date'));

  const params = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reports.purchase(params),
    queryFn: () => reportsService.purchase(params),
  });

  const periodLabel = describeRange(range);
  const settlementRate = data && data.totals.net > 0 ? (data.totals.paid / data.totals.net) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Pembelian"
        description="Rekapitulasi pembelian per pemasok beserta realisasi pembayaran pada periode terpilih."
      />

      <Panel>
        <PanelHeader title="Tren Pembelian Bulanan" description={`Periode ${periodLabel}`} />
        <PanelBody>
          {data ? (
            <TrendChart
              data={data.monthly as unknown as Record<string, string | number>[]}
              seriesKeys={[
                { key: 'net', label: 'Nilai pembelian', color: SERIES.secondary },
                { key: 'paid', label: 'Realisasi pembayaran', color: SERIES.tertiary },
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
              'laporan-pembelian',
              [
                { header: 'Pemasok', value: (row: PurchaseReportRow) => row.vendorName },
                { header: 'Jumlah Tagihan', value: (row: PurchaseReportRow) => row.billCount },
                { header: 'Bruto', value: (row: PurchaseReportRow) => row.gross },
                { header: 'Diskon', value: (row: PurchaseReportRow) => row.discount },
                { header: 'PPN', value: (row: PurchaseReportRow) => row.tax },
                { header: 'Nilai Tagihan', value: (row: PurchaseReportRow) => row.net },
                { header: 'Dibayar', value: (row: PurchaseReportRow) => row.paid },
                { header: 'Sisa Utang', value: (row: PurchaseReportRow) => row.outstanding },
              ],
              data?.rows ?? [],
              { title: 'Laporan Pembelian', subtitle: `PT PTSU Indonesia — ${periodLabel}` },
            );
            toast.success('Ekspor selesai', 'Berkas Excel laporan pembelian telah diunduh.');
          }}
          disabled={!data?.rows.length}
          filters={<DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />}
        />

        <ReportHeading title="Laporan Pembelian" periodLabel={`Periode ${periodLabel}`} />

        {data ? (
          <SummaryBar
            className="lg:grid-cols-5"
            items={[
              { label: 'Jumlah Tagihan', value: data.totals.billCount },
              { label: 'Nilai Pembelian', value: formatCurrency(data.totals.net) },
              { label: 'Sudah Dibayar', value: formatCurrency(data.totals.paid), tone: 'positive' },
              { label: 'Sisa Utang', value: formatCurrency(data.totals.outstanding) },
              { label: 'Tingkat Pelunasan', value: formatPercent(settlementRate), tone: settlementRate > 80 ? 'positive' : 'caution' },
            ]}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton rows={10} columns={8} />
        ) : !data.rows.length ? (
          <EmptyState title="Tidak ada pembelian" description="Belum ada faktur pembelian pada periode yang dipilih." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] border-collapse text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-ink-200">
                  <th className="min-w-[16rem] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Pemasok</th>
                  <th className="w-20 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Tagihan</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Bruto</th>
                  <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Diskon</th>
                  <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">PPN</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Nilai Tagihan</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Dibayar</th>
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Sisa Utang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ink-50">
                    <td className="px-4 py-2 text-ink-800">{row.vendorName}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-600">{row.billCount}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-700">{formatCurrency(row.gross, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-500">{row.discount > 0 ? formatCurrency(row.discount, 'IDR', { withSymbol: false }) : '—'}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-500">{formatCurrency(row.tax, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right font-medium text-ink-900">{formatCurrency(row.net, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-positive-700">{formatCurrency(row.paid, 'IDR', { withSymbol: false })}</td>
                    <td className="tabular whitespace-nowrap px-4 py-2 text-right text-ink-800">{row.outstanding > 0 ? formatCurrency(row.outstanding, 'IDR', { withSymbol: false }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                <tr>
                  <td className="px-4 py-3 text-[13px] font-semibold text-ink-700">Total</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{data.totals.billCount}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.gross, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.discount, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.tax, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.net, 'IDR', { withSymbol: false })}</td>
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">{formatCurrency(data.totals.paid, 'IDR', { withSymbol: false })}</td>
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
