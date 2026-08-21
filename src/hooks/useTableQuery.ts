import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { QueryParams, SortDirection, SortState } from '@/types';

export interface TableQueryOptions {
  defaultPageSize?: number;
  defaultSort?: SortState;
  /** Filter keys owned by this table, kept in the URL so views are shareable. */
  filterKeys?: string[];
  /** Namespace to allow several tables on one route. */
  prefix?: string;
}

export interface TableQueryState {
  page: number;
  pageSize: number;
  search: string;
  sort: SortState;
  filters: Record<string, string>;
  params: QueryParams;
  activeFilterCount: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSort: (sort: SortState) => void;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
}

export function useTableQuery({
  defaultPageSize = 10,
  defaultSort,
  filterKeys = [],
  prefix = '',
}: TableQueryOptions = {}): TableQueryState {
  const [searchParams, setSearchParams] = useSearchParams();
  const key = useCallback((name: string): string => (prefix ? `${prefix}_${name}` : name), [prefix]);

  const page = Number(searchParams.get(key('page')) ?? 1);
  const pageSize = Number(searchParams.get(key('pageSize')) ?? defaultPageSize);
  const search = searchParams.get(key('search')) ?? '';
  const sortField = searchParams.get(key('sortBy')) ?? defaultSort?.field ?? '';
  const sortDir = (searchParams.get(key('sortDir')) ?? defaultSort?.direction ?? 'asc') as SortDirection;

  const filters = useMemo(() => {
    const entries: Record<string, string> = {};
    for (const filterKey of filterKeys) {
      entries[filterKey] = searchParams.get(key(filterKey)) ?? '';
    }
    return entries;
  }, [filterKeys, searchParams, key]);

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void, resetPage = true) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          if (resetPage) next.delete(key('page'));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, key],
  );

  const params = useMemo<QueryParams>(() => {
    const query: QueryParams = { page, pageSize };
    if (search) query.search = search;
    if (sortField) {
      query.sortBy = sortField;
      query.sortDir = sortDir;
    }
    for (const [filterKey, value] of Object.entries(filters)) {
      if (value) query[filterKey] = value;
    }
    return query;
  }, [page, pageSize, search, sortField, sortDir, filters]);

  return {
    page,
    pageSize,
    search,
    sort: { field: sortField, direction: sortDir },
    filters,
    params,
    activeFilterCount: Object.values(filters).filter(Boolean).length,
    setPage: (next) => update((current) => current.set(key('page'), String(next)), false),
    setPageSize: (next) => update((current) => current.set(key('pageSize'), String(next))),
    setSearch: (next) =>
      update((current) => (next ? current.set(key('search'), next) : current.delete(key('search')))),
    setSort: (next) =>
      update((current) => {
        current.set(key('sortBy'), next.field);
        current.set(key('sortDir'), next.direction);
      }, false),
    setFilter: (filterKey, value) =>
      update((current) => (value ? current.set(key(filterKey), value) : current.delete(key(filterKey)))),
    resetFilters: () =>
      update((current) => {
        filterKeys.forEach((filterKey) => current.delete(key(filterKey)));
        current.delete(key('search'));
      }),
  };
}
