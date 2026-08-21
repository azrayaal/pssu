import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Link2, ScanSearch } from 'lucide-react';
import type { DateRange } from '@/types';
import { cashBankService } from '@/services/cash-bank.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SelectInput } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Tabs';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from '@/components/ui/States';
import { ReportToolbar } from '@/components/reports/ReportToolbar';
import { formatCurrency } from '@/utils/format';
import { formatDate, resolvePeriod, type PeriodPresetKey } from '@/utils/date';
import { printDocument } from '@/utils/export';
import { cn } from '@/lib/cn';

type TabKey = 'matched' | 'statement' | 'system';

export default function ReconciliationPage() {
  useDocumentTitle('Rekonsiliasi Bank');
  const queryClient = useQueryClient();
  const [bankAccountId, setBankAccountId] = useState('');
  const [preset, setPreset] = useState<PeriodPresetKey | 'custom'>('this-month');
  const [range, setRange] = useState<DateRange>(() => resolvePeriod('this-month'));
  const [tab, setTab] = useState<TabKey>('matched');

  const { data: bankOptions } = useQuery({
    queryKey: queryKeys.bankAccounts.options,
    queryFn: cashBankService.accountOptions,
  });

  const activeAccountId = bankAccountId || bankOptions?.[0]?.value || '';
  const params = useMemo(
    () => ({ bankAccountId: activeAccountId, from: range.from, to: range.to }),
    [activeAccountId, range],
  );

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.reconciliation.session(params),
    queryFn: () => cashBankService.reconciliation(params),
    enabled: Boolean(activeAccountId),
  });

  const matchMutation = useMutation({
    mutationFn: ({ id, reconciled }: { id: string; reconciled: boolean }) =>
      cashBankService.setReconciled(id, reconciled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cashTransactions.all });
      toast.success('Transaksi ditandai cocok', 'Status rekonsiliasi transaksi telah diperbarui.');
    },
    onError: (error: Error) => toast.error('Rekonsiliasi gagal diperbarui', error.message),
  });

  const balanced = data ? Math.abs(data.difference) < 1 : false;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rekonsiliasi Bank"
        description="Cocokkan mutasi rekening koran bank dengan pencatatan sistem untuk memastikan saldo kas akurat."
      />

      <Panel>
        <ReportToolbar
          refreshing={isFetching}
          onRefresh={() => refetch()}
          onPrint={printDocument}
          filters={
            <>
              <SelectInput
                className="w-full sm:w-72"
                aria-label="Pilih rekening bank"
                value={activeAccountId}
                onChange={(event) => setBankAccountId(event.target.value)}
              >
                {(bankOptions ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
              <DateRangeFilter value={range} onChange={setRange} preset={preset} onPresetChange={setPreset} />
            </>
          }
        />

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isPending || !data ? (
          <div className="p-5">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid divide-y divide-ink-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-ink-500">Saldo Rekening Koran</p>
              <p className="tabular mt-1 text-lg font-semibold text-ink-900">{formatCurrency(data.statementBalance)}</p>
              <p className="mt-0.5 text-xs text-ink-400">Per {formatDate(data.periodTo)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-ink-500">Saldo Menurut Sistem</p>
              <p className="tabular mt-1 text-lg font-semibold text-ink-900">{formatCurrency(data.systemBalance)}</p>
              <p className="mt-0.5 text-xs text-ink-400">Buku besar {data.bankAccountName}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-ink-500">Selisih</p>
              <p
                className={cn(
                  'tabular mt-1 text-lg font-semibold',
                  balanced ? 'text-positive-700' : 'text-negative-700',
                )}
              >
                {formatCurrency(data.difference)}
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                {balanced ? 'Saldo telah sesuai' : 'Masih terdapat item belum cocok'}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-ink-500">Status Rekonsiliasi</p>
              <div className="mt-1.5">
                <StatusBadge status={data.status} />
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                {data.matched.length} cocok · {data.unmatchedStatementLines.length + data.unmatchedTransactions.length} belum
              </p>
            </div>
          </div>
        )}
      </Panel>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'matched', label: 'Transaksi Cocok', count: data?.matched.length },
          { value: 'statement', label: 'Rekening Koran Belum Cocok', count: data?.unmatchedStatementLines.length },
          { value: 'system', label: 'Sistem Belum Cocok', count: data?.unmatchedTransactions.length },
        ]}
      />

      {tab === 'matched' ? (
        <Panel>
          <PanelHeader
            title="Transaksi yang Telah Dicocokkan"
            description="Mutasi rekening koran yang berhasil dipasangkan dengan catatan sistem"
            compact
          />
          {isPending ? (
            <TableSkeleton rows={8} columns={5} />
          ) : !data?.matched.length ? (
            <EmptyState
              icon={<ScanSearch className="size-5" />}
              title="Belum ada transaksi cocok"
              description="Belum ada mutasi yang dipasangkan pada periode rekonsiliasi ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[60rem] border-collapse text-sm">
                <thead className="bg-ink-50">
                  <tr className="border-b border-ink-200">
                    <th className="w-28 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Tanggal</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Rekening Koran</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Catatan Sistem</th>
                    <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Debit</th>
                    <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Kredit</th>
                    <th className="w-32 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Keyakinan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.matched.map((match) => (
                    <tr key={match.id} className="hover:bg-ink-50">
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-ink-600">{formatDate(match.statementLine.date)}</td>
                      <td className="px-4 py-2.5">
                        <p className="line-clamp-1 text-ink-800">{match.statementLine.description}</p>
                        <p className="tabular text-xs text-ink-400">{match.statementLine.reference}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="line-clamp-1 text-ink-700">{match.transaction.description}</p>
                        <p className="tabular text-xs text-ink-400">{match.transaction.reference}</p>
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink-700">
                        {match.statementLine.debit > 0 ? formatCurrency(match.statementLine.debit, 'IDR', { withSymbol: false }) : '—'}
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink-700">
                        {match.statementLine.credit > 0 ? formatCurrency(match.statementLine.credit, 'IDR', { withSymbol: false }) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={match.confidence === 'Exact' ? 'positive' : 'caution'}>
                          {match.confidence === 'Exact' ? 'Sama persis' : 'Disarankan'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}

      {tab === 'statement' ? (
        <Panel>
          <PanelHeader
            title="Mutasi Rekening Koran Belum Cocok"
            description="Item pada rekening koran yang belum ditemukan padanannya di sistem"
            compact
          />
          {isPending ? (
            <TableSkeleton rows={5} columns={4} />
          ) : !data?.unmatchedStatementLines.length ? (
            <EmptyState
              icon={<CheckCircle2 className="size-5" />}
              title="Seluruh mutasi telah cocok"
              description="Tidak ada item rekening koran yang tersisa untuk dicocokkan."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <thead className="bg-ink-50">
                  <tr className="border-b border-ink-200">
                    <th className="w-28 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Tanggal</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Keterangan</th>
                    <th className="w-40 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Referensi</th>
                    <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Debit</th>
                    <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.unmatchedStatementLines.map((line) => (
                    <tr key={line.id} className="hover:bg-ink-50">
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-ink-600">{formatDate(line.date)}</td>
                      <td className="px-4 py-2.5 text-ink-800">{line.description}</td>
                      <td className="tabular px-4 py-2.5 text-ink-500">{line.reference}</td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink-700">
                        {line.debit > 0 ? formatCurrency(line.debit, 'IDR', { withSymbol: false }) : '—'}
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-ink-700">
                        {line.credit > 0 ? formatCurrency(line.credit, 'IDR', { withSymbol: false }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}

      {tab === 'system' ? (
        <Panel>
          <PanelHeader
            title="Catatan Sistem Belum Cocok"
            description="Transaksi yang tercatat di sistem namun belum muncul pada rekening koran"
            compact
          />
          {isPending ? (
            <TableSkeleton rows={5} columns={5} />
          ) : !data?.unmatchedTransactions.length ? (
            <EmptyState
              icon={<CheckCircle2 className="size-5" />}
              title="Seluruh catatan telah cocok"
              description="Tidak ada transaksi sistem yang tersisa untuk dicocokkan."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-sm">
                <thead className="bg-ink-50">
                  <tr className="border-b border-ink-200">
                    <th className="w-28 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Tanggal</th>
                    <th className="w-40 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Referensi</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Keterangan</th>
                    <th className="w-28 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Tipe</th>
                    <th className="w-36 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Nilai</th>
                    <th className="w-32 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.unmatchedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-ink-50">
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-ink-600">{formatDate(transaction.date)}</td>
                      <td className="tabular px-4 py-2.5 text-ink-700">{transaction.reference}</td>
                      <td className="px-4 py-2.5">
                        <span className="line-clamp-1 text-ink-800">{transaction.description}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={transaction.type} />
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-right font-medium text-ink-900">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          leadingIcon={<Link2 className="size-3.5" />}
                          loading={matchMutation.isPending && matchMutation.variables?.id === transaction.id}
                          onClick={() => matchMutation.mutate({ id: transaction.id, reconciled: true })}
                        >
                          Tandai cocok
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
