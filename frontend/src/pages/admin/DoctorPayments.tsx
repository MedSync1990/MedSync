import React, { useState, useEffect, useMemo } from 'react';
import { getAllPayoutRequests, approvePayoutRequest, rejectPayoutRequest } from '../../api/reports';
import { listBranches } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { AdminPayoutRequestItem } from '../../api/reports';
import type { BranchResponse } from '../../api/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) => `LKR ${Math.round(v).toLocaleString('en-US')}`;

function makeInitials(name: string): string {
  const parts = name.replace(/^Dr\.\s*/i, '').split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  Pending:  { label: 'Pending',  bg: 'bg-status-pending-bg',   text: 'text-status-pending-text',   dot: 'bg-status-pending-text'   },
  Approved: { label: 'Approved', bg: 'bg-status-completed-bg', text: 'text-status-completed-text', dot: 'bg-status-completed-text' },
  Rejected: { label: 'Rejected', bg: 'bg-status-cancelled-bg', text: 'text-status-cancelled-text', dot: 'bg-status-cancelled-text' },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: string; icon: string; sub: string }> = ({ label, value, icon, sub }) => (
  <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[110px]">
    <div className="flex items-center justify-between mb-space-sm">
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{label}</span>
      <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
    </div>
    <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{value}</div>
    <div className="font-body-sm text-body-sm text-secondary mt-1">{sub}</div>
  </div>
);

// ─── Review Modal ─────────────────────────────────────────────────────────────

