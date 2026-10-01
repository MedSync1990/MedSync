import { useState, useEffect } from 'react';
import { getInsuranceVsOutOfPocket, exportToCSV } from '../../api/reports';
import type { InsuranceVsOutOfPocketResponse } from '../../api/types';

export function InsuranceVsOutOfPocket() {
  const [data, setData] = useState<InsuranceVsOutOfPocketResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchPeriod, setSearchPeriod] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    getInsuranceVsOutOfPocket({
      from: startDate || undefined,
      to: endDate || undefined,
    }).then(res => {
      setData(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    exportToCSV(filteredData, 'Monthly_Settlement_Ledger');
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 2000);
    }, 600);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setProviderFilter('all');
    setSearchPeriod('');
    setTimeout(() => {
      setLoading(true);
      getInsuranceVsOutOfPocket({}).then(res => { setData(res); setLoading(false); });
    }, 0);
  };

  const fmt = (n: number) => `LKR ${(Number(n) || 0).toLocaleString('en-US')}`;

  const q = searchPeriod.toLowerCase().trim();
  const filteredData = (data?.ledger || []).filter(item => {
    return !q || item.period.toLowerCase().includes(q);
  });

  const hasData = filteredData.length > 0;

  // KPIs
  const totalIns = (data?.ledger || []).reduce((acc, curr) => acc + curr.total_insurance_covered, 0) || 0;
  const totalOop = (data?.ledger || []).reduce((acc, curr) => acc + curr.total_out_of_pocket, 0) || 0;
  const totalBilled = totalIns + totalOop;
  const insCoveragePct = totalBilled > 0 ? (totalIns / totalBilled * 100).toFixed(1) : "0.0";
  const oopRatio = totalBilled > 0 ? (totalOop / totalBilled * 100).toFixed(1) : "0.0";

  const asc = [...(data?.ledger || [])].reverse();
  const X0 = 70, step = 85, base = 200;
  const maxVal = Math.max(...asc.map(m => m.total_insurance_covered + m.total_out_of_pocket), 1200000);
  const sc = 150 / maxVal;
  const yLabels = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

  const prov = (data?.provider_split || []).filter(p => providerFilter === 'all' || p.provider_name.toLowerCase().includes(providerFilter.toLowerCase()));
  const sla = (data?.claim_slas || []).filter(p => providerFilter === 'all' || p.provider_name.toLowerCase().includes(providerFilter.toLowerCase()));
  const modes = data?.payment_modes || [];

  const totalInvoices = (data?.ledger || []).reduce((acc, curr) => acc + curr.volume, 0) || 0;

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Financial Operations</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Branch Performance</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Insurance vs. Out-of-Pocket</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Coverage split between insurance and patient payments over a period.</p>
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
          <div className="flex flex-col gap-1 min-w-[280px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Date Range</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined text-primary text-[18px] absolute left-3 top-2.5 pointer-events-none">event</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 pl-9 pr-2 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
              </div>
              <span className="text-secondary">-</span>
              <div className="relative flex-1">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="provider-filter">Insurance Provider</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">corporate_fare</span>
              <select id="provider-filter" value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer">
                <option value="all">All Providers</option>
                <option value="slic">Sri Lanka Insurance (SLIC)</option>
                <option value="ceylinco">Ceylinco General Insurance</option>
                <option value="aia">AIA Health Sri Lanka</option>
                <option value="softlogic">Softlogic Life Healthcare</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="table-search-input">Search Period</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input id="table-search-input" type="text" placeholder="Search period or amount..." value={searchPeriod} onChange={e => setSearchPeriod(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={handleReset} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>Reset
          </button>
          <button onClick={fetchReport} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">filter_alt</span>Apply Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Insurance Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">health_and_safety</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{insCoveragePct}%</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">shield</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Out-of-Pocket Ratio</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">wallet</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{oopRatio}%</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">payments</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Gross Billed</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">receipt_long</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(totalBilled)}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">receipt</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Avg Claim Settlement</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">timer</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{data?.avg_claim_days ? data.avg_claim_days.toFixed(1) : "0.0"} business days</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">schedule</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        <div className="lg:col-span-2 bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Monthly Settlement Progression</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Insurance vs. out-of-pocket disbursement across 6 months</p>
            </div>
            <div className="flex items-center gap-space-sm text-label-sm font-label-sm">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary"></div><span className="text-on-surface-variant">Insurance</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-teal-light"></div><span className="text-on-surface-variant">Out-of-Pocket</span></div>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <svg className="min-w-[540px] w-full h-[260px]" viewBox="0 0 600 240">
              {yLabels.map((v, i) => {
                const y = base - (v * sc);
                return (
                  <g key={i}>
                    <line x1="0" x2="600" y1={y} y2={y} stroke="#F1F5F9" />
                    <text x="4" y={y - 4} fontSize="10" fill="#707881">{v ? (v / 1000).toFixed(0) + 'K' : '0'}</text>
                  </g>
                );
              })}
              {asc.map((m, i) => {
                const x = X0 + i * step;
                const hi = m.total_insurance_covered * sc;
                const ho = m.total_out_of_pocket * sc;
                const p = (m.total_insurance_covered / (m.total_insurance_covered + m.total_out_of_pocket) * 100).toFixed(1);
                const periodLabel = m.period.slice(0, 3) + " '" + m.period.slice(-2);
                return (
                  <g key={i}>
                    <rect x={x} y={base - hi} width="38" height={hi} rx="4" fill="#006194" />
                    <rect x={x} y={base - hi - ho} width="38" height={ho} rx="4" fill="#38BDF8" />
                    <text x={x + 19} y={base - hi - ho - 8} fontSize="11" fontWeight="700" textAnchor="middle" fill="#006194">{p}%</text>
                    <text x={x + 19} y="220" fontSize="11" fontWeight="600" textAnchor="middle" fill="#565e74">{periodLabel}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex items-center justify-between text-body-sm font-body-sm text-secondary">
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-primary">trending_up</span>Insurance share up 2.3 points since April.</span>
            <span className="font-mono-data text-mono-data text-outline">Updated: 23 Sep 2026</span>
          </div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Top Provider Split</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Disbursed claims by contracted insurer</p>
          </div>
          <div className="flex flex-col gap-space-md">
            {prov.map((p, i) => {
              const bgClass = i === 0 ? 'bg-primary' : i === 1 ? 'bg-tertiary' : i === 2 ? 'bg-brand-teal-light' : 'bg-secondary';
              return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-body-sm font-body-sm">
                  <span className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${bgClass}`}></span>{p.provider_name}
                  </span>
                  <span className="font-mono-data text-mono-data text-secondary">{fmt(p.amount)} ({p.percentage.toFixed(1)}%)</span>
                </div>
                <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden">
                  <div className={`${bgClass} h-full rounded-full`} style={{ width: `${p.percentage}%` }}></div>
                </div>
              </div>
            )})}
          </div>
          <div className="mt-auto p-space-sm rounded-lg bg-surface-subtle flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">policy</span>
            <div>
              <div className="font-label-md text-label-md">Pre-Authorization Policy</div>
              <div className="font-body-sm text-body-sm text-secondary mt-0.5">SLIC and Ceylinco direct billing requires a real-time eligibility check before specialist consultation checkout.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">table_chart</span></div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Monthly Settlement Ledger</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Billing disbursements per monthly cycle</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
              {isExporting ? <span className="material-symbols-outlined text-[16px] animate-spin">sync</span> : exportComplete ? <span className="material-symbols-outlined text-[16px]">check</span> : <span className="material-symbols-outlined text-[16px]">download</span>}
              {isExporting ? 'Exporting...' : exportComplete ? 'Downloaded' : 'Export Ledger'}
            </button>
            <button className="h-9 px-3 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm hover:bg-tertiary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">verified</span>Audit Coverage
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse ${hasData ? '' : 'hidden'}`}>
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider h-11">
                <th className="px-space-md py-2.5 font-semibold">Billing Period</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Insurance (LKR)</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Out-of-Pocket (LKR)</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Total Invoiced</th>
                <th className="px-space-md py-2.5 font-semibold min-w-[200px]">% Covered</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle">
              {filteredData.map((m, i) => {
                const t = m.total_insurance_covered + m.total_out_of_pocket;
                const p = t > 0 ? (m.total_insurance_covered / t * 100).toFixed(1) : "0.0";
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-label-lg text-label-lg ${i === 0 ? 'font-bold' : ''} text-on-surface`}>{m.period}</span>
                        {i === 0 && <span className="px-1.5 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm">Active</span>}
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-semibold text-primary">{fmt(m.total_insurance_covered)}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data text-secondary">{fmt(m.total_out_of_pocket)}</td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-bold text-on-surface">{fmt(t)}</td>
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="font-label-md text-label-md font-bold text-on-surface w-14">{p}%</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-subtle overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 text-right">
                      <span className="px-2 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-mono-data text-mono-data font-semibold">{m.volume} invoices</span>
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
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">Try resetting the insurer filter or extending the date range to include other billing cycles.</p>
              <button onClick={handleReset} className="mt-space-md px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">Clear Filters</button>
            </div>
          )}
          {loading && (
            <div className="py-space-3xl px-space-md flex justify-center text-center text-secondary">
               <span className="material-symbols-outlined animate-spin text-[32px]">refresh</span>
            </div>
          )}
        </div>
        <div className={`p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm ${!hasData ? 'hidden' : ''}`}>
          <div className="text-body-sm font-body-sm text-secondary">Showing {filteredData.length} periods · {totalInvoices} cumulative invoices</div>
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Ins:</span>
              <span className="font-mono-data text-mono-data font-bold text-on-surface">{fmt(totalIns)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total OOP:</span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">{fmt(totalOop)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">speed</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Insurer Claim Turnaround</h3>
            </div>
            <span className="font-label-sm text-label-sm text-status-completed-text bg-status-completed-bg px-2 py-0.5 rounded-full font-semibold">Healthy Flow</span>
          </div>
          <div className="flex flex-col gap-space-sm">
            {sla.map((r, i) => {
              const init = r.provider_name.substring(0, 2).toUpperCase();
              const isGood = r.avg_days <= 5.0;
              return (
              <div key={i} className="p-space-sm rounded-lg bg-surface-subtle flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{init}</span>
                  <div>
                    <div className="font-label-md text-label-md text-on-surface">{r.provider_name}</div>
                    <div className="font-body-sm text-body-sm text-secondary">Claim Turnaround Time</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-data text-mono-data font-bold text-on-surface">{r.avg_days.toFixed(1)} Days</div>
                  <div className={`font-label-sm text-label-sm font-semibold ${isGood ? 'text-status-completed-text' : 'text-status-pending-text'}`}>
                    {isGood ? 'Under SLA (5d)' : 'Review Pending'}
                  </div>
                </div>
              </div>
            )})}
          </div>
          <div className="font-body-sm text-body-sm text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">info</span>Claims over 7 days are flagged to the Financial Accounts team.
          </div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">account_balance_wallet</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Out-of-Pocket Payment Modes</h3>
            </div>
            <span className="font-label-sm text-label-sm text-secondary">Sep 2026 YTD</span>
          </div>
          <div className="grid grid-cols-3 gap-space-sm text-center">
            {modes.map((m, i) => (
              <div key={i} className="p-space-sm rounded-lg bg-surface-subtle">
                <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{m.payment_type}</div>
                <div className="font-headline-sm text-headline-sm text-on-surface mt-1">{m.percentage.toFixed(1)}%</div>
                <div className="font-mono-data text-mono-data text-primary mt-0.5">{fmt(m.amount)}</div>
              </div>
            ))}
          </div>
          <div className="p-space-sm rounded-lg bg-surface-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-completed-text text-[20px]">check_circle</span>
              <span className="font-label-md text-label-md text-on-surface">Daily Cash Drawer Reconciliation</span>
            </div>
            <span className="font-mono-data text-mono-data text-status-completed-text font-bold">100% BALANCED</span>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="font-body-sm text-body-sm text-secondary">Chief Cashier: R. Perera</span>
            <button className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1" type="button">
              View Cashier Logs<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
