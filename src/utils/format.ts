import type { CurrencyCode } from '@/types';

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  SGD: 'en-SG',
  EUR: 'de-DE',
};

const CURRENCY_FRACTION: Record<CurrencyCode, number> = {
  IDR: 0,
  USD: 2,
  SGD: 2,
  EUR: 2,
};

export function formatCurrency(
  value: number,
  currency: CurrencyCode = 'IDR',
  options: { withSymbol?: boolean; signed?: boolean } = {},
): string {
  const { withSymbol = true, signed = false } = options;
  const fraction = CURRENCY_FRACTION[currency];
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(Math.abs(value));

  const symbol = withSymbol ? (currency === 'IDR' ? 'Rp ' : `${currency} `) : '';
  const sign = value < 0 ? '-' : signed && value > 0 ? '+' : '';
  return `${sign}${symbol}${formatted}`;
}

export function formatAccountingAmount(value: number, currency: CurrencyCode = 'IDR'): string {
  if (value === 0) return '—';
  if (value < 0) return `(${formatCurrency(Math.abs(value), currency, { withSymbol: false })})`;
  return formatCurrency(value, currency, { withSymbol: false });
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCompactCurrency(value: number, currency: CurrencyCode = 'IDR'): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const prefix = currency === 'IDR' ? 'Rp ' : `${currency} `;
  if (abs >= 1_000_000_000) return `${sign}${prefix}${(abs / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(0)} jt`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(0)} rb`;
  return `${sign}${prefix}${abs}`;
}

/** Axis ticks drop the currency prefix so they never wrap onto two lines. */
export function formatAxisAmount(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)} M`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(0)} jt`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)} rb`;
  return `${sign}${abs}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
