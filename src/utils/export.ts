/**
 * Client-side export helpers.
 *
 * CSV and the Excel-compatible HTML workbook are produced entirely in the
 * browser. When the REST backend is connected these can be swapped for a
 * server-rendered download by pointing at `/reports/{name}/export`.
 */

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number): string {
  const text = String(value ?? '');
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportToCsv<T>(fileName: string, columns: ExportColumn<T>[], rows: T[]): void {
  const header = columns.map((column) => escapeCsv(column.header)).join(';');
  const body = rows
    .map((row) => columns.map((column) => escapeCsv(column.value(row))).join(';'))
    .join('\n');
  download(new Blob([`﻿${header}\n${body}`], { type: 'text/csv;charset=utf-8;' }), `${fileName}.csv`);
}

function escapeHtml(value: string | number): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function exportToExcel<T>(
  fileName: string,
  columns: ExportColumn<T>[],
  rows: T[],
  meta: { title: string; subtitle?: string } = { title: fileName },
): void {
  const head = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => {
            const value = column.value(row);
            const isNumeric = typeof value === 'number';
            return `<td${isNumeric ? ' style="mso-number-format:\\@"' : ''}>${escapeHtml(value)}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('');

  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" />
<style>
table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
th { background: #a51535; color: #ffffff; border: 1px solid #7d1028; padding: 6px 8px; text-align: left; }
td { border: 1px solid #d9d9d9; padding: 5px 8px; }
h1 { font-size: 14pt; margin: 0 0 2px; }
p { margin: 0 0 10px; color: #595959; font-size: 10pt; }
</style></head><body>
<h1>${escapeHtml(meta.title)}</h1>
${meta.subtitle ? `<p>${escapeHtml(meta.subtitle)}</p>` : ''}
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;

  download(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `${fileName}.xls`);
}

export function printDocument(): void {
  window.print();
}

export function slugifyFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
