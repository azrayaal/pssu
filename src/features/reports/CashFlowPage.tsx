import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DateRange, ReportLine } from '@/types';
import { reportsService } from '@/services/reports.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { ErrorState, TableSkeleton } from '@/components/ui/States';
import { ReportToolbar } from '@/components/reports/ReportToolbar';
import { ReportHeading } from '@/components/reports/ReportHeading';
import { StatementTable } from '@/components/reports/StatementTable';
import { formatCurrency } from '@/utils/format';
import { describeRange, resolvePeriod, type PeriodPresetKey } from '@/utils/date';
import { exportToExcel, printDocument } from '@/utils/export';

export default function CashFlowPage() {
  useDocumentTitle('Laporan Arus Kas');
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('year-to-date');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('year-to-date'));

  const params = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reports.cashFlow(params),
    queryFn: () => reportsService.cashFlow(params),
  });

  const periodLabel = describeRange(range);

  const lines: ReportLine[] = data
    ? [
        { id: 'op-head', label: 'Arus Kas dari Aktivitas Operasi', amount: 0, level: 0, kind: 'section' },
        ...data.operating,
        { id: 'op-total', label: 'Kas Bersih dari Aktivitas Operasi', amount: data.netOperating, level: 0, kind: 'subtotal' },
        { id: 'inv-head', label: 'Arus Kas dari Aktivitas Investasi', amount: 0, level: 0, kind: 'section' },
        ...data.investing,
        { id: 'inv-total', label: 'Kas Bersih dari Aktivitas Investasi', amount: data.netInvesting, level: 0, kind: 'subtotal' },
        { id: 'fin-head', label: 'Arus Kas dari Aktivitas Pendanaan', amount: 0, level: 0, kind: 'section' },
        ...data.financing,
        { id: 'fin-total', label: 'Kas Bersih dari Aktivitas Pendanaan', amount: data.netFinancing, level: 0, kind: 'subtotal' },
        { id: 'net-change', label: 'Kenaikan (Penurunan) Bersih Kas', amount: data.netChange, level: 0, kind: 'total', emphasis: true },
        { id: 'opening', label: 'Kas dan Setara Kas Awal Periode', amount: data.openingCash, level: 0, kind: 'subtotal' },
        { id: 'closing', label: 'Kas dan Setara Kas Akhir Periode', amount: data.closingCash, level: 0, kind: 'total', emphasis: true },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Arus Kas"
        description="Pergerakan kas perusahaan yang dikelompokkan menurut aktivitas operasi, investasi, dan pendanaan."
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
              'laporan-arus-kas',
              [
                { header: 'Uraian', value: (row: ReportLine) => row.label },
                { header: 'Nilai', value: (row: ReportLine) => (row.kind === 'section' ? '' : row.amount) },
              ],
              lines,
              { title: 'Laporan Arus Kas', subtitle: `PT PTSU Indonesia — ${periodLabel}` },
            );
            toast.success('Ekspor selesai', 'Berkas Excel laporan arus kas telah diunduh.');
          }}
          disabled={!data}
          filters={<DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />}
        />

        <ReportHeading title="Laporan Arus Kas" periodLabel={`Periode ${periodLabel}`} />

        {data ? (
          <SummaryBar
            className="lg:grid-cols-5"
            items={[
              { label: 'Kas Awal', value: formatCurrency(data.openingCash) },
              { label: 'Aktivitas Operasi', value: formatCurrency(data.netOperating), tone: data.netOperating >= 0 ? 'positive' : 'negative' },
              { label: 'Aktivitas Investasi', value: formatCurrency(data.netInvesting), tone: data.netInvesting >= 0 ? 'positive' : 'negative' },
              { label: 'Aktivitas Pendanaan', value: formatCurrency(data.netFinancing), tone: data.netFinancing >= 0 ? 'positive' : 'negative' },
              { label: 'Kas Akhir', value: formatCurrency(data.closingCash) },
            ]}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton rows={12} columns={3} />
        ) : (
          <StatementTable lines={lines} currentLabel={periodLabel} showCodes={false} minWidthClass="min-w-[32rem]" />
        )}

        <p className="border-t border-ink-200 px-4 py-3 text-[13px] text-ink-500">
          Disusun dengan metode langsung berdasarkan mutasi rekening kas dan bank yang telah diposting ke buku besar.
        </p>
      </Panel>
    </div>
  );
}
