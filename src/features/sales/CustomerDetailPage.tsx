import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Pencil, Plus } from 'lucide-react';
import type { Invoice } from '@/types';
import { salesService } from '@/services/sales.service';
import { queryKeys } from '@/lib/query-keys';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader, MetaItem } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { DetailList, SummaryBar } from '@/components/ui/DetailList';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { AgingBreakdown } from '@/components/charts/FinancialCharts';
import { formatCurrency, formatPercent } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { CustomerFormDialog } from './components/CustomerFormDialog';

type TabKey = 'overview' | 'invoices' | 'payments';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const { data: customer, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: () => salesService.getCustomer(id!),
    enabled: Boolean(id),
  });

  const { data: history, isPending: historyPending } = useQuery({
    queryKey: queryKeys.customers.transactions(id ?? ''),
    queryFn: () => salesService.getCustomerTransactions(id!),
    enabled: Boolean(id),
  });

  useDocumentTitle(customer ? customer.name : 'Detail Pelanggan');

  const invoiceColumns: Column<Invoice>[] = [
    {
      id: 'number',
      header: 'Nomor',
      width: '10rem',
      cell: (row) => (
        <Link to={`/sales/invoices/${row.id}`} className="tabular font-medium text-brand-700 hover:underline">
          {row.number}
        </Link>
      ),
    },
    { id: 'date', header: 'Tanggal', width: '8rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    { id: 'dueDate', header: 'Jatuh Tempo', width: '8.5rem', hideBelow: 'sm', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.dueDate)}</span> },
    { id: 'total', header: 'Nilai', align: 'right', width: '11.5rem', cell: (row) => formatCurrency(row.total) },
    { id: 'paid', header: 'Dibayar', align: 'right', width: '11.5rem', hideBelow: 'lg', cell: (row) => formatCurrency(row.paidAmount) },
    {
      id: 'outstanding',
      header: 'Sisa',
      align: 'right',
      width: '11.5rem',
      cell: (row) => (
        <span className={row.outstanding > 0 ? 'font-medium text-ink-900' : 'text-ink-400'}>
          {formatCurrency(row.outstanding)}
        </span>
      ),
    },
    { id: 'status', header: 'Status', width: '9rem', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const paymentColumns: Column<NonNullable<typeof history>['payments'][number]>[] = [
    { id: 'date', header: 'Tanggal', width: '8.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    {
      id: 'invoice',
      header: 'Faktur',
      width: '10rem',
      cell: (row) => <span className="tabular font-medium text-ink-800">{row.invoiceNumber}</span>,
    },
    { id: 'method', header: 'Metode', width: '11.5rem', cell: (row) => <Badge tone="muted">{row.method}</Badge> },
    { id: 'account', header: 'Rekening', minWidth: '14rem', hideBelow: 'md', cell: (row) => <span className="text-ink-600">{row.accountName}</span> },
    { id: 'reference', header: 'Referensi', minWidth: '12rem', hideBelow: 'lg', cell: (row) => <span className="tabular text-ink-500">{row.reference}</span> },
    { id: 'amount', header: 'Nilai', align: 'right', width: '11.5rem', cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.amount)}</span> },
  ];

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Pelanggan tidak ditemukan" onRetry={() => refetch()} />
      </Panel>
    );
  }

  if (isPending || !customer) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const utilisation = customer.creditLimit === 0 ? 0 : (customer.outstandingBalance / customer.creditLimit) * 100;

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer.name}
        description={customer.legalName}
        meta={
          <>
            <StatusBadge status={customer.status} />
            <Badge tone="muted">{customer.category}</Badge>
            <MetaItem label="Kode" value={customer.code} />
            <MetaItem label="NPWP" value={customer.taxId} />
            <MetaItem label="Termin" value={`${customer.paymentTermDays} hari`} />
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/sales/customers')}>
              Daftar pelanggan
            </Button>
            <Button variant="outline" leadingIcon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>
              Ubah data
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Plus className="size-4" />}
              onClick={() => navigate(`/sales/invoices/new?customerId=${customer.id}`)}
            >
              Buat Faktur
            </Button>
          </>
        }
      />

      <Panel>
        <SummaryBar
          className="border-b-0"
          items={[
            { label: 'Total Ditagih', value: formatCurrency(history?.totals.billed ?? 0) },
            { label: 'Sudah Diterima', value: formatCurrency(history?.totals.collected ?? 0), tone: 'positive' },
            {
              label: 'Piutang Berjalan',
              value: formatCurrency(customer.outstandingBalance),
              tone: customer.outstandingBalance > customer.creditLimit ? 'negative' : 'neutral',
            },
            {
              label: 'Pemakaian Batas Kredit',
              value: formatPercent(utilisation),
              tone: utilisation > 100 ? 'negative' : utilisation > 80 ? 'caution' : 'positive',
            },
          ]}
        />
      </Panel>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Ringkasan' },
          { value: 'invoices', label: 'Faktur', count: history?.invoices.length },
          { value: 'payments', label: 'Pembayaran', count: history?.payments.length },
        ]}
      />

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <PanelHeader title="Informasi Pelanggan" compact />
            <div className="p-5">
              <DetailList
                columns={3}
                items={[
                  { label: 'Kode pelanggan', value: customer.code },
                  { label: 'Nama badan hukum', value: customer.legalName },
                  { label: 'NPWP', value: customer.taxId },
                  { label: 'Nama kontak', value: customer.contactPerson },
                  { label: 'Email', value: customer.email },
                  { label: 'Telepon', value: customer.phone },
                  { label: 'Alamat', value: `${customer.address}, ${customer.city}, ${customer.province} ${customer.postalCode}`, span: true },
                  { label: 'Termin pembayaran', value: `${customer.paymentTermDays} hari` },
                  { label: 'Batas kredit', value: formatCurrency(customer.creditLimit) },
                  { label: 'Kategori', value: customer.category },
                  { label: 'Catatan', value: customer.notes || '—', span: true },
                ]}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Umur Piutang" description="Distribusi piutang berdasarkan usia jatuh tempo" compact />
            <div className="p-5">
              {history ? (
                <>
                  <p className="tabular text-2xl font-semibold text-ink-900">{formatCurrency(history.aging.total)}</p>
                  <p className="mt-0.5 text-[13px] text-ink-500">Total piutang belum tertagih</p>
                  <AgingBreakdown buckets={history.aging} />
                </>
              ) : (
                <Skeleton className="h-48 w-full" />
              )}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === 'invoices' ? (
        <Panel>
          <PanelHeader title="Riwayat Faktur" description="Faktur penjualan yang diterbitkan untuk pelanggan ini" compact />
          <DataTable
            columns={invoiceColumns}
            rows={history?.invoices ?? []}
            rowKey={(row) => row.id}
            loading={historyPending}
            onRowClick={(row) => navigate(`/sales/invoices/${row.id}`)}
            emptyIcon={<FileText className="size-5" />}
            emptyTitle="Belum ada faktur"
            emptyDescription="Pelanggan ini belum memiliki riwayat faktur penjualan."
          />
        </Panel>
      ) : null}

      {tab === 'payments' ? (
        <Panel>
          <PanelHeader title="Riwayat Pembayaran" description="Penerimaan kas yang tercatat atas faktur pelanggan" compact />
          <DataTable
            columns={paymentColumns}
            rows={history?.payments ?? []}
            rowKey={(row) => row.id}
            loading={historyPending}
            emptyTitle="Belum ada pembayaran"
            emptyDescription="Belum ada penerimaan kas yang tercatat dari pelanggan ini."
          />
        </Panel>
      ) : null}

      <CustomerFormDialog open={editOpen} customer={customer} onClose={() => setEditOpen(false)} />
    </div>
  );
}
