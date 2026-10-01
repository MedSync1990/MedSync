import React from 'react';

export type BadgeVariant =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'unpaid'
  | 'partially_paid'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'default';

export interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant, showDot = true }) => {
  const norm = (variant || status || '').toLowerCase().replace(/[\s-]/g, '_');

  let style = 'bg-surface-subtle text-on-surface-variant';
  let dotColor = 'bg-outline';

  if (norm === 'active' || norm === 'completed' || norm === 'paid') {
    style = 'bg-status-completed-bg text-status-completed-text';
    dotColor = 'bg-status-completed-text';
  } else if (norm === 'scheduled' || norm === 'open' || norm === 'on_duty') {
    style = 'bg-status-scheduled-bg text-status-scheduled-text';
    dotColor = 'bg-status-scheduled-text';
  } else if (norm === 'cancelled' || norm === 'unpaid' || norm === 'inactive' || norm === 'deactivated') {
    style = 'bg-status-cancelled-bg text-status-cancelled-text';
    dotColor = 'bg-status-cancelled-text';
  } else if (norm === 'partially_paid' || norm === 'booked' || norm === 'pending') {
    style = 'bg-status-pending-bg text-status-pending-text';
    dotColor = 'bg-status-pending-text';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold ${style}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span className="capitalize">{status}</span>
    </span>
  );
};
