import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, Check, Download, Eye, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import type { JournalEntry } from '@/types';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useTableQuery } from '@/hooks/useTableQuery';
import { useConfirm } from '@/hooks/useConfirm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { RowActions } from '@/components/tables/RowActions';
import { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { exportToExcel } from '@/utils/export';

const SOURCES = [
  'Manual',
  'Sales Invoice',
  'Purchase Invoice',
  'Cash Receipt',
  'Cash Payment',
  'Expense',
  'Adjustment',
];

export default function JournalEntriesPage() {
  useDocumentTitle('Jurnal Umum');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({
    defaultSort: { field: 'date', direction: 'desc' },
    filterKeys: ['status', 'source', 'from', 'to'],
  });
  const [preset, setPreset] = useState<'custom' | 'this-month' | 'year-to-date'>('custom');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.journals.list(table.params),
    queryFn: () => accountingService.listJournals(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.journals.all, 'summary'],
    queryFn: accountingService.journalSummary,
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => accountingService.postJournal(id),
    onSuccess: (journal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      toast.success('Jurnal diposting', `${journal.number} kini tercatat pada buku besar.`);
    },
    onError: (error: Error) => toast.error('Jurnal gagal diposting', error.message),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => accountingService.voidJournal(id),
    onSuccess: (journal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.all });
      toast.success('Jurnal dibatalkan', `${journal.number} ditandai sebagai void.`);
    },
    onError: (error: Error) => toast.error('Jurnal gagal dibatalkan', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingService.deleteJournal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.all });
      toast.success('Jurnal dihapus', 'Draft jurnal telah dihapus dari sistem.');
    },
    onError: (error: Error) => toast.error('Jurnal gagal dihapus', error.message),
  });

  const columns: Column<JournalEntry>[] = [
    {
      id: 'number',
      header: 'Nomor Jurnal',
      sortField: 'number',
      width: '11.5rem',
      cell: (row) => (
        <Link
          to={`/accounting/journal-entries/${row.id}`}
          className="tabular font-medium text-brand-700 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.number}
        </Link>
      ),
    },
    {
      id: 'date',
      header: 'Tanggal',
      sortField: 'date',
      width: '8rem',
      cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span>,
    },
    {
      id: 'memo',
      header: 'Keterangan',
      minWidth: '22rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-1 text-ink-800">{row.memo}</p>
          <p className="tabular mt-0.5 text-xs text-ink-400">
            {row.reference} · {row.lines.length} baris
          </p>
        </div>
      ),
    },
    {
      id: 'source',
      header: 'Sumber',
      sortField: 'source',
      hideBelow: 'lg',
      width: '10rem',
      cell: (row) => <Badge tone="muted">{row.source}</Badge>,
    },
    {
      id: 'totalDebit',
      header: 'Total Debit',
      sortField: 'totalDebit',
      align: 'right',
      width: '11.5rem',
      cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.totalDebit)}</span>,
    },
    {
      id: 'totalCredit',
      header: 'Total Kredit',
      align: 'right',
      hideBelow: 'md',
      width: '11.5rem',
      cell: (row) => <span className="text-ink-700">{formatCurrency(row.totalCredit)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      sortField: 'status',
      width: '7.5rem',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3.5rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem
                icon={<Eye className="size-3.5" />}
                onClick={() => {
                  close();
                  navigate(`/accounting/journal-entries/${row.id}`);
                }}
              >
                Lihat jurnal
              </DropdownItem>
              <DropdownItem
                icon={<Pencil className="size-3.5" />}
                disabled={row.status !== 'Draft'}
                onClick={() => {
                  close();
                  navigate(`/accounting/journal-entries/${row.id}/edit`);
                }}
              >
                Ubah draft
              </DropdownItem>
              <DropdownItem
                icon={<Check className="size-3.5" />}
                disabled={row.status !== 'Draft'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Posting jurnal',
                    tone: 'info',
                    confirmLabel: 'Posting sekarang',
                    message: (
                      <>
                        Jurnal <strong>{row.number}</strong> senilai {formatCurrency(row.totalDebit)} akan
                        diposting ke buku besar dan tidak dapat diubah kembali.
                      </>
                    ),
                    onConfirm: () => postMutation.mutateAsync(row.id),
                  });
                }}
              >
                Posting jurnal
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<XCircle className="size-3.5" />}
                disabled={row.status === 'Void'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Batalkan jurnal',
                    tone: 'warning',
                    confirmLabel: 'Batalkan jurnal',
                    message: (
                      <>
                        Jurnal <strong>{row.number}</strong> akan ditandai void. Saldo buku besar akan disesuaikan
                        pada periode berjalan.
                      </>
                    ),
                    onConfirm: () => voidMutation.mutateAsync(row.id),
                  });
                }}
              >
                Batalkan jurnal
              </DropdownItem>
              <DropdownItem
                icon={<Trash2 className="size-3.5" />}
                destructive
                disabled={row.status === 'Posted'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Hapus draft jurnal',
                    tone: 'danger',
                    confirmLabel: 'Hapus jurnal',
                    message: (
                      <>
                        Draft <strong>{row.number}</strong> akan dihapus permanen. Tindakan ini tidak dapat
                        dibatalkan.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus draft
              </DropdownItem>
            </>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jurnal Umum"
        description="Seluruh jurnal yang terbentuk dari transaksi operasional maupun penyesuaian manual."
        actions={
          <>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'jurnal-umum',
                  [
                    { header: 'Nomor', value: (row: JournalEntry) => row.number },
                    { header: 'Tanggal', value: (row: JournalEntry) => row.date },
                    { header: 'Referensi', value: (row: JournalEntry) => row.reference },
                    { header: 'Keterangan', value: (row: JournalEntry) => row.memo },
                    { header: 'Sumber', value: (row: JournalEntry) => row.source },
                    { header: 'Total Debit', value: (row: JournalEntry) => row.totalDebit },
                    { header: 'Total Kredit', value: (row: JournalEntry) => row.totalCredit },
                    { header: 'Status', value: (row: JournalEntry) => row.status },
                  ],
                  data?.data ?? [],
                  { title: 'Jurnal Umum', subtitle: 'PT PSSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel jurnal umum telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Plus className="size-4" />}
              onClick={() => navigate('/accounting/journal-entries/new')}
            >
              Buat Jurnal
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0 lg:grid-cols-5"
            items={[
              { label: 'Total Jurnal', value: summary.total },
              { label: 'Draft', value: summary.draft, tone: summary.draft > 0 ? 'caution' : 'neutral' },
              { label: 'Diposting', value: summary.posted, tone: 'positive' },
              { label: 'Jurnal Bulan Ini', value: summary.thisMonthCount },
              { label: 'Nilai Bulan Ini', value: formatCurrency(summary.thisMonthValue) },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nomor, referensi, atau keterangan"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'status',
              label: 'Status',
              value: table.filters.status ?? '',
              onChange: (value) => table.setFilter('status', value),
              options: [
                { value: 'Draft', label: 'Draft' },
                { value: 'Posted', label: 'Diposting' },
                { value: 'Void', label: 'Void' },
              ],
              width: 'w-36',
            },
            {
              id: 'source',
              label: 'Sumber',
              value: table.filters.source ?? '',
              onChange: (value) => table.setFilter('source', value),
              options: SOURCES.map((source) => ({ value: source, label: source })),
            },
          ]}
          extra={
            <DateRangeFilter
              compact
              className="hidden xl:flex"
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
          error={isError ? new Error('Daftar jurnal tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/accounting/journal-entries/${row.id}`)}
          emptyIcon={<BookOpenCheck className="size-5" />}
          emptyTitle="Belum ada jurnal"
          emptyDescription="Buat jurnal penyesuaian pertama atau ubah filter periode untuk menampilkan data lain."
          emptyAction={
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus className="size-4" />}
              onClick={() => navigate('/accounting/journal-entries/new')}
            >
              Buat jurnal
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
            itemLabel="jurnal"
          />
        ) : null}
      </Panel>

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
