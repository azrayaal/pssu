import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, FileText, Pencil, Plus } from 'lucide-react';
import type { PurchaseInvoice, PurchaseOrder } from '@/types';
import { purchaseService } from '@/services/purchase.service';
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
import { formatCurrency } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { VendorFormDialog } from './components/VendorFormDialog';

type TabKey = 'overview' | 'bills' | 'orders' | 'payments';

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const { data: vendor, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.vendors.detail(id ?? ''),
    queryFn: () => purchaseService.getVendor(id!),
    enabled: Boolean(id),
  });

  const { data: history, isPending: historyPending } = useQuery({
    queryKey: queryKeys.vendors.transactions(id ?? ''),
    queryFn: () => purchaseService.getVendorTransactions(id!),
    enabled: Boolean(id),
  });

  useDocumentTitle(vendor ? vendor.name : 'Detail Pemasok');

  const billColumns: Column<PurchaseInvoice>[] = [
    {
      id: 'number',
      header: 'Nomor',
      width: '10.5rem',
      cell: (row) => (
        <Link to={`/purchase/invoices/${row.id}`} className="tabular font-medium text-brand-700 hover:underline">
          {row.number}
        </Link>
      ),
    },
    { id: 'vendorNumber', header: 'Faktur Pemasok', minWidth: '12rem', hideBelow: 'lg', cell: (row) => <span className="tabular text-ink-600">{row.vendorInvoiceNumber}</span> },
    { id: 'date', header: 'Tanggal', width: '7.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    { id: 'dueDate', header: 'Jatuh Tempo', width: '9rem', hideBelow: 'sm', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.dueDate)}</span> },
    { id: 'total', header: 'Nilai', align: 'right', width: '10.5rem', cell: (row) => formatCurrency(row.total) },
    {
      id: 'outstanding',
      header: 'Sisa',
      align: 'right',
      width: '10.5rem',
      cell: (row) => (
        <span className={row.outstanding > 0 ? 'font-medium text-ink-900' : 'text-ink-400'}>{formatCurrency(row.outstanding)}</span>
      ),
    },
    { id: 'status', header: 'Status', width: '10rem', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const orderColumns: Column<PurchaseOrder>[] = [
    {
      id: 'number',
      header: 'Nomor',
      width: '10rem',
      cell: (row) => (
        <Link to={`/purchase/orders/${row.id}`} className="tabular font-medium text-brand-700 hover:underline">
          {row.number}
        </Link>
      ),
    },
    { id: 'date', header: 'Tanggal', width: '7.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    { id: 'expected', header: 'Target Terima', width: '9.5rem', hideBelow: 'sm', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.expectedDate)}</span> },
    { id: 'total', header: 'Nilai', align: 'right', width: '11rem', cell: (row) => formatCurrency(row.total) },
    { id: 'received', header: 'Diterima', align: 'right', width: '8rem', hideBelow: 'lg', cell: (row) => `${row.receivedPercent}%` },
    { id: 'status', header: 'Status', width: '11rem', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const paymentColumns: Column<NonNullable<typeof history>['payments'][number]>[] = [
    { id: 'date', header: 'Tanggal', width: '8.5rem', cell: (row) => <span className="tabular text-ink-600">{formatDate(row.date)}</span> },
    { id: 'bill', header: 'Tagihan', width: '11rem', cell: (row) => <span className="tabular font-medium text-ink-800">{row.billNumber}</span> },
    { id: 'method', header: 'Metode', width: '11rem', cell: (row) => <Badge tone="muted">{row.method}</Badge> },
    { id: 'account', header: 'Rekening', minWidth: '14rem', hideBelow: 'md', cell: (row) => <span className="text-ink-600">{row.accountName}</span> },
    { id: 'reference', header: 'Referensi', minWidth: '11rem', hideBelow: 'lg', cell: (row) => <span className="tabular text-ink-500">{row.reference}</span> },
    { id: 'amount', header: 'Nilai', align: 'right', width: '11rem', cell: (row) => <span className="font-medium text-ink-900">{formatCurrency(row.amount)}</span> },
  ];

  if (isError) {
    return (
      <Panel>
        <ErrorState title="Pemasok tidak ditemukan" onRetry={() => refetch()} />
      </Panel>
    );
  }

  if (isPending || !vendor) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={vendor.name}
        description={vendor.legalName}
        meta={
          <>
            <StatusBadge status={vendor.status} />
            <Badge tone="muted">{vendor.category}</Badge>
            <MetaItem label="Kode" value={vendor.code} />
            <MetaItem label="NPWP" value={vendor.taxId} />
            <MetaItem label="Termin" value={`${vendor.paymentTermDays} hari`} />
          </>
        }
        actions={
          <>
            <Button variant="outline" leadingIcon={<ArrowLeft className="size-4" />} onClick={() => navigate('/purchase/vendors')}>
              Daftar pemasok
            </Button>
            <Button variant="outline" leadingIcon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>
              Ubah data
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="size-4" />} onClick={() => navigate(`/purchase/orders/new?vendorId=${vendor.id}`)}>
              Buat Pesanan
            </Button>
          </>
        }
      />

      <Panel>
        <SummaryBar
          className="border-b-0"
          items={[
            { label: 'Total Pembelian', value: formatCurrency(history?.totals.purchased ?? 0) },
            { label: 'Sudah Dibayar', value: formatCurrency(history?.totals.paid ?? 0), tone: 'positive' },
            { label: 'Utang Berjalan', value: formatCurrency(vendor.outstandingBalance) },
            { label: 'Jumlah Pesanan', value: history?.totals.orderCount ?? 0 },
          ]}
        />
      </Panel>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Ringkasan' },
          { value: 'bills', label: 'Faktur Pembelian', count: history?.bills.length },
          { value: 'orders', label: 'Pesanan', count: history?.orders.length },
          { value: 'payments', label: 'Pembayaran', count: history?.payments.length },
        ]}
      />

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <PanelHeader title="Informasi Pemasok" compact />
            <div className="p-5">
              <DetailList
                columns={3}
                items={[
                  { label: 'Kode pemasok', value: vendor.code },
                  { label: 'Nama badan hukum', value: vendor.legalName },
                  { label: 'NPWP', value: vendor.taxId },
                  { label: 'Nama kontak', value: vendor.contactPerson },
                  { label: 'Email', value: vendor.email },
                  { label: 'Telepon', value: vendor.phone },
                  { label: 'Alamat', value: `${vendor.address}, ${vendor.city}, ${vendor.province} ${vendor.postalCode}`, span: true },
                  { label: 'Bank', value: vendor.bankName },
                  { label: 'Nomor rekening', value: <span className="tabular">{vendor.bankAccount}</span> },
                  { label: 'Termin pembayaran', value: `${vendor.paymentTermDays} hari` },
                  { label: 'Catatan', value: vendor.notes || '—', span: true },
                ]}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Umur Utang" description="Distribusi utang berdasarkan usia jatuh tempo" compact />
            <div className="p-5">
              {history ? (
                <>
                  <p className="tabular text-2xl font-semibold text-ink-900">{formatCurrency(history.aging.total)}</p>
                  <p className="mt-0.5 text-[13px] text-ink-500">Total utang belum dibayar</p>
                  <AgingBreakdown buckets={history.aging} />
                </>
              ) : (
                <Skeleton className="h-48 w-full" />
              )}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === 'bills' ? (
        <Panel>
          <PanelHeader title="Faktur Pembelian" description="Tagihan yang diterbitkan pemasok ini" compact />
          <DataTable
            columns={billColumns}
            rows={history?.bills ?? []}
            rowKey={(row) => row.id}
            loading={historyPending}
            onRowClick={(row) => navigate(`/purchase/invoices/${row.id}`)}
            emptyIcon={<FileText className="size-5" />}
            emptyTitle="Belum ada faktur pembelian"
            emptyDescription="Pemasok ini belum memiliki riwayat tagihan."
          />
        </Panel>
      ) : null}

      {tab === 'orders' ? (
        <Panel>
          <PanelHeader title="Pesanan Pembelian" description="Pesanan yang pernah diterbitkan kepada pemasok ini" compact />
          <DataTable
            columns={orderColumns}
            rows={history?.orders ?? []}
            rowKey={(row) => row.id}
            loading={historyPending}
            onRowClick={(row) => navigate(`/purchase/orders/${row.id}`)}
            emptyIcon={<ClipboardList className="size-5" />}
            emptyTitle="Belum ada pesanan"
            emptyDescription="Belum ada pesanan pembelian untuk pemasok ini."
          />
        </Panel>
      ) : null}

      {tab === 'payments' ? (
        <Panel>
          <PanelHeader title="Riwayat Pembayaran" description="Pengeluaran kas kepada pemasok ini" compact />
          <DataTable
            columns={paymentColumns}
            rows={history?.payments ?? []}
            rowKey={(row) => row.id}
            loading={historyPending}
            emptyTitle="Belum ada pembayaran"
            emptyDescription="Belum ada pengeluaran kas yang tercatat untuk pemasok ini."
          />
        </Panel>
      ) : null}

      <VendorFormDialog open={editOpen} vendor={vendor} onClose={() => setEditOpen(false)} />
    </div>
  );
}
