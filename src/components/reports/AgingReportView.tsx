import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import type { AgingBucketSet, QueryParams } from '@/types';
import { toast } from '@/stores/toast.store';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
import { TextInput } from '@/components/ui/Field';
import { SummaryBar } from '@/components/ui/DetailList';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import { AGING_BUCKETS, AgingBreakdown, AgingChart } from '@/components/charts/FinancialCharts';
import { ReportToolbar } from './ReportToolbar';
import { ReportHeading } from './ReportHeading';
import { formatCurrency, formatPercent } from '@/utils/format';
import { TODAY, formatDateLong } from '@/utils/date';
import { exportToCsv, exportToExcel, printDocument } from '@/utils/export';
import { cn } from '@/lib/cn';

export interface AgingRow extends AgingBucketSet {
  partyId: string;
  partyCode: string;
  partyName: string;
  documentCount: number;
  oldestDays: number;
}

export interface AgingReportViewProps {
  title: string;
  partyLabel: string;
  documentLabel: string;
  detailPathPrefix: string;
  fileName: string;
  queryKey: (params: QueryParams) => readonly unknown[];
  fetcher: (params: QueryParams) => Promise<{ asOf: string; rows: AgingRow[]; totals: AgingBucketSet }>;
}

export function AgingReportView({
  title,
  partyLabel,
  documentLabel,
  detailPathPrefix,
  fileName,
  queryKey,
  fetcher,
}: AgingReportViewProps) {
  const [asOf, setAsOf] = useState(TODAY);
  const [search, setSearch] = useState('');

  const params = useMemo<QueryParams>(() => ({ asOf, search }), [asOf, search]);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKey(params),
    queryFn: () => fetcher(params),
  });

  const totals = data?.totals;
  const overdueShare = totals && totals.total > 0 ? ((totals.total - totals.current) / totals.total) * 100 : 0;

  const exportColumns = [
    { header: 'Kode', value: (row: AgingRow) => row.partyCode },
    { header: partyLabel, value: (row: AgingRow) => row.partyName },
    { header: documentLabel, value: (row: AgingRow) => row.documentCount },
    { header: 'Belum Jatuh Tempo', value: (row: AgingRow) => row.current },
    { header: '1-30 Hari', value: (row: AgingRow) => row.d1to30 },
    { header: '31-60 Hari', value: (row: AgingRow) => row.d31to60 },
    { header: '61-90 Hari', value: (row: AgingRow) => row.d61to90 },
    { header: 'Di Atas 90 Hari', value: (row: AgingRow) => row.d90plus },
    { header: 'Total', value: (row: AgingRow) => row.total },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title={`Distribusi ${title}`}
            description={`Posisi per ${formatDateLong(asOf)}`}
          />
          <PanelBody>
            {totals ? <AgingChart buckets={totals} height={220} /> : <TableSkeleton rows={5} columns={2} />}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Ringkasan" description="Komposisi saldo berdasarkan umur" />
          <PanelBody>
            {totals ? (
              <>
                <p className="tabular text-2xl font-semibold text-ink-900">{formatCurrency(totals.total)}</p>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  {formatPercent(overdueShare)} telah melewati jatuh tempo
                </p>
                <AgingBreakdown buckets={totals} />
              </>
            ) : (
              <TableSkeleton rows={5} columns={2} />
            )}
          </PanelBody>
        </Panel>
      </div>

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
            exportToExcel(fileName, exportColumns, data?.rows ?? [], {
              title,
              subtitle: `PT PSSU Indonesia — per ${formatDateLong(asOf)}`,
            });
            toast.success('Ekspor selesai', `Berkas Excel ${title.toLowerCase()} telah diunduh.`);
          }}
          disabled={!data?.rows.length}
          extra={
            <button
              type="button"
              disabled={!data?.rows.length}
              onClick={() => {
                exportToCsv(fileName, exportColumns, data?.rows ?? []);
                toast.success('Ekspor selesai', `Berkas CSV ${title.toLowerCase()} telah diunduh.`);
              }}
              className="h-9 rounded-md border border-ink-300 px-3.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-400"
            >
              CSV
            </button>
          }
          filters={
            <>
              <label className="flex items-center gap-2 text-[13px] text-ink-600">
                Posisi per
                <TextInput
                  type="date"
                  className="w-[9.5rem]"
                  value={asOf}
                  max={TODAY}
                  aria-label="Tanggal posisi laporan"
                  onChange={(event) => setAsOf(event.target.value)}
                />
              </label>
              <TextInput
                className="w-full sm:w-64"
                placeholder={`Cari ${partyLabel.toLowerCase()}`}
                aria-label={`Cari ${partyLabel.toLowerCase()}`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </>
          }
        />

        <ReportHeading title={title} periodLabel={`Posisi per ${formatDateLong(asOf)}`} />

        {totals ? (
          <SummaryBar
            className="lg:grid-cols-4"
            items={[
              { label: partyLabel, value: data?.rows.length ?? 0 },
              { label: 'Belum Jatuh Tempo', value: formatCurrency(totals.current), tone: 'positive' },
              {
                label: 'Melewati Jatuh Tempo',
                value: formatCurrency(totals.total - totals.current),
                tone: totals.total - totals.current > 0 ? 'negative' : 'neutral',
              },
              { label: 'Total Saldo', value: formatCurrency(totals.total) },
            ]}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending ? (
          <TableSkeleton rows={10} columns={8} />
        ) : !data.rows.length ? (
          <EmptyState
            icon={<Landmark className="size-5" />}
            title="Tidak ada saldo terbuka"
            description="Tidak ditemukan saldo yang masih terbuka pada tanggal posisi yang dipilih."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-ink-200">
                  <th className="w-28 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Kode
                  </th>
                  <th className="min-w-[16rem] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    {partyLabel}
                  </th>
                  <th className="w-20 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Dok
                  </th>
                  {AGING_BUCKETS.map((bucket) => (
                    <th
                      key={bucket.key}
                      className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500"
                    >
                      {bucket.label}
                    </th>
                  ))}
                  <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.rows.map((row) => (
                  <tr key={row.partyId} className="hover:bg-ink-50">
                    <td className="tabular px-4 py-2 font-medium text-ink-700">{row.partyCode}</td>
                    <td className="px-4 py-2">
                      <Link to={`${detailPathPrefix}/${row.partyId}`} className="text-ink-800 hover:text-brand-700 hover:underline">
                        {row.partyName}
                      </Link>
                      {row.oldestDays > 90 ? (
                        <span className="ml-2 text-xs text-negative-600">{row.oldestDays} hari</span>
                      ) : null}
                    </td>
                    <td className="tabular px-4 py-2 text-right text-ink-600">{row.documentCount}</td>
                    {AGING_BUCKETS.map((bucket) => {
                      const value = row[bucket.key];
                      return (
                        <td
                          key={bucket.key}
                          className={cn(
                            'tabular px-4 py-2 text-right',
                            value === 0
                              ? 'text-ink-300'
                              : bucket.key === 'd90plus'
                                ? 'font-medium text-negative-700'
                                : 'text-ink-700',
                          )}
                        >
                          {value === 0 ? '—' : formatCurrency(value, 'IDR', { withSymbol: false })}
                        </td>
                      );
                    })}
                    <td className="tabular px-4 py-2 text-right font-medium text-ink-900">
                      {formatCurrency(row.total, 'IDR', { withSymbol: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-[13px] font-semibold text-ink-700">
                    Total
                  </td>
                  {AGING_BUCKETS.map((bucket) => (
                    <td key={bucket.key} className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                      {formatCurrency(data.totals[bucket.key], 'IDR', { withSymbol: false })}
                    </td>
                  ))}
                  <td className="tabular px-4 py-3 text-right text-[13px] font-semibold text-ink-900">
                    {formatCurrency(data.totals.total, 'IDR', { withSymbol: false })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
