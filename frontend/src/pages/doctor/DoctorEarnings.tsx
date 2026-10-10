import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  getDoctorEarningsOverview,
  getDoctorBankAccounts,
  getDoctorPayoutRequests,
  getDoctorPayouts,
  createDoctorPayoutRequest
} from '../../api';
import type {
  DoctorEarningsOverviewResponse,
  BankAccountItem,
  PayoutRequestItem,
  PayoutHistoryItem
} from '../../api';

export const DoctorEarnings: React.FC = () => {
  const { user } = useAuth();
  
  // UI State
  const [requestAmount, setRequestAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState<number | ''>('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Overview State
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState<DoctorEarningsOverviewResponse | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([]);

  const loadOverviewData = async (isRefresh = false) => {
    if (!user?.id) return;
    if (!isRefresh) setLoadingOverview(true);
    try {
      const [overview, banks, requests, history] = await Promise.all([
        getDoctorEarningsOverview(user.id),
        getDoctorBankAccounts(user.id),
        getDoctorPayoutRequests(user.id),
        getDoctorPayouts(user.id)
      ]);
      setOverviewData(overview);
      setBankAccounts(banks.data);
      setPayoutRequests(requests.data);
      setPayouts(history.data);
      if (banks.data.length > 0 && !bankAccountId) {
        const defaultAccount = banks.data.find(b => b.is_default) || banks.data[0];
        setBankAccountId(defaultAccount.account_id);
      }
    } catch (err: any) {
      console.error('Failed to load overview data', err);
    } finally {
      if (!isRefresh) setLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadOverviewData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestAmount || !bankAccountId) return;
    setRequestError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmPayout = async () => {
    if (!user?.id || !bankAccountId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createDoctorPayoutRequest(user.id, {
        account_id: Number(bankAccountId),
        request_amount: Number(requestAmount)
      });
      setShowConfirmModal(false);
      setShowSuccessAlert(true);
      setRequestAmount('');
      loadOverviewData(true); // Reload data silently
      setTimeout(() => setShowSuccessAlert(false), 5000);
    } catch (err: any) {
      setRequestError(err.message || 'Failed to submit request');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="animate-in fade-in duration-300">
          {loadingOverview ? (
            <div className="py-12 flex justify-center">
              <span className="material-symbols-outlined text-[32px] text-primary">hourglass_empty</span>
            </div>
          ) : (
            <div className="flex flex-col gap-space-md">
              {/* 2. Alert Banner */}
          {showSuccessAlert && (
            <div className="mb-space-md rounded-xl border border-primary/30 bg-primary/10 p-space-sm sm:px-space-md sm:py-space-sm flex items-center justify-between gap-space-sm shadow-xs">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                </div>
                <span className="font-body-sm text-body-sm font-medium text-brand-navy-deep truncate">
                  Payment request submitted successfully. Request ref <strong className="font-mono-data text-brand-navy-deep">#REQ-2026-0902</strong> is currently under administrative audit.
                </span>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-md font-label-sm text-label-sm font-semibold bg-primary/10 text-primary border border-primary/20">
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
                    Rs. {overviewData?.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
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
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="font-display-lg text-display-lg text-status-completed-text font-mono-data font-bold tracking-tight">
                    Rs. {overviewData?.paid_by_hospital.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
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
                    Rs. {overviewData?.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-secondary mt-space-sm leading-relaxed">
                Formula: Total Earned - Paid by Hospital
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
                  <span>Available to Request: <strong className="font-bold text-brand-navy-deep font-mono-data">Rs. {overviewData?.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</strong></span>
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
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(Number(e.target.value))}
                    >
                      <option value="" disabled>Select Bank Account</option>
                      {bankAccounts.map(account => (
                        <option key={account.account_id} value={account.account_id}>
                          {account.bank_name} (Acc: **** {account.account_number.slice(-4)})
                        </option>
                      ))}
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
              <span>Max eligible request: Rs. {overviewData?.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}. Payouts are reviewed and credited within 2 business days.</span>
            </div>
            {requestError && (
              <div className="mt-4 p-3 rounded-lg bg-error-container text-error text-sm">
                {requestError}
              </div>
            )}
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
              <span className="font-label-sm text-label-sm text-secondary self-start sm:self-auto">Showing {payoutRequests.length} requests</span>
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
                  {payoutRequests.map(req => (
                    <tr key={req.request_id} className="hover:bg-surface-subtle/60 transition-colors">
                      <td className="px-space-md py-3.5 whitespace-nowrap font-medium text-brand-navy-deep">{new Date(req.request_date).toLocaleDateString()}</td>
                      <td className="px-space-md py-3.5 whitespace-nowrap font-bold text-brand-navy-deep font-mono-data">Rs. {req.request_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="px-space-md py-3.5 whitespace-nowrap text-center">
                        <span className={`font-semibold ${req.status === 'Paid' ? 'text-brand-navy-deep' : req.status === 'Pending' ? 'text-brand-navy-deep' : 'text-secondary'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5 whitespace-nowrap text-secondary font-medium">{req.processed_date ? new Date(req.processed_date).toLocaleDateString() : '—'}</td>
                      <td className="px-space-md py-3.5 whitespace-nowrap text-secondary">{req.remarks || '—'}</td>
                    </tr>
                  ))}
                  {payoutRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-space-md py-6 text-center text-secondary">No payout requests found</td>
                    </tr>
                  )}
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
                Total Received: <span className="font-bold text-status-completed-text font-mono-data">Rs. {overviewData?.paid_by_hospital.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</span>
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
                  {payouts.map(payment => (
                    <tr key={payment.payout_id} className="hover:bg-surface-subtle/60 transition-colors">
                      <td className="px-space-md py-3.5 whitespace-nowrap font-medium text-brand-navy-deep">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="px-space-md py-3.5 whitespace-nowrap font-bold text-status-completed-text font-mono-data">Rs. {payment.amount_paid.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="px-space-md py-3.5 whitespace-nowrap font-mono-data text-brand-navy-deep">{payment.payment_reference}</td>
                      <td className="px-space-md py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-secondary">
                          <span className="material-symbols-outlined text-[16px]">account_balance</span>
                          <span>{payment.payment_method}</span>
                        </div>
                      </td>
                      <td className="px-space-md py-3.5 whitespace-nowrap text-secondary font-mono-data">{payment.bank_name} •••• {payment.account_number.slice(-4)}</td>
                      <td className="px-space-md py-3.5 whitespace-nowrap text-center">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-subtle hover:bg-surface-card text-brand-navy-deep font-label-sm text-label-sm font-semibold transition-colors"
                          onClick={() => alert(`Downloading remittance slip for ${payment.payment_reference} (PDF)`)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[15px] text-secondary">download</span>
                          <span>Download Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-space-md py-6 text-center text-secondary">No hospital payments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}
        </div>

      {/* Confirmation Dialog for Requests (Only relevant for overview) */}
      {showConfirmModal && (
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
                <span className="font-medium text-brand-navy-deep">{bankAccounts.find(b => b.account_id === bankAccountId)?.bank_name || 'Selected Account'} (Acc: **** {bankAccounts.find(b => b.account_id === bankAccountId)?.account_number.slice(-4)})</span>
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
                disabled={isSubmitting}
                className={`h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
