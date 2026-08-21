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

export default function PayablesPage() {
  useDocumentTitle('Utang Usaha');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Utang Usaha"
        description="Posisi utang per pemasok beserta distribusi umur kewajiban sebagai dasar penjadwalan pembayaran."
      />
      <AgingReportView
        title="Umur Utang Usaha"
        partyLabel="Pemasok"
        documentLabel="Jumlah Tagihan"
        detailPathPrefix="/purchase/vendors"
        fileName="umur-utang"
        queryKey={queryKeys.apAging}
        fetcher={fetchApAging}
      />
    </div>
  );
}
