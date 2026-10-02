import React from 'react';
import { Link } from 'react-router-dom';

export const DoctorDashboard: React.FC = () => {
  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-theme(spacing.topbar-height))] justify-between pb-space-lg">
      {/* Top Level Welcome & Date Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md py-space-md mb-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs mb-1">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm">
              Live Session
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">Overview</h1>
        </div>

        {/* Quick Date & Roster Controls */}
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <div className="flex items-center bg-surface-card rounded-xl px-space-md py-2 shadow-sm border border-border-subtle">
            <span className="material-symbols-outlined text-[18px] text-primary mr-2">event_available</span>
            <span className="font-label-lg text-label-lg text-brand-navy-deep">Sep 3, 2026</span>
            <span className="mx-2 text-secondary opacity-40">|</span>
            <span className="font-mono-data text-mono-data text-secondary">09:58 AM IST</span>
          </div>
        </div>
      </div>

      {/* Widget 1: Key Metric Cards Grid (Stretched to 2 columns to fill width) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-lg">
        {/* Scheduled Metric */}
        <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm border border-border-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Scheduled Today</span>
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">calendar_today</span>
            </div>
          </div>
          <div className="my-space-md flex items-baseline gap-3">
            <span className="font-display-lg text-display-lg text-brand-navy-deep font-headline-lg">14</span>
            <span className="font-body-md text-body-md text-secondary">Patients</span>
          </div>
          <div className="flex items-center justify-between text-status-scheduled-text font-label-sm text-label-sm pt-space-xs border-t border-border-subtle/50">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">checklist</span> 10 remaining
            </span>
            <span className="text-secondary opacity-75">Target: 20 max</span>
          </div>
        </div>

        {/* Completed Consultations Metric */}
        <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm border border-border-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
              Completed Consultations Today
            </span>
            <div className="w-10 h-10 rounded-xl bg-status-completed-bg flex items-center justify-center text-status-completed-text">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
          </div>
          <div className="my-space-md flex items-baseline gap-3">
            <span className="font-display-lg text-display-lg text-brand-navy-deep font-headline-lg">4</span>
            <span className="font-body-md text-body-md text-secondary">Consultations</span>
          </div>
          <div className="flex items-center justify-between text-status-completed-text font-label-sm text-label-sm pt-space-xs border-t border-border-subtle/50">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">timer</span> avg. 14 mins / consult
            </span>
            <span className="text-secondary opacity-75">On pace</span>
          </div>
        </div>
      </div>

      {/* Bento Section: Flex-1 to vertically consume all remaining canvas space */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg flex-1">
        {/* Widget 2: Quick Action (Next Patient Waiting) [Span 7 cols, stretched internals] */}
        <div className="lg:col-span-7 bg-surface-card rounded-2xl p-space-xl shadow-sm border border-border-subtle flex flex-col justify-between relative overflow-hidden h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex flex-col flex-1 justify-between">
            {/* Header with status */}
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">person_pin</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">Next Patient Waiting</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-status-pending-text bg-status-pending-bg px-3 py-1.5 rounded-full font-semibold animate-pulse border border-status-pending-bg">
                <span className="w-2 h-2 rounded-full bg-status-pending-text"></span>
                Waiting 12 mins
              </span>
            </div>

            {/* Patient Content Container: expanded & filling available space */}
            <div className="p-space-lg rounded-2xl bg-surface-subtle border border-border-subtle/80 mb-space-md flex-1 flex flex-col justify-between gap-space-md">
              {/* Primary Identity & Allergy Warning */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                <div>
                  <div className="flex flex-wrap items-center gap-space-xs mb-1">
                    <h3 className="font-headline-lg text-headline-lg text-brand-navy-deep font-bold">Priyantha Dharmasena</h3>
                    <span className="px-2.5 py-0.5 rounded font-mono-data text-mono-data font-semibold bg-surface-container-high text-primary">
                      PT-002841
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-body-md text-body-md text-secondary">
                    <span>48 yrs · Male</span>
                    <span className="text-outline-variant">·</span>
                    <span>NIC: 782410928V</span>
                    <span className="text-outline-variant">·</span>
                    <span className="font-medium text-brand-navy-deep">Blood Group: B+</span>
                  </div>
                </div>
              </div>

              {/* Critical Clinical Alert: Allergy Banner */}
              <div className="p-space-sm rounded-xl bg-status-cancelled-bg/80 border border-status-cancelled-bg flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-status-cancelled-bg flex items-center justify-center text-status-cancelled-text shrink-0">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-label-sm font-bold text-status-cancelled-text uppercase tracking-wider block">
                      Allergy Alert
                    </span>
                    <span className="font-body-md text-body-md font-semibold text-brand-navy-deep">
                      Penicillin & Beta-Lactam Antibiotics
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Grid: Complaint, Vitals, Category */}
              <div className="pt-space-md border-t border-border-subtle/70 grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                <div className="sm:col-span-2">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                    Chief Clinical Reason
                  </span>
                  <p className="font-body-md text-body-md text-brand-navy-deep font-medium">
                    Follow-up Hypertension & 12-Lead ECG Review (Post-Stent Care)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
            <Link
              className="w-full inline-flex items-center justify-center gap-2 px-space-xl py-3.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold shadow-sm hover:shadow transition-all"
              to="/consultation"
            >
              <span className="material-symbols-outlined text-[20px]">stethoscope</span>
              <span>Start Consultation Now</span>
            </Link>
          </div>
        </div>

        {/* Widget 3: This Month's Earnings [Span 5 cols, stretched internals] */}
        <div className="lg:col-span-5 bg-surface-card rounded-2xl p-space-xl shadow-sm border border-border-subtle flex flex-col justify-between h-full">
          <div className="flex flex-col flex-1 justify-between gap-space-md">
            <div>
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">This Month's Earnings</h2>
                </div>
                <span className="font-label-sm text-label-sm text-secondary bg-surface-subtle px-space-sm py-1 rounded-lg uppercase font-semibold">
                  Sep 2026 MTD
                </span>
              </div>

              {/* Big Total Tile with Sub-Context */}
              <div className="mb-space-md">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                  Total Doctor Share Revenue
                </span>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-display-lg text-display-lg text-brand-navy-deep font-headline-lg font-bold">LKR 485,000</span>
                  <span className="font-label-sm text-label-sm text-status-completed-text flex items-center font-semibold">
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span> +14.2% MoM
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown: Collected vs Outstanding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mb-space-sm">
              <div className="p-space-md rounded-2xl bg-surface-subtle flex flex-col justify-between border border-border-subtle/50">
                <div className="flex items-center gap-1.5 text-secondary mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-completed-text"></span>
                  <span className="font-label-sm text-label-sm uppercase font-semibold">Disbursed / Collected</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-mono-data font-bold">
                  LKR 412,000
                </span>
                <span className="font-body-sm text-body-sm text-secondary mt-1">84.9% settled to bank</span>
              </div>
              <div className="p-space-md rounded-2xl bg-surface-subtle flex flex-col justify-between border border-border-subtle/50">
                <div className="flex items-center gap-1.5 text-secondary mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-pending-text animate-pulse"></span>
                  <span className="font-label-sm text-label-sm uppercase font-semibold">Pending Settlement</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-mono-data font-bold">
                  LKR 73,000
                </span>
                <span className="font-body-sm text-body-sm text-secondary mt-1">Clears this Friday</span>
              </div>
            </div>

            {/* Recent Payout Mini Status Indicator to fill vertical space */}
            <div className="p-space-sm rounded-xl bg-surface-card border border-border-subtle flex items-center justify-between text-secondary font-label-sm text-label-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-status-completed-text">task_alt</span>
                <span>Last Payout: <strong className="text-brand-navy-deep font-mono-data">LKR 25,000</strong> on Aug 20</span>
              </div>
              <span className="text-status-completed-text font-semibold">Disbursed</span>
            </div>
          </div>

          {/* Widget Link */}
          <div className="pt-space-md border-t border-border-subtle/60 mt-space-sm">
            <Link
              className="inline-flex items-center justify-between w-full font-label-md text-label-md text-primary hover:text-border-focus font-semibold transition-colors"
              to="/my-earnings"
            >
              <span>View Full Statement & Request Payout</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
