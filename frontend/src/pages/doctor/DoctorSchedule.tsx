import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const DoctorSchedule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'remaining' | 'waiting' | 'upcoming' | 'completed'>('remaining');
  const [currentDateIndex, setCurrentDateIndex] = useState(1); // 1 = Today (Thursday)

  const dates = [
    { label: 'Wednesday, Sep 2, 2026', isToday: false, hasData: false },
    { label: 'Thursday, Sep 3, 2026', isToday: true, hasData: true },
    { label: 'Friday, Sep 4, 2026', isToday: false, hasData: false },
  ];

  const currentDate = dates[currentDateIndex];

  return (
    <div className="flex flex-col w-full py-space-md space-y-space-lg">
      {/* Breadcrumb & Schedule Mode Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-y-space-xs">
        <nav aria-label="Breadcrumb" className="flex items-center gap-space-2xs text-secondary font-label-md text-label-md">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/dashboard">
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
          </Link>
          <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
          <span className="text-secondary font-medium">My Work</span>
          <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
          <span className="text-brand-navy-deep font-semibold">My Schedule</span>
        </nav>
        <div className="flex items-center gap-space-xs">
          <span className="text-secondary font-mono-data text-mono-data hidden lg:inline-block">Sync: 10:14 AM IST</span>
        </div>
      </div>

      {/* Page Header With Date Controller & KPI Pills */}
      <div className="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle flex flex-col gap-space-md">
        {/* Date Selector & Day Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => currentDateIndex > 0 && setCurrentDateIndex(currentDateIndex - 1)}
                className="w-8 h-8 rounded-lg border border-border-subtle flex items-center justify-center text-secondary hover:bg-surface-subtle transition-colors disabled:opacity-40"
                disabled={currentDateIndex === 0}
                type="button"
                aria-label="Previous day"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[18px] ${currentDate.isToday ? 'text-border-focus' : 'text-secondary'}`}>
                  event
                </span>
                <span className={`font-headline-sm text-headline-sm select-none ${currentDate.isToday ? 'text-brand-navy-deep font-bold' : 'text-secondary font-medium'}`}>
                  {currentDate.label}
                </span>
                {currentDate.isToday ? (
                  <span className="px-2 py-0.5 rounded-md bg-border-focus text-on-primary font-label-sm text-label-sm font-bold tracking-wider uppercase">
                    Today
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-surface-subtle text-secondary font-label-sm text-label-sm font-semibold tracking-wider uppercase">
                    Read-Only
                  </span>
                )}
              </div>
              <button
                onClick={() => currentDateIndex < dates.length - 1 && setCurrentDateIndex(currentDateIndex + 1)}
                className="w-8 h-8 rounded-lg border border-border-subtle flex items-center justify-center text-secondary hover:bg-surface-subtle transition-colors disabled:opacity-40"
                disabled={currentDateIndex === dates.length - 1}
                type="button"
                aria-label="Next day"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="w-full sm:w-72 flex flex-col gap-1">
            <div className="flex justify-between font-label-sm text-label-sm text-secondary">
              <span>Daily Progress</span>
              <span className="font-bold text-brand-navy-deep">6 / 14 (43%)</span>
            </div>
            <div className="w-full h-2.5 bg-surface-subtle rounded-full overflow-hidden flex">
              <div className="bg-status-completed-text h-full rounded-full transition-all" style={{ width: '43%' }}></div>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
          <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-status-completed-bg/40 border border-status-completed-bg">
            <div className="w-9 h-9 rounded-lg bg-status-completed-bg flex items-center justify-center text-status-completed-text">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-status-completed-text font-bold leading-tight">6</div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Completed</div>
            </div>
          </div>

          <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-status-scheduled-bg/60 border border-status-scheduled-bg">
            <div className="w-9 h-9 rounded-lg bg-status-scheduled-bg flex items-center justify-center text-status-scheduled-text">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-status-scheduled-text font-bold leading-tight">8</div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Remaining To Do</div>
            </div>
          </div>

          <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-status-pending-bg/60 border border-status-pending-bg">
            <div className="w-9 h-9 rounded-lg bg-status-pending-bg flex items-center justify-center text-status-pending-text">
              <span className="material-symbols-outlined text-[20px] animate-pulse">hourglass_top</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-status-pending-text font-bold leading-tight">2</div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Waiting / Arrived</div>
            </div>
          </div>

          <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-subtle border border-border-subtle">
            <div className="w-9 h-9 rounded-lg bg-surface-card flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold leading-tight">6</div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Upcoming Scheduled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Schedule Container */}
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
        {/* Table Sub-Header & Dynamic Filter Tabs */}
        <div className="px-space-lg py-space-md bg-surface-subtle flex flex-wrap items-center justify-between gap-space-sm border-b border-border-subtle">
          <div className="flex flex-wrap items-center gap-space-xs">
            <div className="flex items-center bg-surface-card p-1 rounded-xl shadow-xs border border-border-subtle">
              {[
                { id: 'all', label: 'All Today (14)' },
                { id: 'remaining', label: 'Remaining To Do (8)' },
                { id: 'waiting', label: 'Waiting / In Queue (2)' },
                { id: 'upcoming', label: 'Upcoming (6)' },
                { id: 'completed', label: 'Completed (6)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all ${
                    activeTab === tab.id
                      ? 'bg-status-scheduled-bg text-status-scheduled-text font-bold shadow-xs'
                      : 'text-secondary hover:text-brand-navy-deep font-medium'
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-space-xs">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-[18px] text-secondary absolute left-3 pointer-events-none">
                search
              </span>
              <input
                className="h-9 pl-9 pr-3 rounded-lg bg-surface-card border border-border-subtle text-body-sm font-body-sm text-brand-navy-deep placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-border-focus w-60 shadow-xs"
                placeholder="Filter patient name or ID..."
                type="text"
              />
            </div>
            <select className="h-9 px-3 rounded-lg bg-surface-card border border-border-subtle text-label-md font-label-md text-secondary focus:outline-none focus:ring-2 focus:ring-border-focus shadow-xs">
              <option value="all">All Categories</option>
              <option value="consultation">Consultation</option>
              <option value="followup">Follow-up</option>
              <option value="walkin">Walk-in</option>
            </select>
          </div>
        </div>

        {/* Schedule Table (Shown when data is present) */}
        {currentDate.hasData ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-bg h-11 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-2.5 px-space-lg w-32">Slot Time</th>
                  <th className="py-2.5 px-space-md min-w-[320px]">Patient Information</th>
                  <th className="py-2.5 px-space-md w-36">Category</th>
                  <th className="py-2.5 px-space-md w-44">Status</th>
                  <th className="py-2.5 px-space-lg text-right min-w-[240px]">Session Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle font-body-md text-body-md text-brand-navy-deep">
                {/* Row 1: Waiting / In Queue */}
                <tr className="bg-status-scheduled-bg/30 hover:bg-status-scheduled-bg/50 transition-colors h-20 border-l-4 border-l-border-focus">
                  <td className="px-space-lg py-space-sm font-mono-data text-mono-data text-status-scheduled-text font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-border-focus animate-ping"></span>
                      <span className="text-base font-bold">10:15 AM</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary block pl-4">Waiting 11m</span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                          Priyantha Dharmasena
                        </span>
                        <span className="text-primary font-mono-data text-mono-data font-label-sm text-label-sm font-bold">PT-003420</span>
                        <span className="px-2 py-0.5 rounded-full bg-status-cancelled-bg text-status-cancelled-text font-label-sm text-label-sm font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">warning</span>Allergy: Penicillin
                        </span>
                      </div>
                      <div className="font-body-sm text-body-sm text-secondary">
                        Male, 48 yrs · NIC: 782410928V · Post-Stent Follow-up
                      </div>
                    </div>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="px-2.5 py-1 rounded-full bg-surface-card text-brand-navy-deep font-label-md text-label-md font-semibold shadow-xs border border-border-subtle">
                      Follow-up
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-pending-bg text-status-pending-text font-label-md text-label-md font-bold shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-status-pending-text animate-pulse"></span>
                      Waiting / In Queue
                    </span>
                  </td>
                  <td className="px-space-lg py-space-sm text-right">
                    <Link
                      to="/consultation"
                      className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-lg bg-border-focus hover:bg-status-scheduled-text text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:shadow transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                      <span>Start Consultation</span>
                    </Link>
                  </td>
                </tr>

                {/* Row 2: Checked in */}
                <tr className="hover:bg-surface-subtle/70 transition-colors h-16">
                  <td className="px-space-lg py-space-sm font-mono-data text-mono-data text-brand-navy-deep font-semibold">
                    10:45 AM
                  </td>
                  <td className="px-space-md py-space-sm">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Anoma Alwis</span>
                        <span className="text-secondary font-mono-data text-mono-data font-label-sm text-label-sm font-semibold">PT-003424</span>
                      </div>
                      <div className="font-body-sm text-body-sm text-secondary">
                        Female, 67 yrs · NIC: 576921004V · Atrial Fibrillation review
                      </div>
                    </div>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="px-2.5 py-1 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md font-semibold">
                      Consultation
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-md text-label-md font-semibold">
                      <span className="material-symbols-outlined text-[14px]">how_to_reg</span>Arrived / Checked-in
                    </span>
                  </td>
                  <td className="px-space-lg py-space-sm text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-subtle text-secondary font-label-md text-label-md font-medium">
                      <span className="material-symbols-outlined text-[15px]">tag</span>Queued #2 in line
                    </span>
                  </td>
                </tr>

                {/* Row 3: Scheduled Walk-in */}
                <tr className="hover:bg-surface-subtle/70 transition-colors h-16">
                  <td className="px-space-lg py-space-sm font-mono-data text-mono-data text-secondary font-medium">11:10 AM</td>
                  <td className="px-space-md py-space-sm">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Kasun Fernando</span>
                        <span className="text-secondary font-mono-data text-mono-data font-label-sm text-label-sm font-semibold">PT-003426</span>
                      </div>
                      <div className="font-body-sm text-body-sm text-secondary">
                        Male, 33 yrs · NIC: 931084221V · Pre-Operative Clearance
                      </div>
                    </div>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-fixed font-label-md text-label-md font-semibold">
                      Walk-in
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md font-semibold">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>Scheduled
                    </span>
                  </td>
                  <td className="px-space-lg py-space-sm text-right">
                    <span className="font-mono-data text-mono-data text-secondary">Expected 11:10 AM</span>
                  </td>
                </tr>

                {/* Midday Recess Row */}
                <tr className="bg-surface-subtle/50 h-10">
                  <td className="px-space-lg py-2 font-label-sm text-label-sm uppercase tracking-wider text-secondary" colSpan={5}>
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[16px] text-primary">restaurant</span>
                      <span className="font-semibold">Midday Recess / Ward Rounds (12:30 PM – 02:00 PM)</span>
                    </div>
                  </td>
                </tr>

                {/* Afternoon Row */}
                <tr className="hover:bg-surface-subtle/70 transition-colors h-16">
                  <td className="px-space-lg py-space-sm font-mono-data text-mono-data text-secondary font-medium">02:00 PM</td>
                  <td className="px-space-md py-space-sm">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-space-xs">
                        <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Kumari Jayasooriya</span>
                        <span className="text-secondary font-mono-data text-mono-data text-xs font-semibold">PT-003438</span>
                      </div>
                      <div className="font-body-sm text-body-sm text-secondary">
                        Female, 61 yrs · NIC: 658931204V · Hypertension management
                      </div>
                    </div>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="px-2.5 py-1 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md font-semibold">
                      Consultation
                    </span>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md font-semibold">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>Scheduled
                    </span>
                  </td>
                  <td className="px-space-lg py-space-sm text-right">
                    <span className="font-mono-data text-mono-data text-secondary">Expected 02:00 PM</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Table Footer / Capacity Summary */}
            <div className="px-space-lg py-space-md bg-canvas-bg border-t border-border-subtle flex flex-wrap items-center justify-between text-secondary font-body-sm text-body-sm">
              <div className="flex items-center gap-space-md flex-wrap">
                <span>Total Booked Today: <strong className="text-brand-navy-deep">14 Patients</strong></span>
                <span className="text-outline-variant">•</span>
                <span>Estimated Time Remaining: <strong className="text-brand-navy-deep">3h 45m</strong></span>
                <span className="text-outline-variant">•</span>
                <span className="text-status-completed-text font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span>Clinic running on schedule
                </span>
              </div>
              <div className="text-secondary font-mono-data text-mono-data">Next appointment slot: 10:15 AM (Priyantha Dharmasena)</div>
            </div>
          </div>
        ) : (
          /* Empty State (Compliant with FR-RA-06) */
          <div className="p-space-3xl flex flex-col items-center justify-center text-center space-y-space-sm">
            <div className="w-16 h-16 rounded-2xl bg-surface-subtle flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[36px]">event_busy</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-headline-md text-headline-md text-brand-navy-deep">No appointments scheduled for this date.</h3>
              <p className="font-body-md text-body-md text-secondary max-w-md">
                There are no clinical sessions or patient consultations registered for this date. Check another day or contact the reception coordinator.
              </p>
            </div>
            <button
              onClick={() => setCurrentDateIndex(1)}
              className="h-10 px-space-lg rounded-xl bg-border-focus text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:shadow transition-all"
              type="button"
            >
              Return to Today (Sep 3, 2026)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
