import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Banknote,
  CreditCard,
  FileClock,
  Landmark,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { queryKeys } from '@/lib/query-keys';
import { useCompanyStore } from '@/stores/company.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel, PanelBody, PanelHeader } from '@/components/ui/Panel';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tabs } from '@/components/ui/Tabs';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/States';
import {
  AgingBreakdown,
  AgingChart,
  CashFlowChart,
  NetProfitChart,
  RevenueExpenseChart,
} from '@/components/charts/FinancialCharts';
import { formatCurrency } from '@/utils/format';
import { TODAY, formatDateLong } from '@/utils/date';
import { RecentTransactionsPanel } from './components/RecentTransactionsPanel';
import { OutstandingInvoicesPanel } from './components/OutstandingInvoicesPanel';
import { UpcomingPaymentsPanel } from './components/UpcomingPaymentsPanel';
import { FinancialSummaryPanel } from './components/FinancialSummaryPanel';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const period = useCompanyStore((state) => state.dashboardPeriod);
  const setPeriod = useCompanyStore((state) => state.setDashboardPeriod);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.dashboard(period),
    queryFn: () => dashboardService.get(period),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Keuangan"
        description={`Ringkasan kinerja keuangan PT PTSU Indonesia per ${formatDateLong(TODAY)}.`}
        actions={
          <>
            <Tabs
              variant="segmented"
              value={period}
              onChange={setPeriod}
              items={[
                { value: '3m', label: '3 Bulan' },
                { value: '6m', label: '6 Bulan' },
                { value: '12m', label: '12 Bulan' },
              ]}
            />
            <Button
              variant="outline"
              leadingIcon={<RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Perbarui
            </Button>
          </>
        }
      />

      {isError ? (
        <Panel>
          <ErrorState onRetry={() => refetch()} />
        </Panel>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {isPending ? (
              Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)
            ) : (
              <>
                <MetricCard
                  label="Total Pendapatan"
                  metric={data.metrics.totalRevenue}
                  caption={`vs periode sebelumnya`}
                  icon={<TrendingUp className="size-4" />}
                />
                <MetricCard
                  label="Total Beban"
                  metric={data.metrics.totalExpenses}
                  caption="vs periode sebelumnya"
                  invertTrend
                  icon={<TrendingDown className="size-4" />}
                />
                <MetricCard
                  label="Laba Bersih"
                  metric={data.metrics.netProfit}
                  caption={`Margin ${data.summary.netProfitMargin.toFixed(1)}%`}
                  icon={<Banknote className="size-4" />}
                />
                <MetricCard
                  label="Saldo Kas & Bank"
                  metric={data.metrics.cashBalance}
                  caption="6 rekening aktif"
                  icon={<Wallet className="size-4" />}
                />
                <MetricCard
                  label="Piutang Usaha"
                  metric={data.metrics.accountsReceivable}
                  caption={`${data.summary.receivableDays.toFixed(0)} hari rata-rata tertagih`}
                  invertTrend
                  icon={<Landmark className="size-4" />}
                />
                <MetricCard
                  label="Utang Usaha"
                  metric={data.metrics.accountsPayable}
                  caption={`${data.summary.payableDays.toFixed(0)} hari rata-rata terbayar`}
                  invertTrend
                  icon={<CreditCard className="size-4" />}
                />
              </>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2">
              <PanelHeader
                title="Pendapatan dan Beban"
                description={isPending ? 'Memuat data' : `Periode ${data.periodLabel}`}
                actions={
                  <Link
                    to="/reports/profit-loss"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    Laporan laba rugi
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                }
              />
              <PanelBody>
                {isPending ? <Skeleton className="h-[260px] w-full" /> : <RevenueExpenseChart data={data.monthly} />}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Laba Bersih Bulanan"
                description={isPending ? 'Memuat data' : 'Selisih pendapatan terhadap beban'}
              />
              <PanelBody>
                {isPending ? <Skeleton className="h-[240px] w-full" /> : <NetProfitChart data={data.monthly} />}
              </PanelBody>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2">
              <PanelHeader
                title="Arus Kas"
                description={isPending ? 'Memuat data' : 'Penerimaan, pengeluaran, dan arus kas bersih per bulan'}
                actions={
                  <Link
                    to="/reports/cash-flow"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    Laporan arus kas
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                }
              />
              <PanelBody>
                {isPending ? <Skeleton className="h-[260px] w-full" /> : <CashFlowChart data={data.monthly} />}
              </PanelBody>
            </Panel>

            <FinancialSummaryPanel summary={data?.summary} loading={isPending} />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Umur Piutang Usaha"
                description={isPending ? 'Memuat data' : `Total ${formatCurrency(data.arAging.total)} belum tertagih`}
                actions={
                  <Link
                    to="/sales/receivables"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    Rincian
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                }
              />
              <PanelBody>
                {isPending ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <>
                    <AgingChart buckets={data.arAging} />
                    <AgingBreakdown buckets={data.arAging} />
                  </>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Umur Utang Usaha"
                description={isPending ? 'Memuat data' : `Total ${formatCurrency(data.apAging.total)} belum dibayar`}
                actions={
                  <Link
                    to="/purchase/payables"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    Rincian
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                }
              />
              <PanelBody>
                {isPending ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <>
                    <AgingChart buckets={data.apAging} />
                    <AgingBreakdown buckets={data.apAging} />
                  </>
                )}
              </PanelBody>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <OutstandingInvoicesPanel rows={data?.outstandingInvoices ?? []} loading={isPending} />
            <UpcomingPaymentsPanel rows={data?.upcomingPayments ?? []} loading={isPending} />
          </section>

          <RecentTransactionsPanel
            rows={data?.recentTransactions ?? []}
            loading={isPending}
            icon={<FileClock className="size-4" />}
          />
        </>
      )}
    </div>
  );
}
