import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function InvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(invoiceId || '');

  // Synchronize searchQuery with current URL parameter
  useEffect(() => {
    setSearchQuery(invoiceId || '');
  }, [invoiceId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/receptionist/invoice/${searchQuery.trim()}`);
    }
  };

  // Micro visual pulse effect for selected invoice
  useEffect(() => {
    if (invoiceId) {
      const detailPanel = document.getElementById('invoiceDetailPanel');
      if (detailPanel) {
        detailPanel.classList.add('scale-[0.99]');
        const timer = setTimeout(() => {
          detailPanel.classList.remove('scale-[0.99]');
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [invoiceId]);

  return (
    <div className="flex flex-col w-full px-space-md md:px-space-xl py-space-lg max-w-[1600px] mx-auto space-y-space-lg text-[18px]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          {/* Breadcrumb Navigation - matching manage-appointments.html */}
          <div className="flex items-center gap-1.5 font-label-sm text-[16px] text-outline uppercase tracking-wider mb-1.5">
            <a className="hover:text-primary transition-colors" href="#">Home</a>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            <span>Billing &amp; Payments</span>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            <span className="text-primary font-bold">Invoices</span>
          </div>
          <h1 className="text-[34px] font-extrabold text-brand-navy-deep tracking-tight">Invoices</h1>
          <p className="font-body-md text-[18px] text-on-surface-variant mt-0.5">Search and view invoice details and treatment breakdowns.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="inline-flex items-center gap-2 bg-surface-card hover:bg-surface-subtle text-brand-navy-deep font-label-lg text-[18px] px-5 py-3 rounded-xl border border-border-subtle shadow-sm transition-all duration-150" type="button">
            <span className="material-symbols-outlined text-[22px] text-outline">ios_share</span>
            <span>Export Invoices</span>
          </button>
          <a className="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary font-label-lg text-[18px] px-6 py-3 rounded-xl shadow-sm transition-all duration-150" href="/receptionist/collect-payment">
            <span className="material-symbols-outlined text-[24px]">add_card</span>
            <span>Collect Payment</span>
          </a>
        </div>
      </div>

      <div className="bg-surface-card rounded-2xl p-space-lg border border-border-subtle shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-[26px]">search</span>
            <input
              className="w-full h-14 pl-12 pr-10 rounded-xl bg-surface-subtle text-brand-navy-deep placeholder:text-outline font-body-md text-[18px] focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus border border-border-subtle transition-all"
              id="invoiceSearchInput"
              placeholder="Search by NIC (e.g. 782410928V), Invoice #, or Patient Name..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep" title="Clear search" onClick={() => setSearchQuery('')}>
                <span className="material-symbols-outlined text-[22px]">cancel</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select className="h-14 appearance-none bg-surface-subtle hover:bg-surface-container-low rounded-xl px-5 pr-10 font-label-md text-[18px] text-brand-navy-deep border border-border-subtle focus:outline-none focus:ring-2 focus:ring-border-focus cursor-pointer">
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <button type="submit" className="h-14 px-7 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-[18px] inline-flex items-center justify-center gap-2 shadow-sm transition-all">
              <span className="material-symbols-outlined text-[22px]">search</span>
              <span>Search</span>
            </button>
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="font-label-sm text-[15px] text-outline uppercase tracking-wider mr-1">Quick Lookups by NIC / Invoice:</span>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[16px] transition-colors ${invoiceId === 'INV-004281' ? 'bg-status-scheduled-bg text-status-scheduled-text border border-brand-teal-light/30 shadow-sm' : 'bg-surface-subtle hover:bg-surface-container text-on-surface-variant'}`}
            onClick={() => navigate('/receptionist/invoice/INV-004281')}
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span className="font-bold">NIC: 782410928V</span>
            <span>· Priyantha (INV-004281)</span>
          </button>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[16px] transition-colors ${invoiceId === 'INV-004280' ? 'bg-status-scheduled-bg text-status-scheduled-text border border-brand-teal-light/30 shadow-sm' : 'bg-surface-subtle hover:bg-surface-container text-on-surface-variant'}`}
            onClick={() => navigate('/receptionist/invoice/INV-004280')}
          >
            <span className="material-symbols-outlined text-[18px]">badge</span>
            <span>NIC: 855210344V · Nalini Jayawardena (INV-004280)</span>
          </button>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[16px] transition-colors ${invoiceId === 'INV-004279' ? 'bg-status-scheduled-bg text-status-scheduled-text border border-brand-teal-light/30 shadow-sm' : 'bg-surface-subtle hover:bg-surface-container text-on-surface-variant'}`}
            onClick={() => navigate('/receptionist/invoice/INV-004279')}
          >
            <span className="material-symbols-outlined text-[18px]">receipt</span>
            <span>INV-004279 · Kamal Wickramasinghe</span>
          </button>
        </div>
      </div>

      <div className="w-full">
        {!invoiceId ? (
          <div className="bg-surface-card rounded-2xl border border-dashed border-border-subtle p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[36px]">receipt_long</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-[22px] font-bold text-brand-navy-deep">Enter an Invoice Number or NIC to Search</h3>
              <p className="text-[16px] text-on-surface-variant max-w-md mx-auto">
                Use the search console above or click a quick lookup button to load patient invoice breakdowns and payment records.
              </p>
            </div>
          </div>
        ) : (
        <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm p-space-lg space-y-space-md transition-transform" id="invoiceDetailPanel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[32px] font-black text-brand-navy-deep tracking-tight">{invoiceId}</span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-[15px] font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-completed-text"></span>
                  Receipt Issued · Paid
                </span>
              </div>
              <p className="font-body-sm text-[16px] text-outline mt-0.5">Issued: Sep 3, 2026 · 10:15 AM · Colombo Central Branch</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-[17px] font-semibold transition-colors" onClick={() => window.print()} type="button">
                <span className="material-symbols-outlined text-[22px]">print</span>
                <span>Print</span>
              </button>
              <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-[17px] font-semibold transition-colors" type="button">
                <span className="material-symbols-outlined text-[22px]">download</span>
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-subtle p-space-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border-subtle">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary-fixed flex items-center justify-center text-primary text-[24px] font-bold">PD</div>
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-[24px] font-bold text-brand-navy-deep leading-tight">Priyantha Dharmasena</h4>
                  <span className="px-3 py-1 rounded-md bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-[14px] font-bold border border-brand-teal-light/30">NIC: 782410928V</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[16px] text-outline">
                  <span className="font-mono-data text-on-surface-variant font-semibold">Patient ID: PT-003420</span>
                  <span>·</span>
                  <span>Phone: +94 77 123 4567</span>
                </div>
              </div>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border-subtle">
              <span className="font-label-sm text-[14px] text-outline uppercase tracking-wider block font-semibold">Attending Doctor &amp; Unit</span>
              <span className="font-label-md text-[18px] text-brand-navy-deep font-bold">Dr. Anura Bandara</span>
              <span className="text-[15px] text-outline block">Cardiology Unit</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-label-sm text-[15px] uppercase tracking-wider text-outline font-bold">Itemised Treatment Lines</span>
              <span className="font-mono-data text-[16px] text-outline font-semibold">3 Service Codes</span>
            </div>
            <div className="border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
              <div className="p-4 bg-surface-card flex items-center justify-between hover:bg-surface-subtle transition-colors">
                <div className="flex flex-col">
                  <span className="font-label-lg text-[18px] text-brand-navy-deep font-bold">Cardiology Specialist Consultation</span>
                  <span className="font-mono-data text-[16px] text-outline">SRV-CRD-01 · 1x Consultation</span>
                </div>
                <span className="font-mono-data text-[18px] font-bold text-brand-navy-deep">LKR 3,500.00</span>
              </div>
              <div className="p-4 bg-surface-card flex items-center justify-between hover:bg-surface-subtle transition-colors">
                <div className="flex flex-col">
                  <span className="font-label-lg text-[18px] text-brand-navy-deep font-bold">12-Lead Electrocardiogram (ECG)</span>
                  <span className="font-mono-data text-[16px] text-outline">SRV-DIA-04 · Diagnostic</span>
                </div>
                <span className="font-mono-data text-[18px] font-bold text-brand-navy-deep">LKR 1,800.00</span>
              </div>
              <div className="p-4 bg-surface-card flex items-center justify-between hover:bg-surface-subtle transition-colors">
                <div className="flex flex-col">
                  <span className="font-label-lg text-[18px] text-brand-navy-deep font-bold">Blood Glucose Random (RBS)</span>
                  <span className="font-mono-data text-[16px] text-outline">SRV-LAB-12 · Pathology</span>
                </div>
                <span className="font-mono-data text-[18px] font-bold text-brand-navy-deep">LKR 650.00</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-subtle p-space-md rounded-xl space-y-3 border border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-[15px] uppercase tracking-wider text-outline font-bold">Financial Summary</span>
              <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-primary">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                SLIC Direct Approved
              </span>
            </div>
            <div className="space-y-2 text-[18px]">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Subtotal Amount</span>
                <span className="font-mono-data text-[18px] text-brand-navy-deep font-bold">LKR 5,950.00</span>
              </div>
              <div className="flex items-center justify-between text-status-scheduled-text">
                <span className="flex items-center gap-2">
                  <span className="font-medium">Insurance Coverage (70%)</span>
                  <span className="px-2 py-0.5 rounded bg-surface-card text-primary font-mono-data text-[14px] font-bold border border-border-subtle">SLIC-0098231</span>
                </span>
                <span className="font-mono-data text-[18px] font-bold">- LKR 4,165.00</span>
              </div>
              <div className="pt-2.5 mt-1 border-t border-border-subtle flex items-center justify-between">
                <span className="text-[20px] text-brand-navy-deep font-extrabold">Net Patient Payable</span>
                <span className="text-[28px] text-primary font-black">LKR 1,785.00</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-label-sm text-[15px] uppercase tracking-wider text-outline font-bold">Payment Status &amp; Record</span>
              <span className="font-label-sm text-[15px] text-status-completed-text font-extrabold">Fully Settled</span>
            </div>
            <div className="bg-surface-subtle rounded-xl p-4 text-[17px] space-y-2 border border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px] text-status-completed-text">credit_card</span>
                  <span className="font-label-md text-[18px] text-brand-navy-deep font-semibold">Visa Card (ending in 4219)</span>
                </div>
                <span className="font-mono-data text-[18px] font-bold text-brand-navy-deep">LKR 1,785.00</span>
              </div>
              <div className="flex items-center justify-between text-outline text-[15px]">
                <span>Sep 3, 2026 · 10:45 AM</span>
                <span>Recorded by: Sarah (Receptionist)</span>
              </div>
              <div className="flex items-center justify-between text-[14px] text-outline pt-2 border-t border-border-subtle">
                <span>Auth Reference: TXN-LK-9912048</span>
                <span className="text-status-completed-text font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[17px]">done_all</span> Terminal Batch #04
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border-subtle">
            <div className="flex items-center gap-2.5">
              <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-[17px] font-bold transition-colors" onClick={() => window.print()} type="button">
                <span className="material-symbols-outlined text-[22px]">print</span>
                <span>Print Invoice</span>
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-[17px] font-bold transition-colors" type="button">
                <span className="material-symbols-outlined text-[22px]">download</span>
                <span>Download PDF</span>
              </button>
            </div>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-status-completed-bg text-status-completed-text font-label-md text-[17px] hover:opacity-90 transition-opacity font-extrabold" type="button">
              <span className="material-symbols-outlined text-[22px]">receipt</span>
              <span>Collect Payment / View Receipt</span>
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
