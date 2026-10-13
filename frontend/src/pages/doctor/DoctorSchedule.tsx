import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listAppointments } from '../../api/appointments';
import type { AppointmentResponse } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { DoctorRosterModal } from '../../components/DoctorRosterModal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const DoctorSchedule: React.FC = () => {
  useDocumentTitle('Doctor Schedule');
  const [activeTab, setActiveTab] = useState<'all' | 'remaining' | 'waiting' | 'upcoming' | 'completed'>('remaining');
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { user } = useAuth();

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const dates = useMemo(() => {
    const today = new Date();
    const offsets = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
    return offsets.map((offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      return {
        date: dateStr,
        label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
        isToday: offset === 0,
      };
    });
  }, []);

  const todayIndex = 7;
  const [currentDateIndex, setCurrentDateIndex] = useState(todayIndex);
  const currentDate = dates[currentDateIndex] || dates[todayIndex];

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    listAppointments({ date: currentDate.date, limit: 100 })
      .then((response) => {
        const allItems = response.data || [];
        // Strictly filter to the specific date to ensure no leaking of other days
        const dayOnly = allItems.filter((apt) => {
          const d = apt.appointment_date?.split('T')[0]?.trim();
          return !d || d === currentDate.date;
        });
        dayOnly.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
        setAppointments(dayOnly);
      })
      .catch(() => {
        setAppointments([]);
        setLoadError('Unable to load appointments for this date.');
      })
      .finally(() => setLoading(false));
  }, [currentDate.date]);

  const isAppointmentWaiting = useCallback((apt: AppointmentResponse): boolean => {
    if (apt.status !== 'Scheduled') return false;
    if (!currentDate.isToday) {
      // Past day uncompleted appointments are considered waiting/overdue; future days are not yet arrived
      return currentDate.date < todayStr;
    }
    // Walk-ins are physically present in the clinic
    if (apt.is_walkin_patient || (apt.appointment_type || '').toLowerCase().includes('walk')) return true;
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentH}:${currentM}`;
    const slotTime = (apt.start_time || '').slice(0, 5);
    return slotTime <= currentTime;
  }, [currentDate.isToday, currentDate.date, todayStr]);

  const isAppointmentUpcoming = useCallback((apt: AppointmentResponse): boolean => {
    if (apt.status !== 'Scheduled') return false;
    if (!currentDate.isToday) {
      return currentDate.date > todayStr;
    }
    return !isAppointmentWaiting(apt);
  }, [currentDate.isToday, currentDate.date, todayStr, isAppointmentWaiting]);

  // Specific day dynamic counts
  const activeAppointments = useMemo(
    () => appointments.filter((a) => a.status !== 'Cancelled'),
    [appointments]
  );
  const completedCount = useMemo(
    () => appointments.filter((a) => a.status === 'Completed').length,
    [appointments]
  );
  const remainingCount = useMemo(
    () => appointments.filter((a) => a.status !== 'Completed' && a.status !== 'Cancelled').length,
    [appointments]
  );
  const waitingCount = useMemo(
    () => appointments.filter(isAppointmentWaiting).length,
    [appointments, isAppointmentWaiting]
  );
  const upcomingCount = useMemo(
    () => appointments.filter(isAppointmentUpcoming).length,
    [appointments, isAppointmentUpcoming]
  );
  const progressPercent = activeAppointments.length > 0
    ? Math.round((completedCount / activeAppointments.length) * 100)
    : 0;

  const visibleAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      if (appointment.status === 'Cancelled') return false;

      // Tab filter
      if (activeTab === 'completed' && appointment.status !== 'Completed') return false;
      if (activeTab === 'remaining' && appointment.status === 'Completed') return false;
      if (activeTab === 'waiting' && !isAppointmentWaiting(appointment)) return false;
      if (activeTab === 'upcoming' && !isAppointmentUpcoming(appointment)) return false;

      // Category filter
      if (categoryFilter !== 'all') {
        const typeStr = (appointment.appointment_type || '').toLowerCase();
        if (categoryFilter === 'consultation' && !typeStr.includes('consultation') && !typeStr.includes('scheduled')) return false;
        if (categoryFilter === 'followup' && !typeStr.includes('follow')) return false;
        if (categoryFilter === 'walkin' && !typeStr.includes('walk')) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (appointment.patient_name || '').toLowerCase().includes(q);
        const matchesCode = (appointment.appointment_code || '').toLowerCase().includes(q);
        const matchesNic = (appointment.patient_nic || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesNic) return false;
      }

      return true;
    });
  }, [appointments, activeTab, categoryFilter, searchQuery, isAppointmentWaiting, isAppointmentUpcoming]);

  const formatTime = (value: string) => value ? value.slice(0, 5) : '—';
  const statusLabel = (status: string) => status === 'Scheduled' ? 'Scheduled' : status;

  return (
    <div className="flex flex-col w-full pt-space-lg pb-space-xl space-y-space-lg">
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
          <button
            type="button"
            onClick={() => setShowRosterModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-brand-navy-deep transition-all shadow-sm flex items-center gap-1.5"
            title="Edit Recurring Working Hours"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span>Edit My Weekly Roster</span>
          </button>
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
                  <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary font-label-sm text-label-sm font-bold tracking-wider uppercase">
                    Today
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-surface-subtle text-secondary font-label-sm text-label-sm font-semibold tracking-wider uppercase">
                    {currentDate.date < todayStr ? 'Past' : 'Upcoming'}
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
              <span className="font-bold text-brand-navy-deep">
                {completedCount} / {activeAppointments.length} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-subtle rounded-full overflow-hidden flex">
              <div
                className="bg-status-completed-text h-full rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat Counters (Specific Day Counts) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-space-sm p-space-sm rounded-xl text-left transition-all ${
              activeTab === 'completed'
                ? 'bg-surface-card border-2 border-primary shadow-sm'
                : 'bg-surface-subtle border border-border-subtle hover:bg-surface-subtle/80'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-surface-card flex items-center justify-center text-status-completed-text shadow-xs">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold leading-tight">
                {completedCount}
              </div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Completed</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('remaining')}
            className={`flex items-center gap-space-sm p-space-sm rounded-xl text-left transition-all ${
              activeTab === 'remaining'
                ? 'bg-surface-card border-2 border-primary shadow-sm'
                : 'bg-surface-subtle border border-border-subtle hover:bg-surface-subtle/80'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-surface-card flex items-center justify-center text-secondary shadow-xs">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold leading-tight">
                {remainingCount}
              </div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Remaining To Do</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('waiting')}
            className={`flex items-center gap-space-sm p-space-sm rounded-xl text-left transition-all ${
              activeTab === 'waiting'
                ? 'bg-surface-card border-2 border-primary shadow-sm'
                : 'bg-surface-subtle border border-border-subtle hover:bg-surface-subtle/80'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-surface-card flex items-center justify-center text-status-pending-text shadow-xs">
              <span className="material-symbols-outlined text-[20px] animate-pulse">hourglass_top</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold leading-tight">
                {waitingCount}
              </div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Waiting / Arrived</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-space-sm p-space-sm rounded-xl text-left transition-all ${
              activeTab === 'upcoming'
                ? 'bg-surface-card border-2 border-primary shadow-sm'
                : 'bg-surface-subtle border border-border-subtle hover:bg-surface-subtle/80'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-surface-card flex items-center justify-center text-primary shadow-xs">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold leading-tight">
                {upcomingCount}
              </div>
              <div className="font-label-sm text-label-sm text-secondary font-medium">Upcoming Scheduled</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Schedule Container */}
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
        {/* Table Sub-Header & Dynamic Filter Tabs */}
        <div className="px-space-lg py-space-md bg-surface-subtle flex flex-wrap items-center justify-between gap-space-sm border-b border-border-subtle">
          <div className="flex flex-wrap items-center gap-space-xs">
            <div className="flex items-center bg-surface-card p-1 rounded-xl shadow-xs border border-border-subtle">
              {[
                { id: 'all', label: `All (${activeAppointments.length})` },
                { id: 'remaining', label: `Remaining To Do (${remainingCount})` },
                { id: 'waiting', label: `Waiting / In Queue (${waitingCount})` },
                { id: 'upcoming', label: `Upcoming (${upcomingCount})` },
                { id: 'completed', label: `Completed (${completedCount})` },
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 rounded-lg bg-surface-card border border-border-subtle text-body-sm font-body-sm text-brand-navy-deep placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-border-focus w-60 shadow-xs"
                placeholder="Filter patient name or ID..."
                type="text"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-surface-card border border-border-subtle text-label-md font-label-md text-secondary focus:outline-none focus:ring-2 focus:ring-border-focus shadow-xs"
            >
              <option value="all">All Categories</option>
              <option value="consultation">Consultation</option>
              <option value="followup">Follow-up</option>
              <option value="walkin">Walk-in</option>
            </select>
          </div>
        </div>

        {/* Schedule Table (Shown when data is present) */}
        {!loading && !loadError ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full table-fixed text-left border-collapse">
              <colgroup>
                <col className="w-32" />
                <col />
                <col className="w-40" />
                <col className="w-44" />
                <col className="w-60" />
              </colgroup>
              <thead>
                <tr className="bg-canvas-bg h-11 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-2.5 px-space-lg w-32">Slot Time</th>
                  <th className="py-2.5 px-space-md min-w-[320px]">Patient Information</th>
                  <th className="py-2.5 px-space-md w-40">Category</th>
                  <th className="py-2.5 px-space-md w-44">Status</th>
                  <th className="py-2.5 px-space-lg text-right min-w-[240px]">Session Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle font-body-md text-body-md text-brand-navy-deep">
                {visibleAppointments.map((appointment) => (
                  <tr key={appointment.appointment_id} className="hover:bg-surface-subtle/70 transition-colors h-16">
                    <td className="px-space-lg py-space-sm font-mono-data text-mono-data text-brand-navy-deep font-semibold">
                      {formatTime(appointment.start_time)}
                    </td>
                    <td className="px-space-md py-space-sm">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-space-xs">
                          <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                            {appointment.patient_name}
                          </span>
                          <span className="text-primary font-mono-data text-mono-data font-label-sm text-label-sm font-semibold">
                            {appointment.appointment_code}
                          </span>
                        </div>
                        <div className="font-body-sm text-body-sm text-secondary">
                          {appointment.appointment_type}
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-space-sm align-middle whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md font-semibold">
                        {appointment.appointment_type}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-md text-label-md font-semibold">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {statusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-space-lg py-space-sm text-right">
                      {appointment.status === 'Scheduled' ? (
                        <Link
                          to={`/doctor/consultation?appointmentId=${appointment.appointment_id}`}
                          className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:shadow transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                          <span>Start Consultation</span>
                        </Link>
                      ) : (
                        <span className="font-mono-data text-mono-data text-secondary">{statusLabel(appointment.status)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tbody hidden className="divide-y divide-surface-subtle font-body-md text-body-md text-brand-navy-deep">
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
                      className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:shadow transition-all"
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
                <span>
                  {currentDate.isToday ? 'Total Booked Today:' : 'Total Booked:'}{' '}
                  <strong className="text-brand-navy-deep">{activeAppointments.length} Patients</strong>
                </span>
                <span className="text-outline-variant">•</span>
                <span>
                  Estimated Time Remaining:{' '}
                  <strong className="text-brand-navy-deep">
                    {Math.floor((remainingCount * 15) / 60) > 0
                      ? `${Math.floor((remainingCount * 15) / 60)}h ${(remainingCount * 15) % 60}m`
                      : `${(remainingCount * 15) % 60}m`}
                  </strong>
                </span>
                <span className="text-outline-variant">•</span>
                <span className="text-status-completed-text font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span>Clinic running on schedule
                </span>
              </div>
              <div className="text-secondary font-mono-data text-mono-data">
                Next appointment slot: {visibleAppointments[0] ? `${formatTime(visibleAppointments[0].start_time)} (${visibleAppointments[0].patient_name})` : 'None'}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State (Compliant with FR-RA-06) */
          <div className="p-space-3xl flex flex-col items-center justify-center text-center space-y-space-sm">
            <div className="w-16 h-16 rounded-2xl bg-surface-subtle flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[36px]">event_busy</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-headline-md text-headline-md text-brand-navy-deep">
                {loadError || 'No appointments scheduled for this date.'}
              </h3>
              <p className="font-body-md text-body-md text-secondary max-w-md">
                {loadError ? 'Please try again or contact the reception coordinator.' : 'There are no clinical sessions or patient consultations registered for this date.'}
              </p>
            </div>
            <button
              onClick={() => setCurrentDateIndex(todayIndex)}
              className="h-10 px-space-lg rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold shadow-sm hover:shadow transition-all"
              type="button"
            >
              Return to Today ({dates[todayIndex]?.label})
            </button>
          </div>
        )}
      </div>

      {/* Doctor Weekly Working Roster Modal */}
      <DoctorRosterModal
        isOpen={showRosterModal}
        doctorId={user?.id ?? null}
        doctorName={user?.firstName ? `Dr. ${user.firstName} ${user.lastName || ''}` : 'My Schedule'}
        onClose={() => setShowRosterModal(false)}
      />
    </div>
  );
};
