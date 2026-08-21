import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import type { ReportLine } from '@/types';
import { reportsService } from '@/services/reports.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Checkbox, TextInput } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { SummaryBar } from '@/components/ui/DetailList';
import { ErrorState, TableSkeleton } from '@/components/ui/States';
import { ReportToolbar } from '@/components/reports/ReportToolbar';
import { ReportHeading } from '@/components/reports/ReportHeading';
import { StatementTable } from '@/components/reports/StatementTable';
import { formatCurrency } from '@/utils/format';
import { TODAY, formatDateLong } from '@/utils/date';
import { exportToExcel, printDocument } from '@/utils/export';

export default function BalanceSheetPage() {
  useDocumentTitle('Neraca');
  const [asOf, setAsOf] = useState(TODAY);
  const [comparativeAsOf, setComparativeAsOf] = useState('2025-12-31');
  const [comparative, setComparative] = useState(true);

  const params = useMemo(
    () => ({ asOf, comparativeAsOf, comparative: String(comparative) }),
    [asOf, comparativeAsOf, comparative],
  );

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reports.balanceSheet(params),
    queryFn: () => reportsService.balanceSheet(params),
  });

  const exportRows: ReportLine[] = data
    ? [...data.assetLines, ...data.liabilityLines, ...data.equityLines]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Neraca"
        description="Posisi aset, kewajiban, dan ekuitas perusahaan pada tanggal pelaporan yang dipilih."
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
              'neraca',
              [
                { header: 'Kode', value: (row: ReportLine) => row.code ?? '' },
                { header: 'Uraian', value: (row: ReportLine) => row.label },
                { header: 'Saldo', value: (row: ReportLine) => (row.kind === 'section' ? '' : row.amount) },
                { header: 'Pembanding', value: (row: ReportLine) => row.comparativeAmount ?? '' },
              ],
              exportRows,
              { title: 'Neraca', subtitle: `PT PTSU Indonesia — per ${formatDateLong(asOf)}` },
            );
            toast.success('Ekspor selesai', 'Berkas Excel neraca telah diunduh.');
          }}
          disabled={!data}
          filters={
            <>
              <label className="flex items-center gap-2 text-[13px] text-ink-600">
                Posisi per
                <TextInput
                  type="date"
                  className="w-[9.5rem]"
                  value={asOf}
                  max={TODAY}
                  aria-label="Tanggal posisi neraca"
                  onChange={(event) => setAsOf(event.target.value)}
                />
              </label>
              <Checkbox
                label="Bandingkan dengan"
                checked={comparative}
                onChange={(event) => setComparative(event.target.checked)}
              />
              <TextInput
                type="date"
                className="w-[9.5rem]"
                value={comparativeAsOf}
                max={asOf}
                disabled={!comparative}
                aria-label="Tanggal pembanding neraca"
                onChange={(event) => setComparativeAsOf(event.target.value)}
              />
            </>
          }
        />

        <ReportHeading title="Neraca" periodLabel={`Posisi per ${formatDateLong(asOf)}`} />

        {data ? (
          <SummaryBar
            className="lg:grid-cols-4"
            items={[
              { label: 'Total Aset', value: formatCurrency(data.totalAssets) },
              { label: 'Total Kewajiban', value: formatCurrency(data.totalLiabilities) },
              { label: 'Total Ekuitas', value: formatCurrency(data.totalEquity) },
              {
                label: 'Selisih',
                value: formatCurrency(data.totalAssets - data.totalLiabilities - data.totalEquity),
                tone: data.balanced ? 'positive' : 'negative',
              },
            ]}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton rows={16} columns={4} />
        ) : (
          <>
            <div className="grid grid-cols-1 divide-y divide-ink-200 2xl:grid-cols-2 2xl:divide-x 2xl:divide-y-0">
              <div>
                <PanelHeader compact title="Aset" description="Sumber daya yang dikuasai perusahaan" />
                <StatementTable
                  lines={data.assetLines}
                  currentLabel={formatDateLong(asOf)}
                  comparativeLabel={comparative && data.comparativeAsOf ? formatDateLong(data.comparativeAsOf) : undefined}
                  minWidthClass="min-w-[34rem]"
                />
              </div>
              <div>
                <PanelHeader compact title="Kewajiban dan Ekuitas" description="Sumber pendanaan atas aset perusahaan" />
                <StatementTable
                  lines={data.liabilityLines}
                  currentLabel={formatDateLong(asOf)}
                  comparativeLabel={comparative && data.comparativeAsOf ? formatDateLong(data.comparativeAsOf) : undefined}
                  minWidthClass="min-w-[34rem]"
                />
                <StatementTable
                  lines={data.equityLines}
                  currentLabel={formatDateLong(asOf)}
                  comparativeLabel={comparative && data.comparativeAsOf ? formatDateLong(data.comparativeAsOf) : undefined}
                  minWidthClass="min-w-[34rem]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-4 py-3">
              <p className="text-[13px] text-ink-500">
                Laba tahun berjalan dihitung dari selisih pendapatan dan beban sejak awal tahun buku.
              </p>
              <Badge tone={data.balanced ? 'positive' : 'negative'}>
                <span className="flex items-center gap-1.5">
                  {data.balanced ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                  {data.balanced ? 'Neraca seimbang' : 'Neraca tidak seimbang'}
                </span>
              </Badge>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
