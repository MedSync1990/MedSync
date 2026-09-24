import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { InvoiceData } from '../../types/invoiceTypes';
import * as client from '../../api/client';

type PaymentMethod = 'Cash' | 'Card / POS' | 'LankaPay / QR';

const PAYMENT_METHODS: { label: PaymentMethod; icon: string }[] = [
  { label: 'Cash',           icon: 'payments'         },
  { label: 'Card / POS',    icon: 'credit_card'      },
  { label: 'LankaPay / QR', icon: 'account_balance'  },
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CollectPayment() {
  const { invoiceCode: urlCode } = useParams<{ invoiceCode: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(urlCode || '');
  const [recentLookups, setRecentLookups] = useState<{ code: string; name: string }[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card / POS');
  const [amount, setAmount]               = useState('');
  const [txnRef, setTxnRef]               = useState('');
  const [genReceipt, setGenReceipt]       = useState(true);
  const [sendSms, setSendSms]             = useState(true);

  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (urlCode) {
      setSearchQuery(urlCode);
      loadInvoice(urlCode);
    }
  }, [urlCode]);

  const loadInvoice = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoadingInvoice(true);
    setLoadError(null);
    setInvoice(null);
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      const data = await client.get<InvoiceData>(`/invoices/${encodeURIComponent(trimmed)}`, { type: 'invoice' });
      setInvoice(data);
      setAmount(data.outstanding_balance > 0 ? data.outstanding_balance.toFixed(2) : '');
      setRecentLookups((prev) => {
        const next = [{ code: data.invoice_code, name: data.patient_name }, ...prev.filter((r) => r.code !== data.invoice_code)];
        return next.slice(0, 3);
      });
    } catch (e: any) {
      setLoadError(e.message || 'Failed to load invoice.');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/receptionist/collect-payment/${encodeURIComponent(searchQuery.trim())}`);
      loadInvoice(searchQuery.trim());
    }
  };

  const setFullAmount = () => invoice && setAmount(invoice.outstanding_balance.toFixed(2));
  const setHalfAmount = () => invoice && setAmount((invoice.outstanding_balance / 2).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setSubmitError('Please enter a valid amount greater than zero.');
      return;
    }
    if (invoice && numericAmount > invoice.outstanding_balance) {
      setSubmitError(`Amount cannot exceed the outstanding balance of LKR ${fmt(invoice.outstanding_balance)}.`);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await client.post<{ message: string }>(
        `/payments/${encodeURIComponent(invoice!.invoice_code)}`,
        { amount: numericAmount, payment_type: paymentMethod, reference: txnRef || undefined }
      );
      setSuccessMessage(data.message || 'Payment recorded successfully!');
      setTimeout(() => { navigate(`/receptionist/invoices/${invoice!.invoice_code}?type=invoice`); }, 2500);
    } catch (e: unknown) {
      setSubmitError(e instanceof client.ApiError ? e.message : 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBg = (s: string) => {
    if (s === 'Paid') return 'bg-status-completed-bg text-status-completed-text';
    if (s === 'Partially Paid') return 'bg-status-pending-bg text-status-pending-text';
    return 'bg-status-cancelled-bg text-status-cancelled-text';
  };
  const statusDot = (s: string) => {
    if (s === 'Paid') return 'bg-status-completed-text';
    if (s === 'Partially Paid') return 'bg-status-pending-text';
    return 'bg-status-cancelled-text';
  };

  return (
    <div className="flex flex-col w-full px-space-md md:px-space-xl py-space-lg max-w-[1600px] mx-auto space-y-space-lg text-[18px]">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <nav className="flex items-center gap-space-xs text-on-surface-variant text-[16px] mb-1.5">
            <a className="hover:text-primary transition-colors" href="#" onClick={(e) => { e.preventDefault(); navigate('/receptionist/dashboard'); }}>Home</a>
            <span className="text-outline">/</span>
            <span className="text-on-surface-variant">Billing &amp; Payments</span>
            <span className="text-outline">/</span>
            <span className="text-brand-navy-deep font-semibold">Collect Payment</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-[34px] font-extrabold text-brand-navy-deep tracking-tight">Collect Payment</h1>
            <span className="bg-status-scheduled-bg text-status-scheduled-text px-2.5 py-0.5 rounded-full text-[13px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Terminal Ready
            </span>
          </div>
          <p className="text-[18px] text-on-surface-variant mt-0.5">Search an invoice or patient to view balance details and collect payment.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm border border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="collectInvoiceSearch" className="text-[18px] font-bold text-brand-navy-deep flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">manage_search</span>
            <span>Search Invoice Code</span>
          </label>
          <span className="text-outline text-[15px]">Press Enter to search</span>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[22px]">search</span>
            <input
              ref={searchRef}
              id="collectInvoiceSearch"
              type="text"
              className="w-full h-12 pl-12 pr-10 rounded-xl bg-surface-subtle text-brand-navy-deep placeholder:text-outline text-[18px] focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all border border-border-subtle"
              placeholder="Search by Invoice # (e.g. INV-004281), Patient Name, or NIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep"
                onClick={() => { setSearchQuery(''); setInvoice(null); setLoadError(null); searchRef.current?.focus(); }}>
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-[16px] font-bold transition-colors shadow-sm shadow-primary/20">
            <span className="material-symbols-outlined text-[20px]">search</span>
            <span>Search</span>
          </button>
        </form>

        {recentLookups.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[13px] font-bold text-outline uppercase tracking-wider mr-1">Recent Lookups:</span>
            {recentLookups.map((r, i) => (
              <button key={r.code} type="button" onClick={() => { setSearchQuery(r.code); loadInvoice(r.code); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[13px] font-semibold transition-colors ${i === 0 && invoice?.invoice_code === r.code ? 'bg-status-scheduled-bg border border-brand-teal-light/30 text-status-scheduled-text' : 'bg-surface-subtle hover:bg-surface-container-high text-on-surface-variant'}`}>
                <span className="font-bold">{r.code}</span>
                <span>·</span>
                <span>{r.name}</span>
                {i === 0 && invoice?.invoice_code === r.code && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loadingInvoice && (
        <div className="bg-surface-card rounded-2xl border border-border-subtle p-12 text-center flex flex-col items-center gap-4 shadow-sm">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[18px] font-semibold text-brand-navy-deep">Loading invoice...</p>
        </div>
      )}

      {/* Load Error */}
      {loadError && !loadingInvoice && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <span className="material-symbols-outlined text-[42px] text-red-500">error</span>
          <h3 className="text-[20px] font-bold">Could Not Load Invoice</h3>
          <p className="text-[16px]">{loadError}</p>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-emerald-500">check_circle</span>
          <h3 className="text-[22px] font-bold">Payment Recorded!</h3>
          <p className="text-[16px]">{successMessage}</p>
          <p className="text-[14px] text-emerald-600">Redirecting to invoice...</p>
        </div>
      )}

      {/* Empty state */}
      {!invoice && !loadingInvoice && !loadError && !successMessage && (
        <div className="bg-surface-card rounded-2xl border border-dashed border-border-subtle p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[36px]">receipt_long</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-[22px] font-bold text-brand-navy-deep">Search an Invoice to Begin</h3>
            <p className="text-[16px] text-on-surface-variant max-w-md mx-auto">Use the search bar above to find an invoice by invoice number, patient name, or NIC.</p>
          </div>
        </div>
      )}

      {/* Two-column workspace */}
      {invoice && !successMessage && !loadingInvoice && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

          {/* LEFT: Invoice Detail */}
          <div className="lg:col-span-7 space-y-space-md">
            <div className="bg-surface-card rounded-2xl shadow-sm border border-border-subtle overflow-hidden">

              {/* Header bar */}
              <div className="px-space-lg py-3.5 bg-surface-subtle flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[16px] font-bold text-brand-navy-deep">{invoice.invoice_code}</span>
                  </div>
                  <span className="text-outline text-[15px] font-medium">
                    {new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(invoice.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold ${statusBg(invoice.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot(invoice.status)}`} />
                  {invoice.status === 'Unpaid' ? 'Pending Payment' : invoice.status}
                </span>
              </div>

              <div className="p-space-lg space-y-space-lg">

                {/* Patient card */}
                <div className="bg-surface-subtle p-space-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center text-primary text-[18px] font-bold">
                      {initials(invoice.patient_name)}
                    </div>
                    <div>
                      <h3 className="text-[18px] font-bold text-brand-navy-deep leading-tight">{invoice.patient_name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[14px] text-outline">
                        <span className="text-brand-navy-deep font-semibold">{invoice.patient_id}</span>
                        <span>·</span>
                        <span>NIC: <strong className="text-on-surface font-medium">{invoice.patient_nic}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border-subtle">
                    <span className="text-[13px] text-outline uppercase tracking-wider block">Attending Doctor</span>
                    <span className="text-[16px] text-brand-navy-deep font-semibold">{invoice.doctor_name}</span>
                    <span className="text-[11px] text-outline block">{invoice.unit_name}</span>
                  </div>
                </div>

                {/* Itemised Treatment Lines */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold uppercase tracking-wider text-outline">Itemised Treatment Lines</span>
                    <span className="text-[14px] text-outline">{invoice.items.length} Procedure{invoice.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y border border-border-subtle rounded-xl overflow-hidden">
                    {invoice.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-surface-card flex items-center justify-between hover:bg-surface-subtle/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[16px] font-semibold text-brand-navy-deep leading-snug">{item.treatment_name}</span>
                          <span className="text-[14px] text-outline">Code: {item.service_code} · {item.quantity}x</span>
                        </div>
                        <span className="text-[15px] font-semibold text-brand-navy-deep">LKR {fmt(item.total_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial & Insurance Assessment */}
                <div className="bg-surface-subtle p-space-md rounded-xl space-y-2.5 border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold uppercase tracking-wider text-outline">Financial &amp; Insurance Assessment</span>
                    {invoice.insurance_amount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-scheduled-bg text-status-scheduled-text text-[13px] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        {invoice.insurance_percentage}% Covered
                        {invoice.insurance_policy_number && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-card text-primary font-mono-data text-[10px] border border-border-subtle">{invoice.insurance_policy_number}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-[16px] pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Subtotal Bill</span>
                      <span className="text-[15px] font-semibold text-brand-navy-deep">LKR {fmt(invoice.total_amount)}</span>
                    </div>
                    {invoice.insurance_amount > 0 && (
                      <div className="flex items-center justify-between text-status-scheduled-text">
                        <span>Insurance Covered ({invoice.insurance_percentage}%)</span>
                        <span className="text-[15px] font-semibold">- LKR {fmt(invoice.insurance_amount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span>Prior Payments / Deposits</span>
                      <span className="text-[15px]">LKR {fmt(invoice.total_amount - invoice.insurance_amount - invoice.outstanding_balance)}</span>
                    </div>
                    <div className="pt-2.5 mt-2 border-t border-border-subtle flex items-center justify-between">
                      <div>
                        <span className="text-[18px] font-bold text-brand-navy-deep block leading-tight">Net Patient Payable</span>
                        <span className="text-[13px] text-outline">Balance due upon discharge</span>
                      </div>
                      <span className="text-[20px] font-bold text-brand-navy-deep">LKR {fmt(invoice.outstanding_balance)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment history */}
                {invoice.payments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[13px] font-bold uppercase tracking-wider text-outline">Payment History</span>
                    <div className="divide-y border border-border-subtle rounded-xl overflow-hidden">
                      {invoice.payments.map((p, idx) => (
                        <div key={idx} className="p-3 bg-surface-card flex items-center justify-between text-[15px]">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-status-scheduled-text">check_circle</span>
                            <div>
                              <span className="text-[15px] font-medium text-brand-navy-deep">{p.payment_type}</span>
                              <span className="text-[15px] text-outline ml-2">{new Date(p.payment_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className="text-[15px] font-semibold text-status-completed-text">LKR {fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* RIGHT: Payment Terminal */}
          <div className="lg:col-span-5 space-y-space-md">
            <div className="bg-surface-card rounded-2xl shadow-md p-space-lg border border-border-subtle space-y-space-lg relative">

              {/* Outstanding balance highlight */}
              <div className="p-space-md rounded-xl bg-status-scheduled-bg border border-brand-teal-light/30 flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold uppercase tracking-wider text-status-scheduled-text block">Outstanding Balance</span>
                  <span className="text-[32px] font-bold text-brand-navy-deep leading-none">LKR {fmt(invoice.outstanding_balance)}</span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-surface-card flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">payments</span>
                </div>
              </div>

              {invoice.outstanding_balance > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-space-lg">

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-[16px] font-semibold text-brand-navy-deep block">Select Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(({ label, icon }) => (
                        <label key={label} className="cursor-pointer">
                          <input type="radio" name="payMethod" className="peer hidden" checked={paymentMethod === label} onChange={() => setPaymentMethod(label)} />
                          <div className={`h-20 rounded-xl border p-2.5 flex flex-col items-center justify-center gap-1 text-center transition-all ${paymentMethod === label ? 'border-2 border-primary bg-primary/5 text-primary' : 'border-border-subtle text-on-surface-variant hover:bg-surface-subtle'}`}>
                            <span className="material-symbols-outlined text-[22px]">{icon}</span>
                            <span className="text-[13px] font-semibold leading-tight">{label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="amountInput" className="text-[16px] font-semibold text-brand-navy-deep">Amount Received (LKR)</label>
                      <span className="text-outline text-[14px]">Exact balance default</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant text-[15px]">LKR</span>
                      <input
                        id="amountInput"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={invoice.outstanding_balance}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-11 pl-14 pr-4 rounded-xl bg-surface-subtle text-[18px] font-bold text-brand-navy-deep border border-border-subtle focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={setFullAmount} className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[14px] font-semibold border border-primary/20 hover:bg-primary/15 transition-colors">Full: {fmt(invoice.outstanding_balance)}</button>
                      <button type="button" onClick={setHalfAmount} className="px-3 py-1 rounded-lg bg-surface-subtle text-on-surface-variant text-[14px] hover:bg-surface-container-high transition-colors">Half: {fmt(invoice.outstanding_balance / 2)}</button>
                      <button type="button" onClick={() => setAmount('')} className="px-3 py-1 rounded-lg bg-surface-subtle text-on-surface-variant text-[14px] hover:bg-surface-container-high transition-colors">Custom</button>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="space-y-1.5">
                    <label htmlFor="txnRef" className="text-[16px] font-semibold text-brand-navy-deep">Reference / POS Slip No. / Remarks</label>
                    <input
                      id="txnRef"
                      type="text"
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      placeholder="e.g. Visa 4219 – Slip #TXN-99120"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle text-[16px] text-brand-navy-deep border border-border-subtle focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle space-y-2 text-[15px]">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={genReceipt} onChange={(e) => setGenReceipt(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                      <span className="text-[15px] text-brand-navy-deep font-medium">Generate official payment receipt upon confirmation</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                      <span className="text-[15px] text-on-surface-variant">Send SMS confirmation to patient</span>
                    </label>
                  </div>

                  {/* Error */}
                  {submitError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-[15px]">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">error</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="space-y-2 pt-1">
                    <button type="submit" disabled={submitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-[17px] font-extrabold flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed">
                      {submitting ? (
                        <><div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />Processing...</>
                      ) : (
                        <><span className="material-symbols-outlined text-[22px]">check_circle</span><span>Collect Payment (LKR {fmt(parseFloat(amount || '0'))})</span></>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => window.print()}
                        className="flex-1 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep text-[15px] font-semibold border border-border-subtle flex items-center justify-center gap-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">print</span>
                        <span>Print Invoice / Estimate</span>
                      </button>
                      <button type="button" onClick={() => navigate(`/receptionist/invoices/${invoice.invoice_code}?type=invoice`)}
                        className="px-4 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-container text-outline hover:text-brand-navy-deep text-[15px] font-semibold border border-border-subtle transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-3 py-4">
                  <span className="material-symbols-outlined text-[48px] text-emerald-500">check_circle</span>
                  <h3 className="text-[22px] font-bold text-emerald-800">Invoice Fully Settled</h3>
                  <p className="text-[16px] text-emerald-700">There is no outstanding balance on this invoice.</p>
                  <button onClick={() => navigate('/receptionist/invoices')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-[16px] hover:bg-emerald-700 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Back to Invoices
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
