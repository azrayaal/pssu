import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { BREADCRUMB_LABELS } from '@/app/navigation';

function labelFor(segment: string): string {
  if (BREADCRUMB_LABELS[segment]) return BREADCRUMB_LABELS[segment];
  if (/^(inv|cust|vend|po|bill|exp|excat|usr|role|je|acc|bank|cash)-/.test(segment)) return 'Detail';
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-ink-500 print-hidden">
      <Link to="/" className="flex items-center gap-1.5 transition-colors hover:text-ink-700">
        <Home className="size-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only">Dashboard</span>
      </Link>
      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-ink-300" aria-hidden />
            {isLast ? (
              <span className="font-medium text-ink-800">{labelFor(segment)}</span>
            ) : (
              <Link to={path} className="transition-colors hover:text-ink-700">
                {labelFor(segment)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
