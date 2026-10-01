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
  const [searchQuery, setSearchQuery] = useState(invoiceId || '');
  const initialType = (searchParams.get('type') as 'invoice' | 'nic') || 'invoice';
  const [searchType, setSearchType] = useState<'invoice' | 'nic'>(initialType);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoiceItem[]>([]);
  const urlSearchType = searchParams.get('type');

  useEffect(() => {
    setSearchQuery(invoiceId || '');
    if (invoiceId) {
      fetchInvoiceDetail(invoiceId);
    } else {
      setInvoiceData(null);
      setError(null);
      fetchRecentInvoices();
    }
  }, [invoiceId, urlSearchType]);

  const fetchRecentInvoices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/recent`, {
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
      const type = searchParams.get('type') || searchType;
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
    if (searchQuery.trim()) navigate(`/receptionist/invoices/${searchQuery.trim()}?type=${searchType}`);
  };

  // When "Record Payment" is clicked, navigate to the Collect Payment page
  // passing the invoice code in the URL so that page can pre-load the invoice.
  const handleRecordPayment = (invoiceCode: string) => {
    navigate(`/receptionist/collect-payment/${encodeURIComponent(invoiceCode)}`);
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
          <span className="text-primary font-bold">Invoices</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md mt-1">
          <div>
            <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">
              Invoices
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Search and view invoice details and treatment breakdowns.
            </p>
          </div>

        </div>
      </div>

      {/* Search Console */}
      <InvoiceSearch
        searchQuery={searchQuery}
        searchType={searchType}
        invoiceId={invoiceId}
        onSearchQueryChange={setSearchQuery}
        onSearchTypeChange={setSearchType}
        onSubmit={handleSearchSubmit}
        onQuickLookup={() => navigate('/receptionist/invoices/2')}
      />

      {/* Content Area */}
      <div className="w-full">
        {!invoiceId ? (
          <div className="w-full">
            {recentInvoices.length > 0 ? (
              <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                {/* Section header — matches RegisterPatient card headers */}
                <div className="flex items-center gap-space-md p-space-lg sm:p-space-xl pb-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">
                      Recent Unpaid Invoices
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Invoices with outstanding balances awaiting payment
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto mt-space-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-y border-border-subtle bg-surface-subtle">
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
              </div>
            ) : (
              /* Empty state — matches RegisterPatient / UI guidelines §5 */
              <div className="bg-surface-card rounded-xl border border-dashed border-border-subtle p-space-xl text-center flex flex-col items-center justify-center space-y-space-md shadow-sm">
                <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[36px]">receipt_long</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-headline-md text-headline-md text-brand-navy-deep">
                    Enter an Invoice Code or Patient NIC to Search
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                    Use the search console above to load real patient invoice details and treatment breakdowns.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          /* Loading state — matches UI guidelines §5 */
          <div className="bg-surface-card rounded-xl shadow-sm p-space-xl text-center flex flex-col items-center justify-center space-y-space-md">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
            onPrint={() => window.print()}
            onRecordPayment={() => handleRecordPayment(invoiceData.invoice_code)}
          />
        ) : null}
      </div>
    </div>
  );
}