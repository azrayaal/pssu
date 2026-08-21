import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { TrialBalanceView } from './components/TrialBalanceView';

export default function TrialBalancePage() {
  useDocumentTitle('Neraca Saldo');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Neraca Saldo"
        description="Rekapitulasi saldo debit dan kredit seluruh akun sebagai dasar penyusunan laporan keuangan."
      />
      <TrialBalanceView />
    </div>
  );
}
