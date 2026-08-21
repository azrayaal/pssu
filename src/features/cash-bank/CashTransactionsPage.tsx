import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Download, Plus } from 'lucide-react';
import type { CashTransaction } from '@/types';
import { cashBankService } from '@/services/cash-bank.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useTableQuery } from '@/hooks/useTableQuery';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { exportToExcel } from '@/utils/export';
import { CashTransactionDialog } from './components/CashTransactionDialog';

export default function CashTransactionsPage() {
  useDocumentTitle('Transaksi Kas dan Bank');
  const table = useTableQuery({
    defaultSort: { field: 'date', direction: 'desc' },
    defaultPageSize: 25,
    filterKeys: ['type', 'bankAccountId', 'reconciled', 'from', 'to'],
  });
  const [preset, setPreset] = useState<'custom' | 'this-month'>('custom');
  const [formOpen, setFormOpen] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.cashTransactions.list(table.params),
    queryFn: () => cashBankService.listTransactions(table.params),
  });

  const { data: bankOptions } = useQuery({
    queryKey: queryKeys.bankAccounts.options,
    queryFn: cashBankService.accountOptions,
  });

  const columns: Column<CashTransaction>[] = [
    { id: 'date', header: 'Tanggal', sortField: 'date', width: '7.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    { id: 'reference', header: 'Referensi', sortField: 'reference', width: '11rem', cell: (row) => <span className="tabular font-medium text-ink-800">{row.reference}</span> },
    {
      id: 'description',
      header: 'Keterangan',
      minWidth: '16rem',
      cell: (row) => <span className="line-clamp-1 text-ink-700">{row.description}</span>,
    },
    { id: 'account', header: 'Rekening', sortField: 'bankAccountName', minWidth: '12rem', hideBelow: 'lg', cell: (row) => <span className="line-clamp-1 text-ink-600">{row.bankAccountName}</span> },
    {
      id: 'counter',
      header: 'Akun Lawan',
      minWidth: '14rem',
      hideBelow: '2xl',
      cell: (row) => <span className="line-clamp-1 text-ink-500">{row.transferToAccountName ?? row.counterAccountName}</span>,
    },
    { id: 'type', header: 'Tipe', sortField: 'type', width: '8rem', cell: (row) => <StatusBadge status={row.type} /> },
    {
      id: 'amount',
      header: 'Nilai',
      sortField: 'amount',
      align: 'right',
      width: '11.5rem',
      cell: (row) => (
        <span
          className={
            row.type === 'Income'
              ? 'font-medium text-positive-700'
              : row.type === 'Expense'
                ? 'font-medium text-negative-700'
                : 'font-medium text-ink-700'
          }
        >
          {row.type === 'Expense' ? '-' : row.type === 'Income' ? '+' : ''}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      id: 'balance',
      header: 'Saldo',
      align: 'right',
      width: '12rem',
      hideBelow: 'xl',
      cell: (row) => <span className="text-ink-700">{formatCurrency(row.runningBalance)}</span>,
    },
    {
      id: 'reconciled',
      header: 'Rekonsiliasi',
      width: '8.5rem',
      hideBelow: 'md',
      cell: (row) => <Badge tone={row.reconciled ? 'positive' : 'muted'}>{row.reconciled ? 'Cocok' : 'Belum'}</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transaksi Kas dan Bank"
        description="Seluruh mutasi kas masuk, kas keluar, dan pemindahbukuan antar rekening perusahaan."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'transaksi-kas-bank',
                  [
                    { header: 'Tanggal', value: (row: CashTransaction) => row.date },
                    { header: 'Referensi', value: (row: CashTransaction) => row.reference },
                    { header: 'Keterangan', value: (row: CashTransaction) => row.description },
                    { header: 'Rekening', value: (row: CashTransaction) => row.bankAccountName },
                    { header: 'Akun Lawan', value: (row: CashTransaction) => row.counterAccountName },
                    { header: 'Tipe', value: (row: CashTransaction) => row.type },
                    { header: 'Nilai', value: (row: CashTransaction) => row.amount },
                    { header: 'Saldo Berjalan', value: (row: CashTransaction) => row.runningBalance },
                    { header: 'Rekonsiliasi', value: (row: CashTransaction) => (row.reconciled ? 'Cocok' : 'Belum') },
                  ],
                  data?.data ?? [],
                  { title: 'Transaksi Kas dan Bank', subtitle: 'PT PSSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel transaksi kas telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Catat Transaksi
            </Button>
          </>
        }
      />

      {data ? (
        <Panel>
          <SummaryBar
            className="border-b-0"
            items={[
              { label: 'Jumlah Transaksi', value: data.total },
              { label: 'Total Penerimaan', value: formatCurrency(data.totals.income), tone: 'positive' },
              { label: 'Total Pengeluaran', value: formatCurrency(data.totals.expense), tone: 'negative' },
              { label: 'Total Pemindahbukuan', value: formatCurrency(data.totals.transfer) },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari referensi atau keterangan"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'bankAccountId',
              label: 'Rekening',
              value: table.filters.bankAccountId ?? '',
              onChange: (value) => table.setFilter('bankAccountId', value),
              options: (bankOptions ?? []).map((option) => ({ value: option.value, label: option.label })),
              width: 'w-56',
            },
            {
              id: 'type',
              label: 'Tipe',
              value: table.filters.type ?? '',
              onChange: (value) => table.setFilter('type', value),
              options: [
                { value: 'Income', label: 'Penerimaan' },
                { value: 'Expense', label: 'Pengeluaran' },
                { value: 'Transfer', label: 'Transfer' },
              ],
              width: 'w-40',
            },
            {
              id: 'reconciled',
              label: 'Rekonsiliasi',
              value: table.filters.reconciled ?? '',
              onChange: (value) => table.setFilter('reconciled', value),
              options: [
                { value: 'true', label: 'Sudah cocok' },
                { value: 'false', label: 'Belum cocok' },
              ],
              width: 'w-44',
            },
          ]}
          extra={
            <DateRangeFilter
              compact
              className="hidden 2xl:flex"
              preset={preset}
              onPresetChange={(next) => setPreset(next as typeof preset)}
              value={{ from: table.filters.from ?? '', to: table.filters.to ?? '' }}
              onChange={(range) => {
                table.setFilter('from', range.from);
                table.setFilter('to', range.to);
              }}
            />
          }
        />

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isPending}
          error={isError ? new Error('Daftar transaksi tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          emptyIcon={<ArrowLeftRight className="size-5" />}
          emptyTitle="Tidak ada transaksi"
          emptyDescription="Catat transaksi kas pertama atau sesuaikan filter rekening dan periode."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Catat transaksi
            </Button>
          }
        />

        {data && data.total > 0 ? (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={data.totalPages}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            itemLabel="transaksi"
          />
        ) : null}
      </Panel>

      <CashTransactionDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
