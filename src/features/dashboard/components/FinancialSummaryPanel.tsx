import type { FinancialSummary } from '@/types';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/States';
import { Tooltip } from '@/components/ui/Tooltip';
import { HelpCircle } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/utils/format';
import { cn } from '@/lib/cn';

interface SummaryRow {
  label: string;
  value: string;
  hint: string;
  tone?: 'positive' | 'negative' | 'neutral';
}

export function FinancialSummaryPanel({ summary, loading }: { summary?: FinancialSummary; loading: boolean }) {
  const rows: SummaryRow[] = summary
    ? [
        {
          label: 'Marjin Laba Kotor',
          value: formatPercent(summary.grossProfitMargin),
          hint: 'Laba kotor dibagi pendapatan usaha pada periode berjalan.',
          tone: summary.grossProfitMargin >= 30 ? 'positive' : 'neutral',
        },
        {
          label: 'Marjin Laba Bersih',
          value: formatPercent(summary.netProfitMargin),
          hint: 'Laba bersih sebelum pajak dibagi total pendapatan.',
          tone: summary.netProfitMargin >= 5 ? 'positive' : 'negative',
        },
        {
          label: 'Rasio Lancar',
          value: `${summary.currentRatio.toFixed(2)}x`,
          hint: 'Aset lancar dibagi kewajiban lancar. Di atas 1,5x dinilai sehat.',
          tone: summary.currentRatio >= 1.5 ? 'positive' : 'negative',
        },
        {
          label: 'Rasio Cepat',
          value: `${summary.quickRatio.toFixed(2)}x`,
          hint: 'Aset lancar tanpa persediaan dibagi kewajiban lancar.',
          tone: summary.quickRatio >= 1 ? 'positive' : 'negative',
        },
        {
          label: 'Modal Kerja',
          value: formatCurrency(summary.workingCapital),
          hint: 'Selisih aset lancar terhadap kewajiban lancar.',
          tone: summary.workingCapital > 0 ? 'positive' : 'negative',
        },
        {
          label: 'Rata-rata Beban Bulanan',
          value: formatCurrency(summary.burnRate),
          hint: 'Total beban periode dibagi jumlah bulan periode.',
        },
        {
          label: 'Perputaran Piutang',
          value: `${summary.receivableDays.toFixed(0)} hari`,
          hint: 'Estimasi rata-rata hari yang dibutuhkan untuk menagih piutang.',
        },
        {
          label: 'Perputaran Utang',
          value: `${summary.payableDays.toFixed(0)} hari`,
          hint: 'Estimasi rata-rata hari perusahaan melunasi utang usaha.',
        },
      ]
    : [];

  return (
    <Panel>
      <PanelHeader title="Ringkasan Keuangan" description="Indikator kesehatan keuangan periode berjalan" />
      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <dl className="divide-y divide-ink-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <dt className="flex items-center gap-1.5 text-[13px] text-ink-600">
                {row.label}
                <Tooltip content={row.hint}>
                  <HelpCircle className="size-3.5 text-ink-300" aria-hidden />
                </Tooltip>
              </dt>
              <dd
                className={cn(
                  'tabular text-[13px] font-semibold',
                  row.tone === 'positive' && 'text-positive-700',
                  row.tone === 'negative' && 'text-negative-700',
                  (!row.tone || row.tone === 'neutral') && 'text-ink-900',
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
