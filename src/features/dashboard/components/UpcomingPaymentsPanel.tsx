import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { UpcomingPaymentRow } from '@/types';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';

export function UpcomingPaymentsPanel({ rows, loading }: { rows: UpcomingPaymentRow[]; loading: boolean }) {
  const navigate = useNavigate();

  const columns: Column<UpcomingPaymentRow>[] = [
    {
      id: 'number',
      header: 'Nomor',
      width: '10rem',
      cell: (row) => <span className="font-medium text-brand-700">{row.number}</span>,
    },
    {
      id: 'vendor',
      header: 'Pemasok',
      minWidth: '14rem',
      cell: (row) => <span className="line-clamp-1 text-ink-700">{row.vendorName}</span>,
    },
    {
      id: 'dueDate',
      header: 'Jatuh Tempo',
      width: '9.5rem',
      cell: (row) => (
        <span className="tabular text-ink-600">
          {formatDate(row.dueDate)}
          <span
            className={
              row.daysUntilDue < 0
                ? 'ml-1.5 text-xs text-negative-600'
                : row.daysUntilDue <= 7
                  ? 'ml-1.5 text-xs text-caution-600'
                  : 'ml-1.5 text-xs text-ink-400'
            }
          >
            {row.daysUntilDue < 0 ? `${Math.abs(row.daysUntilDue)}h lewat` : `${row.daysUntilDue}h lagi`}
          </span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: '9.5rem',
      hideBelow: 'sm',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'outstanding',
      header: 'Sisa Utang',
      align: 'right',
      width: '10rem',
      cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.outstanding)}</span>,
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title="Pembayaran Mendatang"
        description="Kewajiban kepada pemasok yang perlu segera dijadwalkan"
        actions={
          <Link
            to="/purchase/invoices"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
          >
            Semua tagihan
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        onRowClick={(row) => navigate(`/purchase/invoices/${row.id}`)}
        emptyTitle="Tidak ada utang terbuka"
        emptyDescription="Seluruh faktur pembelian telah diselesaikan."
      />
    </Panel>
  );
}
