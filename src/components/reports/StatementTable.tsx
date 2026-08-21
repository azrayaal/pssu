import type { ReportLine } from '@/types';
import { cn } from '@/lib/cn';
import { formatAccountingAmount } from '@/utils/format';

export interface StatementTableProps {
  lines: ReportLine[];
  comparativeLabel?: string;
  currentLabel: string;
  showCodes?: boolean;
  /** Expense-natured sections read better when shown as positive magnitudes. */
  minWidthClass?: string;
}

export function StatementTable({
  lines,
  comparativeLabel,
  currentLabel,
  showCodes = true,
  minWidthClass = 'min-w-[36rem]',
}: StatementTableProps) {
  const hasComparative = Boolean(comparativeLabel);

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', minWidthClass)}>
        <thead className="bg-ink-50">
          <tr className="border-b border-ink-200">
            {showCodes ? (
              <th className="w-24 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Kode
              </th>
            ) : null}
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Uraian
            </th>
            <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              {currentLabel}
            </th>
            {hasComparative ? (
              <th className="w-44 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                {comparativeLabel}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const isSection = line.kind === 'section';
            const isSubtotal = line.kind === 'subtotal';
            const isTotal = line.kind === 'total';

            return (
              <tr
                key={line.id}
                className={cn(
                  'border-b border-ink-100',
                  isSection && 'bg-ink-50/70',
                  isTotal && 'border-t-2 border-b-2 border-ink-300 bg-ink-50',
                  isSubtotal && 'border-t border-ink-200',
                  !isSection && !isTotal && !isSubtotal && 'hover:bg-ink-50',
                )}
              >
                {showCodes ? (
                  <td className="tabular whitespace-nowrap px-4 py-2 text-ink-500">{line.code ?? ''}</td>
                ) : null}
                <td
                  className={cn(
                    'px-4 py-2',
                    isSection && 'text-[11px] font-semibold uppercase tracking-wide text-ink-600',
                    isSubtotal && 'font-semibold text-ink-800',
                    isTotal && 'text-[13px] font-semibold text-ink-900',
                    !isSection && !isSubtotal && !isTotal && 'text-ink-700',
                  )}
                  style={!isSection && !isSubtotal && !isTotal ? { paddingLeft: `${1 + line.level * 0.75}rem` } : undefined}
                >
                  {line.label}
                </td>
                <td
                  className={cn(
                    'tabular whitespace-nowrap px-4 py-2 text-right',
                    isSection && 'text-transparent',
                    isSubtotal && 'font-semibold text-ink-900',
                    isTotal && 'text-[13px] font-semibold text-ink-900',
                    !isSection && !isSubtotal && !isTotal && 'text-ink-800',
                  )}
                >
                  {isSection ? '' : formatAccountingAmount(line.amount)}
                </td>
                {hasComparative ? (
                  <td
                    className={cn(
                      'tabular whitespace-nowrap px-4 py-2 text-right',
                      isSubtotal || isTotal ? 'font-semibold text-ink-700' : 'text-ink-500',
                    )}
                  >
                    {isSection ? '' : formatAccountingAmount(line.comparativeAmount ?? 0)}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
