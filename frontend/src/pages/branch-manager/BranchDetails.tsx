import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { listBranches, getBranch } from '../../api/branches';
import { getStatsOverview } from '../../api/stats';
import type { BranchResponse, StatsOverview } from '../../api/types';

function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export const BranchDetails: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const branchesData = await listBranches();
      const branchArray = Array.isArray(branchesData) ? branchesData : [];
      setBranches(branchArray);

      let currentId = selectedBranchId;
      if (!currentId) {
        if (user?.branchId) {
          currentId = user.branchId;
        } else if (branchArray.length > 0) {
          currentId = branchArray[0].branch_id;
        }
      }

      if (currentId) {
        setSelectedBranchId(currentId);
        const [branchRes, statsRes] = await Promise.allSettled([
          getBranch(currentId),
          getStatsOverview({ branch: currentId }),
        ]);

        if (branchRes.status === 'fulfilled') {
          setBranch(branchRes.value);
        } else {
          const fallback = branchArray.find((b) => b.branch_id === currentId);
          if (fallback) setBranch(fallback);
        }

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value);
        } else {
          setStats(null);
        }
      } else {
        setBranch(null);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to load branch details.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranchId, user?.branchId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBranchSwitch = async (newBranchId: number) => {
    setSelectedBranchId(newBranchId);
    setLoading(true);
    try {
      const [branchRes, statsRes] = await Promise.allSettled([
        getBranch(newBranchId),
        getStatsOverview({ branch: newBranchId }),
      ]);
      if (branchRes.status === 'fulfilled') {
        setBranch(branchRes.value);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to switch branch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => showToast(`${label} copied!`, 'info'),
      () => showToast(`Failed to copy ${label.toLowerCase()}`, 'error')
    );
  };

  const branchInitials = branch?.name ? branch.name.slice(0, 2).toUpperCase() : 'BR';
  const isCurrentUserBranchManager = Boolean(
    branch?.branch_manager_id && user?.id === branch.branch_manager_id
  );

  const todayTotal = stats?.today_appointments
    ? stats.today_appointments.scheduled +
    stats.today_appointments.completed +
    stats.today_appointments.cancelled
    : 0;

  return (
    <div className="flex flex-col w-full min-h-screen bg-canvas-bg font-sans text-brand-navy-deep antialiased">
      <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full space-y-space-lg">
        {/* ── Breadcrumb & Top Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-label-sm text-outline uppercase tracking-wider">
              <span>Branch Management</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-bold">Branch Details</span>
            </div>
            <h1 className="text-display-lg tracking-tight font-bold text-brand-navy-deep">
              {branch ? `${branch.name} Branch` : 'Branch Details'}
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Comprehensive profile, location, and operational parameters for your branch. All details are read-only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            {/* Admin Branch Switcher */}
            {user?.role === 'Administrator' && branches.length > 1 && (
              <div className="flex items-center gap-2 bg-surface-card rounded-xl px-3 py-2 shadow-sm border border-border-subtle">
                <span className="text-label-sm text-outline uppercase tracking-wider">Branch:</span>
                <select
                  value={selectedBranchId ?? ''}
                  onChange={(e) => handleBranchSwitch(Number(e.target.value))}
                  className="bg-transparent text-label-md font-medium text-brand-navy-deep border-none focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.name} (#{b.branch_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Read-Only Badge */}
            <div className="h-10 px-space-md rounded-xl bg-surface-card border border-border-subtle shadow-sm flex items-center gap-1.5 text-label-md text-outline">
              <span className="material-symbols-outlined text-[18px] text-primary">lock</span>
              <span>Read-only</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => void fetchData(true)}
              disabled={refreshing || loading}
              className="h-10 px-space-md rounded-xl bg-surface-card hover:bg-surface-subtle text-primary text-label-md flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* ── Error Notification ── */}
        {error && (
          <div role="alert" className="p-space-md rounded-xl bg-error-container text-error text-label-md flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void fetchData(true)}
              className="font-bold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading Skeleton ── */}
        {loading && !branch ? (
          <div className="space-y-space-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-surface-card shadow-sm animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-space-lg">
              <div className="h-96 rounded-xl bg-surface-card shadow-sm animate-pulse" />
              <div className="h-96 rounded-xl bg-surface-card shadow-sm animate-pulse" />
            </div>
          </div>
        ) : !branch ? (
          <div className="bg-surface-card rounded-xl p-space-2xl text-center shadow-sm space-y-3">
            <span className="material-symbols-outlined text-[48px] text-outline">domain_disabled</span>
            <h2 className="text-headline-md font-bold text-brand-navy-deep">No Branch Assigned</h2>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              Your account does not have an active clinic branch assignment. Please contact the administrator.
            </p>
          </div>
        ) : (
          <>
            {/* ── Stat Summary Cards (Theme matching ManageStaff) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
              {/* Total Staff */}
              <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">badge</span>
                </div>
                <div>
                  <p className="text-label-sm uppercase text-outline tracking-wider">Assigned Staff</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-headline-md font-bold">{branch.staff_count ?? stats?.total_staff ?? 0}</span>
                    <span className="text-body-sm text-on-surface-variant">active personnel</span>
                  </div>
                </div>
              </div>

              {/* Rostered Doctors */}
              <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-xl bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">stethoscope</span>
                </div>
                <div>
                  <p className="text-label-sm uppercase text-outline tracking-wider">Rostered Doctors</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-headline-md font-bold">{stats?.total_doctors ?? '—'}</span>
                    <span className="text-body-sm text-on-surface-variant">physicians</span>
                  </div>
                </div>
              </div>

              {/* Registered Patients */}
              <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-xl bg-secondary-container text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">groups</span>
                </div>
                <div>
                  <p className="text-label-sm uppercase text-outline tracking-wider">Branch Patients</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-headline-md font-bold">{stats?.total_patients ?? '—'}</span>
                    <span className="text-body-sm text-on-surface-variant">registered</span>
                  </div>
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                </div>
                <div>
                  <p className="text-label-sm uppercase text-outline tracking-wider">Today's Visits</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-headline-md font-bold">{todayTotal}</span>
                    <span className="text-body-sm text-on-surface-variant">
                      {stats?.today_appointments?.scheduled ?? 0} scheduled
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2-Column Detail Layout (Identical theme to ManageStaff) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-space-lg items-start">
              {/* ── Left Aside: Branch Overview Card ── */}
              <aside className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                {/* Header with Initial & Name */}
                <div className="p-space-lg flex items-center gap-space-md">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center text-headline-md font-bold shrink-0 ${branch.is_active
                      ? 'bg-secondary-container text-on-secondary-fixed'
                      : 'bg-surface-subtle text-outline'
                      }`}
                  >
                    {branchInitials}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-headline-md font-bold leading-tight truncate">
                      {branch.name} Branch
                    </h2>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-label-sm ${branch.is_active ? 'bg-surface-container text-primary' : 'bg-surface-subtle text-outline'
                        }`}
                    >
                      #BR-{branch.branch_id.toString().padStart(4, '0')}
                    </span>
                  </div>
                </div>

                {/* Key Quick Attributes */}
                <div className="px-space-lg divide-y divide-surface-subtle border-t border-surface-subtle text-body-sm">
                  {/* Status */}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-on-surface-variant">Status</span>
                    <span
                      className={`text-right font-medium flex items-center gap-1.5 ${branch.is_active ? 'text-primary' : 'text-outline'
                        }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? 'bg-primary' : 'bg-outline'}`}
                      />
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Branch Manager */}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-on-surface-variant">Manager</span>
                    <span className="text-right font-medium text-brand-navy-deep truncate max-w-[190px]">
                      {branch.branch_manager_name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-on-surface-variant">Telephone</span>
                    <span className="text-right font-medium font-mono">
                      {formatPhoneNumber(branch.phone_number)}
                    </span>
                  </div>

                  {/* Staff Headcount */}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-on-surface-variant">Staff members</span>
                    <span className="text-right font-medium">
                      {branch.staff_count ?? stats?.total_staff ?? 0} active
                    </span>
                  </div>

                  {/* Classification */}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-on-surface-variant">Facility tier</span>
                    <span className="text-right font-medium">Regional Center</span>
                  </div>
                </div>

                {/* Read-Only Notice Box at Bottom of Aside */}
                <div className="p-space-lg space-y-2 border-t border-surface-subtle bg-surface-subtle/50">
                  <div className="flex items-start gap-2.5 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                      info
                    </span>
                    <p className="text-xs leading-relaxed">
                      All branch specifications and managerial assignments are read-only for Branch Managers.
                    </p>
                  </div>
                </div>
              </aside>

              {/* ── Right Main Column: Structured Details Sections ── */}
              <div className="space-y-space-md min-w-0">
                {/* ── Section 1: Branch Information ── */}
                <section className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                  <div className="px-space-md py-space-sm bg-surface-subtle flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-primary">domain</span>
                      <h2 className="text-headline-sm font-bold">Branch information</h2>
                    </div>
                    <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">
                      Read-only
                    </span>
                  </div>
                  <dl className="divide-y divide-surface-subtle">
                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Branch name</dt>
                      <dd className="text-label-md font-medium text-brand-navy-deep">{branch.name}</dd>
                    </div>

                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Branch code</dt>
                      <dd className="text-label-md font-medium font-mono text-brand-navy-deep">
                        BR-{branch.branch_id.toString().padStart(4, '0')}
                      </dd>
                    </div>

                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Facility ID</dt>
                      <dd className="text-label-md font-medium font-mono text-brand-navy-deep">
                        #{branch.branch_id}
                      </dd>
                    </div>

                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3 items-center">
                      <dt className="text-on-surface-variant text-label-md">Status</dt>
                      <dd className="text-label-md font-medium">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-bold ${branch.is_active
                            ? 'bg-secondary-container text-primary'
                            : 'bg-surface-subtle text-outline'
                            }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? 'bg-primary' : 'bg-outline'
                              }`}
                          />
                          {branch.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </dd>
                    </div>

                  </dl>
                </section>

                {/* ── Section 2: Branch Management & Administration ── */}
                <section className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                  <div className="px-space-md py-space-sm bg-surface-subtle flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-primary">manage_accounts</span>
                      <h2 className="text-headline-sm font-bold">Management & leadership</h2>
                    </div>
                    <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">
                      Read-only
                    </span>
                  </div>
                  <dl className="divide-y divide-surface-subtle">
                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Branch manager</dt>
                      <dd className="text-label-md font-medium text-brand-navy-deep flex items-center gap-2">
                        <span>{branch.branch_manager_name || 'Unassigned'}</span>
                        {isCurrentUserBranchManager && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800">
                            Your Profile
                          </span>
                        )}
                      </dd>
                    </div>

                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Manager User ID</dt>
                      <dd className="text-label-md font-medium font-mono text-brand-navy-deep">
                        {branch.branch_manager_id ? `#${branch.branch_manager_id}` : 'N/A'}
                      </dd>
                    </div>

                  </dl>
                </section>

                {/* ── Section 3: Location & Contact Details ── */}
                <section className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                  <div className="px-space-md py-space-sm bg-surface-subtle flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-primary">contacts</span>
                      <h2 className="text-headline-sm font-bold">Location and contact</h2>
                    </div>
                    <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">
                      Read-only
                    </span>
                  </div>
                  <dl className="divide-y divide-surface-subtle">
                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3 items-center">
                      <dt className="text-on-surface-variant text-label-md">Phone number</dt>
                      <dd className="text-label-md font-medium font-mono text-brand-navy-deep flex items-center justify-between">
                        <span>{formatPhoneNumber(branch.phone_number)}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(branch.phone_number, 'Phone number')}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          <span>Copy</span>
                        </button>
                      </dd>
                    </div>

                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3 items-start">
                      <dt className="text-on-surface-variant text-label-md pt-0.5">Physical address</dt>
                      <dd className="text-label-md font-medium text-brand-navy-deep flex items-start justify-between gap-3">
                        <span className="leading-relaxed">{branch.address}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(branch.address, 'Address')}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0 pt-0.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          <span>Copy</span>
                        </button>
                      </dd>
                    </div>

                  </dl>
                </section>

                {/* ── Section 4: Workforce and Operational Summary ── */}
                <section className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                  <div className="px-space-md py-space-sm bg-surface-subtle flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-primary">badge</span>
                      <h2 className="text-headline-sm font-bold">Operational workforce summary</h2>
                    </div>
                    <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">
                      Read-only
                    </span>
                  </div>
                  <dl className="divide-y divide-surface-subtle">
                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Active staff headcount</dt>
                      <dd className="text-label-md font-medium text-brand-navy-deep">
                        {branch.staff_count ?? stats?.total_staff ?? 0} active members assigned
                      </dd>
                    </div>

                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Medical physicians</dt>
                      <dd className="text-label-md font-medium text-brand-navy-deep">
                        {stats?.total_doctors ?? '—'} doctors rostered for consultation
                      </dd>
                    </div>

                    <div className="grid grid-cols-[180px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant text-label-md">Registered patients</dt>
                      <dd className="text-label-md font-medium text-brand-navy-deep">
                        {stats?.total_patients ?? '—'} active patient records
                      </dd>
                    </div>
                  </dl>
                </section>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BranchDetails;
