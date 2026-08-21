import { Badge, type BadgeTone } from './Badge';

const STATUS_TONES: Record<string, BadgeTone> = {
  Active: 'positive',
  Inactive: 'muted',
  Draft: 'neutral',
  Posted: 'positive',
  Void: 'negative',
  Sent: 'info',
  'Partially Paid': 'caution',
  Paid: 'positive',
  Overdue: 'negative',
  Cancelled: 'muted',
  'Awaiting Approval': 'caution',
  'Awaiting Payment': 'info',
  Approved: 'info',
  'Partially Received': 'caution',
  Received: 'positive',
  Closed: 'muted',
  Submitted: 'caution',
  Rejected: 'negative',
  Income: 'positive',
  Expense: 'negative',
  Transfer: 'info',
  'In Progress': 'caution',
  Completed: 'positive',
  Exact: 'positive',
  Suggested: 'caution',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} className={className}>
      {status}
    </Badge>
  );
}
