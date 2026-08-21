import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { TrialBalanceView } from '@/features/accounting/components/TrialBalanceView';

export default function TrialBalanceReportPage() {
  useDocumentTitle('Laporan Neraca Saldo');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Neraca Saldo"
        description="Neraca saldo formal yang siap dicetak maupun diekspor untuk keperluan audit dan pelaporan."
      />
      <TrialBalanceView />
    </div>
  );
}
