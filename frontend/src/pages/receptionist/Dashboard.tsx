import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { listAppointments } from '../../api/appointments';
import type { AppointmentResponse } from '../../api/types';
import { StatusBadge } from '../../components/StatusBadge';

const actions = [
  { title: 'Emergency Walk-in', description: 'Immediate patient triage & booking', icon: 'emergency', to: '/receptionist/book-appointment', color: 'bg-rose-50 text-rose-600 border border-rose-200' },
  { title: 'Register Patient', description: 'Create new patient profile & MRN', icon: 'person_add', to: '/receptionist/register-patient', color: 'bg-surface-container text-primary' },
  { title: 'Book Appointment', description: 'Schedule appointment with doctor', icon: 'event_available', to: '/receptionist/book-appointment', color: 'bg-surface-container text-primary' },
  { title: 'Collect Payment', description: 'Record invoice & receipt payment', icon: 'payments', to: '/receptionist/collect-payment', color: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  { title: 'Manage Invoices', description: 'View statements and billing history', icon: 'receipt_long', to: '/receptionist/invoices', color: 'bg-surface-container text-primary' },
];

const pageSize = 8;

function clinicDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function formatTime(value?: string) {
  if (!value) return '—';
  const clean = value.slice(0, 5);
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return clean;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour.toString().padStart(2, '0')}:${mStr} ${ampm}`;
}

export function Dashboard() {
  const { user } = useAuth();
  const branchId = user?.branchId;
  const [date, setDate] = useState(clinicDate);
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [counts, setCounts] = useState<{ total: number; scheduled: number; completed: number; cancelled: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live Time state matching Doctor Dashboard design
  const [liveTime, setLiveTime] = useState(() => {
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date()) + ' IST'
    );
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveTime(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Colombo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date()) + ' IST'
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const todayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    const updateDate = () => {
      const today = clinicDate();
      if (today !== date) {
        setDate(today);
        setPage(1);
      }
    };
    const timer = window.setInterval(updateDate, 60000);
    return () => window.clearInterval(timer);
  }, [date]);

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const params = { branch: branchId, date };
      const [list, scheduled, completed, cancelled] = await Promise.all([
        listAppointments({ ...params, page, limit: pageSize }),
        listAppointments({ ...params, status: 'Scheduled', limit: 1 }),
        listAppointments({ ...params, status: 'Completed', limit: 1 }),
        listAppointments({ ...params, status: 'Cancelled', limit: 1 }),
      ]);
      if (signal.cancelled) return;
      const lastPage = Math.max(1, Math.ceil(list.total / pageSize));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setAppointments(list.data);
      setCounts({ total: list.total, scheduled: scheduled.total, completed: completed.total, cancelled: cancelled.total });
    } catch (err: unknown) {
      if (!signal.cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, [date, page, branchId]);

  useEffect(() => {
    const signal = { cancelled: false };
    let running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      await load(signal);
      running = false;
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      signal.cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load, refreshVersion]);

  const nextAppointment = appointments.find((item) => item.status === 'Scheduled') || appointments[0];

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-theme(spacing.topbar-height))] justify-between pb-space-lg p-space-lg md:p-space-xl max-w-content-max-width mx-auto">
      {/* Top Level Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md py-space-md mb-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs mb-1">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-semibold">
              Reception Desk
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight font-bold">Overview</h1>
          <p className="font-body-md text-body-md text-secondary mt-0.5">
            {user?.branchName || 'Assigned Branch'} · Receptionist
          </p>
        </div>

        {/* Date & Time pill matching Doctor Dashboard image */}
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <div className="flex items-center bg-surface-card rounded-xl px-4 py-2 shadow-sm border border-border-subtle">
            <span className="material-symbols-outlined text-[18px] text-primary mr-2">event_available</span>
            <span className="font-label-lg text-label-lg text-brand-navy-deep font-semibold">{todayLabel}</span>
            <span className="mx-2 text-secondary opacity-40">|</span>
            <span className="font-mono-data text-mono-data text-secondary">{liveTime}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRefreshVersion((v) => v + 1)}
            className="w-10 h-10 rounded-xl bg-surface-card border border-border-subtle shadow-sm flex items-center justify-center text-primary hover:bg-surface-subtle transition-colors disabled:opacity-50"
            title="Refresh dashboard data"
            aria-label="Refresh dashboard data"
          >
            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-space-md rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 flex flex-wrap items-center justify-between gap-3">
          <p>{error} Displayed data may be out of date.</p>
          <button type="button" onClick={() => setRefreshVersion((v) => v + 1)} disabled={loading} className="border border-rose-300 rounded-lg px-4 py-2 disabled:opacity-50 font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg mb-space-lg">
        {/* Scheduled Metric */}
        <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm border border-border-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Scheduled Today</span>
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">calendar_today</span>
            </div>
          </div>
          <div className="my-space-md flex items-baseline gap-3">
            <span className="font-display-lg text-display-lg text-brand-navy-deep font-headline-lg font-bold">
              {counts?.scheduled ?? 0}
            </span>
            <span className="font-body-md text-body-md text-secondary">Patients</span>
          </div>
          <div className="flex items-center justify-between text-status-scheduled-text font-label-sm text-label-sm pt-space-xs border-t border-border-subtle/50">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">checklist</span> {counts?.scheduled ?? 0} remaining
            </span>
            <span className="text-secondary opacity-75">In queue</span>
          </div>
        </div>

        {/* Completed Consultations Metric */}
        <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm border border-border-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
              Completed Today
            </span>
            <div className="w-10 h-10 rounded-xl bg-status-completed-bg flex items-center justify-center text-status-completed-text">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
          </div>
          <div className="my-space-md flex items-baseline gap-3">
            <span className="font-display-lg text-display-lg text-brand-navy-deep font-headline-lg font-bold">
              {counts?.completed ?? 0}
            </span>
            <span className="font-body-md text-body-md text-secondary">Consultations</span>
          </div>
          <div className="flex items-center justify-between text-status-completed-text font-label-sm text-label-sm pt-space-xs border-t border-border-subtle/50">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span> Checked out
            </span>
            <span className="text-secondary opacity-75">On pace</span>
          </div>
        </div>

        {/* Total Booked Metric */}
        <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm border border-border-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Total Booked</span>
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">groups</span>
            </div>
          </div>
          <div className="my-space-md flex items-baseline gap-3">
            <span className="font-display-lg text-display-lg text-brand-navy-deep font-headline-lg font-bold">
              {counts?.total ?? 0}
            </span>
            <span className="font-body-md text-body-md text-secondary">Appointments</span>
          </div>
          <div className="flex items-center justify-between text-secondary font-label-sm text-label-sm pt-space-xs border-t border-border-subtle/50">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span> Active roster
            </span>
            <span className="text-secondary opacity-75">All doctors</span>
          </div>
        </div>

        {/* Cancelled Metric */}
        <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm border border-border-subtle relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Cancelled</span>
            <div className="w-10 h-10 rounded-xl bg-status-cancelled-bg flex items-center justify-center text-status-cancelled-text">
              <span className="material-symbols-outlined text-[22px]">cancel</span>
            </div>
          </div>
          <div className="my-space-md flex items-baseline gap-3">
            <span className="font-display-lg text-display-lg text-brand-navy-deep font-headline-lg font-bold">
              {counts?.cancelled ?? 0}
            </span>
            <span className="font-body-md text-body-md text-secondary">Cancelled</span>
          </div>
          <div className="flex items-center justify-between text-status-cancelled-text font-label-sm text-label-sm pt-space-xs border-t border-border-subtle/50">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">event_busy</span> Slots released
            </span>
            <span className="text-secondary opacity-75">Reschedulable</span>
          </div>
        </div>
      </div>

      {/* Bento Section: Next Patient Waiting & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
        {/* Next Patient Waiting */}
        <div className="lg:col-span-7 bg-surface-card rounded-2xl p-space-xl shadow-sm border border-border-subtle flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-full pointer-events-none" />
          <div className="flex flex-col flex-1 justify-between">
            {/* Header with status */}
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">person_pin</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">Next Patient Waiting</h2>
              </div>
              {nextAppointment && (
                <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-status-pending-text bg-status-pending-bg px-3 py-1.5 rounded-full font-semibold border border-status-pending-bg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-status-pending-text" />
                  Scheduled Next
                </span>
              )}
            </div>

            {/* Patient Content Container */}
            <div className="p-space-lg rounded-2xl bg-surface-subtle border border-border-subtle/80 mb-space-md flex-1 flex flex-col justify-between gap-space-md">
              <div>
                <div className="flex flex-wrap items-center gap-space-xs mb-1">
                  <h3 className="font-headline-lg text-headline-lg text-brand-navy-deep font-bold">
                    {loading && !counts ? 'Loading next patient...' : nextAppointment?.patient_name || 'No patient waiting'}
                  </h3>
                  {nextAppointment && (
                    <span className="px-2.5 py-0.5 rounded font-mono-data text-mono-data font-semibold bg-surface-container-high text-primary">
                      {nextAppointment.appointment_code}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-body-md text-body-md text-secondary">
                  <span>{nextAppointment?.appointment_type || 'No scheduled appointments in queue'}</span>
                  {nextAppointment && (
                    <>
                      <span className="text-outline-variant">·</span>
                      <span className="font-semibold text-brand-navy-deep">{formatTime(nextAppointment.start_time)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Doctor Assignment Card */}
              {nextAppointment && (
                <div className="p-space-sm rounded-xl bg-surface-card border border-border-subtle flex items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                    </div>
                    <div>
                      <span className="font-label-sm text-label-sm text-secondary block">Attending Doctor</span>
                      <span className="font-body-md text-body-md font-semibold text-brand-navy-deep">
                        {nextAppointment.doctor_name || 'Dr. Assigned'}
                      </span>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm font-semibold px-2.5 py-1 rounded-full bg-surface-subtle text-secondary">
                    {nextAppointment.status}
                  </span>
                </div>
              )}

              {/* Details Grid */}
              <div className="pt-space-sm border-t border-border-subtle/70 grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                    Appointment Type
                  </span>
                  <p className="font-body-md text-body-md text-brand-navy-deep font-medium">
                    {nextAppointment?.appointment_type || 'None'}
                  </p>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                    Time Slot
                  </span>
                  <p className="font-body-md text-body-md text-brand-navy-deep font-semibold">
                    {formatTime(nextAppointment?.start_time)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-space-xs">
            <Link
              className="flex-1 w-full inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold shadow-sm hover:shadow transition-all"
              to="/receptionist/appointments"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span>Manage Appointments</span>
            </Link>
            <Link
              className="flex-1 w-full inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep border border-border-subtle font-label-lg text-label-lg font-semibold transition-all"
              to="/receptionist/collect-payment"
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              <span>Collect Payment</span>
            </Link>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-5 bg-surface-card rounded-2xl p-space-xl shadow-sm border border-border-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">Quick Actions</h2>
              </div>
              <span className="font-label-sm text-label-sm text-secondary bg-surface-subtle px-space-sm py-1 rounded-lg uppercase font-semibold">
                Desk Tools
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {actions.map((action) => (
                <Link
                  key={action.title}
                  to={action.to}
                  className="group bg-surface-subtle border border-border-subtle rounded-xl p-3 hover:border-primary hover:bg-surface-container transition-all flex items-center gap-3"
                >
                  <span
                    aria-hidden="true"
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${action.color}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-brand-navy-deep group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-body-sm text-secondary truncate">{action.description}</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[18px]">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-space-md border-t border-border-subtle/60 mt-space-md">
            <Link
              className="inline-flex items-center justify-between w-full font-label-md text-label-md text-primary hover:text-border-focus font-semibold transition-colors"
              to="/receptionist/invoices"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>Billing & Invoices Hub</span>
              </span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Appointments Queue Section */}
      <section
        aria-busy={loading}
        className="bg-surface-card border border-border-subtle rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-space-lg border-b border-border-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">Today's Appointments Queue</h2>
              <p className="text-body-sm text-secondary mt-0.5">
                Latest appointments first · {counts?.total ?? '—'} total appointments
              </p>
            </div>
          </div>
          <Link
            to="/receptionist/appointments"
            className="text-primary font-semibold inline-flex items-center gap-1 text-label-md text-label-md hover:underline"
          >
            <span>View All Appointments</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {loading && !counts ? (
          <p role="status" className="p-10 text-center text-secondary">Loading appointments...</p>
        ) : error && !counts ? (
          <p className="p-10 text-center text-secondary">Appointments could not be loaded. Please retry.</p>
        ) : appointments.length === 0 ? (
          <div className="m-5 p-12 text-center border border-dashed border-border-subtle rounded-xl">
            <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-primary">event_available</span>
            <p className="mt-2 text-headline-sm font-semibold text-brand-navy-deep">No appointments scheduled for today.</p>
            <p className="text-body-sm text-secondary mt-1">Ready to book walk-ins and consultations.</p>
            <Link
              to="/receptionist/book-appointment"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md font-semibold hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Book Appointment</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider border-b border-border-subtle">
                <tr>
                  <th scope="col" className="px-space-lg py-3.5 w-32">Time</th>
                  <th scope="col" className="px-space-md py-3.5 min-w-[240px]">Patient Information</th>
                  <th scope="col" className="px-space-md py-3.5 min-w-[180px]">Attending Doctor</th>
                  <th scope="col" className="px-space-md py-3.5 w-36">Category</th>
                  <th scope="col" className="px-space-md py-3.5 w-36 text-center">Status</th>
                  <th scope="col" className="px-space-lg py-3.5 text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-body-md text-body-md text-brand-navy-deep">
                {appointments.map((appointment) => (
                  <tr key={appointment.appointment_id} className="hover:bg-surface-subtle/70 transition-colors h-16">
                    <td className="px-space-lg py-space-sm font-mono-data text-mono-data font-semibold text-brand-navy-deep whitespace-nowrap">
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
                    <td className="px-space-md py-space-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-secondary">stethoscope</span>
                        <span className="font-body-md text-body-md text-brand-navy-deep font-medium">
                          {appointment.doctor_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-space-md py-space-sm align-middle whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md font-semibold">
                        {appointment.appointment_type}
                      </span>
                    </td>
                    <td className="px-space-md py-space-sm text-center">
                      <StatusBadge status={appointment.status} />
                    </td>
                    <td className="px-space-lg py-space-sm text-right">
                      <Link
                        to="/receptionist/appointments"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-subtle hover:border-primary text-primary hover:bg-surface-subtle font-label-md text-label-md font-semibold transition-all"
                      >
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Footer */}
        <div className="p-space-md bg-surface-subtle/50 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-body-sm text-secondary font-medium">
            <button
              aria-label="Previous appointment page"
              type="button"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="border border-border-subtle bg-surface-card rounded-lg px-3 py-1.5 disabled:opacity-40 hover:bg-surface-subtle transition-colors font-semibold"
            >
              Previous
            </button>
            <span>
              Page <strong className="text-brand-navy-deep">{page}</strong> of{' '}
              <strong className="text-brand-navy-deep">{Math.max(1, Math.ceil((counts?.total ?? 0) / pageSize))}</strong>
            </span>
            <button
              aria-label="Next appointment page"
              type="button"
              disabled={loading || page * pageSize >= (counts?.total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
              className="border border-border-subtle bg-surface-card rounded-lg px-3 py-1.5 disabled:opacity-40 hover:bg-surface-subtle transition-colors font-semibold"
            >
              Next
            </button>
          </div>
          <span className="text-body-sm text-secondary">
            Auto-refreshes every minute
          </span>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
