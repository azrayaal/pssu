import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { SelectInput } from './Field';
import { formatNumber } from '@/utils/format';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', totalPages];
  if (page >= totalPages - 3) {
    return [1, 'gap', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'gap', page - 1, page, page + 1, 'gap', totalPages];
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
  itemLabel = 'data',
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-ink-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-3 text-[13px] text-ink-500">
        <span className="tabular">
          {formatNumber(first)}–{formatNumber(last)} dari {formatNumber(total)} {itemLabel}
        </span>
        <span className="hidden h-4 w-px bg-ink-200 sm:block" />
        <label className="hidden items-center gap-2 sm:flex">
          <span>Baris</span>
          <SelectInput
            className="h-8 w-[4.5rem] py-1 text-[13px]"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Jumlah baris per halaman"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageWindow(page, Math.max(1, totalPages)).map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} className="px-1.5 text-[13px] text-ink-400">
              &hellip;
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={cn(
                'tabular h-8 min-w-8 rounded border px-2 text-[13px] font-medium transition-colors',
                entry === page
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-ink-300 bg-white text-ink-600 hover:bg-ink-50',
              )}
            >
              {entry}
            </button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
