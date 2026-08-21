import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { dashboardService } from '@/services/dashboard.service';
import { queryKeys } from '@/lib/query-keys';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(term, 250);

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: () => dashboardService.search(debounced),
    enabled: debounced.trim().length >= 2,
  });

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const groups = data?.groups ?? [];
  const showPanel = open && debounced.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        ref={inputRef}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari faktur, pelanggan, akun, jurnal"
        aria-label="Pencarian global"
        className="h-9 w-full rounded-md border border-ink-300 bg-white pl-9 pr-16 text-sm text-ink-800 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-600"
      />
      <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {isFetching ? <Loader2 className="size-3.5 animate-spin text-ink-400" aria-hidden /> : null}
        {term ? (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              setOpen(false);
            }}
            className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
            aria-label="Bersihkan pencarian"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
            Ctrl K
          </kbd>
        )}
      </div>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-[26rem] overflow-y-auto rounded-md border border-ink-200 bg-white py-1.5 shadow-raised">
          {groups.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-500">
              {isFetching ? 'Mencari data' : `Tidak ada hasil untuk "${debounced}"`}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="py-1">
                <p className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      setOpen(false);
                      setTerm('');
                    }}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 px-3.5 py-1.5 text-left transition-colors hover:bg-ink-100',
                    )}
                  >
                    <span className="text-[13px] font-medium text-ink-800">{item.title}</span>
                    <span className="line-clamp-1 text-xs text-ink-500">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
