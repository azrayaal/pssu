import { useEffect, useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { SelectInput, TextInput } from '@/components/ui/Field';

export interface FilterDefinition {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  width?: string;
}

export interface TableToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  actions?: ReactNode;
  extra?: ReactNode;
  className?: string;
  activeFilterCount?: number;
  onResetFilters?: () => void;
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Cari data',
  filters = [],
  actions,
  extra,
  className,
  onResetFilters,
}: TableToolbarProps) {
  const [term, setTerm] = useState(search ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setTerm(search ?? '');
  }, [search]);

  useEffect(() => {
    if (!onSearchChange) return undefined;
    if (term === (search ?? '')) return undefined;
    const timer = setTimeout(() => onSearchChange(term), 300);
    return () => clearTimeout(timer);
  }, [term, search, onSearchChange]);

  const activeCount = filters.filter((filter) => filter.value !== '').length;

  return (
    <div className={cn('border-b border-ink-200 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange ? (
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <TextInput
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 pr-8"
              aria-label={searchPlaceholder}
            />
            {term ? (
              <button
                type="button"
                onClick={() => {
                  setTerm('');
                  onSearchChange('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                aria-label="Bersihkan pencarian"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}

        {filters.length ? (
          <Button
            variant={activeCount ? 'primary' : 'outline'}
            size="md"
            className="sm:hidden"
            leadingIcon={<SlidersHorizontal className="size-4" />}
            onClick={() => setFiltersOpen((value) => !value)}
          >
            Filter{activeCount ? ` (${activeCount})` : ''}
          </Button>
        ) : null}

        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {filters.map((filter) => (
            <SelectInput
              key={filter.id}
              className={cn('h-9', filter.width ?? 'w-44')}
              value={filter.value}
              aria-label={filter.label}
              onChange={(event) => filter.onChange(event.target.value)}
            >
              <option value="">{filter.label}: Semua</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          ))}
          {activeCount && onResetFilters ? (
            <Button variant="ghost" size="sm" onClick={onResetFilters} leadingIcon={<X className="size-3.5" />}>
              Reset
            </Button>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {extra}
          {actions}
        </div>
      </div>

      {filtersOpen && filters.length ? (
        <div className="mt-3 grid gap-2 sm:hidden">
          {filters.map((filter) => (
            <SelectInput
              key={filter.id}
              className="h-9 w-full"
              value={filter.value}
              aria-label={filter.label}
              onChange={(event) => filter.onChange(event.target.value)}
            >
              <option value="">{filter.label}: Semua</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          ))}
          {activeCount && onResetFilters ? (
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              Reset filter
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
