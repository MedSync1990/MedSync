import { useState, useEffect } from 'react';
import { getTreatmentCategories, exportToCSV } from '../../api/reports';
import type { TreatmentCategoriesResponse } from '../../api/types';

export default function TreatmentCategoryBreakdownReport() {
  const [data, setData] = useState<TreatmentCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [periodFilter, setPeriodFilter] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  useEffect(() => {
    getTreatmentCategories().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    exportToCSV(filteredData, 'Treatment_Category_Breakdown');
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 2000);
    }, 600);
  };

  const handleReset = () => {
    setPeriodFilter('current');
    setSearchQuery('');
  };

  const fmt = (n: number) => `LKR ${(Number(n) || 0).toLocaleString('en-US')}`;

  const isEmpty = periodFilter === 'empty_test';
  const q = searchQuery.toLowerCase().trim();

  const filteredData = (!data || isEmpty) ? [] : (data?.data || []).filter(item => {
    if (!q) return true;
    return (item.treatment_item || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
  });

  const hasData = filteredData.length > 0;

  // KPIs
  const totalTreatments = (data?.data || []).reduce((sum, item) => sum + item.usage_count, 0) || 0;
  const totalRevenue = (data?.data || []).reduce((sum, item) => sum + item.total_revenue, 0) || 0;
  
  // Categories grouping for Chart and Bars
  const catMap: Record<string, { count: number, rev: number }> = {};
  (data?.data || []).forEach(item => {
    const cat = item.category || 'Unknown';
    if (!catMap[cat]) catMap[cat] = { count: 0, rev: 0 };
    catMap[cat].count += item.usage_count;
    catMap[cat].rev += item.total_revenue;
  });

  const categories = Object.keys(catMap).map(k => ({
    name: k,
    count: catMap[k].count,
    pct: totalTreatments > 0 ? (catMap[k].count / totalTreatments) * 100 : 0
  })).sort((a, b) => b.count - a.count);

  const topCategory = categories.length > 0 ? categories[0].name : 'N/A';
  const catalogActiveItems = data?.active_catalog_items || 0;
  const catalogTotalItems = data?.total_catalog_items || 0;

  // Donut chart logic
  const C = 2 * Math.PI * 80;
  let offset = 0;
  
  const colors = [
    { stroke: '#006194', bg: 'bg-primary', light: 'bg-primary/10 text-primary' },
    { stroke: '#007cb1', bg: 'bg-tertiary-container', light: 'bg-tertiary-container/10 text-tertiary' },
    { stroke: '#38BDF8', bg: 'bg-brand-teal-light', light: 'bg-brand-teal-light/15 text-primary' },
    { stroke: '#565e74', bg: 'bg-secondary', light: 'bg-secondary/10 text-secondary' },
    { stroke: '#93ccff', bg: 'bg-primary-fixed-dim', light: 'bg-primary-fixed-dim/20 text-primary' }
  ];

  const getColor = (catName: string) => {
    const idx = categories.findIndex(c => c.name === catName);
    return colors[idx % colors.length];
  };

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Clinical Reporting</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Utilization</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Treatment Category Breakdown</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">Number of treatments performed per category over a period, with demand distribution and procedure revenue.</p>
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
          <div className="flex flex-col gap-1 min-w-[260px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="periodSelector">Reporting Period</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-primary text-[18px] absolute left-3 pointer-events-none">date_range</span>
              <select id="periodSelector" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer">
                <option value="current">Current Month — Sep 2026</option>
                <option value="last_month">Last Month — Aug 2026</option>
                <option value="last_quarter">Last Quarter — Q2 2026</option>
                <option value="empty_test">Previous Year — 2025 (Empty)</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="tableSearchInput">Search Treatment</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input id="tableSearchInput" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter treatment or category..." className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all"/>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={handleReset} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>Reset
          </button>
          <button onClick={() => {
            setLoading(true);
            getTreatmentCategories().then(res => { setData(res); setLoading(false); });
          }} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">filter_alt</span>Apply Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Treatments</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">medical_services</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{totalTreatments}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">vaccines</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Top Category</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">biotech</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{topCategory}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">science</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Treatment Value</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">payments</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(totalRevenue)}</div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">paid</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Catalog Active Items</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">fact_check</span></div>
          </div>
          <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{catalogActiveItems} <span className="font-body-md text-body-md text-outline font-normal">/ {catalogTotalItems} items</span></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">checklist</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-5 bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Category Share</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Relative frequency of treatments by volume</p>
            </div>
          </div>
          <div className="relative flex items-center justify-center my-space-xs">
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
              {categories.map((c, i) => {
                const d = C * c.pct / 100;
                const s = <circle key={i} cx="100" cy="100" r="80" fill="none" stroke={getColor(c.name).stroke} strokeWidth="26" strokeDasharray={`${d.toFixed(1)} ${C.toFixed(1)}`} strokeDashoffset={(-offset).toFixed(1)}/>;
                offset += d;
                return s;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-display-lg text-display-lg text-on-surface font-bold leading-none">{totalTreatments}</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline mt-1">Procedures</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm p-space-sm bg-surface-subtle rounded-lg">
            {categories.map((c, i) => (
              <div key={i} className="flex items-center gap-space-xs">
                <span className={`w-3 h-3 rounded-full shrink-0 ${getColor(c.name).bg}`}></span>
                <div className="truncate">
                  <div className="font-label-sm text-label-sm text-on-surface truncate">{c.name}</div>
                  <div className="font-mono-data text-mono-data text-primary font-bold">{c.pct.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="lg:col-span-7 bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Volume &amp; Capacity Impact</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Delivery load per clinical specialty</p>
            </div>
            <span className="material-symbols-outlined text-outline">bar_chart</span>
          </div>
          <div className="flex flex-col gap-space-md">
            {categories.map((c, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-on-surface flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getColor(c.name).bg}`}></span>{c.name}
                  </span>
                  <div className="flex items-center gap-space-sm">
                    <span className="font-mono-data text-mono-data text-on-surface-variant">{c.count} ops</span>
                    <span className="font-label-md text-label-md text-primary font-bold">{c.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden">
                  <div className={`${getColor(c.name).bg} h-full rounded-full transition-all duration-500`} style={{ width: `${c.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto p-space-sm bg-surface-subtle rounded-lg flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">info</span>
              <span className="font-body-sm text-body-sm text-on-surface">Diagnostic turnover matches the Q3 target (94.2% within standard turnaround).</span>
            </div>
            <button onClick={() => window.print()} className="font-label-sm text-label-sm text-primary hover:underline shrink-0" type="button">Download Audit PDF</button>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">table_chart</span></div>
            <div>
              <div className="flex items-center gap-space-xs">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Treatment Item Performance</h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm">{hasData ? `${filteredData.length} Key Catalog Lines` : '0 Key Catalog Lines'}</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Procedure frequency, demand share and revenue</p>
            </div>
          </div>
          <button onClick={handleExport} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
            {isExporting ? <span className="material-symbols-outlined text-[16px] animate-spin">sync</span> : exportComplete ? <span className="material-symbols-outlined text-[16px]">check</span> : <span className="material-symbols-outlined text-[16px]">download</span>}
            {isExporting ? 'Exporting...' : exportComplete ? 'Downloaded' : 'Export CSV'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse ${hasData ? '' : 'hidden'}`}>
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider h-11">
                <th className="px-space-md py-2.5 font-semibold">Category</th>
                <th className="px-space-md py-2.5 font-semibold">Treatment Item</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Count</th>
                <th className="px-space-md py-2.5 font-semibold text-right">% of Total</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Revenue (LKR)</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle">
              {filteredData.map((item, i) => {
                const colors = getColor(item.category);
                const pct = totalTreatments > 0 ? (item.usage_count / totalTreatments) * 100 : 0;
                // mock status
                const st = item.usage_count > 50 ? { txt: 'In Stock', ico: 'check_circle', bg: 'bg-status-completed-bg text-status-completed-text' } : { txt: 'Standard', ico: 'schedule', bg: 'bg-status-scheduled-bg text-status-scheduled-text' };
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.light} font-label-sm text-label-sm`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.bg}`}></span>{item.category}
                      </span>
                    </td>
                    <td className="px-space-md py-3.5">
                      <div className="font-label-lg text-label-lg text-on-surface">{item.treatment_item}</div>
                      <div className="font-body-sm text-body-sm text-secondary">{item.treatment_code}</div>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-semibold">{item.usage_count}</td>
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono-data text-mono-data text-primary font-bold">{pct.toFixed(1)}%</span>
                        <div className="w-12 h-1.5 bg-surface-subtle rounded-full overflow-hidden hidden md:block">
                          <div className={`${colors.bg} h-full rounded-full`} style={{ width: `${Math.min(pct * 3, 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-bold">{fmt(item.total_revenue)}</td>
                    <td className="px-space-md py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${st.bg} font-label-sm text-label-sm`}>
                        <span className="material-symbols-outlined text-[14px]">{st.ico}</span>{st.txt}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!hasData && !loading && (
            <div className="py-space-3xl px-space-md flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-space-sm">
                <span className="material-symbols-outlined text-[32px]">folder_off</span>
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">No data available for the selected criteria.</h4>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">No treatment records match this period or search for Colombo Central Branch.</p>
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
          <div className="text-body-sm font-body-sm text-secondary">Showing {filteredData.length} of {(data?.data || []).length || 0} utilized catalog treatments</div>
          <div className="flex items-center gap-space-md">
            <span className="font-label-sm text-label-sm text-outline">Ledger Code: CCB-2026-TREAT</span>
            <span className="font-label-sm text-label-sm text-status-completed-text font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-completed-text"></span>Audit Synced
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">vaccines</span></div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Consumable Utilization</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Diagnostic assay and ECG gel restock was auto-triggered by high September volume (142 ECGs).</p>
          <div className="mt-auto pt-space-xs flex items-center justify-between font-label-md text-label-md">
            <span className="text-status-completed-text font-semibold">Inventory Normal</span>
            <span className="font-mono-data text-mono-data text-outline">Reorder in 8 days</span>
          </div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">schedule_send</span></div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Peak Day Demand</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Mondays and Thursdays account for 48% of laboratory tests and cardiac screenings.</p>
          <div className="mt-auto pt-space-xs flex items-center justify-between font-label-md text-label-md">
            <span className="text-status-completed-text font-semibold">Colombo Central Hub</span>
            <span className="font-mono-data text-mono-data text-outline">Peak: 09:00 – 11:30</span>
          </div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">shield_with_heart</span></div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Quality Standards</h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">100% of wound care and surgical dressing procedures followed sterile field verification.</p>
          <div className="mt-auto pt-space-xs flex items-center justify-between font-label-md text-label-md">
            <span className="text-status-completed-text font-semibold">0 Adverse Incidents</span>
            <span className="font-mono-data text-mono-data text-outline">Grade A Audit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
