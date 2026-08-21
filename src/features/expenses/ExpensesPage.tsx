import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, Download, Eye, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import type { Expense } from '@/types';
import { expensesService } from '@/services/expenses.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useTableQuery } from '@/hooks/useTableQuery';
import { useConfirm } from '@/hooks/useConfirm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SummaryBar } from '@/components/ui/DetailList';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { RowActions } from '@/components/tables/RowActions';
import { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { formatCurrency, formatPercent } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { exportToExcel } from '@/utils/export';

const STATUS_LABELS: Record<Expense['status'], string> = {
  Draft: 'Draft',
  Submitted: 'Diajukan',
  Approved: 'Disetujui',
  Paid: 'Dibayar',
  Rejected: 'Ditolak',
};

export default function ExpensesPage() {
  useDocumentTitle('Biaya');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({
    defaultSort: { field: 'date', direction: 'desc' },
    filterKeys: ['status', 'categoryId', 'from', 'to'],
  });
  const [preset, setPreset] = useState<'custom' | 'this-month'>('custom');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.expenses.list(table.params),
    queryFn: () => expensesService.list(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.expenses.all, 'summary'],
    queryFn: expensesService.summary,
  });

  const { data: categoryOptions } = useQuery({
    queryKey: queryKeys.expenseCategories.options,
    queryFn: expensesService.categoryOptions,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Expense['status'] }) => expensesService.setStatus(id, status),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.all });
      toast.success('Status biaya diperbarui', `${expense.number} kini berstatus ${STATUS_LABELS[expense.status]}.`);
    },
    onError: (error: Error) => toast.error('Status biaya gagal diubah', error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      toast.success('Biaya dihapus', 'Pengajuan biaya telah dihapus dari sistem.');
    },
    onError: (error: Error) => toast.error('Biaya gagal dihapus', error.message),
  });

  const columns: Column<Expense>[] = [
    { id: 'number', header: 'Nomor', sortField: 'number', width: '10rem', cell: (row) => <span className="tabular font-medium text-brand-700">{row.number}</span> },
    { id: 'date', header: 'Tanggal', sortField: 'date', width: '7.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    {
      id: 'description',
      header: 'Keterangan',
      minWidth: '16rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-1 text-ink-800">{row.description}</p>
          <p className="line-clamp-1 text-xs text-ink-400">{row.vendorName || row.reference}</p>
        </div>
      ),
    },
    { id: 'category', header: 'Kategori', sortField: 'categoryName', width: '12rem', hideBelow: 'lg', cell: (row) => <Badge tone="muted">{row.categoryName}</Badge> },
    { id: 'account', header: 'Akun Bayar', minWidth: '13rem', hideBelow: '2xl', cell: (row) => <span className="line-clamp-1 text-ink-600">{row.paymentAccountName}</span> },
    { id: 'attachments', header: 'Lampiran', width: '7.5rem', align: 'center', hideBelow: 'xl', cell: (row) => <span className="tabular text-ink-500">{row.attachments.length || '—'}</span> },
    { id: 'total', header: 'Nilai', sortField: 'total', align: 'right', width: '11.5rem', cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.total)}</span> },
    { id: 'status', header: 'Status', sortField: 'status', width: '9rem', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem icon={<Eye className="size-3.5" />} onClick={() => { close(); navigate(`/expenses/${row.id}`); }}>
                Lihat detail
              </DropdownItem>
              <DropdownItem
                icon={<Pencil className="size-3.5" />}
                disabled={row.status === 'Paid'}
                onClick={() => { close(); navigate(`/expenses/${row.id}/edit`); }}
              >
                Ubah biaya
              </DropdownItem>
              <DropdownItem
                icon={<Send className="size-3.5" />}
                disabled={row.status !== 'Draft'}
                onClick={() => { close(); statusMutation.mutate({ id: row.id, status: 'Submitted' }); }}
              >
                Ajukan persetujuan
              </DropdownItem>
              <DropdownItem
                icon={<Check className="size-3.5" />}
                disabled={row.status !== 'Submitted'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Setujui pengajuan biaya',
                    tone: 'info',
                    confirmLabel: 'Setujui biaya',
                    message: (
                      <>
                        Biaya <strong>{row.number}</strong> senilai {formatCurrency(row.total)} akan disetujui dan
                        siap dibayarkan.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: 'Approved' }),
                  });
                }}
              >
                Setujui biaya
              </DropdownItem>
              <DropdownItem
                icon={<Check className="size-3.5" />}
                disabled={row.status !== 'Approved'}
                onClick={() => { close(); statusMutation.mutate({ id: row.id, status: 'Paid' }); }}
              >
                Tandai dibayar
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<X className="size-3.5" />}
                disabled={row.status === 'Paid' || row.status === 'Rejected'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Tolak pengajuan biaya',
                    tone: 'warning',
                    confirmLabel: 'Tolak biaya',
                    message: (
                      <>
                        Pengajuan <strong>{row.number}</strong> akan ditolak dan dikembalikan kepada pengaju.
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: 'Rejected' }),
                  });
                }}
              >
                Tolak biaya
              </DropdownItem>
              <DropdownItem
                icon={<Trash2 className="size-3.5" />}
                destructive
                disabled={row.status === 'Paid'}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: 'Hapus pengajuan biaya',
                    tone: 'danger',
                    confirmLabel: 'Hapus biaya',
                    message: (
                      <>
                        Pengajuan <strong>{row.number}</strong> akan dihapus permanen dari sistem.
                      </>
                    ),
                    onConfirm: () => deleteMutation.mutateAsync(row.id),
                  });
                }}
              >
                Hapus biaya
              </DropdownItem>
            </>
          )}
        </RowActions>
      ),
    },
  ];

  const budgetUsage = summary && summary.monthBudget > 0 ? (summary.monthTotal / summary.monthBudget) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Biaya Operasional"
        description="Pengajuan, persetujuan, dan pembayaran biaya operasional perusahaan."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/expenses/categories')}>
              Kategori Biaya
            </Button>
            <Button
              variant="outline"
              leadingIcon={<Download className="size-4" />}
              disabled={!data?.data.length}
              onClick={() => {
                exportToExcel(
                  'daftar-biaya',
                  [
                    { header: 'Nomor', value: (row: Expense) => row.number },
                    { header: 'Tanggal', value: (row: Expense) => row.date },
                    { header: 'Kategori', value: (row: Expense) => row.categoryName },
                    { header: 'Keterangan', value: (row: Expense) => row.description },
                    { header: 'Pemasok', value: (row: Expense) => row.vendorName },
                    { header: 'Akun Pembayaran', value: (row: Expense) => row.paymentAccountName },
                    { header: 'Nilai', value: (row: Expense) => row.amount },
                    { header: 'PPN', value: (row: Expense) => row.taxAmount },
                    { header: 'Total', value: (row: Expense) => row.total },
                    { header: 'Status', value: (row: Expense) => STATUS_LABELS[row.status] },
                  ],
                  data?.data ?? [],
                  { title: 'Daftar Biaya', subtitle: 'PT PSSU Indonesia' },
                );
                toast.success('Ekspor selesai', 'Berkas Excel daftar biaya telah diunduh.');
              }}
            >
              Ekspor
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/expenses/new')}>
              Catat Biaya
            </Button>
          </>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0 lg:grid-cols-5"
            items={[
              { label: 'Biaya Bulan Ini', value: formatCurrency(summary.monthTotal) },
              { label: 'Anggaran Bulan Ini', value: formatCurrency(summary.monthBudget) },
              {
                label: 'Serapan Anggaran',
                value: formatPercent(budgetUsage),
                tone: budgetUsage > 100 ? 'negative' : budgetUsage > 85 ? 'caution' : 'positive',
              },
              {
                label: 'Menunggu Persetujuan',
                value: formatCurrency(summary.pendingValue),
                tone: summary.pendingApproval > 0 ? 'caution' : 'neutral',
              },
              { label: 'Total Tahun Berjalan', value: formatCurrency(summary.yearTotal) },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nomor, keterangan, atau kategori"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'categoryId',
              label: 'Kategori',
              value: table.filters.categoryId ?? '',
              onChange: (value) => table.setFilter('categoryId', value),
              options: (categoryOptions ?? []).map((option) => ({ value: option.value, label: option.label })),
              width: 'w-52',
            },
            {
              id: 'status',
              label: 'Status',
              value: table.filters.status ?? '',
              onChange: (value) => table.setFilter('status', value),
              options: (Object.keys(STATUS_LABELS) as Expense['status'][]).map((key) => ({
                value: key,
                label: STATUS_LABELS[key],
              })),
              width: 'w-40',
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
          error={isError ? new Error('Daftar biaya tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/expenses/${row.id}`)}
          emptyIcon={<CreditCard className="size-5" />}
          emptyTitle="Tidak ada data biaya"
          emptyDescription="Catat pengeluaran operasional pertama atau sesuaikan filter kategori dan periode."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => navigate('/expenses/new')}>
              Catat biaya
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
            itemLabel="biaya"
          />
        ) : null}
      </Panel>

      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
