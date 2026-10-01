import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-space-md sm:px-space-lg lg:px-space-xl py-space-lg space-y-space-xl">

      {/* Page header / breadcrumb */}
      <div className="flex flex-col gap-1 pb-space-xs">
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider"
        >
          <Link
            to="/receptionist/dashboard"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">home</span>
            <span>Home</span>
          </Link>
          <span className="text-outline/50">/</span>
          <span>Billing &amp; Payments</span>
          <span className="text-outline/50">/</span>
          <span className="text-primary font-bold">Collect Payment</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md mt-1">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">
                Collect Payment
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Terminal Ready
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Search an invoice or patient to view balance details and collect payment.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar Card */}
      <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-md">
        <div className="flex items-center justify-between">
          <label htmlFor="collectInvoiceSearch" className="font-label-lg text-label-lg text-brand-navy-deep flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">manage_search</span>
            <span>Search Invoice Code</span>
          </label>
          <span className="font-body-sm text-body-sm text-outline">Press Enter to search</span>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">search</span>
            <input
              ref={searchRef}
              id="collectInvoiceSearch"
              type="text"
              className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-10 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
              placeholder="Search by Invoice # (e.g. INV-004281), Patient Name, or NIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep transition-colors cursor-pointer"
                onClick={() => { setSearchQuery(''); setInvoice(null); setLoadError(null); searchRef.current?.focus(); }}>
                <span className="material-symbols-outlined text-[20px]">cancel</span>
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-[42px] px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
            <span>Search</span>
          </button>
        </form>

        {recentLookups.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider mr-1">Recent Lookups:</span>
            {recentLookups.map((r, i) => (
              <button key={r.code} type="button" onClick={() => { setSearchQuery(r.code); loadInvoice(r.code); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-colors cursor-pointer ${i === 0 && invoice?.invoice_code === r.code ? 'bg-status-scheduled-bg border border-brand-teal-light/30 text-status-scheduled-text' : 'bg-surface-subtle hover:bg-surface-container-high text-on-surface-variant'}`}>
                <span className="font-bold">{r.code}</span>
                <span>·</span>
                <span>{r.name}</span>
                {i === 0 && invoice?.invoice_code === r.code && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loadingInvoice && (
        <div className="bg-surface-card rounded-xl shadow-sm p-space-xl text-center flex flex-col items-center justify-center space-y-space-md">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-label-lg text-label-lg text-brand-navy-deep">Loading invoice…</p>
        </div>
      )}

      {/* Load Error */}
      {loadError && !loadingInvoice && (
        <div
          role="alert"
          className="bg-surface-card rounded-xl border border-error/20 shadow-sm p-space-xl text-center flex flex-col items-center justify-center space-y-space-md"
        >
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-error">error</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-headline-md text-headline-md text-error">Could Not Load Invoice</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">{loadError}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="bg-surface-card rounded-xl shadow-sm border border-status-completed-text/20 p-space-xl text-center flex flex-col items-center justify-center space-y-space-md">
          <div className="w-16 h-16 rounded-full bg-status-completed-bg flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px] text-status-completed-text">check_circle</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-headline-md text-headline-md text-brand-navy-deep">Payment Recorded!</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">{successMessage}</p>
          </div>
          <p className="font-body-sm text-body-sm text-status-completed-text">Redirecting to invoice…</p>
        </div>
      )}

      {/* Empty state */}
      {!invoice && !loadingInvoice && !loadError && !successMessage && (
        <div className="bg-surface-card rounded-xl border border-dashed border-border-subtle p-space-xl text-center flex flex-col items-center justify-center space-y-space-md shadow-sm">
          <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[36px]">receipt_long</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-headline-md text-headline-md text-brand-navy-deep">Search an Invoice to Begin</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
              Use the search bar above to find an invoice by invoice number, patient name, or NIC.
            </p>
          </div>
        </div>
      )}

      {/* Two-column workspace */}
      {invoice && !successMessage && !loadingInvoice && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

          {/* LEFT: Invoice Detail */}
          <div className="lg:col-span-7 space-y-space-md">
            <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">

              {/* Header bar */}
              <div className="px-space-lg py-3.5 bg-surface-subtle flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="font-mono-data text-mono-data font-bold text-brand-navy-deep">{invoice.invoice_code}</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-outline">
                    {new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(invoice.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm font-bold ${statusBg(invoice.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot(invoice.status)}`} />
                  {invoice.status === 'Unpaid' ? 'Pending Payment' : invoice.status}
                </span>
              </div>

              <div className="p-space-lg space-y-space-lg">

                {/* Patient card */}
                <div className="bg-surface-subtle p-space-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-label-lg text-label-lg font-bold">
                      {initials(invoice.patient_name)}
                    </div>
                    <div>
                      <h3 className="font-label-lg text-label-lg font-bold text-brand-navy-deep leading-tight">{invoice.patient_name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 font-body-sm text-body-sm text-outline">
                        <span className="text-brand-navy-deep font-semibold">{invoice.patient_id}</span>
                        <span>·</span>
                        <span>NIC: <strong className="text-on-surface font-medium">{invoice.patient_nic}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border-subtle">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">Attending Doctor</span>
                    <span className="font-label-md text-label-md text-brand-navy-deep font-semibold">{invoice.doctor_name}</span>
                    <span className="font-body-sm text-body-sm text-outline block">{invoice.unit_name}</span>
                  </div>
                </div>

                {/* Itemised Treatment Lines */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-outline">Itemised Treatment Lines</span>
                    <span className="font-body-sm text-body-sm text-outline">{invoice.items.length} Procedure{invoice.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y border border-border-subtle rounded-xl overflow-hidden">
                    {invoice.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-surface-card flex items-center justify-between hover:bg-surface-subtle/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md font-semibold text-brand-navy-deep leading-snug">{item.treatment_name}</span>
                          <span className="font-body-sm text-body-sm text-outline">Code: {item.service_code} · {item.quantity}x</span>
                        </div>
                        <span className="font-mono-data text-mono-data font-semibold text-brand-navy-deep">LKR {fmt(item.total_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial & Insurance Assessment */}
                <div className="bg-surface-subtle p-space-md rounded-xl space-y-2.5 border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-outline">Financial &amp; Insurance Assessment</span>
                    {invoice.insurance_amount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        {invoice.insurance_percentage}% Covered
                        {invoice.insurance_policy_number && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-card text-primary font-mono-data text-[10px] border border-border-subtle">{invoice.insurance_policy_number}</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 font-body-sm text-body-sm pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Subtotal Bill</span>
                      <span className="font-mono-data text-mono-data font-semibold text-brand-navy-deep">LKR {fmt(invoice.total_amount)}</span>
                    </div>
                    {invoice.insurance_amount > 0 && (
                      <div className="flex items-center justify-between text-status-scheduled-text">
                        <span>Insurance Covered ({invoice.insurance_percentage}%)</span>
                        <span className="font-mono-data text-mono-data font-semibold">- LKR {fmt(invoice.insurance_amount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span>Prior Payments / Deposits</span>
                      <span className="font-mono-data text-mono-data">LKR {fmt(invoice.total_amount - invoice.insurance_amount - invoice.outstanding_balance)}</span>
                    </div>
                    <div className="pt-2.5 mt-2 border-t border-border-subtle flex items-center justify-between">
                      <div>
                        <span className="font-label-lg text-label-lg font-bold text-brand-navy-deep block leading-tight">Net Patient Payable</span>
                        <span className="font-body-sm text-body-sm text-outline">Balance due upon discharge</span>
                      </div>
                      <span className="font-headline-md text-headline-md font-bold text-brand-navy-deep">LKR {fmt(invoice.outstanding_balance)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment history */}
                {invoice.payments.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-outline">Payment History</span>
                    <div className="divide-y border border-border-subtle rounded-xl overflow-hidden">
                      {invoice.payments.map((p, idx) => (
                        <div key={idx} className="p-3 bg-surface-card flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-status-scheduled-text">check_circle</span>
                            <div>
                              <span className="font-label-md text-label-md font-medium text-brand-navy-deep">{p.payment_type}</span>
                              <span className="font-body-sm text-body-sm text-outline ml-2">{new Date(p.payment_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className="font-mono-data text-mono-data font-semibold text-status-completed-text">LKR {fmt(p.amount)}</span>
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
            <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">

              {/* Outstanding balance highlight */}
              <div className="p-space-md rounded-xl bg-status-scheduled-bg border border-brand-teal-light/30 flex items-center justify-between">
                <div>
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-status-scheduled-text block">Outstanding Balance</span>
                  <span className="font-display-lg text-display-lg font-bold text-brand-navy-deep leading-none">LKR {fmt(invoice.outstanding_balance)}</span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-surface-card flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">payments</span>
                </div>
              </div>

              {invoice.outstanding_balance > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-space-lg">

                  {/* Payment Method */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-lg text-label-lg text-brand-navy-deep">Select Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(({ label, icon }) => (
                        <label key={label} className="cursor-pointer">
                          <input type="radio" name="payMethod" className="peer hidden" checked={paymentMethod === label} onChange={() => setPaymentMethod(label)} />
                          <div className={`h-20 rounded-xl border p-2.5 flex flex-col items-center justify-center gap-1 text-center transition-all ${paymentMethod === label ? 'border-2 border-primary bg-primary/5 text-primary' : 'border-border-subtle text-on-surface-variant hover:bg-surface-subtle'}`}>
                            <span className="material-symbols-outlined text-[22px]">{icon}</span>
                            <span className="font-label-sm text-label-sm font-semibold leading-tight">{label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="amountInput" className="font-label-lg text-label-lg text-brand-navy-deep">
                        Amount Received (LKR) <span className="text-error font-bold">*</span>
                      </label>
                      <span className="font-body-sm text-body-sm text-outline">Exact balance default</span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 font-mono-data text-mono-data font-semibold text-outline select-none">LKR</span>
                      <input
                        id="amountInput"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={invoice.outstanding_balance}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-14 pr-4 font-mono-data text-mono-data font-bold text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={setFullAmount}
                        className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-label-sm text-label-sm font-semibold border border-primary/20 hover:bg-primary/15 transition-colors cursor-pointer">
                        Full: {fmt(invoice.outstanding_balance)}
                      </button>
                      <button type="button" onClick={setHalfAmount}
                        className="px-3 py-1 rounded-lg bg-surface-subtle text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container-high transition-colors cursor-pointer">
                        Half: {fmt(invoice.outstanding_balance / 2)}
                      </button>
                      <button type="button" onClick={() => setAmount('')}
                        className="px-3 py-1 rounded-lg bg-surface-subtle text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container-high transition-colors cursor-pointer">
                        Custom
                      </button>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="txnRef" className="font-label-lg text-label-lg text-brand-navy-deep">
                      Reference / POS Slip No. / Remarks
                    </label>
                    <input
                      id="txnRef"
                      type="text"
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      placeholder="e.g. Visa 4219 – Slip #TXN-99120"
                      className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg px-3.5 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="p-space-md bg-surface-subtle rounded-xl border border-border-subtle space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={genReceipt} onChange={(e) => setGenReceipt(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                      <span className="font-label-md text-label-md text-brand-navy-deep">Generate official payment receipt upon confirmation</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Send SMS confirmation to patient</span>
                    </label>
                  </div>

                  {/* Error */}
                  {submitError && (
                    <div role="alert" className="rounded-xl border border-error/20 bg-error-container px-space-lg py-3 text-error font-label-md text-label-md flex items-start gap-2">
                      <span className="material-symbols-outlined text-[20px] mt-0.5">error</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="space-y-2 pt-1">
                    <button type="submit" disabled={submitting}
                      className="w-full h-[42px] px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed">
                      {submitting ? (
                        <><div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />Processing…</>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">check_circle</span>
                          <span>Collect Payment (LKR {fmt(parseFloat(amount || '0'))})</span>
                        </>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => window.print()}
                        className="flex-1 h-[42px] rounded-lg border border-outline-variant bg-transparent hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">print</span>
                        <span>Print Invoice / Estimate</span>
                      </button>
                      <button type="button" onClick={() => navigate(`/receptionist/invoices/${invoice.invoice_code}?type=invoice`)}
                        className="h-[42px] px-5 rounded-lg border border-outline-variant bg-transparent hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md transition-colors cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-space-md py-space-md">
                  <div className="w-16 h-16 rounded-full bg-status-completed-bg text-status-completed-text flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[36px]">check_circle</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline-md text-headline-md text-brand-navy-deep">Invoice Fully Settled</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">There is no outstanding balance on this invoice.</p>
                  </div>
                  <button onClick={() => navigate('/receptionist/invoices')}
                    className="inline-flex items-center gap-2 h-[42px] px-5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
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
