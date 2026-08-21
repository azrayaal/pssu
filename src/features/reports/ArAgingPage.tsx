import type { QueryParams } from '@/types';
import { salesService } from '@/services/sales.service';
import { queryKeys } from '@/lib/query-keys';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { AgingReportView, type AgingRow } from '@/components/reports/AgingReportView';

async function fetchArAging(params: QueryParams) {
  const report = await salesService.arAging(params);
  return {
    asOf: report.asOf,
    totals: report.totals,
    rows: report.rows.map<AgingRow>((row) => ({
      ...row,
      documentCount: row.invoiceCount,
      oldestDays: row.oldestInvoiceDays,
    })),
  };
}

export default function ArAgingPage() {
  useDocumentTitle('Laporan Umur Piutang');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Umur Piutang"
        description="Analisis umur piutang usaha untuk keperluan penilaian risiko kredit dan pencadangan."
      />
      <AgingReportView
        title="Laporan Umur Piutang"
        partyLabel="Pelanggan"
        documentLabel="Jumlah Faktur"
        detailPathPrefix="/sales/customers"
        fileName="laporan-umur-piutang"
        queryKey={queryKeys.arAging}
        fetcher={fetchArAging}
      />
    </div>
  );
}
