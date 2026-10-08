import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStatsOverview, listAppointments } from '../../api';
import { get } from '../../api/client';
import type { AppointmentResponse, DoctorResponse, StatsOverview } from '../../api/types';

const timezone = 'Asia/Colombo';
const card = 'rounded-xl bg-surface-container-lowest shadow-sm';
const action = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
const dateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to load branch information.';

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function BranchManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [appointmentError, setAppointmentError] = useState('');
  const [doctorError, setDoctorError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const results = await Promise.allSettled([
        getStatsOverview({ branch: user?.branchId }),
        listAppointments({ branch: user?.branchId, date: dateKey(), limit: 6 }),
        get<DoctorResponse[]>('/doctors', { branch_id: user?.branchId }),
      ]);
      if (!mounted.current) return;
      const [overview, recent, roster] = results;
      if (overview.status === 'fulfilled') {
        setStats(overview.value); setError(''); setUpdatedAt(new Date());
      } else setError(message(overview.reason));
      if (recent.status === 'fulfilled') { setAppointments(recent.value.data); setAppointmentError(''); }
      else setAppointmentError(message(recent.reason));
      if (roster.status === 'fulfilled') { setDoctors(roster.value.filter(doctor => doctor.is_active)); setDoctorError(''); }
      else setDoctorError(message(roster.reason));
    } finally {
      inFlight.current = false;
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [user?.branchId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { mounted.current = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const today = stats?.today_appointments;
  const total = today ? today.scheduled + today.completed + today.cancelled : 0;
  const branchName = user?.branchName || 'Your Branch';
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone }).format(new Date());
  const specialtyGroups = new Map<string, DoctorResponse[]>();
  for (const doctor of doctors) {
    for (const specialty of doctor.specialties.length ? doctor.specialties : ['General OPD']) {
      specialtyGroups.set(specialty, [...(specialtyGroups.get(specialty) || []), doctor]);
    }
  }
  const statuses = [
    { label: 'Scheduled', count: today?.scheduled ?? 0, color: 'bg-sky-100 text-sky-800', bar: 'bg-sky-500', note: 'Awaiting consultation' },
    { label: 'In Progress', count: null, color: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500', note: 'Not tracked by the system' },
    { label: 'Completed', count: today?.completed ?? 0, color: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-600', note: 'Consultations completed' },
    { label: 'Cancelled', count: today?.cancelled ?? 0, color: 'bg-rose-100 text-rose-800', bar: 'bg-rose-500', note: 'Cancelled appointments' },
  ];

  return <div className="mx-auto flex w-full max-w-content-max-width flex-col gap-space-lg py-space-lg">
    <section className={`${card} relative overflow-hidden p-space-xl`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-surface-container-low" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-md">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-medium text-secondary">
            <span className="rounded-full bg-sky-100 px-3 py-1 font-semibold uppercase tracking-wide text-primary">{error ? 'Connection issue' : updatedAt ? 'Operational live' : 'Connecting'}</span><span>{dateLabel}</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">{greeting},<br />{user?.firstName || user?.username || 'Manager'}</h1>
          <p className="mt-3 text-sm text-secondary">{branchName} · Branch Manager Overview</p>

        </div>
        <div className="flex max-w-xl flex-wrap gap-3">
          <Link to="/reports/appointments-summary" className={`${action} bg-primary text-white hover:bg-tertiary`}><Icon name="calendar_month" className="text-xl" />View Branch Appointments</Link>
          <Link to="/reports/doctor-revenue" className={`${action} bg-surface-container-high text-on-surface hover:bg-surface-variant`}><Icon name="trending_up" className="text-xl" />Doctor Revenue</Link>
          <Link to="/branch-manager/branch-details" className={`${action} bg-surface-container text-on-surface hover:bg-surface-dim`}><Icon name="domain" className="text-xl" />Branch Details & Staff</Link>
        </div>
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-secondary" aria-live="polite">
      <span>{updatedAt ? `Last updated ${updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone })} · Refreshes every 30 seconds` : 'Loading branch information…'}</span>
      <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-primary hover:bg-sky-50 disabled:opacity-50"><Icon name="refresh" className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{stats ? 'Showing the last available overview. ' : ''}{error} Use Refresh to try again.</div>}
    {loading && !stats ? <div role="status" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className={`${card} h-40 animate-pulse bg-slate-100`} />)}<span className="sr-only">Loading dashboard</span></div> : stats && <>
      <section aria-label="Branch overview statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active Patients', context: 'Assigned branch', value: stats.total_patients, icon: 'groups', detail: 'Active patients registered at this branch' },
          { label: 'Active Doctors', context: 'Medical roster', value: stats.total_doctors, icon: 'stethoscope', detail: Array.from(specialtyGroups.keys()).join(', ') || 'Active physicians assigned to this branch' },
          { label: 'Branch Staff', context: 'Workforce headcount', value: stats.total_staff, icon: 'badge', detail: 'Active staff profiles, including physicians' },
          { label: 'Clinical Rooms', context: 'Facility capacity', value: null, icon: 'meeting_room', detail: 'Room capacity is not tracked by the system' },
        ].map(item => <article key={item.label} className={`${card} flex min-h-[180px] flex-col justify-between p-space-lg hover:shadow-md transition-shadow`}><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">{item.context}</p><h2 className="mt-1 font-headline-sm text-headline-sm text-on-surface">{item.label}</h2></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-primary"><Icon name={item.icon} className="text-2xl" /></div></div><p className="mt-4 font-display-lg text-display-lg text-on-surface tabular-nums">{item.value === null ? 'Not tracked' : item.value.toLocaleString()}</p><p className="text-xs leading-relaxed text-secondary">{item.detail}</p></article>)}
      </section>
      <section className={`${card} p-space-xl`} aria-label="Today's appointment progress">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Today's Schedule Progress</p><h2 className="font-headline-md text-headline-md text-on-surface">Branch Appointments Flow</h2></div><div className="rounded-xl bg-sky-50 px-4 py-3 text-xs text-secondary"><strong className="mr-2 text-2xl text-brand-navy-deep tabular-nums">{total}</strong>Total today</div></div>
        <div className="mt-space-lg grid grid-cols-2 gap-space-sm rounded-xl bg-surface p-space-md sm:grid-cols-4">
          {statuses.map(status => <div key={status.label} className={`flex flex-col rounded-lg p-space-sm ${status.color}`}>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />{status.label}</h3>
            <p className="mt-1 font-headline-lg text-headline-lg tabular-nums">{status.count === null ? 'Not tracked' : status.count}</p>
            <p className="mt-1 text-xs text-secondary">{status.count !== null && total ? `${(status.count / total * 100).toFixed(1)}% of today's appointments` : status.note}</p>
          </div>)}
        </div>
      </section>
    </>}

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <section className={`${card} p-space-xl lg:col-span-8`}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-50 p-2 text-primary"><Icon name="history" className="text-xl" /></div><div><h2 className="font-headline-md text-headline-md text-on-surface">Recent Branch Activity</h2><p className="mt-1 text-xs text-secondary">Appointments for today and their current status</p></div></div><Link to="/reports/appointments-summary" className="text-xs font-semibold text-primary hover:underline">View summary</Link></div>
        {appointmentError ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{appointmentError}</p> : loading ? <p role="status" className="py-8 text-center text-sm text-secondary">Loading appointment activity…</p> : !appointments.length ? <div className="rounded-xl bg-slate-50 p-8 text-center"><Icon name="event_available" className="mb-2 text-3xl text-primary" /><p className="text-sm text-secondary">No appointments recorded for today.</p></div> : <div className="flex flex-col gap-3">{appointments.map(appointment => <article key={appointment.appointment_id} className="flex items-start gap-space-md rounded-xl bg-surface p-space-md hover:bg-surface-container-low transition-colors"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${appointment.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : appointment.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-primary'}`}><Icon name={appointment.status === 'Completed' ? 'check_circle' : appointment.status === 'Cancelled' ? 'event_busy' : 'calendar_month'} className="text-xl" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold text-brand-navy-deep">{appointment.patient_name}</h3><span className="text-xs font-medium text-secondary">{appointment.start_time.slice(0, 5)}</span></div><p className="mt-1 text-sm text-secondary">{appointment.doctor_name} · {appointment.appointment_type}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded bg-sky-100 px-2 py-1 font-medium text-primary">{appointment.appointment_code || `Appointment #${appointment.appointment_id}`}</span><span className="rounded bg-white px-2 py-1 text-secondary">{appointment.status}</span></div></div></article>)}</div>}
      </section>
      <aside className="flex flex-col gap-6 lg:col-span-4">
        <section className={`${card} p-space-xl`}><div className="mb-5 flex items-center justify-between gap-2"><h2 className="font-headline-sm text-headline-sm text-on-surface">Physician Allocation</h2><span className="text-xs font-semibold text-primary">{doctorError ? 'Unavailable' : `${doctors.length} active`}</span></div>{doctorError ? <p role="alert" className="text-sm text-rose-800">{doctorError}</p> : loading ? <p className="text-sm text-secondary">Loading roster…</p> : !doctors.length ? <p className="text-sm text-secondary">No active physicians assigned.</p> : <div className="flex flex-col gap-3">{Array.from(specialtyGroups.entries()).map(([specialty, members]) => <div key={specialty} className="flex items-center justify-between gap-3 rounded-lg bg-surface p-2.5"><div className="flex min-w-0 items-center gap-2"><Icon name="medical_services" className="rounded-lg bg-sky-100 p-2 text-xl text-primary" /><div className="min-w-0"><h3 className="text-sm font-semibold text-brand-navy-deep">{specialty}</h3><p className="mt-1 text-xs text-secondary">{members[0].full_name}{members.length > 1 ? ` + ${members.length - 1}` : ''}</p></div></div><span className="shrink-0 text-xs font-medium text-secondary">{members.length} {members.length === 1 ? 'doctor' : 'doctors'}</span></div>)}</div>}<Link to="/branch-manager/doctors" className={`${action} mt-5 w-full bg-surface-container-low text-primary hover:bg-surface-container`}>Doctor Rosters & Specialties</Link></section>
        <section className={`${card} p-space-xl`}>
          <div className="mb-space-md flex items-center gap-2"><Icon name="shield" className="text-xl text-primary" /><h2 className="font-headline-sm text-headline-sm text-on-surface">Facility Readiness</h2></div>
          <dl className="flex flex-col gap-3 text-xs">
            {['Pharmacy Stock Audit', 'Lab Specimen Dispatch', 'Billing Counter Terminals', 'Emergency Response Room'].map(label => <div key={label} className="flex items-start justify-between gap-3"><dt className="text-secondary">{label}</dt><dd className="shrink-0 font-medium text-secondary">Not tracked</dd></div>)}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-secondary">Facility checks are not recorded in the current backend.</p>
          <div className="mt-space-md flex items-center justify-between border-t border-surface-container-high pt-space-sm"><span className="text-xs uppercase tracking-wide text-secondary">Branch ID</span><span className="font-mono-data text-mono-data font-semibold text-on-surface">{user?.branchId ?? 'Unavailable'}</span></div>
        </section>
      </aside>
    </div>
  </div>;
}

export const Dashboard = BranchManagerDashboard;