interface ReviewModalProps {
  payout: AdminPayoutRequestItem;
  onClose: () => void;
  onApprove: (note: string) => Promise<void>;
  onReject: (note: string) => Promise<void>;
  saving: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ payout, onClose, onApprove, onReject, saving }) => {
  const [note, setNote] = useState(payout.remarks || '');
  const [err, setErr] = useState('');
  const isPending = payout.status === 'Pending';
  const st = STATUS_CONFIG[payout.status] || STATUS_CONFIG['Pending'];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, saving]);

  const handleApprove = async () => {
    setErr('');
    await onApprove(note);
  };

  const handleReject = async () => {
    if (!note.trim()) { setErr('A reason is required when rejecting a payout.'); return; }
    setErr('');
    await onReject(note.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-navy-deep/40 backdrop-blur-sm flex items-center justify-center p-space-md"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
      role="dialog" aria-modal="true"
    >
      <div className="bg-surface-card rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-space-lg bg-surface-container-low flex items-start justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">request_quote</span>
            </div>
            <div>
              <div className="font-headline-sm text-headline-sm text-on-surface">{payout.doctor_name}</div>
              <div className="font-body-sm text-body-sm text-primary font-medium">{payout.specialty} · {payout.branch_name}</div>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="w-8 h-8 rounded-lg bg-surface-card text-secondary hover:text-on-surface flex items-center justify-center transition-colors" aria-label="Close">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-space-lg flex flex-col gap-space-md overflow-y-auto">
          {/* Request info */}
          <div className="flex flex-col gap-space-xs">
            {[
              { label: 'Request ID', value: `#${payout.request_id}` },
              { label: 'Requested Amount', value: fmt(payout.request_amount) },
              { label: 'Bank', value: `${payout.bank_name} — ${payout.account_number}` },
              { label: 'Requested On', value: new Date(payout.request_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} className="p-space-sm rounded-lg bg-surface-subtle flex items-center justify-between">
                <span className="font-body-sm text-body-sm text-secondary">{label}</span>
                <span className="font-mono-data text-mono-data font-semibold text-on-surface">{value}</span>
              </div>
            ))}
          </div>

          {/* Net payable highlight */}
          <div className="p-space-sm rounded-xl bg-surface-subtle flex items-center justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Requested Payout</span>
              <div className="font-headline-lg text-headline-lg text-primary font-bold">{fmt(payout.request_amount)}</div>
            </div>
            <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm ${st.bg} ${st.text}`}>{st.label}</span>
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="modal-note">
              Remarks{' '}
              <span className="normal-case font-normal text-secondary">
                {isPending ? '(required when rejecting)' : '(recorded)'}
              </span>
            </label>
            <textarea
              id="modal-note"
              rows={3}
              value={note}
              onChange={(e) => { setNote(e.target.value); setErr(''); }}
              readOnly={!isPending}
              placeholder="Add a remark for finance..."
              className="w-full p-space-sm rounded-lg bg-surface-subtle font-body-md text-body-md outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 resize-none transition-all"
            />
            {err && <p className="font-body-sm text-body-sm text-status-cancelled-text">{err}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-space-md bg-surface-container-low flex justify-end gap-space-sm">
          <button onClick={onClose} disabled={saving} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-60">
            Close
          </button>
          {isPending && (
            <>
              <button onClick={handleReject} disabled={saving}
                className="h-10 px-4 rounded-lg bg-status-cancelled-bg text-status-cancelled-text font-label-md text-label-md hover:brightness-95 transition flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[16px]">block</span>}
                Reject
              </button>
              <button onClick={handleApprove} disabled={saving}
                className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                Approve Payout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DoctorPayments: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<AdminPayoutRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reviewTarget, setReviewTarget] = useState<AdminPayoutRequestItem | null>(null);

  useEffect(() => {
    if (user?.role === 'Administrator') {
      listBranches().then(setBranches).catch(() => {});
    }
  }, [user?.role]);

  const fetchData = () => {
    setLoading(true);
    getAllPayoutRequests({ branch: selectedBranch || undefined })
      .then((res) => { setRequests(res.data || []); setLoading(false); })
      .catch(() => { setLoading(false); showToast('Failed to load payout requests.', 'error'); });
  };

  useEffect(() => { fetchData(); }, [selectedBranch]);

  // Filtered
  const visible = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return requests.filter((r) => {
      const statusMatch = statusFilter === 'all' || r.status === statusFilter;
      const nameMatch = !q || r.doctor_name.toLowerCase().includes(q) || r.specialty.toLowerCase().includes(q);
      return statusMatch && nameMatch;
    });
  }, [requests, statusFilter, searchQuery]);

  // KPIs
  const pendingList  = requests.filter((r) => r.status === 'Pending');
  const approvedList = requests.filter((r) => r.status === 'Approved');
  const rejectedList = requests.filter((r) => r.status === 'Rejected');
  const pendingTotal  = pendingList.reduce((s, r)  => s + r.request_amount, 0);
  const approvedTotal = approvedList.reduce((s, r) => s + r.request_amount, 0);
  const totalAmount   = requests.reduce((s, r) => s + r.request_amount, 0);

  // Decide (single)
  const handleApprove = async (requestId: number, note: string) => {
    setSaving(true);
    try {
      await approvePayoutRequest(requestId, note);
      showToast('Payout request approved ✓', 'success');
      setReviewTarget(null);
      fetchData();
    } catch (e: any) {
      showToast(e?.message || 'Failed to approve.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (requestId: number, note: string) => {
    setSaving(true);
    try {
      await rejectPayoutRequest(requestId, note);
      showToast('Payout request rejected ✗', 'error');
      setReviewTarget(null);
      fetchData();
    } catch (e: any) {
      showToast(e?.message || 'Failed to reject.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Bulk approve
  const bulkApprove = async () => {
    setSaving(true);
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => approvePayoutRequest(id, '')));
      showToast(`${ids.length} payout${ids.length !== 1 ? 's' : ''} approved`, 'success');
      setSelected(new Set());
      fetchData();
    } catch {
      showToast('Some approvals failed — please refresh.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Quick approve single
  const quickApprove = async (requestId: number) => {
    setSaving(true);
    try {
      await approvePayoutRequest(requestId, '');
      showToast('Payout approved ✓', 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || 'Failed to approve.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Selection
  const pendingVisible = visible.filter((r) => r.status === 'Pending');
  const allPendingSelected = pendingVisible.length > 0 && pendingVisible.every((r) => selected.has(r.request_id));

  const toggleSelectAll = (checked: boolean) => {
    setSelected((prev) => {
      const s = new Set(prev);
      pendingVisible.forEach((r) => checked ? s.add(r.request_id) : s.delete(r.request_id));
      return s;
    });
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const s = new Set(prev);
      checked ? s.add(id) : s.delete(id);
      return s;
    });
  };

  // Export
  const handleExport = () => {
    const rows = visible.map((r) => ({
      'Request ID': r.request_id,
      Doctor: r.doctor_name,
      Specialty: r.specialty,
      Branch: r.branch_name,
      Bank: r.bank_name,
      Account: r.account_number,
      'Amount (LKR)': r.request_amount,
      Status: r.status,
      'Requested On': new Date(r.request_date).toLocaleDateString(),
      Remarks: r.remarks || '',
    }));
    if (!rows.length) { showToast('No data to export', 'error'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => `"${(row as any)[h]}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'doctor_payout_requests.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Exported as CSV', 'success');
  };

  const resetFilters = () => { setStatusFilter('all'); setSearchQuery(''); };

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Financial Operations</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Doctor Payouts</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Doctor Payment Approval</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Review physician payout requests and approve or reject them before releasing to finance.
          </p>
        </div>

        {/* Branch Scope */}
        {user?.role === 'Administrator' ? (
          <div className="flex items-center gap-space-sm px-space-md py-2 rounded-xl bg-surface-container-low shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
            <div className="flex flex-col">
              <label htmlFor="branch-select" className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Reporting Scope</label>
              <select id="branch-select" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : '')}
                className="bg-transparent font-label-lg text-label-lg text-on-surface outline-none cursor-pointer border-none p-0 focus:ring-0">
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-space-sm px-space-md py-2 rounded-xl bg-surface-container-low shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Reporting Scope</span>
              <span className="font-label-lg text-label-lg text-on-surface">{user?.branchName || 'Assigned Branch'} (Locked)</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md flex-1">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="status-filter">Status</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">fact_check</span>
              <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all">
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="search-doctor">Search Physician</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input id="search-doctor" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by doctor name..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={resetFilters} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>Reset
          </button>
          <button onClick={fetchData} disabled={loading}
            className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[18px]">refresh</span>}
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <KpiCard label="Pending Approval" value={String(pendingList.length)} icon="hourglass_top" sub={`${fmt(pendingTotal)} awaiting`} />
        <KpiCard label="Approved" value={String(approvedList.length)} icon="check_circle" sub={`${fmt(approvedTotal)} released`} />
        <KpiCard label="Rejected" value={String(rejectedList.length)} icon="block" sub="On hold" />
        <KpiCard label="Total Requested" value={fmt(totalAmount)} icon="account_balance_wallet" sub={`${requests.length} request${requests.length !== 1 ? 's' : ''}`} />
      </div>

      {/* Table */}
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Payout Requests</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{visible.length} of {requests.length} request{requests.length !== 1 ? 's' : ''} shown</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button onClick={bulkApprove} disabled={saving} id="bulk-approve-btn"
                className="h-9 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm hover:bg-tertiary transition-colors flex items-center gap-1 disabled:opacity-60">
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                Approve Selected ({selected.size})
              </button>
            )}
            <button onClick={handleExport} id="export-btn"
              className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-space-3xl flex flex-col items-center justify-center gap-space-sm">
              <span className="material-symbols-outlined text-[36px] text-secondary animate-spin">refresh</span>
              <span className="font-body-md text-body-md text-secondary">Loading payout requests…</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-space-3xl px-space-md flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-space-sm">
                <span className="material-symbols-outlined text-[32px]">folder_off</span>
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">No payout requests found.</h4>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">
                Doctors haven't submitted any payout requests yet, or your filters don't match.
              </p>
              <button onClick={resetFilters} className="mt-space-md px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">
                Clear Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="payouts-table">
              <thead>
                <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider h-11">
                  <th className="pl-space-md py-2.5 w-10">
                    <input type="checkbox" checked={allPendingSelected} onChange={(e) => toggleSelectAll(e.target.checked)}
                      disabled={pendingVisible.length === 0} aria-label="Select all pending" className="cursor-pointer" />
                  </th>
                  <th className="px-space-md py-2.5 font-semibold">Doctor</th>
                  <th className="px-space-md py-2.5 font-semibold">Branch</th>
                  <th className="px-space-md py-2.5 font-semibold">Bank Account</th>
                  <th className="px-space-md py-2.5 font-semibold text-right">Requested</th>
                  <th className="px-space-md py-2.5 font-semibold">Date</th>
                  <th className="px-space-md py-2.5 font-semibold text-center">Status</th>
                  <th className="px-space-md py-2.5 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle">
                {visible.map((r) => {
                  const st = STATUS_CONFIG[r.status] || STATUS_CONFIG['Pending'];
                  const isPending = r.status === 'Pending';
                  return (
                    <tr key={r.request_id} className="hover:bg-surface-subtle/70 transition-colors">
                      <td className="pl-space-md py-3.5">
                        {isPending && (
                          <input type="checkbox" checked={selected.has(r.request_id)}
                            onChange={(e) => toggleSelect(r.request_id, e.target.checked)}
                            aria-label={`Select ${r.doctor_name}`} className="cursor-pointer" />
                        )}
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[14px] shrink-0">
                            {makeInitials(r.doctor_name)}
                          </div>
                          <div>
                            <div className="font-label-lg text-label-lg">{r.doctor_name}</div>
                            <div className="font-body-sm text-body-sm text-secondary">{r.specialty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-space-md py-3.5">
                        <span className="font-body-sm text-body-sm text-on-surface">{r.branch_name}</span>
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="font-body-sm text-body-sm text-on-surface">{r.bank_name}</div>
                        <div className="font-mono-data text-mono-data text-secondary text-[12px]">{r.account_number}</div>
                      </td>
                      <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-bold">{fmt(r.request_amount)}</td>
                      <td className="px-space-md py-3.5">
                        <span className="font-body-sm text-body-sm text-on-surface">
                          {new Date(r.request_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${st.bg} ${st.text} font-label-sm text-label-sm`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setReviewTarget(r)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">visibility</span>Review
                          </button>
                          {isPending && (
                            <button onClick={() => quickApprove(r.request_id)} disabled={saving}
                              title={`Quick approve ${r.doctor_name}`} aria-label={`Quick approve ${r.doctor_name}`}
                              className="w-8 h-8 rounded-lg bg-status-completed-bg text-status-completed-text hover:brightness-95 flex items-center justify-center transition-all disabled:opacity-60">
                              <span className="material-symbols-outlined text-[18px]">check</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && visible.length > 0 && (
          <div className="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="text-body-sm font-body-sm text-secondary">
              Showing {visible.length} of {requests.length} request{requests.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Visible Total:</span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">
                {fmt(visible.reduce((s, r) => s + r.request_amount, 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          payout={reviewTarget}
          saving={saving}
          onClose={() => setReviewTarget(null)}
          onApprove={(note) => handleApprove(reviewTarget.request_id, note)}
          onReject={(note) => handleReject(reviewTarget.request_id, note)}
        />
      )}
    </div>
  );
};

export default DoctorPayments;