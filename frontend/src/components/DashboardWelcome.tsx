import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export const dashboardAction = 'inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-space-md font-label-md text-label-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

interface DashboardWelcomeProps {
  subtitle: string;
  status: string;
  children?: ReactNode;
}

export function DashboardWelcome({ subtitle, status, children }: DashboardWelcomeProps) {
  const { user } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || user?.role || 'User';
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo',
  }).format(new Date());

  return (
    <section className="flex flex-col justify-between gap-space-lg xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-space-sm flex flex-wrap items-center gap-space-sm font-body-sm text-body-sm font-medium text-secondary">
            <span className="rounded-full bg-sky-100 px-space-sm py-1 font-semibold uppercase tracking-wide text-primary">{status}</span>
            <span>{dateLabel}</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight break-words">Welcome, {name}</h1>
          <p className="mt-space-sm font-body-md text-body-md text-secondary">{subtitle}</p>
        </div>
        {children && <div className="flex flex-wrap gap-space-sm xl:max-w-[55%]">{children}</div>}
    </section>
  );
}
