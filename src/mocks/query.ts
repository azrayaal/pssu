import type { Paginated, QueryParams, SortDirection } from '@/types';

export function readString(params: QueryParams | undefined, key: string): string | undefined {
  const value = params?.[key];
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

export function readNumber(params: QueryParams | undefined, key: string, fallback: number): number {
  const value = params?.[key];
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function matchesSearch(term: string | undefined, fields: (string | number | null | undefined)[]): boolean {
  if (!term) return true;
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(field ?? '').toLowerCase().includes(needle));
}

type Comparable = string | number | boolean | null | undefined;

export function sortRecords<T>(
  records: T[],
  sortBy: string | undefined,
  direction: SortDirection,
  accessor: (record: T, field: string) => Comparable,
): T[] {
  if (!sortBy) return records;
  const factor = direction === 'desc' ? -1 : 1;
  return [...records].sort((a, b) => {
    const left = accessor(a, sortBy);
    const right = accessor(b, sortBy);
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
    return String(left).localeCompare(String(right), 'id-ID', { numeric: true }) * factor;
  });
}

export function paginate<T>(records: T[], params: QueryParams | undefined): Paginated<T> {
  const page = Math.max(1, readNumber(params, 'page', 1));
  const pageSize = Math.max(1, readNumber(params, 'pageSize', 10));
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: records.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function withinRange(value: string, from?: string, to?: string): boolean {
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}
