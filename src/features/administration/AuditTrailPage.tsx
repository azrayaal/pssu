import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, History } from 'lucide-react';
import type { AuditLog } from '@/types';
import { administrationService } from '@/services/administration.service';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/stores/toast.store';
import { useTableQuery } from '@/hooks/useTableQuery';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { TableToolbar } from '@/components/tables/TableToolbar';
import { formatDateTime } from '@/utils/date';
import { exportToExcel } from '@/utils/export';

const ACTIONS = ['Create', 'Update', 'Delete', 'Post', 'Void', 'Approve', 'Login', 'Logout', 'Export'];
const MODULES = [
  'Sales Invoices',
  'Purchase Invoices',
  'Journal Entries',
  'Expenses',
  'Reports',
  'Dashboard',
  'Chart of Accounts',
  'General Ledger',
  'Users & Roles',
];

export default function AuditTrailPage() {
  useDocumentTitle('Jejak Audit');
  const table = useTableQuery({
    defaultSort: { field: 'timestamp', direction: 'desc' },
    defaultPageSize: 25,
    filterKeys: ['action', 'module', 'userId', 'from', 'to'],
  });
  const [preset, setPreset] = useState<'custom' | 'this-month'>('custom');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.auditLogs(table.params),
    queryFn: () => administrationService.listAuditLogs(table.params),
  });

  const { data: users } = useQuery({
    queryKey: queryKeys.users.list({ pageSize: 100 }),
    queryFn: () => administrationService.listUsers({ pageSize: 100 }),
  });

  const columns: Column<AuditLog>[] = [
    {
      id: 'timestamp',
      header: 'Waktu',
      sortField: 'timestamp',
      width: '12.5rem',
      cell: (row) => <span className="tabular text-ink-600">{formatDateTime(row.timestamp)}</span>,
    },
    {
      id: 'user',
      header: 'Pengguna',
      sortField: 'userName',
      width: '13rem',
      cell: (row) => <span className="font-medium text-ink-800">{row.userName}</span>,
    },
    { id: 'action', header: 'Aksi', sortField: 'action', width: '7.5rem', cell: (row) => <Badge tone="muted">{row.action}</Badge> },
    { id: 'module', header: 'Modul', sortField: 'module', width: '12rem', hideBelow: 'md', cell: (row) => <span className="text-ink-600">{row.module}</span> },
    { id: 'reference', header: 'Referensi', width: '11rem', hideBelow: 'lg', cell: (row) => <span className="tabular text-ink-600">{row.reference}</span> },
    {
      id: 'description',
      header: 'Keterangan',
      minWidth: '20rem',
      cell: (row) => <span className="line-clamp-1 text-ink-700">{row.description}</span>,
    },
    { id: 'ip', header: 'Alamat IP', width: '9.5rem', hideBelow: 'xl', cell: (row) => <span className="tabular text-ink-500">{row.ipAddress}</span> },
    { id: 'agent', header: 'Perangkat', minWidth: '13rem', hideBelow: '2xl', cell: (row) => <span className="line-clamp-1 text-ink-500">{row.userAgent}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jejak Audit"
        description="Catatan aktivitas pengguna pada seluruh modul aplikasi untuk keperluan pengendalian internal."
        actions={
          <Button
            variant="outline"
            leadingIcon={<Download className="size-4" />}
            disabled={!data?.data.length}
            onClick={() => {
              exportToExcel(
                'jejak-audit',
                [
                  { header: 'Waktu', value: (row: AuditLog) => row.timestamp },
                  { header: 'Pengguna', value: (row: AuditLog) => row.userName },
                  { header: 'Aksi', value: (row: AuditLog) => row.action },
                  { header: 'Modul', value: (row: AuditLog) => row.module },
                  { header: 'Referensi', value: (row: AuditLog) => row.reference },
                  { header: 'Keterangan', value: (row: AuditLog) => row.description },
                  { header: 'Alamat IP', value: (row: AuditLog) => row.ipAddress },
                  { header: 'Perangkat', value: (row: AuditLog) => row.userAgent },
                ],
                data?.data ?? [],
                { title: 'Jejak Audit', subtitle: 'PT PTSU Indonesia' },
              );
              toast.success('Ekspor selesai', 'Berkas Excel jejak audit telah diunduh.');
            }}
          >
            Ekspor
          </Button>
        }
      />

      <Panel>
        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Cari pengguna, referensi, atau keterangan"
          onResetFilters={table.resetFilters}
          filters={[
            {
              id: 'userId',
              label: 'Pengguna',
              value: table.filters.userId ?? '',
              onChange: (value) => table.setFilter('userId', value),
              options: (users?.data ?? []).map((user) => ({ value: user.id, label: user.name })),
              width: 'w-48',
            },
            {
              id: 'action',
              label: 'Aksi',
              value: table.filters.action ?? '',
              onChange: (value) => table.setFilter('action', value),
              options: ACTIONS.map((action) => ({ value: action, label: action })),
              width: 'w-36',
            },
            {
              id: 'module',
              label: 'Modul',
              value: table.filters.module ?? '',
              onChange: (value) => table.setFilter('module', value),
              options: MODULES.map((module) => ({ value: module, label: module })),
              width: 'w-48',
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
          error={isError ? new Error('Jejak audit tidak dapat dimuat.') : undefined}
          onRetry={() => refetch()}
          sort={table.sort}
          onSortChange={table.setSort}
          emptyIcon={<History className="size-5" />}
          emptyTitle="Tidak ada aktivitas"
          emptyDescription="Belum ada aktivitas tercatat sesuai kriteria pencarian yang dipilih."
        />

        {data && data.total > 0 ? (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            totalPages={data.totalPages}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            itemLabel="aktivitas"
          />
        ) : null}
      </Panel>
    </div>
  );
}
