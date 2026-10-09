import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { listAppointments } from '../../api/appointments';
import type { AppointmentResponse } from '../../api/types';
import { StatusBadge } from '../../components/StatusBadge';

const actions = [
  { title: 'Emergency Walk-in', description: 'Open booking and choose Walk-in', icon: 'emergency', to: '/receptionist/book-appointment', color: 'bg-surface-container text-primary' },
  { title: 'Register Patient', description: 'Register a new patient', icon: 'person_add', to: '/receptionist/register-patient', color: 'bg-surface-container text-primary' },
  { title: 'Book Appointment', description: 'Schedule a patient with a doctor', icon: 'event_available', to: '/receptionist/book-appointment', color: 'bg-surface-container text-primary' },
  { title: 'Reschedule Appointment', description: 'Change an existing appointment', icon: 'edit_calendar', to: '/receptionist/appointments', color: 'bg-surface-container text-primary' },
  { title: 'Collect Payment', description: 'Record an invoice payment', icon: 'payments', to: '/receptionist/collect-payment', color: 'bg-surface-container text-primary' },
];
const pageSize = 8;
function clinicDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
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
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const updateDate = () => { const today = clinicDate(); if (today !== date) { setDate(today); setPage(1); } };
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
      if (page > lastPage) { setPage(lastPage); return; }
      setAppointments(list.data);
      setCounts({ total: list.total, scheduled: scheduled.total, completed: completed.total, cancelled: cancelled.total });
      setUpdatedAt(new Date());
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
    return () => { signal.cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load, refreshVersion]);

  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  const greeting = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const overview = [
    { label: 'Appointments', value: counts?.total, icon: 'calendar_today', color: 'text-primary' },
    { label: 'Scheduled', value: counts?.scheduled, icon: 'schedule', color: 'text-status-scheduled-text' },
    { label: 'Completed', value: counts?.completed, icon: 'check_circle', color: 'text-status-completed-text' },
    { label: 'Cancelled', value: counts?.cancelled, icon: 'cancel', color: 'text-status-cancelled-text' },
  ];
  return (
    <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline uppercase tracking-wider">
            <span className="text-primary font-bold">Dashboard</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight font-bold">
              Good {greeting}, {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username}
            </h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {user?.branchName || 'Assigned Branch'} · Receptionist
          </p>
        </div>
        <div className="font-body-sm text-body-sm text-secondary bg-surface-subtle px-4 py-2 rounded-lg border border-border-subtle shadow-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          {new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 flex flex-wrap items-center justify-between gap-3"><p>{error} Displayed data may be out of date.</p><button type="button" onClick={() => setRefreshVersion(version => version + 1)} disabled={loading} className="border border-rose-300 rounded-lg px-4 py-2 disabled:opacity-50">Retry</button></div>}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 min-w-0 flex flex-col gap-6">
        <section aria-busy={loading} className="min-w-0 bg-surface-card border border-border-subtle rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border-subtle flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-headline-md text-headline-md">Today's Appointments</h2><p className="text-body-sm text-secondary mt-1">Latest appointments first · {counts?.total ?? '—'} appointments</p></div><button type="button" disabled={loading} onClick={() => setRefreshVersion(version => version + 1)} className="inline-flex items-center gap-2 border border-border-subtle rounded-lg px-3 py-2 text-primary disabled:opacity-50"><span aria-hidden="true" className="material-symbols-outlined">refresh</span>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
          {loading && !counts ? <p role="status" className="p-10 text-center text-secondary">Loading dashboard...</p> : error && !counts ? <p className="p-10 text-center text-secondary">Appointments could not be loaded. Please retry.</p> : appointments.length === 0 ? <div className="m-5 p-8 text-center border border-dashed border-border-subtle rounded-xl"><span aria-hidden="true" className="material-symbols-outlined text-primary">event_available</span><p className="mt-2 text-body-md">No appointments scheduled for today.</p><Link to="/receptionist/book-appointment" className="inline-block mt-4 text-primary hover:underline">Book Appointment</Link></div> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead className="bg-surface-subtle text-secondary text-label-sm uppercase"><tr>{['Time', 'Patient', 'Doctor', 'Status'].map(label => <th key={label} scope="col" className={`px-5 py-3 ${label === 'Status' ? 'text-right' : ''}`}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border-subtle text-body-sm">{appointments.map(appointment => <tr key={appointment.appointment_id} className="hover:bg-surface-subtle/60"><td className="px-5 py-4 font-semibold whitespace-nowrap">{appointment.start_time.slice(0, 5)}</td><td className="px-5 py-4 font-medium">{appointment.patient_name}<span className="block text-secondary text-label-sm font-normal mt-1">{appointment.appointment_code} · {appointment.appointment_type}</span></td><td className="px-5 py-4 text-secondary">{appointment.doctor_name}</td><td className="px-5 py-4 text-right"><StatusBadge status={appointment.status} /></td></tr>)}</tbody></table></div>}
          <div className="p-4 bg-surface-subtle/50 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3 text-body-sm"><button aria-label="Previous appointment page" type="button" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)} className="border border-border-subtle rounded-lg px-3 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {Math.max(1, Math.ceil((counts?.total ?? 0) / pageSize))}</span><button aria-label="Next appointment page" type="button" disabled={loading || page * pageSize >= (counts?.total ?? 0)} onClick={() => setPage(p => p + 1)} className="border border-border-subtle rounded-lg px-3 py-1 disabled:opacity-40">Next</button></div><Link to="/receptionist/appointments" className="text-primary font-semibold inline-flex items-center gap-1 text-body-sm">View All Appointments<span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></Link></div>
        </section>
        <aside className="min-w-0 bg-surface-card rounded-xl border border-border-subtle shadow-sm p-5"><h2 className="font-headline-md text-headline-md mb-4">Today's Overview</h2><div className="divide-y divide-border-subtle">{overview.map(item => <div key={item.label} className="flex items-center justify-between py-4 gap-3"><span className="flex items-center gap-2 text-body-md text-secondary"><span aria-hidden="true" className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>{item.label}</span><span className={`font-headline-sm text-headline-sm ${item.color}`}>{item.value ?? '—'}</span></div>)}</div><p className="text-body-sm text-secondary mt-4">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' })} · refreshes every minute` : 'Awaiting dashboard data'}</p><Link to="/receptionist/invoices" className="mt-5 inline-flex items-center gap-2 text-primary font-semibold text-body-sm"><span aria-hidden="true" className="material-symbols-outlined">receipt_long</span>Invoices<span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></Link></aside>
        </div>
        <div className="xl:col-span-4 min-w-0 flex">
      <section aria-label="Quick Actions" className="w-full bg-surface-card border border-border-subtle rounded-xl shadow-sm p-5 space-y-3">
        <h2 className="font-headline-md text-headline-md mb-4">Quick Actions</h2>
        {actions.map(action => <Link key={action.title} to={action.to} className="group bg-surface-subtle border border-border-subtle rounded-xl p-3 hover:border-primary hover:bg-surface-container transition-colors flex items-center gap-3"><span aria-hidden="true" className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${action.color}`}><span className="material-symbols-outlined">{action.icon}</span></span><div><h2 className="font-headline-sm text-headline-sm group-hover:text-primary">{action.title}</h2><p className="text-body-sm text-secondary mt-1">{action.description}</p></div></Link>)}
      </section>

        </div>
      </div>
    </div>
  );
}
export default Dashboard;
