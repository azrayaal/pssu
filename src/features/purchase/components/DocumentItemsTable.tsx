import type { PurchaseLineItem } from '@/types';
import { formatCurrency } from '@/utils/format';

export function DocumentItemsTable({ items }: { items: PurchaseLineItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead className="bg-ink-50">
          <tr className="border-b border-ink-200">
            <th className="w-10 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">#</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Deskripsi</th>
            <th className="w-24 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Qty</th>
            <th className="w-24 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Satuan</th>
            <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Harga</th>
            <th className="w-20 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Disk</th>
            <th className="w-20 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">PPN</th>
            <th className="w-40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Jumlah</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="tabular px-4 py-2.5 text-ink-400">{index + 1}</td>
              <td className="px-4 py-2.5 text-ink-800">{item.description}</td>
              <td className="tabular px-4 py-2.5 text-right text-ink-700">{item.quantity}</td>
              <td className="px-4 py-2.5 text-ink-500">{item.unit}</td>
              <td className="tabular px-4 py-2.5 text-right text-ink-700">
                {formatCurrency(item.unitPrice, 'IDR', { withSymbol: false })}
              </td>
              <td className="tabular px-4 py-2.5 text-right text-ink-500">{item.discountPercent}%</td>
              <td className="tabular px-4 py-2.5 text-right text-ink-500">{item.taxPercent}%</td>
              <td className="tabular px-4 py-2.5 text-right font-medium text-ink-900">
                {formatCurrency(item.amount, 'IDR', { withSymbol: false })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocumentTotalsPanel({
  subtotal,
  discountTotal,
  taxTotal,
  total,
  paidLabel,
  paidAmount,
  outstanding,
}: {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paidLabel?: string;
  paidAmount?: number;
  outstanding?: number;
}) {
  return (
    <dl className="w-full max-w-sm space-y-2">
      <div className="flex items-center justify-between text-[13px]">
        <dt className="text-ink-600">Subtotal</dt>
        <dd className="tabular font-medium text-ink-900">{formatCurrency(subtotal)}</dd>
      </div>
      <div className="flex items-center justify-between text-[13px]">
        <dt className="text-ink-600">Diskon</dt>
        <dd className="tabular font-medium text-negative-700">
          {discountTotal > 0 ? `- ${formatCurrency(discountTotal)}` : formatCurrency(0)}
        </dd>
      </div>
      <div className="flex items-center justify-between text-[13px]">
        <dt className="text-ink-600">PPN</dt>
        <dd className="tabular font-medium text-ink-900">{formatCurrency(taxTotal)}</dd>
      </div>
      <div className="flex items-center justify-between border-t border-ink-300 pt-2">
        <dt className="text-sm font-semibold text-ink-900">Total</dt>
        <dd className="tabular text-base font-semibold text-ink-900">{formatCurrency(total)}</dd>
      </div>
      {paidAmount !== undefined ? (
        <div className="flex items-center justify-between text-[13px]">
          <dt className="text-ink-600">{paidLabel ?? 'Sudah dibayar'}</dt>
          <dd className="tabular font-medium text-positive-700">{formatCurrency(paidAmount)}</dd>
        </div>
      ) : null}
      {outstanding !== undefined ? (
        <div className="flex items-center justify-between border-t border-ink-200 pt-2">
          <dt className="text-[13px] font-semibold text-ink-900">Sisa kewajiban</dt>
          <dd className="tabular text-[15px] font-semibold text-ink-900">{formatCurrency(outstanding)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
