import type { QueryParams } from '@/types';
import { purchaseService } from '@/services/purchase.service';
import { queryKeys } from '@/lib/query-keys';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { AgingReportView, type AgingRow } from '@/components/reports/AgingReportView';

async function fetchApAging(params: QueryParams) {
  const report = await purchaseService.apAging(params);
  return {
    asOf: report.asOf,
    totals: report.totals,
    rows: report.rows.map<AgingRow>((row) => ({
      ...row,
      documentCount: row.billCount,
      oldestDays: row.oldestBillDays,
    })),
  };
}

export default function ApAgingPage() {
  useDocumentTitle('Laporan Umur Utang');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Umur Utang"
        description="Analisis umur utang usaha untuk perencanaan arus kas dan prioritas pembayaran pemasok."
      />
      <AgingReportView
        title="Laporan Umur Utang"
        partyLabel="Pemasok"
        documentLabel="Jumlah Tagihan"
        detailPathPrefix="/purchase/vendors"
        fileName="laporan-umur-utang"
        queryKey={queryKeys.apAging}
        fetcher={fetchApAging}
      />
    </div>
  );
}
