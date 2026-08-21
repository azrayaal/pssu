import {
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from 'date-fns';
import type { DateRange, ISODate } from '@/types';

export const TODAY: ISODate = '2026-08-21';

export function today(): Date {
  return parseISO(TODAY);
}

export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function formatDate(value: ISODate | null | undefined): string {
  if (!value) return '—';
  return format(parseISO(value), 'dd MMM yyyy');
}

export function formatDateLong(value: ISODate): string {
  return format(parseISO(value), 'dd MMMM yyyy');
}

export function formatDateTime(value: ISODate | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), 'dd MMM yyyy, HH:mm');
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function daysOverdue(dueDate: ISODate, asOf: ISODate = TODAY): number {
  return Math.max(0, daysBetween(dueDate, asOf));
}

export type PeriodPresetKey =
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'year-to-date'
  | 'last-12-months'
  | 'this-year';

export const PERIOD_PRESETS: { key: PeriodPresetKey; label: string }[] = [
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'this-quarter', label: 'This Quarter' },
  { key: 'year-to-date', label: 'Year to Date' },
  { key: 'last-12-months', label: 'Last 12 Months' },
  { key: 'this-year', label: 'This Year' },
];

export function resolvePeriod(key: PeriodPresetKey, base: Date = today()): DateRange {
  switch (key) {
    case 'this-month':
      return { from: toISODate(startOfMonth(base)), to: toISODate(endOfMonth(base)) };
    case 'last-month': {
      const prev = subMonths(base, 1);
      return { from: toISODate(startOfMonth(prev)), to: toISODate(endOfMonth(prev)) };
    }
    case 'this-quarter':
      return { from: toISODate(startOfQuarter(base)), to: toISODate(endOfQuarter(base)) };
    case 'year-to-date':
      return { from: toISODate(startOfYear(base)), to: toISODate(base) };
    case 'last-12-months':
      return { from: toISODate(startOfMonth(subMonths(base, 11))), to: toISODate(base) };
    case 'this-year':
      return { from: toISODate(startOfYear(base)), to: toISODate(endOfYear(base)) };
  }
}

export function monthLabel(value: ISODate): string {
  return format(parseISO(value), 'MMM yyyy');
}

export function describeRange(range: DateRange): string {
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}
