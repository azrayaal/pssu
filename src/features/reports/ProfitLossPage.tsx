import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DateRange, ReportLine } from '@/types';
import { reportsService } from '@/services/reports.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Checkbox } from '@/components/ui/Field';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { ErrorState, TableSkeleton } from '@/components/ui/States';
import { ReportToolbar } from '@/components/reports/ReportToolbar';
import { ReportHeading } from '@/components/reports/ReportHeading';
import { StatementTable } from '@/components/reports/StatementTable';
import { formatCurrency, formatPercent } from '@/utils/format';
import { describeRange, resolvePeriod, type PeriodPresetKey } from '@/utils/date';
import { exportToExcel, printDocument } from '@/utils/export';

export default function ProfitLossPage() {
  useDocumentTitle('Laporan Laba Rugi');
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('year-to-date');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('year-to-date'));
  const [comparative, setComparative] = useState(true);

  const params = useMemo(
    () => ({ from: range.from, to: range.to, comparative: String(comparative) }),
    [range, comparative],
  );

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reports.profitLoss(params),
    queryFn: () => reportsService.profitLoss(params),
  });

  const periodLabel = describeRange(range);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Laba Rugi"
        description="Kinerja pendapatan dan beban perusahaan pada periode berjalan beserta perbandingan periode sebelumnya."
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
            exportToExcel(
              'laporan-laba-rugi',
              [
                { header: 'Kode', value: (row: ReportLine) => row.code ?? '' },
                { header: 'Uraian', value: (row: ReportLine) => row.label },
                { header: 'Periode Berjalan', value: (row: ReportLine) => (row.kind === 'section' ? '' : row.amount) },
                { header: 'Periode Pembanding', value: (row: ReportLine) => row.comparativeAmount ?? '' },
              ],
              data?.lines ?? [],
              { title: 'Laporan Laba Rugi', subtitle: `PT PTSU Indonesia — ${periodLabel}` },
            );
            toast.success('Ekspor selesai', 'Berkas Excel laporan laba rugi telah diunduh.');
          }}
          disabled={!data?.lines.length}
          filters={
            <>
              <DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />
              <Checkbox
                label="Tampilkan periode pembanding"
                checked={comparative}
                onChange={(event) => setComparative(event.target.checked)}
              />
            </>
          }
        />

        <ReportHeading title="Laporan Laba Rugi" periodLabel={`Periode ${periodLabel}`} />

        {data ? (
          <SummaryBar
            className="lg:grid-cols-5"
            items={[
              { label: 'Pendapatan Usaha', value: formatCurrency(data.revenue) },
              { label: 'Laba Kotor', value: formatCurrency(data.grossProfit), tone: 'positive' },
              { label: 'Beban Operasional', value: formatCurrency(data.operatingExpenses), tone: 'negative' },
              { label: 'Laba Usaha', value: formatCurrency(data.operatingProfit) },
              {
                label: 'Marjin Laba Bersih',
                value: formatPercent(data.revenue === 0 ? 0 : (data.netProfit / data.revenue) * 100),
                tone: data.netProfit > 0 ? 'positive' : 'negative',
              },
            ]}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton rows={14} columns={4} />
        ) : (
          <StatementTable
            lines={data.lines}
            currentLabel={periodLabel}
            comparativeLabel={
              comparative && data.comparativePeriod ? describeRange(data.comparativePeriod) : undefined
            }
          />
        )}

        <p className="border-t border-ink-200 px-4 py-3 text-[13px] text-ink-500">
          Laporan disusun dari seluruh jurnal berstatus diposting. Angka dalam tanda kurung menunjukkan nilai negatif.
        </p>
      </Panel>
    </div>
  );
}
