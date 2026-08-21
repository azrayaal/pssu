import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Landmark, ListOrdered, Pencil, Plus } from 'lucide-react';
import type { BankAccount } from '@/types';
import { cashBankService } from '@/services/cash-bank.service';
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
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { RowActions } from '@/components/tables/RowActions';
import { DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { formatCurrency } from '@/utils/format';
import { BankAccountFormDialog } from './components/BankAccountFormDialog';

const KIND_LABELS: Record<BankAccount['kind'], string> = {
  Bank: 'Bank',
  Cash: 'Kas',
  'E-Wallet': 'Dompet Digital',
  'Virtual Account': 'Virtual Account',
};

export default function BankAccountsPage() {
  useDocumentTitle('Rekening Kas dan Bank');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmation = useConfirm();
  const table = useTableQuery({ defaultSort: { field: 'name', direction: 'asc' }, filterKeys: ['status', 'kind'] });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.bankAccounts.list(table.params),
    queryFn: () => cashBankService.listAccounts(table.params),
  });

  const { data: summary } = useQuery({
    queryKey: [...queryKeys.bankAccounts.all, 'summary'],
    queryFn: cashBankService.summary,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Active' | 'Inactive' }) =>
      cashBankService.setAccountStatus(id, status),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts.all });
      toast.success(account.status === 'Active' ? 'Rekening diaktifkan' : 'Rekening dinonaktifkan', account.name);
    },
    onError: (error: Error) => toast.error('Perubahan status gagal', error.message),
  });

  const columns: Column<BankAccount>[] = [
    {
      id: 'name',
      header: 'Nama Rekening',
      sortField: 'name',
      minWidth: '15rem',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">{row.holderName}</p>
        </div>
      ),
    },
    { id: 'accountNumber', header: 'Nomor Rekening', sortField: 'accountNumber', width: '13rem', cell: (row) => <span className="tabular text-ink-700">{row.accountNumber}</span> },
    { id: 'bankName', header: 'Bank', sortField: 'bankName', width: '12rem', hideBelow: 'md', cell: (row) => <span className="text-ink-600">{row.bankName}</span> },
    { id: 'branch', header: 'Cabang', width: '13rem', hideBelow: '2xl', cell: (row) => <span className="text-ink-500">{row.branch}</span> },
    { id: 'gl', header: 'Akun GL', width: '7.5rem', hideBelow: 'xl', cell: (row) => <span className="tabular text-ink-600">{row.glAccountCode}</span> },
    { id: 'kind', header: 'Jenis', width: '8rem', hideBelow: 'lg', cell: (row) => <Badge tone="muted">{KIND_LABELS[row.kind]}</Badge> },
    { id: 'currency', header: 'Mata Uang', width: '7rem', hideBelow: 'xl', cell: (row) => <span className="text-ink-600">{row.currency}</span> },
    {
      id: 'balance',
      header: 'Saldo Berjalan',
      sortField: 'currentBalance',
      align: 'right',
      width: '12rem',
      cell: (row) => (
        <span className={row.currentBalance < 0 ? 'font-medium text-negative-700' : 'font-medium text-ink-900'}>
          {formatCurrency(row.currentBalance, row.currency)}
        </span>
      ),
    },
    { id: 'status', header: 'Status', sortField: 'status', width: '8rem', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: '3rem',
      cell: (row) => (
        <RowActions>
          {({ close }) => (
            <>
              <DropdownItem
                icon={<ListOrdered className="size-3.5" />}
                onClick={() => { close(); navigate(`/cash-bank/transactions?bankAccountId=${row.id}`); }}
              >
                Lihat mutasi
              </DropdownItem>
              <DropdownItem icon={<Pencil className="size-3.5" />} onClick={() => { close(); setEditing(row); setFormOpen(true); }}>
                Ubah rekening
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={row.status === 'Active' ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                onClick={() => {
                  close();
                  confirmation.confirm({
                    title: row.status === 'Active' ? 'Nonaktifkan rekening' : 'Aktifkan rekening',
                    tone: row.status === 'Active' ? 'warning' : 'info',
                    confirmLabel: row.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan',
                    message: (
                      <>
                        Rekening <strong>{row.name}</strong>{' '}
                        {row.status === 'Active'
                          ? 'tidak akan tersedia untuk transaksi baru. Saldo dan riwayat tetap tersimpan.'
                          : 'akan kembali tersedia untuk pencatatan transaksi.'}
                      </>
                    ),
                    onConfirm: () => statusMutation.mutateAsync({ id: row.id, status: row.status === 'Active' ? 'Inactive' : 'Active' }),
                  });
                }}
              >
                {row.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}
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
        title="Rekening Kas dan Bank"
        description="Seluruh rekening operasional perusahaan beserta saldo berjalan yang tercermin pada buku besar."
        actions={
          <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Tambah Rekening
          </Button>
        }
      />

      {summary ? (
        <Panel>
          <SummaryBar
            className="border-b-0 lg:grid-cols-5"
            items={[
              { label: 'Total Saldo', value: formatCurrency(summary.totalBalance) },
              { label: 'Saldo Bank', value: formatCurrency(summary.bankBalance) },
              { label: 'Saldo Kas', value: formatCurrency(summary.cashBalance) },
              { label: 'Kas Masuk Bulan Ini', value: formatCurrency(summary.monthInflow), tone: 'positive' },
              { label: 'Kas Keluar Bulan Ini', value: formatCurrency(summary.monthOutflow), tone: 'negative' },
            ]}
          />
        </Panel>
      ) : null}

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari nama rekening atau nomor"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'kind',
              label: 'Jenis',
              value: table.filters.kind ?? '',
              onChange: (value) => table.setFilter('kind', value),
              options: (Object.keys(KIND_LABELS) as BankAccount['kind'][]).map((key) => ({ value: key, label: KIND_LABELS[key] })),
              width: 'w-44',
            },
            {
              id: 'status',
              label: 'Status',
              value: table.filters.status ?? '',
              onChange: (value) => table.setFilter('status', value),
              options: [
                { value: 'Active', label: 'Aktif' },
                { value: 'Inactive', label: 'Nonaktif' },
              ],
              width: 'w-36',
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(row) => row.id}
          loading={isPending}
          error={isError ? new Error('Daftar rekening tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(row) => navigate(`/cash-bank/transactions?bankAccountId=${row.id}`)}
          emptyIcon={<Landmark className="size-5" />}
          emptyTitle="Belum ada rekening"
          emptyDescription="Tambahkan rekening bank atau kas untuk mulai mencatat mutasi keuangan."
          emptyAction={
            <Button variant="primary" size="sm" leadingIcon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Tambah rekening
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
            itemLabel="rekening"
          />
        ) : null}
      </Panel>

      <BankAccountFormDialog open={formOpen} account={editing} onClose={() => { setFormOpen(false); setEditing(null); }} />
      <ConfirmDialog {...confirmation.dialogProps} />
    </div>
  );
}
