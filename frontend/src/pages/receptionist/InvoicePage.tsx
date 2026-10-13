import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import InvoiceDetails from '../../components/invoices/InvoiceDetails';
import InvoiceSearch from '../../components/invoices/InvoiceSearch';
import type { InvoiceData, RecentInvoiceItem } from '../../types/invoiceTypes';

const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
const API_BASE_URL = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;

export default function InvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = invoiceId || searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const urlSearchType = searchParams.get('type');

  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (!invoiceId && querySearch) {
      navigate(`/receptionist/invoices/${encodeURIComponent(querySearch)}?type=all`, {
        replace: true,
      });
      return;
    }

    setSearchQuery(invoiceId || '');
    if (invoiceId) {
      fetchInvoiceDetail(invoiceId);
    } else {
      setInvoiceData(null);
      setError(null);
      fetchRecentInvoices(statusFilter);
    }
  }, [invoiceId, urlSearchType, searchParams, navigate, statusFilter]);

  const fetchRecentInvoices = async (filter: 'all' | 'unpaid' | 'paid' = statusFilter) => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/recent?status=${filter}&limit=25`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRecentInvoices(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch recent invoices', e);
    }
  };

  const fetchInvoiceDetail = async (identifier: string) => {
    setLoading(true);
    setError(null);
    try {
      const type = searchParams.get('type') || 'all';
      const response = await fetch(`${API_BASE_URL}/invoices/${encodeURIComponent(identifier)}?type=${type}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        let errorMessage = errorJson.message;
        if (!errorMessage && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) errorMessage = errorJson.errors[0].message;
        throw new Error(errorMessage || `Invoice '${identifier}' not found.`);
      }
      const data: InvoiceData = await response.json();
      setInvoiceData(data);
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to fetch invoice details.');
      setInvoiceData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const identifier = searchQuery.trim();
    if (identifier) {
      navigate(`/receptionist/invoices/${encodeURIComponent(identifier)}?type=all`);
    }
  };

  // When "Record Payment" is clicked, navigate to the Collect Payment page
  // passing the invoice code in the URL so that page can pre-load the invoice.
  const handleRecordPayment = (invoiceCode: string) => {
    navigate(`/receptionist/collect-payment/${encodeURIComponent(invoiceCode)}`);
  };

  return (
    <div className="flex flex-col w-full pt-space-lg pb-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline uppercase tracking-wider">
            <Link to="/receptionist/dashboard" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-outline">Billing &amp; Payments</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Invoices</span>
          </div>

          {/* Title */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight font-bold">
              Invoices
            </h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Search and view invoice details and treatment breakdowns.
          </p>
        </div>
      </div>

      {/* Search Console */}
      <InvoiceSearch
        searchQuery={searchQuery}
        invoiceId={invoiceId}
        onSearchQueryChange={setSearchQuery}
        onSubmit={handleSearchSubmit}
        onQuickLookup={() => navigate('/receptionist/invoices/2')}
      />

      {/* Content Area */}
      <div className="w-full">
        {!invoiceId ? (
          <div className="w-full">
            <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
              {/* Section header with status filter tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-space-lg sm:p-space-xl pb-space-md border-b border-border-subtle/50">
                <div className="flex items-center gap-space-md">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">
                      {statusFilter === 'all'
                        ? 'Recent Invoices'
                        : statusFilter === 'paid'
                          ? 'Recent Paid Invoices'
                          : 'Recent Unpaid Invoices'}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      {statusFilter === 'all'
                        ? 'Recent billing invoices and payment statuses'
                        : statusFilter === 'paid'
                          ? 'Settled invoices with completed payments'
                          : 'Invoices with outstanding balances awaiting payment'}
                    </p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="inline-flex p-1 bg-surface-subtle rounded-lg border border-border-subtle self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-surface-card text-primary font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-brand-navy-deep'
                    }`}
                  >
                    All Invoices
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('unpaid')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-all cursor-pointer ${
                      statusFilter === 'unpaid'
                        ? 'bg-surface-card text-primary font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-brand-navy-deep'
                    }`}
                  >
                    Unpaid
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('paid')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-all cursor-pointer ${
                      statusFilter === 'paid'
                        ? 'bg-surface-card text-primary font-semibold shadow-xs'
                        : 'text-on-surface-variant hover:text-brand-navy-deep'
                    }`}
                  >
                    Paid
                  </button>
                </div>
              </div>

              {recentInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-subtle">
                        <th className="px-6 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Invoice Number</th>
                        <th className="px-6 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Amount</th>
                        <th className="px-6 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-right">Outstanding</th>
                        <th className="px-6 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {recentInvoices.map((inv) => (
                        <tr key={inv.invoice_code} className="hover:bg-surface-subtle transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-body-sm text-body-sm text-on-surface-variant">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono-data text-mono-data font-semibold text-brand-navy-deep">
                            {inv.invoice_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-body-md text-body-md text-brand-navy-deep">
                            {inv.patient_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-mono-data text-mono-data text-brand-navy-deep">
                            Rs. {inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-mono-data text-mono-data font-semibold text-status-cancelled-text">
                            Rs. {inv.outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full font-label-sm text-label-sm font-bold ${
                                inv.status === 'Paid'
                                  ? 'bg-status-completed-bg text-status-completed-text'
                                  : inv.status === 'Unpaid'
                                    ? 'bg-status-cancelled-bg text-status-cancelled-text'
                                    : 'bg-status-scheduled-bg text-status-scheduled-text'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => navigate(`/receptionist/invoices/${inv.invoice_code}?type=invoice`)}
                              className="text-primary hover:text-primary-container font-label-md text-label-md inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>View</span>
                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-space-xl text-center flex flex-col items-center justify-center space-y-space-sm">
                  <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[28px]">receipt_long</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep">
                    No {statusFilter === 'all' ? '' : statusFilter} invoices found
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                    {statusFilter === 'all'
                      ? 'No recent invoices were found in the system.'
                      : `There are currently no recent ${statusFilter} invoices recorded.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
          /* Loading state — matches UI guidelines §5 */
          <div className="bg-surface-card rounded-xl shadow-sm p-space-xl text-center flex flex-col items-center justify-center space-y-space-md">
            <span className="material-symbols-outlined text-[32px] text-primary">hourglass_empty</span>
            <p className="font-label-lg text-label-lg text-brand-navy-deep">
              Loading invoice details…
            </p>
          </div>
        ) : error ? (
          /* Error state — matches UI guidelines §5 */
          <div
            role="alert"
            className="bg-surface-card rounded-xl border border-error/20 shadow-sm p-space-xl text-center flex flex-col items-center justify-center space-y-space-md"
          >
            <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-error">error</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-headline-md text-headline-md text-error">
                Error Loading Invoice
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/receptionist/invoices')}
              className="inline-flex items-center gap-1.5 h-[42px] px-5 rounded-lg border border-outline-variant bg-transparent hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Invoices</span>
            </button>
          </div>
        ) : invoiceData ? (
          <InvoiceDetails
            invoiceData={invoiceData}
            onRecordPayment={() => handleRecordPayment(invoiceData.invoice_code)}
          />
        ) : null}
      </div>
    </div>
  );
}