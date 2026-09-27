import React from 'react';
import { NavLink } from 'react-router-dom';

const REPORT_CARDS = [
  {
    title: 'Branch Appointment Summary',
    description: 'View scheduled, completed, and cancelled appointments grouped by branch and date.',
    icon: 'calendar_today',
    path: '/reports/appointments-summary',
  },
  {
    title: 'Doctor Revenue',
    description: 'Analyze total revenue generated per doctor and specialty over a specific period.',
    icon: 'monitoring',
    path: '/reports/doctor-revenue',
  },
  {
    title: 'Outstanding Balances',
    description: 'Track patients with unpaid or partially paid invoices across your branches.',
    icon: 'account_balance_wallet',
    path: '/reports/outstanding-balances',
  },
  {
    title: 'Treatment Category Breakdown',
    description: 'See which treatment categories are performed most frequently and their revenue share.',
    icon: 'pie_chart',
    path: '/reports/treatment-categories',
  },
  {
    title: 'Insurance vs. Out-of-Pocket',
    description: 'Compare revenue covered by insurance providers versus direct patient payments.',
    icon: 'health_and_safety',
    path: '/reports/insurance-vs-out-of-pocket',
  },
];

export const ReportsIndex: React.FC = () => {
  return (
    <div className="flex flex-col w-full px-space-md md:px-space-xl py-space-lg max-w-content-max-width mx-auto space-y-space-lg text-[18px]">
      <div>
        <h1 className="font-display-lg text-[34px] font-extrabold text-on-surface tracking-tight">Reports & Analytics</h1>
        <p className="font-body-md text-[18px] text-secondary mt-0.5">
          Select a report below to view clinic performance, financial data, and operational metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {REPORT_CARDS.map((report) => (
          <NavLink
            key={report.path}
            to={report.path}
            className="group bg-surface-card rounded-2xl border border-border-subtle p-6 shadow-sm hover:shadow-md hover:border-brand-teal-light transition-all flex flex-col items-start text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-subtle group-hover:bg-primary-fixed group-hover:text-primary transition-colors flex items-center justify-center text-secondary mb-4">
              <span className="material-symbols-outlined text-[24px]">{report.icon}</span>
            </div>
            <h3 className="font-headline-sm text-on-surface mb-2 group-hover:text-primary transition-colors">
              {report.title}
            </h3>
            <p className="font-body-sm text-secondary line-clamp-3">
              {report.description}
            </p>
          </NavLink>
        ))}
      </div>
    </div>
  );
};
