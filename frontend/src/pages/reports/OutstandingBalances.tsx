import { useState, useEffect } from 'react';
import { getOutstandingBalances, exportToCSV } from '../../api/reports';
import { recordPayment } from '../../api/billing';
import type { OutstandingBalancesResponse } from '../../api/types';

export function OutstandingBalances() {
  const [data, setData] = useState<OutstandingBalancesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [agingFilter, setAgingFilter] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<any | null>(null);

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  useEffect(() => {
    getOutstandingBalances().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    exportToCSV(filteredData, 'Outstanding_Balances');
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 2000);
    }, 600);
  };

  const handleRecordPayment = async () => {
    if (!selectedInv) return;
    setIsRecordingPayment(true);
    try {
      await recordPayment(selectedInv.invoice_id, {
        amount: selectedInv.due_amount,
        payment_type: 'Cash'
      });
      const res = await getOutstandingBalances();
      setData(res);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to record payment', err);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const fmt = (n: number) => `LKR ${(Number(n) || 0).toLocaleString('en-US')}`;

  const getAgingCategory = (days: number) => {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    return '60+';
  };

  const filteredData = (data?.data || []).filter(inv => {
    const q = searchQuery.toLowerCase().trim();
    const searchMatch = !q || 
      (inv.patient_name || '').toLowerCase().includes(q) || 
      String(inv.patient_id || '').toLowerCase().includes(q) || 
      (inv.invoice_id || '').toLowerCase().includes(q);
    
    const agingMatch = agingFilter === 'all' || getAgingCategory(inv.aging_days) === agingFilter;

    return searchMatch && agingMatch;
  }) || [];

  const hasData = filteredData.length > 0;

  // KPIs
  const totalOutstanding = (data?.data || []).reduce((acc, curr) => acc + curr.due_amount, 0) || 0;
  const overdueInvoices = data?.data?.length || 0;
  const partiallyPaid = (data?.data || []).filter(i => i.paid_amount > 0 && i.due_amount > 0).length || 0;
  const fullyUnpaid = (data?.data || []).filter(i => i.paid_amount === 0).length || 0;

  const handleView = (inv: any) => {
    setSelectedInv(inv);
    setIsModalOpen(true);
  };

  const handleReset = () => {
    setSearchQuery('');
    setAgingFilter('all');
  };

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Financial Operations</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Collections</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Outstanding Balances</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">Patients with unpaid or partially paid invoices. Monitor collection risks and invoice recovery status.</p>
        </div>
        <div className="flex items-center gap-space-sm px-space-md py-2 rounded-xl bg-surface-container-low shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">lock</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Reporting Scope</span>
            <span className="font-label-lg text-label-lg text-on-surface">Colombo Central Branch (Locked)</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md flex-1">
          <div className="flex flex-col gap-1 min-w-[280px] flex-1 max-w-md">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="patient-search">Search Patient</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input id="patient-search" type="text" placeholder="Patient name, ID, or invoice #" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 pl-9 pr-9 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 text-outline hover:text-on-surface" type="button" aria-label="Clear search">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="aging-filter">Aging Range</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-primary text-[18px] absolute left-3 pointer-events-none">date_range</span>
              <select id="aging-filter" value={agingFilter} onChange={e => setAgingFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer">
                <option value="all">All Overdue</option>
                <option value="0-30">0–30 Days</option>
                <option value="31-60">31–60 Days</option>
                <option value="60+">60+ Days</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={handleReset} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>Reset
          </button>
          <button onClick={() => {
            setLoading(true);
            getOutstandingBalances().then(res => { setData(res); setLoading(false); });
          }} disabled={loading} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            )}
            {loading ? 'Applying...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Outstanding</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">account_balance_wallet</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(totalOutstanding)}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">payments</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">receipt_long</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{overdueInvoices} <span className="font-body-md text-body-md text-secondary font-normal">invoices</span></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">receipt</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Partially Paid</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">pie_chart</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{partiallyPaid}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">donut_small</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Fully Unpaid</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">block</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fullyUnpaid}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">money_off</span></div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">table_chart</span></div>
            <div>
              <div className="flex items-center gap-space-xs">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Invoice Ledger</h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm">Showing {filteredData.length} of {data?.data?.length || 0} invoices</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Unpaid and partially paid invoices for this branch</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
              {isExporting ? <span className="material-symbols-outlined text-[16px] animate-spin">sync</span> : exportComplete ? <span className="material-symbols-outlined text-[16px]">check</span> : <span className="material-symbols-outlined text-[16px]">download</span>}
              {isExporting ? 'Exporting...' : exportComplete ? 'Downloaded' : 'Export CSV'}
            </button>
            <button onClick={() => window.print()} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">print</span>Print
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse ${hasData ? '' : 'hidden'}`}>
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider h-11">
                <th className="px-space-md py-2.5 font-semibold">Patient</th>
                <th className="px-space-md py-2.5 font-semibold">Invoice #</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Total</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Paid</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Outstanding</th>
                <th className="px-space-md py-2.5 font-semibold">Last Payment</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Status</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle">
              {filteredData.map((d: any, i: number) => {
                const paidAmt = d.paid_amount;
                const dueAmt = d.due_amount;
                const un = paidAmt === 0;
                const st = un ? 'Unpaid' : 'Partially Paid';
                const c = un ? 'bg-status-cancelled-bg text-status-cancelled-text' : 'bg-status-pending-bg text-status-pending-text';
                const dot = un ? 'bg-status-cancelled-text' : 'bg-status-pending-text';
                const initials = (d.patient_name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-space-sm">
                        <div className={`w-9 h-9 rounded-full ${un ? 'bg-error-container text-on-error-container' : 'bg-primary/10 text-primary'} flex items-center justify-center font-bold text-[14px]`}>{initials}</div>
                        <div className="min-w-0">
                          <div className="font-label-lg text-label-lg text-on-surface truncate">{d.patient_name}</div>
                          <div className="font-body-sm text-body-sm text-secondary">{d.patient_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 font-mono-data text-mono-data font-semibold text-primary">{d.invoice_id}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data">{fmt(d.total_amount)}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data text-secondary">{fmt(paidAmt)}</td>
                    <td className="px-space-md py-3.5 text-right">
                      <span className={`px-2 py-0.5 rounded ${c} font-mono-data text-mono-data font-bold`}>{fmt(dueAmt)}</span>
                    </td>
                    <td className="px-space-md py-3.5 font-mono-data text-mono-data text-secondary">{un || !d.last_payment_date ? '—' : new Date(d.last_payment_date).toLocaleDateString()}</td>
                    <td className="px-space-md py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${c} font-label-sm text-label-sm`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>{st}
                      </span>
                    </td>
                    <td className="px-space-md py-3.5 text-center">
                      <button onClick={() => handleView(d)} className="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1 mx-auto">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>View Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {!hasData && !loading && (
            <div className="py-space-3xl px-space-md flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-space-sm"><span className="material-symbols-outlined text-[32px]">folder_off</span></div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">No data available for the selected criteria.</h4>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">Adjust the aging range or search for another patient identifier or invoice number.</p>
              <button onClick={handleReset} className="mt-space-md px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">Clear Filters</button>
            </div>
          )}
          {loading && (
             <div className="py-space-3xl px-space-md flex justify-center text-center text-secondary">
               <span className="material-symbols-outlined animate-spin text-[32px]">refresh</span>
            </div>
          )}
        </div>
        <div className="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 text-body-sm font-body-sm text-secondary"><span className="material-symbols-outlined text-[16px] text-primary">verified</span>Reconciliation sync active · latest Colombo Central ledgers</div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg text-outline cursor-not-allowed" disabled type="button" aria-label="Previous page"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
            <span className="px-3 py-1 rounded-md bg-surface-card text-on-surface font-mono-data text-mono-data font-semibold">Page 1 of 1</span>
            <button className="p-1.5 rounded-lg text-outline cursor-not-allowed" disabled type="button" aria-label="Next page"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[24px]">contact_phone</span></div>
          <div><div className="font-headline-sm text-headline-sm text-on-surface">Need help with invoice escalation?</div><div className="font-body-sm text-body-sm text-secondary">Notify the patient liaison desk or send SMS reminders from central billing.</div></div>
        </div>
        <div className="flex items-center gap-space-sm">
          <button onClick={(e) => {
            const btn = e.currentTarget;
            const originalText = btn.innerText;
            btn.innerText = 'Links Sent!';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
          }} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors" type="button">Send Payment Links</button>
          <a href="mailto:billing@medsync.com" className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-colors flex items-center">Billing Help Desk</a>
        </div>
      </div>

      {isModalOpen && selectedInv && (
        <div className="fixed inset-0 z-[100] bg-brand-navy-deep/40 backdrop-blur-sm flex items-center justify-center p-space-md" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface-card rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-space-lg bg-surface-container-low flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center"><span className="material-symbols-outlined text-[26px]">receipt</span></div>
                <div><div className="font-headline-sm text-headline-sm text-on-surface">{selectedInv.invoice_id}</div><div className="font-body-sm text-body-sm text-primary font-medium">Colombo Central Branch Registry</div></div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg bg-surface-card text-secondary hover:text-on-surface flex items-center justify-center transition-colors" aria-label="Close"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <div className="p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-subtle"><span className="font-label-md text-label-md text-secondary">Patient</span><span className="font-label-md text-label-md text-on-surface font-semibold">{selectedInv.patient_name}</span></div>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col"><span className="font-label-sm text-label-sm uppercase text-secondary">Total Invoiced</span><span className="font-headline-sm text-headline-sm font-bold text-on-surface">{fmt(selectedInv.total_amount)}</span></div>
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col"><span className="font-label-sm text-label-sm uppercase text-secondary">Paid Amount</span><span className="font-headline-sm text-headline-sm font-bold text-secondary">{fmt(selectedInv.paid_amount)}</span></div>
              </div>
              <div className="p-space-sm rounded-xl bg-surface-subtle flex items-center justify-between">
                <div><span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Balance Due</span><div className="font-headline-lg text-headline-lg text-primary font-bold">{fmt(selectedInv.due_amount)}</div></div>
                <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm ${selectedInv.paid_amount === 0 ? 'bg-status-cancelled-bg text-status-cancelled-text' : 'bg-status-pending-bg text-status-pending-text'}`}>
                  {selectedInv.paid_amount === 0 ? 'Unpaid' : 'Partially Paid'}
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm text-secondary">
                <span>Last Recorded Payment</span>
                <strong className="font-mono-data text-mono-data text-on-surface">{(selectedInv.paid_amount === 0 || !selectedInv.last_payment_date) ? 'None recorded' : new Date(selectedInv.last_payment_date).toLocaleDateString()}</strong>
              </div>
            </div>
            <div className="p-space-md bg-surface-container-low flex justify-end gap-space-sm">
              <button onClick={() => setIsModalOpen(false)} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Close</button>
              <button onClick={handleRecordPayment} disabled={isRecordingPayment} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors flex items-center gap-1.5 disabled:opacity-50">
                {isRecordingPayment ? <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[16px]">payments</span>}
                {isRecordingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
