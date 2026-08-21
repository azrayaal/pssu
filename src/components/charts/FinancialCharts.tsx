import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AgingBucketSet, MonthlySeriesPoint } from '@/types';
import { formatAxisAmount, formatCurrency } from '@/utils/format';
import { AGING_RAMP, AXIS_PROPS, BAR_RADIUS, CHART_INK, GRID_PROPS, POLARITY, SERIES } from './theme';
import { CurrencyTooltip, SingleValueTooltip } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';

const compactAxis = (value: number): string => formatAxisAmount(value);

export function RevenueExpenseChart({ data, height = 260 }: { data: MonthlySeriesPoint[]; height?: number }) {
  return (
    <div>
      <ChartLegend
        entries={[
          { label: 'Pendapatan', color: SERIES.primary },
          { label: 'Beban', color: SERIES.secondary },
        ]}
      />
      <ResponsiveContainer width="100%" height={height} className="mt-3">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="month" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={compactAxis} width={72} />
          <Tooltip content={CurrencyTooltip} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
          <Bar isAnimationActive={false} dataKey="revenue" name="Pendapatan" fill={SERIES.primary} radius={BAR_RADIUS} maxBarSize={18} />
          <Bar isAnimationActive={false} dataKey="expenses" name="Beban" fill={SERIES.secondary} radius={BAR_RADIUS} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetProfitChart({ data, height = 240 }: { data: MonthlySeriesPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="month" {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={compactAxis} width={72} />
        <Tooltip content={SingleValueTooltip} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
        <Bar isAnimationActive={false} dataKey="netProfit" name="Laba bersih" radius={BAR_RADIUS} maxBarSize={26}>
          {data.map((point) => (
            <Cell
              key={point.month}
              fill={point.netProfit >= 0 ? POLARITY.positive : POLARITY.negative}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CashFlowChart({ data, height = 260 }: { data: MonthlySeriesPoint[]; height?: number }) {
  return (
    <div>
      <ChartLegend
        entries={[
          { label: 'Kas masuk', color: SERIES.primary },
          { label: 'Kas keluar', color: SERIES.secondary },
          { label: 'Arus kas bersih', color: SERIES.tertiary },
        ]}
      />
      <ResponsiveContainer width="100%" height={height} className="mt-3">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="month" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={compactAxis} width={72} />
          <Tooltip content={CurrencyTooltip} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
          <Bar isAnimationActive={false} dataKey="cashIn" name="Kas masuk" fill={SERIES.primary} radius={BAR_RADIUS} maxBarSize={16} />
          <Bar isAnimationActive={false} dataKey="cashOut" name="Kas keluar" fill={SERIES.secondary} radius={BAR_RADIUS} maxBarSize={16} />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="netCash"
            name="Arus kas bersih"
            stroke={SERIES.tertiary}
            strokeWidth={2}
            dot={{ r: 3, fill: SERIES.tertiary, stroke: CHART_INK.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: SERIES.tertiary, stroke: CHART_INK.surface, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export const AGING_BUCKETS: { key: keyof Omit<AgingBucketSet, 'total'>; label: string }[] = [
  { key: 'current', label: 'Belum jatuh tempo' },
  { key: 'd1to30', label: '1–30 hari' },
  { key: 'd31to60', label: '31–60 hari' },
  { key: 'd61to90', label: '61–90 hari' },
  { key: 'd90plus', label: 'Di atas 90 hari' },
];

export function AgingChart({ buckets, height = 200 }: { buckets: AgingBucketSet; height?: number }) {
  const data = AGING_BUCKETS.map((bucket, index) => ({
    label: bucket.label,
    amount: buckets[bucket.key],
    fill: AGING_RAMP[index],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART_INK.grid} horizontal={false} />
        <XAxis type="number" {...AXIS_PROPS} tickFormatter={compactAxis} />
        <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={124} />
        <Tooltip content={SingleValueTooltip} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
        <Bar isAnimationActive={false} dataKey="amount" name="Nilai" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgingBreakdown({ buckets }: { buckets: AgingBucketSet }) {
  return (
    <ul className="mt-4 space-y-2 border-t border-ink-100 pt-3">
      {AGING_BUCKETS.map((bucket, index) => {
        const value = buckets[bucket.key];
        const share = buckets.total === 0 ? 0 : (value / buckets.total) * 100;
        return (
          <li key={bucket.key} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-ink-600">
              <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: AGING_RAMP[index] }} aria-hidden />
              <span className="truncate">{bucket.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="tabular text-xs text-ink-400">{share.toFixed(1)}%</span>
              <span className="tabular font-medium text-ink-900">{formatCurrency(value)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function TrendChart({
  data,
  seriesKeys,
  height = 240,
}: {
  data: Record<string, string | number>[];
  seriesKeys: { key: string; label: string; color: string }[];
  height?: number;
}) {
  return (
    <div>
      <ChartLegend entries={seriesKeys.map((series) => ({ label: series.label, color: series.color }))} />
      <ResponsiveContainer width="100%" height={height} className="mt-3">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="month" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={compactAxis} width={72} />
          <Tooltip content={seriesKeys.length > 1 ? CurrencyTooltip : SingleValueTooltip} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
          {seriesKeys.map((series) => (
            <Bar
              key={series.key}
              isAnimationActive={false}
              dataKey={series.key}
              name={series.label}
              fill={series.color}
              radius={BAR_RADIUS}
              maxBarSize={seriesKeys.length > 1 ? 18 : 28}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
