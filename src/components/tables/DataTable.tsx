import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SortState } from '@/types';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import { useUiStore } from '@/stores/ui.store';

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  minWidth?: string;
  sortField?: string;
  headerClassName?: string;
  cellClassName?: string;
  /** Hide on narrow viewports without losing the column on desktop. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  onRowClick?: (row: T) => void;
  footerRow?: ReactNode;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  stickyHeader?: boolean;
  maxHeight?: string;
}

const ALIGN: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const HIDE_BELOW: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyTitle = 'Belum ada data',
  emptyDescription,
  emptyAction,
  emptyIcon,
  sort,
  onSortChange,
  onRowClick,
  footerRow,
  className,
  rowClassName,
  stickyHeader = false,
  maxHeight,
}: DataTableProps<T>) {
  const density = useUiStore((state) => state.density);
  const cellPadding = density === 'compact' ? 'px-4 py-1.5' : 'px-4 py-2.5';

  if (error) {
    return (
      <ErrorState
        onRetry={onRetry}
        message={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (loading) {
    return <TableSkeleton rows={8} columns={Math.min(columns.length, 7)} />;
  }

  if (!rows.length) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} icon={emptyIcon} />
    );
  }

  const handleSort = (field: string): void => {
    if (!onSortChange) return;
    const direction = sort?.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction });
  };

  return (
    <div className={cn('w-full overflow-x-auto', maxHeight && 'overflow-y-auto', className)} style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full min-w-full border-collapse text-sm">
        <thead className={cn('bg-ink-50', stickyHeader && 'sticky top-0 z-10')}>
          <tr className="border-b border-ink-200">
            {columns.map((column) => {
              const sortable = Boolean(column.sortField && onSortChange);
              const active = sort?.field === column.sortField;
              return (
                <th
                  key={column.id}
                  scope="col"
                  style={{ width: column.width, minWidth: column.minWidth }}
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500',
                    ALIGN[column.align ?? 'left'],
                    column.hideBelow && HIDE_BELOW[column.hideBelow],
                    column.headerClassName,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.sortField!)}
                      className={cn(
                        'group inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink-800',
                        active && 'text-ink-900',
                        column.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {column.header}
                      {active ? (
                        sort?.direction === 'asc' ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 text-ink-300 group-hover:text-ink-400" aria-hidden />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer',
                'hover:bg-ink-50',
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    cellPadding,
                    'align-middle text-ink-700',
                    // Fixed-width columns hold dates, amounts and badges: never let them wrap.
                    column.width && 'whitespace-nowrap',
                    ALIGN[column.align ?? 'left'],
                    column.align === 'right' && 'tabular',
                    column.hideBelow && HIDE_BELOW[column.hideBelow],
                    column.cellClassName,
                  )}
                >
                  {column.cell(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footerRow ? <tfoot className="border-t-2 border-ink-300 bg-ink-50 font-semibold text-ink-900">{footerRow}</tfoot> : null}
      </table>
    </div>
  );
}
