import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { OutstandingInvoiceRow } from '@/types';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';

export function OutstandingInvoicesPanel({ rows, loading }: { rows: OutstandingInvoiceRow[]; loading: boolean }) {
  const navigate = useNavigate();

  const columns: Column<OutstandingInvoiceRow>[] = [
    {
      id: 'number',
      header: 'Nomor',
      width: '9.5rem',
      cell: (row) => <span className="font-medium text-brand-700">{row.number}</span>,
    },
    {
      id: 'customer',
      header: 'Pelanggan',
      minWidth: '14rem',
      cell: (row) => <span className="line-clamp-1 text-ink-700">{row.customerName}</span>,
    },
    {
      id: 'dueDate',
      header: 'Jatuh Tempo',
      width: '9rem',
      cell: (row) => (
        <span className="tabular text-ink-600">
          {formatDate(row.dueDate)}
          {row.daysOverdue > 0 ? (
            <span className="ml-1.5 text-xs text-negative-600">+{row.daysOverdue}h</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: '8.5rem',
      hideBelow: 'sm',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'outstanding',
      header: 'Sisa Tagihan',
      align: 'right',
      width: '10rem',
      cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.outstanding)}</span>,
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title="Faktur Belum Tertagih"
        description="Sepuluh faktur dengan jatuh tempo terdekat"
        actions={
          <Link
            to="/sales/invoices"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
          >
            Semua faktur
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        onRowClick={(row) => navigate(`/sales/invoices/${row.id}`)}
        emptyTitle="Tidak ada piutang terbuka"
        emptyDescription="Seluruh faktur penjualan telah dilunasi pelanggan."
      />
    </Panel>
  );
}
