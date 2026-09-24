import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import InvoiceDetails from '../../components/invoices/InvoiceDetails';
import InvoiceSearch from '../../components/invoices/InvoiceSearch';
import type { InvoiceData, RecentInvoiceItem } from '../../types/invoiceTypes';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`;

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
    <div className="flex flex-col w-full px-space-md md:px-space-xl py-space-lg max-w-[1600px] mx-auto space-y-space-lg text-[18px]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-1.5 font-label-sm text-[16px] text-outline uppercase tracking-wider mb-1.5"><a className="hover:text-primary transition-colors" href="#">Home</a><span className="material-symbols-outlined text-[18px]">chevron_right</span><span>Billing &amp; Payments</span><span className="material-symbols-outlined text-[18px]">chevron_right</span><span className="text-primary font-bold">Invoices</span></div>
          <h1 className="text-[34px] font-extrabold text-brand-navy-deep tracking-tight">Invoices</h1>
          <p className="font-body-md text-[18px] text-on-surface-variant mt-0.5">Search and view invoice details and treatment breakdowns.</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-surface-card hover:bg-surface-subtle text-brand-navy-deep font-label-lg text-[18px] px-5 py-3 rounded-xl border border-border-subtle shadow-sm transition-all duration-150" type="button" onClick={() => window.print()}><span className="material-symbols-outlined text-[22px] text-outline">ios_share</span><span>Export Invoices</span></button>
      </div>

      <InvoiceSearch searchQuery={searchQuery} searchType={searchType} invoiceId={invoiceId} onSearchQueryChange={setSearchQuery} onSearchTypeChange={setSearchType} onSubmit={handleSearchSubmit} onQuickLookup={() => navigate('/receptionist/invoices/2')} />

      <div className="w-full">
        {!invoiceId ? (
          <div className="w-full">
            {recentInvoices.length > 0 ? (
              <div className="bg-surface-card rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border-subtle bg-surface-subtle">
                  <h3 className="font-bold text-brand-navy-deep text-[18px]">Recent Invoices</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-main border-b border-border-subtle text-on-surface-variant font-label-sm uppercase tracking-wider text-[14px]">
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Invoice Number</th>
                        <th className="px-6 py-4 font-semibold">Patient</th>
                        <th className="px-6 py-4 font-semibold text-right">Amount</th>
                        <th className="px-6 py-4 font-semibold text-right">Outstanding</th>
                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                        <th className="px-6 py-4 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {recentInvoices.map((inv) => (
                        <tr key={inv.invoice_code} className="hover:bg-surface-subtle transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-[15px]">{new Date(inv.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-brand-navy-deep">{inv.invoice_code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-[15px]">{inv.patient_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-medium">Rs. {inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-orange-600">Rs. {inv.outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[13px] font-bold ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : inv.status === 'Unpaid' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{inv.status}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => navigate(`/receptionist/invoices/${inv.invoice_code}?type=invoice`)}
                              className="text-primary hover:text-primary-dark font-medium text-[15px] inline-flex items-center gap-1"
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
              <div className="bg-surface-card rounded-2xl border border-dashed border-border-subtle p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[36px]">receipt_long</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-[22px] font-bold text-brand-navy-deep">Enter an Invoice Code or Patient NIC to Search</h3>
                  <p className="text-[16px] text-on-surface-variant max-w-md mx-auto">Use the search console above to load real patient invoice details and treatment breakdowns.</p>
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="bg-surface-card rounded-2xl border border-border-subtle p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-sm"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-[18px] font-semibold text-brand-navy-deep">Loading invoice details...</p></div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-8 text-center space-y-3 shadow-sm"><span className="material-symbols-outlined text-[42px] text-red-500">error</span><h3 className="text-[22px] font-bold">Error Loading Invoice</h3><p className="text-[16px]">{error}</p></div>
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