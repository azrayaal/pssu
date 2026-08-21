import { useQuery } from '@tanstack/react-query';
import { administrationService } from '@/services/administration.service';
import { queryKeys } from '@/lib/query-keys';

/**
 * Printed report masthead. Hidden on screen, rendered on paper so exported
 * documents carry the statutory entity details finance teams expect.
 */
export function ReportHeading({ title, periodLabel }: { title: string; periodLabel: string }) {
  const { data: company } = useQuery({
    queryKey: queryKeys.company,
    queryFn: administrationService.getCompany,
    staleTime: Infinity,
  });

  return (
    <div className="hidden border-b border-ink-300 px-5 py-4 text-center print:block">
      <p className="text-base font-semibold text-ink-900">{company?.legalName ?? 'PT PTSU Indonesia'}</p>
      <p className="text-[13px] text-ink-600">
        {company?.address}, {company?.city} {company?.postalCode}
      </p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-ink-900">{title}</p>
      <p className="text-[13px] text-ink-600">{periodLabel}</p>
    </div>
  );
}
