import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import type { Account } from '@/types';
import { accountingService } from '@/services/accounting.service';
import { queryKeys } from '@/lib/query-keys';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailList } from '@/components/ui/DetailList';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { formatCurrency } from '@/utils/format';
import { formatDate, formatDateTime } from '@/utils/date';

export function AccountDetailDrawer({
  accountId,
  onClose,
  onEdit,
}: {
  accountId: string | null;
  onClose: () => void;
  onEdit: (account: Account) => void;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.accounts.detail(accountId ?? ''),
    queryFn: () => accountingService.getAccount(accountId!),
    enabled: Boolean(accountId),
  });

  return (
    <Drawer
      open={Boolean(accountId)}
      onClose={onClose}
      width="max-w-2xl"
      title={data ? `${data.account.code} · ${data.account.name}` : 'Detail Akun'}
      description={data ? `${data.account.type} · ${data.account.subtype}` : undefined}
      footer={
        data ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button variant="primary" leadingIcon={<Pencil className="size-4" />} onClick={() => onEdit(data.account)}>
              Ubah akun
            </Button>
          </>
        ) : null
      }
    >
      {isError ? (
        <ErrorState compact onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3.5">
            <p className="text-xs font-medium text-ink-500">Saldo berjalan</p>
            <p className="tabular mt-1 text-2xl font-semibold text-ink-900">{formatCurrency(data.account.balance)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={data.account.status} />
              <Badge tone="muted">Saldo normal {data.account.normalBalance === 'Debit' ? 'Debit' : 'Kredit'}</Badge>
              {data.account.isSystem ? <Badge tone="brand">Akun sistem</Badge> : null}
            </div>
          </div>

          <DetailList
            items={[
              { label: 'Kode akun', value: <span className="tabular">{data.account.code}</span> },
              { label: 'Nama akun', value: data.account.name },
              { label: 'Tipe akun', value: data.account.type },
              { label: 'Kelompok akun', value: data.account.subtype },
              {
                label: 'Akun induk',
                value: data.account.parentCode ? `${data.account.parentCode} · ${data.account.parentName}` : '—',
              },
              { label: 'Saldo awal', value: formatCurrency(data.account.openingBalance) },
              { label: 'Dibuat', value: `${formatDate(data.account.createdAt.slice(0, 10))} oleh ${data.account.createdBy}` },
              { label: 'Diperbarui', value: formatDateTime(data.account.updatedAt) },
              { label: 'Keterangan', value: data.account.description || '—', span: true },
            ]}
          />

          {data.children.length ? (
            <section>
              <h3 className="text-[13px] font-semibold text-ink-900">Akun turunan</h3>
              <ul className="mt-2 divide-y divide-ink-100 rounded-md border border-ink-200">
                {data.children.map((child) => (
                  <li key={child.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="tabular text-[13px] font-medium text-ink-800">{child.code}</span>
                      <span className="ml-2 truncate text-[13px] text-ink-600">{child.name}</span>
                    </span>
                    <span className="tabular shrink-0 text-[13px] font-medium text-ink-900">
                      {formatCurrency(child.balance)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-ink-900">Mutasi terakhir</h3>
              <Link
                to={`/accounting/general-ledger?accountId=${data.account.id}`}
                className="text-[13px] font-medium text-brand-700 hover:underline"
              >
                Buka buku besar
              </Link>
            </div>
            {data.movements.length ? (
              <ul className="mt-2 divide-y divide-ink-100 rounded-md border border-ink-200">
                {data.movements.map((movement) => (
                  <li key={movement.id} className="px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink-800">{movement.journalNumber}</p>
                        <p className="line-clamp-1 text-xs text-ink-500">{movement.memo}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular text-[13px] font-medium text-ink-900">
                          {movement.debit > 0
                            ? `D ${formatCurrency(movement.debit, 'IDR', { withSymbol: false })}`
                            : `K ${formatCurrency(movement.credit, 'IDR', { withSymbol: false })}`}
                        </p>
                        <p className="tabular text-xs text-ink-400">{formatDate(movement.date)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-md border border-ink-200 bg-ink-50 px-3.5 py-4 text-center text-[13px] text-ink-500">
                Belum ada mutasi tercatat pada akun ini.
              </p>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
