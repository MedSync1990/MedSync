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
  | 'default';

export interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant }) => {
  const norm = (variant || status || '').toLowerCase().replace(/[\s-]/g, '_');

  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (norm === 'scheduled' || norm === 'open' || norm === 'active') {
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (norm === 'completed' || norm === 'paid') {
    style = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (norm === 'cancelled' || norm === 'unpaid' || norm === 'inactive') {
    style = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (norm === 'partially_paid' || norm === 'booked') {
    style = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
};
