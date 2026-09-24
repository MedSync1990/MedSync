import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getDoctorItemizedPayments } from '../../api';
import type { ItemizedPaymentResponse } from '../../api';

export const DoctorEarnings: React.FC = () => {
  const { user } = useAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'itemized'>('overview');
  const [requestAmount, setRequestAmount] = useState('30000');
  const [bankAccount, setBankAccount] = useState('Commercial Bank (Acc: **** 5821)');
  const [showSuccessAlert, setShowSuccessAlert] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Itemized Report State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemizedData, setItemizedData] = useState<ItemizedPaymentResponse | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmPayout = () => {
    setShowConfirmModal(false);
    setShowSuccessAlert(true);
  };

  const loadItemizedPayments = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getDoctorItemizedPayments(user.id, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setItemizedData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load itemized payments');
    } finally {
      setLoading(false);
    }
  };

  // Load itemized data when switching to that tab
  useEffect(() => {
    if (activeTab === 'itemized' && !itemizedData) {
      loadItemizedPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  return (
    <div className="flex flex-col w-full pb-space-3xl max-w-content-max-width mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-lg pb-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">Payments & Earnings</h1>
          <p className="font-body-md text-body-md text-secondary mt-0.5">
            View your hospital payments, monthly revenue share, and payout requests
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <button
            className="inline-flex items-center gap-2 px-space-sm py-2 rounded-lg bg-surface-card border border-border-subtle shadow-xs font-label-md text-label-md text-brand-navy-deep hover:bg-surface-subtle transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">calendar_today</span>
            <span>This Month (Sep 2026)</span>
            <span className="material-symbols-outlined text-[18px] text-secondary -mr-0.5">expand_more</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle mb-space-lg">
        <button
          className={`pb-2 font-label-md text-[16px] transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-brand-navy-deep'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview & Payouts
        </button>
        <button
          className={`pb-2 font-label-md text-[16px] transition-colors border-b-2 ${
            activeTab === 'itemized'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-brand-navy-deep'
          }`}
          onClick={() => setActiveTab('itemized')}
        >
          Itemized Payments
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="animate-in fade-in duration-300">
          {/* 2. Alert Banner */}
          {showSuccessAlert && (
            <div className="mb-space-md rounded-xl border border-status-completed-text/30 bg-status-completed-bg/70 p-space-sm sm:px-space-md sm:py-space-sm flex items-center justify-between gap-space-sm shadow-xs">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-6 h-6 rounded-full bg-status-completed-text text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                </div>
                <span className="font-body-sm text-body-sm font-medium text-brand-navy-deep truncate">
                  Payment request submitted successfully. Request ref <strong className="font-mono-data text-brand-navy-deep">#REQ-2026-0902</strong> is currently under administrative audit.
                </span>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-md font-label-sm text-label-sm font-semibold bg-status-completed-bg text-status-completed-text border border-status-completed-text/20">
                Pending Approval
              </span>
            </div>
          )}

          {/* 3. Top 3 Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-md">
            {/* Card 1: TOTAL EARNED */}
            <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs flex flex-col justify-between relative">
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-label-sm text-label-sm text-secondary tracking-wider uppercase">TOTAL EARNED</span>
                  <div className="w-9 h-9 rounded-lg bg-surface-subtle flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="font-display-lg text-display-lg text-brand-navy-deep font-mono-data font-bold tracking-tight">
                    Rs. 185,000
                  </span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-secondary mt-space-sm leading-relaxed">
                Cumulative earned from completed consultations & services
              </p>
            </div>

            {/* Card 2: PAID BY HOSPITAL */}
            <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs flex flex-col justify-between relative">
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-label-sm text-label-sm text-secondary tracking-wider uppercase">PAID BY HOSPITAL</span>
                  <div className="w-9 h-9 rounded-lg bg-status-completed-bg flex items-center justify-center text-status-completed-text">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="font-display-lg text-display-lg text-status-completed-text font-mono-data font-bold tracking-tight">
                    Rs. 140,000
                  </span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-secondary mt-space-sm leading-relaxed">
                Successfully disbursed to registered bank account
              </p>
            </div>

            {/* Card 3: OUTSTANDING */}
            <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs flex flex-col justify-between relative">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-secondary tracking-wider uppercase">OUTSTANDING</span>
                    <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-scheduled-bg text-status-scheduled-text border border-status-scheduled-bg">
                      Available
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-status-scheduled-bg flex items-center justify-center text-status-scheduled-text">
                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="font-display-lg text-display-lg text-primary font-mono-data font-bold tracking-tight">
                    Rs. 45,000
                  </span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-secondary mt-space-sm leading-relaxed">
                Formula: Total Earned (Rs. 185,000) - Paid by Hospital (Rs. 140,000)
              </p>
            </div>
          </div>

          {/* 4. Request Payment Card */}
          <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md sm:p-space-lg shadow-xs mb-space-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-brand-navy-deep">Request Payment</h2>
                <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                  Submit an on-demand payout request to the hospital accounts department
                </p>
              </div>
              <div className="self-start sm:self-auto">
                <div className="inline-flex items-center gap-2 px-space-sm py-1.5 rounded-lg border border-border-subtle bg-status-scheduled-bg text-status-scheduled-text font-label-md text-label-md shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                  <span>Available to Request: <strong className="font-bold text-brand-navy-deep font-mono-data">Rs. 45,000</strong></span>
                </div>
              </div>
            </div>

            <form className="pt-space-md" onSubmit={handleOpenConfirm}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-end">
                <div className="md:col-span-4">
                  <label className="block font-label-sm text-label-sm text-brand-navy-deep mb-1.5" htmlFor="requestAmount">
                    Request Amount (LKR) *
                  </label>
                  <input
                    className="w-full h-11 px-3.5 rounded-lg bg-surface-subtle border border-border-subtle font-mono-data text-mono-data font-semibold text-brand-navy-deep placeholder-secondary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    id="requestAmount"
                    type="number"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="block font-label-sm text-label-sm text-brand-navy-deep mb-1.5" htmlFor="bankAccountSelect">
                    Destination Bank Account *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
                      <span className="material-symbols-outlined text-[18px]">account_balance</span>
                    </div>
                    <select
                      className="w-full h-11 pl-10 pr-9 rounded-lg bg-surface-subtle border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all appearance-none cursor-pointer"
                      id="bankAccountSelect"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                    >
                      <option>Commercial Bank (Acc: **** 5821)</option>
                      <option>Sampath Bank (Acc: **** 9044)</option>
                      <option>Hatton National Bank (Acc: **** 1120)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-secondary">
                      <span className="material-symbols-outlined text-[18px]">unfold_more</span>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-3">
                  <button
                    className="w-full h-11 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-[0.99]"
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Request Payment</span>
                  </button>
                </div>
              </div>
            </form>
            <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-secondary mt-space-sm pt-1">
              <span className="material-symbols-outlined text-[15px]">info</span>
              <span>Max eligible request: Rs. 45,000. Payouts are reviewed and credited within 2 business days.</span>
            </div>
          </div>

          {/* 5. Payment Requests Table */}
          <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden mb-space-lg">
            <div className="px-space-md py-space-sm border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep">Payment Requests</h3>
                <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                  Doctor-initiated payout requests awaiting hospital approval or disbursement
                </p>
              </div>
              <span className="font-label-sm text-label-sm text-secondary self-start sm:self-auto">Showing 3 requests</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-subtle font-label-sm text-label-sm text-secondary uppercase tracking-wider h-10">
                    <th className="px-space-md py-2.5">REQUEST DATE</th>
                    <th className="px-space-md py-2.5">REQUESTED AMOUNT</th>
                    <th className="px-space-md py-2.5 text-center">STATUS</th>
                    <th className="px-space-md py-2.5">PROCESSED DATE</th>
                    <th className="px-space-md py-2.5">REMARKS / NOTES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm text-brand-navy-deep">
                  <tr className="hover:bg-surface-subtle/60 transition-colors">
                    <td className="px-space-md py-3.5 whitespace-nowrap font-medium text-brand-navy-deep">02 Sep 2026</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap font-bold text-brand-navy-deep font-mono-data">Rs. 20,000</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-pending-bg text-status-pending-text border border-status-pending-bg">
                        Pending
                      </span>
                    </td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary">—</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary">Monthly consultation payout</td>
                  </tr>
                  <tr className="hover:bg-surface-subtle/60 transition-colors">
                    <td className="px-space-md py-3.5 whitespace-nowrap font-medium text-brand-navy-deep">15 Aug 2026</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap font-bold text-brand-navy-deep font-mono-data">Rs. 25,000</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-completed-bg text-status-completed-text border border-status-completed-bg">
                        Paid
                      </span>
                    </td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary font-medium">20 Aug 2026</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary">Bi-weekly OPD disbursement</td>
                  </tr>
                  <tr className="hover:bg-surface-subtle/60 transition-colors">
                    <td className="px-space-md py-3.5 whitespace-nowrap font-medium text-brand-navy-deep">01 Aug 2026</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap font-bold text-brand-navy-deep font-mono-data">Rs. 25,000</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-completed-bg text-status-completed-text border border-status-completed-bg">
                        Paid
                      </span>
                    </td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary font-medium">05 Aug 2026</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary">Ward rounds & emergency procedures</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Hospital Payment History Table */}
          <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden">
            <div className="px-space-md py-space-sm border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep">Hospital Payment History</h3>
                <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                  Record of disbursements made directly to your registered bank account
                </p>
              </div>
              <div className="font-label-md text-label-md text-secondary self-start sm:self-auto">
                Total Received: <span className="font-bold text-status-completed-text font-mono-data">Rs. 140,000</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-subtle font-label-sm text-label-sm text-secondary uppercase tracking-wider h-10">
                    <th className="px-space-md py-2.5">PAYMENT DATE</th>
                    <th className="px-space-md py-2.5">AMOUNT PAID</th>
                    <th className="px-space-md py-2.5">PAYMENT REFERENCE</th>
                    <th className="px-space-md py-2.5">PAYMENT METHOD</th>
                    <th className="px-space-md py-2.5">BANK ACCOUNT / DESTINATION</th>
                    <th className="px-space-md py-2.5 text-center">RECEIPT / ADVICE ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm text-brand-navy-deep">
                  <tr className="hover:bg-surface-subtle/60 transition-colors">
                    <td className="px-space-md py-3.5 whitespace-nowrap font-medium text-brand-navy-deep">20 Aug 2026</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap font-bold text-status-completed-text font-mono-data">Rs. 25,000</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap font-mono-data text-brand-navy-deep">PAY-00482</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-secondary">
                        <span className="material-symbols-outlined text-[16px]">account_balance</span>
                        <span>Bank Transfer</span>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary font-mono-data">Commercial Bank •••• 5821</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-center">
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle hover:bg-surface-card text-brand-navy-deep font-label-sm text-label-sm font-semibold transition-colors"
                        onClick={() => alert('Downloading remittance slip for PAY-00482 (PDF)')}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px] text-secondary">download</span>
                        <span>Download Slip</span>
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-subtle/60 transition-colors">
                    <td className="px-space-md py-3.5 whitespace-nowrap font-medium text-brand-navy-deep">05 Aug 2026</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap font-bold text-status-completed-text font-mono-data">Rs. 25,000</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap font-mono-data text-brand-navy-deep">PAY-00391</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-secondary">
                        <span className="material-symbols-outlined text-[16px]">account_balance</span>
                        <span>Bank Transfer</span>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-secondary font-mono-data">Commercial Bank •••• 5821</td>
                    <td className="px-space-md py-3.5 whitespace-nowrap text-center">
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle hover:bg-surface-card text-brand-navy-deep font-label-sm text-label-sm font-semibold transition-colors"
                        onClick={() => alert('Downloading remittance slip for PAY-00391 (PDF)')}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[15px] text-secondary">download</span>
                        <span>Download Slip</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'itemized' && (
        <div className="animate-in fade-in duration-300">
          <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden">
            {/* Filter Bar for Itemized Report */}
            <div className="p-space-md border-b border-border-subtle flex flex-col sm:flex-row items-end gap-space-md bg-surface-subtle/30">
              <div className="flex-1 w-full sm:w-auto">
                <label className="block font-label-sm text-secondary mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-brand-navy-deep focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <label className="block font-label-sm text-secondary mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-brand-navy-deep focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <button
                onClick={loadItemizedPayments}
                className="h-10 px-6 rounded-lg bg-primary hover:bg-primary-container text-white font-label-md transition-colors w-full sm:w-auto shrink-0"
                type="button"
              >
                Apply Filters
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-body-lg text-brand-navy-deep">Loading payments...</p>
              </div>
            ) : error ? (
              <div className="bg-error-container/50 border border-error/20 text-error rounded-xl m-4 p-6 text-center shadow-sm">
                <span className="material-symbols-outlined text-[32px] mb-2">error</span>
                <p className="font-body-md">{error}</p>
              </div>
            ) : itemizedData?.data.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[36px]">search_off</span>
                </div>
                <h3 className="font-headline-sm text-brand-navy-deep">No payments found</h3>
                <p className="font-body-md text-on-surface-variant">Try adjusting your date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-border-subtle">
                      <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Date</th>
                      <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Patient Name</th>
                      <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Invoice ID</th>
                      <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Amount (LKR)</th>
                      <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Running Total (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {itemizedData?.data.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-3 px-space-md font-body-sm text-on-surface-variant">
                          {new Date(item.payment_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-space-md font-body-sm text-brand-navy-deep font-medium">{item.patient_name}</td>
                        <td className="py-3 px-space-md font-mono-data text-secondary text-sm">#{item.invoice_id}</td>
                        <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right">
                          {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-space-md font-mono-data text-primary text-right font-medium">
                          {item.running_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Requests (Only relevant for overview) */}
      {showConfirmModal && activeTab === 'overview' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy-deep/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-xl max-w-md w-full p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-status-scheduled-bg text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">Confirm Payout Request</h3>
                <p className="font-body-sm text-body-sm text-secondary">Hospital Accounts Department</p>
              </div>
            </div>
            <div className="bg-surface-subtle p-space-sm rounded-xl border border-border-subtle space-y-1">
              <div className="flex justify-between font-body-sm text-body-sm">
                <span className="text-secondary">Amount:</span>
                <span className="font-mono-data font-bold text-brand-navy-deep">
                  LKR {Number(requestAmount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-body-sm text-body-sm">
                <span className="text-secondary">Account:</span>
                <span className="font-medium text-brand-navy-deep">{bankAccount}</span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">
              Are you sure you want to submit this payout request for administrative audit?
            </p>
            <div className="flex items-center justify-end gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="h-10 px-4 rounded-lg border border-border-subtle bg-surface-card text-brand-navy-deep font-label-md text-label-md hover:bg-surface-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayout}
                className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
