import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { RecentTransaction } from '@/types';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';

const columns: Column<RecentTransaction>[] = [
  {
    id: 'date',
    header: 'Tanggal',
    width: '7.5rem',
    cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span>,
  },
  {
    id: 'reference',
    header: 'Referensi',
    width: '11.5rem',
    cell: (row) => <span className="font-medium text-ink-800">{row.reference}</span>,
  },
  {
    id: 'description',
    header: 'Keterangan',
    minWidth: '18rem',
    cell: (row) => <span className="line-clamp-1 text-ink-700">{row.description}</span>,
  },
  {
    id: 'party',
    header: 'Rekening',
    hideBelow: 'lg',
    minWidth: '13rem',
    cell: (row) => <span className="text-ink-600">{row.party}</span>,
  },
  {
    id: 'account',
    header: 'Akun Lawan',
    hideBelow: 'xl',
    minWidth: '15rem',
    cell: (row) => <span className="line-clamp-1 text-ink-500">{row.account}</span>,
  },
  {
    id: 'type',
    header: 'Tipe',
    width: '7rem',
    cell: (row) => <StatusBadge status={row.type} />,
  },
  {
    id: 'amount',
    header: 'Nilai',
    align: 'right',
    width: '10rem',
    cell: (row) => (
      <span className={row.type === 'Expense' ? 'font-medium text-negative-700' : 'font-medium text-ink-900'}>
        {row.type === 'Expense' ? '-' : ''}
        {formatCurrency(row.amount)}
      </span>
    ),
  },
];

export function RecentTransactionsPanel({
  rows,
  loading,
  icon,
}: {
  rows: RecentTransaction[];
  loading: boolean;
  icon?: ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            {icon}
            Transaksi Terkini
          </span>
        }
        description="Pergerakan kas dan bank terbaru yang tercatat pada buku besar"
        actions={
          <Link
            to="/cash-bank/transactions"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
          >
            Lihat semua
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyTitle="Belum ada transaksi"
        emptyDescription="Transaksi kas dan bank akan muncul di sini setelah jurnal diposting."
      />
    </Panel>
  );
}
