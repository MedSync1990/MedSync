import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStatsOverview, getRecentActivity, listBranches } from '../../api';
import { exportToCSV } from '../../api/reports';
import type { ActivityItem, BranchResponse, StatsOverview } from '../../api/types';

const panel = 'rounded-xl bg-surface-card p-6 shadow-sm md:p-7';
const headerAction = 'inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm';
const timezone = 'Asia/Colombo';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unable to load dashboard data.';
const appointmentCount = (stats: StatsOverview) => stats.today_appointments.scheduled + stats.today_appointments.completed + stats.today_appointments.cancelled;
function Icon({ name, className = 'text-xl' }: { name: string; className?: string }) { return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{name}</span>; }
interface BranchVolume { branch: BranchResponse; count: number | null }

export default function AdministratorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [volumes, setVolumes] = useState<BranchVolume[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchError, setBranchError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [page, setPage] = useState(0);
  const activityRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [overview, audit, branches] = await Promise.allSettled([getStatsOverview(), getRecentActivity({ limit: 50 }), listBranches()]);
      if (!mounted.current) return;
      if (overview.status === 'fulfilled') { setStats(overview.value); setError(''); setUpdatedAt(new Date()); }
      else setError(errorMessage(overview.reason));
      if (audit.status === 'fulfilled') { setActivity(audit.value); setPage(0); setActivityError(''); }
      else setActivityError(errorMessage(audit.reason));
      if (branches.status === 'fulfilled') {
        const results = await Promise.allSettled(branches.value.map(async branch => ({ branch, count: appointmentCount(await getStatsOverview({ branch: branch.branch_id })) })));
        if (!mounted.current) return;
        setVolumes(results.map((result, index) => result.status === 'fulfilled' ? result.value : { branch: branches.value[index], count: null }).sort((a, b) => (b.count ?? -1) - (a.count ?? -1)));
        setBranchError(results.some(result => result.status === 'rejected') ? 'Some branch totals could not be loaded.' : '');
      } else setBranchError(errorMessage(branches.reason));
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true; void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { mounted.current = false; window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [refresh]);
  const total = stats ? appointmentCount(stats) : 0;
  const today = stats?.today_appointments;
  const pages = Math.max(1, Math.ceil(activity.length / 5));
  const currentPage = Math.min(page, pages - 1);
  const visibleActivity = activity.slice(currentPage * 5, currentPage * 5 + 5);
  const timeLabel = (value: string | Date) => new Date(value).toLocaleString('en-GB', { timeZone: timezone, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return <div className="mx-auto flex w-full max-w-content-max-width flex-col gap-6 py-6 md:py-8">
    <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Enterprise Healthcare Network</p><h1 className="font-display-lg text-display-lg text-on-surface">Welcome, {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Administrator'}</h1><p className="mt-2 flex items-center gap-2 text-sm text-secondary"><Icon name="verified_user" />Administrator · All Branches</p></div>
      <div className="flex flex-col gap-3"><div className="flex flex-wrap items-center gap-3 text-xs text-secondary"><span className="rounded-full bg-surface-container-low px-3 py-2">{new Date().toLocaleDateString('en-GB', { timeZone: timezone, day: 'numeric', month: 'long', year: 'numeric' })}</span><button type="button" onClick={() => void refresh()} disabled={refreshing} className="flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-primary hover:bg-sky-50 disabled:opacity-50"><Icon name="refresh" />{refreshing ? 'Refreshing…' : 'Refresh'}</button></div><div className="flex flex-wrap gap-2"><Link to="/admin/staff" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm"><Icon name="group_add" />Staff Portal</Link><Link to="/admin/branches" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm"><Icon name="domain" />Branches</Link><button type="button" disabled={!activity.length || !!activityError} onClick={() => exportToCSV(activity, 'System_Audit')} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-tertiary disabled:opacity-50"><Icon name="download" />Export System Audit</button></div></div>
    </section>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{stats ? 'Showing the last available overview. ' : ''}{error}</p>}
    {loading && !stats ? <div role="status" className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0,1,2,3].map(index => <div key={index} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}<span className="sr-only">Loading administrator dashboard</span></div> : stats && <section aria-label="Network overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Total Active Patients', value: stats.total_patients, icon: 'person_check', note: 'Active patient records across the network', color: 'bg-sky-50 text-primary' },
      { label: 'Active Doctors', value: stats.total_doctors, icon: 'stethoscope', note: 'Active physicians across all branches', color: 'bg-sky-100 text-primary' },
      { label: 'Total Staff Personnel', value: stats.total_staff, icon: 'badge', note: 'Active staff profiles, including doctors', color: 'bg-indigo-50 text-indigo-700' },
      { label: 'Clinic Branches', value: stats.total_branches, icon: 'domain', note: 'Active branches in the clinic network', color: 'bg-emerald-50 text-emerald-700' },
    ].map(item => <article key={item.label} className="relative overflow-hidden rounded-xl bg-surface-card p-4 shadow-sm"><div aria-hidden="true" className={`absolute -right-6 -top-8 h-24 w-24 rounded-full ${item.color}`} /><div className="relative"><div className="flex items-center justify-between gap-2"><h2 className="text-[10px] font-semibold uppercase tracking-wide text-secondary">{item.label}</h2><span className={`rounded-lg p-1.5 ${item.color}`}><Icon name={item.icon} className="text-lg" /></span></div><p className="my-2 text-3xl font-semibold text-on-surface tabular-nums">{item.value.toLocaleString()}</p><p className="text-xs leading-relaxed text-secondary">{item.note}</p></div></article>)}</section>}
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <section className={`${panel} lg:col-span-8`}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface"><span className="text-primary"><Icon name="monitoring" /></span>Today Across All Branches</h2><p className="mt-1 text-sm text-secondary">Consolidated appointment volume across the clinic network</p></div><div className="rounded-xl bg-surface-subtle px-4 py-3 text-xs uppercase text-secondary">Consolidated: <strong className="ml-2 text-lg text-on-surface">{stats ? total : '—'}</strong> appointments</div></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[{ label: 'Completed', value: today?.completed, color: 'bg-emerald-50 text-emerald-800', bar: 'bg-emerald-600', icon: 'check_circle' },{ label: 'Scheduled', value: today?.scheduled, color: 'bg-sky-50 text-sky-800', bar: 'bg-sky-600', icon: 'schedule' },{ label: 'Cancelled', value: today?.cancelled, color: 'bg-rose-50 text-rose-800', bar: 'bg-rose-600', icon: 'cancel' }].map(item => <div key={item.label} className={`rounded-xl p-4 ${item.color}`}><div className="flex items-center justify-between text-xs font-semibold uppercase"><span>{item.label}</span><Icon name={item.icon} /></div><div className="my-3 flex items-center justify-between"><strong className="text-3xl tabular-nums">{item.value ?? '—'}</strong><span className="text-sm">{stats ? `${(total ? (item.value ?? 0)/total*100 : 0).toFixed(1)}%` : '—'}</span></div><div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-white"><div className={`h-full ${item.bar}`} style={{ width: `${total ? (item.value ?? 0)/total*100 : 0}%` }} /></div></div>)}</div>
        <div className="mb-4 mt-7 flex items-center justify-between gap-2"><h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface">Branch Volume Distribution</h3><span className="text-xs text-secondary">Sorted by workload share</span></div>{branchError && <p role="alert" className="mb-4 text-sm text-rose-700">{branchError}</p>}{loading && !volumes.length ? <p className="text-sm text-secondary">Loading branch totals…</p> : !volumes.length ? <p className="text-sm text-secondary">No branch totals available.</p> : <div className="space-y-5">{volumes.map(({branch,count}) => <div key={branch.branch_id}><div className="mb-2 flex items-start justify-between gap-3 text-sm"><div><span className="font-semibold text-on-surface">{branch.name}</span>{branch.is_active === false && <span className="ml-2 text-xs text-secondary">Inactive</span>}</div><span className="shrink-0 text-secondary">{count === null ? 'Unavailable' : `${count} appts · ${(total ? count/total*100 : 0).toFixed(1)}%`}</span></div><div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-primary" style={{width:`${total && count !== null ? Math.min(100,count/total*100) : 0}%`}} /></div></div>)}</div>}<div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-border-subtle pt-4 text-xs text-secondary"><span>{updatedAt ? `Updated ${timeLabel(updatedAt)} · Refreshes every 60 seconds` : 'Waiting for overview data'}</span><Link to="/reports/appointments-summary" className="font-semibold text-primary hover:underline">View Full Breakdowns →</Link></div>
      </section>
      <aside className="flex flex-col gap-5 lg:col-span-4"><section className={panel}><h2 className="mb-5 flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface"><span className="text-primary"><Icon name="bolt" /></span>Quick Actions</h2><div className="space-y-3">{[{label:'Manage Staff & Users',note:'Permissions and staff profiles',icon:'badge',path:'/admin/staff'},{label:'Manage Branches',note:'Clinic locations and branch details',icon:'domain',path:'/admin/branches'},{label:'Manage Treatments',note:'Treatment catalogue and pricing',icon:'medical_services',path:'/admin/treatment-catalogue'}].map(item => <Link key={item.path} to={item.path} className="flex items-center gap-3 rounded-xl bg-surface-subtle p-4 transition-colors hover:bg-surface-container-low"><span className="rounded-lg bg-white p-2 text-primary"><Icon name={item.icon} /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-on-surface">{item.label}</h3><p className="mt-1 text-xs text-secondary">{item.note}</p></div><Icon name="arrow_forward" /></Link>)}<button type="button" onClick={() => activityRef.current?.scrollIntoView({behavior:'smooth',block:'start'})} className="flex w-full items-center gap-3 rounded-xl bg-surface-subtle p-4 text-left hover:bg-surface-container-low"><span className="rounded-lg bg-white p-2 text-primary"><Icon name="policy" /></span><div className="flex-1"><h3 className="text-sm font-semibold text-on-surface">System Access Audits</h3><p className="mt-1 text-xs text-secondary">Review recorded administrative activity</p></div><Icon name="arrow_forward" /></button></div></section></aside>
    </div>
    <section ref={activityRef} className={`${panel} scroll-mt-24`}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface"><span className="rounded-lg bg-sky-50 p-2 text-primary"><Icon name="fact_check" /></span>Administrative Activity Feed & Security Log</h2><p className="mt-2 text-sm text-secondary">Latest recorded changes across the network</p></div><span className="rounded-full bg-surface-subtle px-3 py-2 text-xs text-secondary">Latest 50 records</span></div>{activityError ? <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{activityError}</p> : loading && !activity.length ? <p className="text-sm text-secondary">Loading audit records…</p> : !activity.length ? <p className="rounded-xl bg-surface-subtle p-8 text-center text-sm text-secondary">No audit entries available.</p> : <><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-surface-subtle text-xs uppercase tracking-wide text-secondary"><tr>{['Timestamp','Actor','Action Context','Operation'].map(label => <th key={label} className="p-4 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-border-subtle">{visibleActivity.map(item => <tr key={item.id} className="hover:bg-surface-subtle/50"><td className="whitespace-nowrap p-4 text-xs text-secondary">{timeLabel(item.created_at)}</td><td className="p-4 font-medium text-on-surface">{item.performed_by}</td><td className="p-4 text-on-surface">{item.description}</td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.action_type === 'DELETE' ? 'bg-rose-100 text-rose-800' : item.action_type === 'INSERT' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>{item.action_type}</span></td></tr>)}</tbody></table></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-secondary"><span>Showing {currentPage*5+1}–{Math.min((currentPage+1)*5,activity.length)} of {activity.length} loaded audit entries</span><div className="flex gap-2"><button type="button" disabled={currentPage===0} onClick={() => setPage(currentPage-1)} className="rounded-lg bg-surface-subtle px-3 py-2 font-semibold disabled:opacity-40">Previous Page</button><button type="button" disabled={currentPage>=pages-1} onClick={() => setPage(currentPage+1)} className="rounded-lg bg-primary px-3 py-2 font-semibold text-white disabled:opacity-40">Next Page</button></div></div></>}</section>
  </div>;
}
export const Dashboard = AdministratorDashboard;
