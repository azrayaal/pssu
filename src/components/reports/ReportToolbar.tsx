import type { ReactNode } from 'react';
import { FileSpreadsheet, FileText, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface ReportToolbarProps {
  filters?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  disabled?: boolean;
  className?: string;
  extra?: ReactNode;
}

export function ReportToolbar({
  filters,
  onRefresh,
  refreshing = false,
  onPrint,
  onExportPdf,
  onExportExcel,
  disabled = false,
  className,
  extra,
}: ReportToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-ink-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between print-hidden',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{filters}</div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {onRefresh ? (
          <Button
            variant="outline"
            size="md"
            leadingIcon={<RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} />}
            onClick={onRefresh}
            disabled={refreshing}
          >
            Perbarui
          </Button>
        ) : null}
        {onPrint ? (
          <Button variant="outline" size="md" leadingIcon={<Printer className="size-4" />} onClick={onPrint} disabled={disabled}>
            Cetak
          </Button>
        ) : null}
        {onExportPdf ? (
          <Button variant="outline" size="md" leadingIcon={<FileText className="size-4" />} onClick={onExportPdf} disabled={disabled}>
            PDF
          </Button>
        ) : null}
        {onExportExcel ? (
          <Button
            variant="outline"
            size="md"
            leadingIcon={<FileSpreadsheet className="size-4" />}
            onClick={onExportExcel}
            disabled={disabled}
          >
            Excel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
