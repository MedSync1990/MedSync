import { useState, useEffect } from 'react';
import { getDoctorRevenue, exportToCSV } from '../../api/reports';
import type { DoctorRevenueResponse, DoctorRevenueItem } from '../../api/types';

export default function DoctorRevenueReport() {
  const [data, setData] = useState<DoctorRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateRange] = useState('Sep 01, 2026 – Sep 30, 2026');
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [searchDoctor, setSearchDoctor] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DoctorRevenueItem | null>(null);

  useEffect(() => {
    getDoctorRevenue().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const handleResetFilters = () => {
    setSpecialtyFilter('All Specialties');
    setSearchDoctor('');
  };

  const handleOpenModal = (doc: DoctorRevenueItem) => {
    setSelectedDoc(doc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDoc(null);
  };

  // KPIs
  const totalClinicalRevenue = (data?.data || []).reduce((sum: number, d: any) => sum + d.total_revenue, 0) || 0;
  const completedConsults = (data?.data || []).reduce((sum: number, d: any) => sum + d.total_appointments, 0) || 0;
  const avgRevenue = (data?.data || []).length ? totalClinicalRevenue / (data?.data || []).length : 0;
  
  // Find top earning specialty
  let topSpecialty = 'N/A';
  let maxRev = 0;
  const specMap: Record<string, number> = {};
  (data?.data || []).forEach((d: any) => {
    specMap[d.specialty] = (specMap[d.specialty] || 0) + d.total_revenue;
    if (specMap[d.specialty] > maxRev) {
      maxRev = specMap[d.specialty];
      topSpecialty = d.specialty;
    }
  });

  // Filter Data
  const filteredDocs = (data?.data || []).filter((doc) => {
    const sMatch = specialtyFilter === 'All Specialties' || doc.specialty.toLowerCase().includes(specialtyFilter.toLowerCase());
    const qMatch = !searchDoctor || doc.doctor_name.toLowerCase().includes(searchDoctor.toLowerCase());
    return sMatch && qMatch;
  }) || [];
  
  const hasData = filteredDocs.length > 0;
  
  // Helper to format currency
  const fmt = (v: number) => `LKR ${(Number(v) || 0).toLocaleString('en-US')}`;

  return (
    <div className="flex flex-col w-full py-space-xl max-w-content-max-width mx-auto gap-space-xl">
      {/* Locked Context & Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Financial Operations</span>
            <span className="text-outline">/</span>
            <span className="text-secondary font-medium">Branch Performance</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Doctor Revenue</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Revenue generated per doctor over a date range.</p>
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

      {/* Operational Filter Toolbar */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md flex-1">
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="date-range-input">Date Range</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-primary text-[18px] absolute left-3 pointer-events-none">date_range</span>
              <input readOnly className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer" id="date-range-input" type="text" value={dateRange}/>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="specialty-filter">Specialty</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">medical_services</span>
              <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer" id="specialty-filter">
                <option value="All Specialties">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="General OPD">General OPD</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Dermatology">Dermatology</option>
                <option value="ENT">ENT</option>
              </select>
              <span className="material-symbols-outlined text-secondary text-[18px] absolute right-3 pointer-events-none">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-secondary" htmlFor="search-doctor-input">Search Physician</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 pointer-events-none">search</span>
              <input value={searchDoctor} onChange={e => setSearchDoctor(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all" id="search-doctor-input" placeholder="Filter by doctor name..." type="text"/>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-center">
          <button onClick={handleResetFilters} className="h-10 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1.5" id="reset-filters-btn">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span> Reset
          </button>
          <button onClick={() => {
            setLoading(true);
            getDoctorRevenue().then(res => { setData(res); setLoading(false); });
          }} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary shadow-sm transition-all flex items-center gap-1.5" id="apply-filters-btn">
            <span className="material-symbols-outlined text-[18px]">filter_alt</span> Apply Filters
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Clinical Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(totalClinicalRevenue)}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">payments</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Completed Consults</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">event_available</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{completedConsults}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">calendar_today</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Top Earning Specialty</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">cardiology</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{topSpecialty}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">ecg_heart</span></div>
        </div>
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Avg Revenue / Doctor</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div><div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">{fmt(avgRevenue)}</div></div>
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none"><span className="material-symbols-outlined text-[90px]">stacked_bar_chart</span></div>
        </div>
      </div>

      {/* Visual Bar Comparison Section */}
      <div className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col gap-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Physician Revenue Contribution</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Comparative performance against branch target (LKR 500,000 max benchmark)</p>
          </div>
          <div className="flex items-center gap-space-sm text-label-sm font-label-sm">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary"></div><span className="text-on-surface-variant">Consultations</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-brand-teal-light"></div><span className="text-on-surface-variant">Procedures &amp; Labs</span></div>
          </div>
        </div>
        <div className="flex flex-col gap-space-md">
          {(!data?.data || (data?.data || []).length === 0) && !loading && <div className="text-center text-secondary py-4">No data available</div>}
          {(data?.data || []).map((doc: any, i: number) => {
            const consultRev = doc.consult_revenue || 0;
            const procRev = doc.procedure_revenue || 0;
            const maxBenchmark = 500000;
            const consultPct = (consultRev / maxBenchmark) * 100;
            const procPct = (procRev / maxBenchmark) * 100;
            const overallPct = ((doc.total_revenue / totalClinicalRevenue) * 100) || 0;
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${i === 0 ? 'bg-surface-container-high text-primary' : 'bg-surface-container text-secondary'}`}>{i + 1}</span>
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">{doc.doctor_name}</span>
                    <span className="text-secondary">· {doc.specialty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-mono-data font-semibold text-on-surface">{fmt(doc.total_revenue)}</span>
                    <span className={`text-label-sm font-label-sm ${i === 0 ? 'text-status-completed-text font-bold' : 'text-secondary'}`}>({overallPct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-surface-subtle rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full rounded-l-full transition-all duration-500" style={{ width: `${Math.min(consultPct, 100)}%` }}></div>
                  <div className="bg-brand-teal-light h-full rounded-r-full transition-all duration-500" style={{ width: `${Math.min(procPct, 100 - consultPct)}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Doctor Revenue Table */}
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">table_chart</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Physician Financial Summary</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{data?.data.length || 0} practicing physicians documented for this period</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportToCSV(filteredDocs, 'Doctor_Revenue')} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
            </button>
            <button onClick={() => window.print()} className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">print</span> Print
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse ${hasData ? '' : 'hidden'}`}>
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider h-11">
                <th className="px-space-md py-2.5 font-semibold">Doctor</th>
                <th className="px-space-md py-2.5 font-semibold">Specialty</th>
                <th className="px-space-md py-2.5 font-semibold">Branch</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Appointments Completed</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Revenue (LKR)</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle font-body-md text-body-md text-on-surface">
              {filteredDocs.map((doc: any, i: number) => {
                const initials = doc.doctor_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
                return (
                  <tr key={i} className="hover:bg-surface-subtle/70 transition-colors">
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[14px]">{initials}</div>
                        <div>
                          <div className="font-label-lg text-label-lg font-semibold text-on-surface">{doc.doctor_name}</div>
                          <div className="font-body-sm text-body-sm text-secondary">ID: {doc.doctor_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5">
                      <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">{doc.specialty}</span>
                    </td>
                    <td className="px-space-md py-3.5">
                      <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm">
                        <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
                        <span>{doc.branch_name}</span>
                      </div>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data">
                      <span className="px-2 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-semibold">{doc.total_appointments}</span>
                    </td>
                    <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-bold text-on-surface">
                      {fmt(doc.total_revenue)}
                    </td>
                    <td className="px-space-md py-3.5 text-center">
                      <button onClick={() => handleOpenModal(doc)} className="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1 mx-auto">
                        <span className="material-symbols-outlined text-[16px]">visibility</span> View Breakdown
                      </button>
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
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-1">
                Try expanding your date range, resetting specialty filters, or searching for another physician name.
              </p>
              <button onClick={handleResetFilters} className="mt-space-md px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">
                Clear Filters
              </button>
            </div>
          )}
          {loading && (
            <div className="py-space-3xl px-space-md flex justify-center text-center text-secondary">
               <span className="material-symbols-outlined animate-spin text-[32px]">refresh</span>
            </div>
          )}
        </div>
        
        <div className="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <div className="text-body-sm font-body-sm text-secondary">
            Showing {filteredDocs.length} of {(data?.data || []).length || 0} active branch doctors · Period locked: Sep 01 – Sep 30, 2026
          </div>
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Appts:</span>
              <span className="font-mono-data text-mono-data font-bold text-on-surface">{completedConsults}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Aggregate:</span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">{fmt(totalClinicalRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Drawer / Modal Backdrop */}
      {isModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-[100] bg-brand-navy-deep/40 backdrop-blur-sm flex items-center justify-center p-space-md" onClick={handleCloseModal}>
          <div className="bg-surface-card rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col transform transition-transform" onClick={e => e.stopPropagation()}>
            <div className="p-space-lg bg-surface-container-low flex items-start justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">analytics</span>
                </div>
                <div>
                  <div className="font-headline-sm text-headline-sm text-on-surface">{selectedDoc.doctor_name}</div>
                  <div className="font-body-sm text-body-sm text-primary font-medium">{selectedDoc.specialty}</div>
                </div>
              </div>
              <button onClick={handleCloseModal} className="w-8 h-8 rounded-lg bg-surface-card text-secondary hover:text-on-surface flex items-center justify-center transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm bg-surface-subtle px-3 py-2 rounded-lg inline-flex self-start">
                <span className="material-symbols-outlined text-[16px] text-secondary">apartment</span>
                <span>{selectedDoc.branch_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase text-secondary">Completed Sessions</span>
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">{selectedDoc.total_appointments}</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-subtle flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase text-secondary">Gross Revenue</span>
                  <span className="font-headline-md text-headline-md font-bold text-primary">{fmt(selectedDoc.total_revenue)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-space-xs mt-space-2xs">
                <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Service Breakdown</div>
                <div className="p-space-sm rounded-xl bg-surface-subtle flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">Consultation Charges</div>
                      <div className="font-body-sm text-body-sm text-secondary">Regular clinic visit fees</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-data text-mono-data font-bold text-on-surface">{fmt(selectedDoc.consult_revenue || 0)}</div>
                    <div className="font-label-sm text-label-sm text-secondary">{(((selectedDoc.consult_revenue || 0) / selectedDoc.total_revenue) * 100 || 0).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="p-space-sm rounded-xl bg-surface-subtle flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">biotech</span>
                    </div>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface">Procedures &amp; Diagnostics</div>
                      <div className="font-body-sm text-body-sm text-secondary">In-clinic testing &amp; minor surgery</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-data text-mono-data font-bold text-on-surface">{fmt(selectedDoc.procedure_revenue || 0)}</div>
                    <div className="font-label-sm text-label-sm text-secondary">{(((selectedDoc.procedure_revenue || 0) / selectedDoc.total_revenue) * 100 || 0).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mt-space-2xs">
                <div className="flex justify-between text-label-sm font-label-sm text-secondary">
                  <span>Consultations Split</span>
                  <span>Procedures Split</span>
                </div>
                <div className="h-2.5 w-full bg-surface-subtle rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full rounded-l-full" style={{ width: `${(selectedDoc.consult_revenue / selectedDoc.total_revenue) * 100 || 0}%` }}></div>
                  <div className="bg-brand-teal-light h-full rounded-r-full" style={{ width: `${(selectedDoc.procedure_revenue / selectedDoc.total_revenue) * 100 || 0}%` }}></div>
                </div>
              </div>
            </div>
            <div className="p-space-md bg-surface-container-low flex justify-end gap-space-sm">
              <button onClick={handleCloseModal} className="h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-tertiary transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
