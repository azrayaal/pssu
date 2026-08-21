import {
  Controller,
  useFieldArray,
  type Control,
  type FieldArrayPath,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { LineItemFormValues } from '@/schemas/invoice.schema';
import { emptyLineItem } from '@/schemas/invoice.schema';
import { Button } from '@/components/ui/Button';
import { PanelHeader } from '@/components/ui/Panel';
import { TextInput } from '@/components/ui/Field';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/utils/format';

export interface DocumentTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}

export function computeTotals(items: (Partial<LineItemFormValues> | undefined)[]): DocumentTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const quantity = Number(item?.quantity ?? 0);
    const unitPrice = Number(item?.unitPrice ?? 0);
    const gross = quantity * unitPrice;
    const discount = Math.round((gross * Number(item?.discountPercent ?? 0)) / 100);
    const net = gross - discount;
    subtotal += gross;
    discountTotal += discount;
    taxTotal += Math.round((net * Number(item?.taxPercent ?? 0)) / 100);
  }

  return { subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal };
}

export function lineAmount(item: Partial<LineItemFormValues> | undefined): number {
  const gross = Number(item?.quantity ?? 0) * Number(item?.unitPrice ?? 0);
  return gross - Math.round((gross * Number(item?.discountPercent ?? 0)) / 100);
}

interface LineItemsEditorProps<TValues extends FieldValues> {
  control: Control<TValues>;
  register: UseFormRegister<TValues>;
  errors: FieldErrors<TValues>;
  items: (Partial<LineItemFormValues> | undefined)[];
  totals: DocumentTotals;
  title?: string;
  description?: string;
  rootError?: string;
}

export function LineItemsEditor<TValues extends FieldValues>({
  control,
  register,
  errors,
  items,
  totals,
  title = 'Rincian Item',
  description = 'Nilai baris dihitung otomatis dari kuantitas, harga satuan, diskon, dan pajak.',
  rootError,
}: LineItemsEditorProps<TValues>) {
  const { fields, append, remove } = useFieldArray<TValues>({
    control,
    name: 'items' as FieldArrayPath<TValues>,
  });

  const itemErrors = (errors.items ?? []) as unknown as Record<
    number,
    Partial<Record<keyof LineItemFormValues, { message?: string }>>
  >;

  const field = (index: number, key: keyof LineItemFormValues): Path<TValues> =>
    `items.${index}.${key}` as Path<TValues>;

  return (
    <div className="border-t border-ink-200">
      <PanelHeader
        compact
        title={title}
        description={description}
        actions={
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Plus className="size-3.5" />}
            onClick={() => append(emptyLineItem as never)}
          >
            Tambah item
          </Button>
        }
      />

      {rootError ? <p className="px-4 pt-3 text-[13px] text-negative-600">{rootError}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead className="bg-ink-50">
            <tr className="border-b border-ink-200">
              <th className="w-10 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">#</th>
              <th className="min-w-[18rem] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Deskripsi
              </th>
              <th className="w-24 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Qty</th>
              <th className="w-28 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">Satuan</th>
              <th className="w-44 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Harga Satuan
              </th>
              <th className="w-24 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Disk %</th>
              <th className="w-24 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Pajak %</th>
              <th className="w-40 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">Jumlah</th>
              <th className="w-12 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {fields.map((row, index) => {
              const rowErrors = itemErrors[index];
              return (
                <tr key={row.id} className="align-top">
                  <td className="tabular px-3 py-2.5 text-ink-400">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <TextInput
                      aria-label={`Deskripsi item ${index + 1}`}
                      placeholder="Nama produk atau jasa"
                      invalid={Boolean(rowErrors?.description)}
                      {...register(field(index, 'description'))}
                    />
                    {rowErrors?.description ? (
                      <p className="mt-1 text-xs text-negative-600">{rowErrors.description.message}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <TextInput
                      type="number"
                      min={0}
                      step="0.01"
                      align="right"
                      aria-label={`Kuantitas item ${index + 1}`}
                      invalid={Boolean(rowErrors?.quantity)}
                      {...register(field(index, 'quantity'), { valueAsNumber: true })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <TextInput aria-label={`Satuan item ${index + 1}`} {...register(field(index, 'unit'))} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Controller
                      control={control}
                      name={field(index, 'unitPrice')}
                      render={({ field: priceField }) => (
                        <CurrencyInput
                          aria-label={`Harga satuan item ${index + 1}`}
                          value={Number(priceField.value ?? 0)}
                          onValueChange={priceField.onChange}
                          invalid={Boolean(rowErrors?.unitPrice)}
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <TextInput
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      align="right"
                      aria-label={`Diskon item ${index + 1}`}
                      invalid={Boolean(rowErrors?.discountPercent)}
                      {...register(field(index, 'discountPercent'), { valueAsNumber: true })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <TextInput
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      align="right"
                      aria-label={`Pajak item ${index + 1}`}
                      invalid={Boolean(rowErrors?.taxPercent)}
                      {...register(field(index, 'taxPercent'), { valueAsNumber: true })}
                    />
                  </td>
                  <td className="tabular px-3 py-2.5 pt-4 text-right font-medium text-ink-900">
                    {formatCurrency(lineAmount(items[index]), 'IDR', { withSymbol: false })}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={fields.length <= 1}
                      aria-label={`Hapus item ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-3.5 text-ink-400" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-ink-200 bg-ink-50 px-4 py-4">
        <dl className="w-full max-w-sm space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <dt className="text-ink-600">Subtotal</dt>
            <dd className="tabular font-medium text-ink-900">{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <dt className="text-ink-600">Diskon</dt>
            <dd className="tabular font-medium text-negative-700">
              {totals.discountTotal > 0 ? `- ${formatCurrency(totals.discountTotal)}` : formatCurrency(0)}
            </dd>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <dt className="text-ink-600">PPN</dt>
            <dd className="tabular font-medium text-ink-900">{formatCurrency(totals.taxTotal)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-ink-300 pt-2">
            <dt className="text-sm font-semibold text-ink-900">Total</dt>
            <dd className="tabular text-base font-semibold text-ink-900">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
