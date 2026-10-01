import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ReportPageShell } from '../../components/ReportPageShell';
import { getInsuranceVsOutOfPocket } from '../../api';
import type { InsuranceVsOutOfPocketResponse } from '../../api';

export const InsuranceVsOutOfPocket: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InsuranceVsOutOfPocketResponse | null>(null);

  const handleFilterChange = async (filters: { branch?: number; from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInsuranceVsOutOfPocket({
        branch: filters.branch,
        from: filters.from,
        to: filters.to,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const hasData = data !== null && data.ledger.length > 0;

  // Calculate totals across the filtered ledger periods
  const totalInsurance = useMemo(() => {
    return hasData ? data.ledger.reduce((sum, item) => sum + item.total_insurance_covered, 0) : 0;
  }, [hasData, data?.ledger]);

  const totalOutOfPocket = useMemo(() => {
    return hasData ? data.ledger.reduce((sum, item) => sum + item.total_out_of_pocket, 0) : 0;
  }, [hasData, data?.ledger]);

  const grandTotal = totalInsurance + totalOutOfPocket;
  const coverageRatio = grandTotal > 0 ? (totalInsurance / grandTotal) * 100 : 0;
  const oopRatio = grandTotal > 0 ? (totalOutOfPocket / grandTotal) * 100 : 0;
  const totalVolume = hasData ? data!.ledger.reduce((sum, item) => sum + item.volume, 0) : 0;

  // Reverse ledger for chart so chronological order is left to right
  const chartData = useMemo(() => {
    if (!hasData) return [];
    return [...data.ledger].reverse();
  }, [hasData, data?.ledger]);

  return (
    <ReportPageShell
      title="Insurance vs. Out-of-Pocket"
      subtitle="Coverage split between insurance and patient payments over a period."
      loading={loading}
      error={error}
      hasData={hasData}
      onFilterChange={handleFilterChange}
    >
      {hasData && data && (
        <div className="space-y-space-xl">
          {/* Key Metrics Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
            {/* Card 1: Insurance Coverage */}
            <div className="metric-block p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Insurance Coverage</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display-lg text-display-lg text-primary">{coverageRatio.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-status-scheduled-bg text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">health_and_safety</span>
                </div>
              </div>
              <div className="mt-space-md pt-space-xs flex items-center justify-between font-mono-data text-mono-data">
                <span className="text-secondary">Total Settled</span>
                <span className="text-on-surface font-semibold">LKR {totalInsurance.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 2: Out of Pocket */}
            <div className="metric-block p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Out-of-Pocket Ratio</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display-lg text-display-lg text-tertiary">{oopRatio.toFixed(1)}%</span>
                    <span className="font-label-sm text-label-sm text-secondary bg-surface-container px-1.5 py-0.5 rounded-full font-semibold">Patient Paid</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-surface-container text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">wallet</span>
                </div>
              </div>
              <div className="mt-space-md pt-space-xs flex items-center justify-between font-mono-data text-mono-data">
                <span className="text-secondary">Patient Direct</span>
                <span className="text-on-surface font-semibold">LKR {totalOutOfPocket.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 3: Total Gross Billed */}
            <div className="metric-block p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Total Gross Billed</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                      LKR {(grandTotal / 1000000).toFixed(2)}M
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary">Aggregate</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                </div>
              </div>
              <div className="mt-space-md pt-space-xs flex items-center justify-between font-mono-data text-mono-data">
                <span className="text-secondary">Actual Billed</span>
                <span className="text-on-surface font-semibold">LKR {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Card 4: Claim Settlement Time (Simulated) */}
            <div className="metric-block p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary flex items-center gap-1">
                    Avg Claim Settlement
                    <span className="material-symbols-outlined text-[14px] text-outline cursor-help" title="Simulated Data: SLA tracking is not yet integrated with the billing backend.">info</span>
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display-lg text-display-lg text-on-surface">4.2</span>
                    <span className="font-label-md text-label-md text-secondary">business days</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-status-completed-bg text-status-completed-text flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">timer</span>
                </div>
              </div>
              <div className="mt-space-md pt-space-xs font-label-sm text-[11px] text-outline italic">
                * Simulated metric
              </div>
            </div>
          </div>

          {/* Visualization & Claim Split Insight */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
            {/* Chart Panel: Dual Stacked Monthly Progression */}
            <div className="lg:col-span-2 p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-lg">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Monthly Settlement Progression</h2>
                  <p className="font-body-sm text-body-sm text-secondary">Progression of Insurance vs Out-of-Pocket disbursement</p>
                </div>
              </div>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fill: '#565e74', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `${(val / 1000)}k`} tick={{ fill: '#707881', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any) => `LKR ${Number(value).toLocaleString()}`}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="total_out_of_pocket" name="Out-of-Pocket" stackId="a" fill="#89ceff" radius={[0, 0, 4, 4]} barSize={40} />
                    <Bar dataKey="total_insurance_covered" name="Insurance" stackId="a" fill="#006194" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Provider Split Breakdown */}
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Top Provider Split</h2>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mb-space-md">Disbursed claims distribution by contracted health insurer</p>
                
                <div className="flex flex-col gap-space-sm">
                  {data.provider_split.map((prov, i) => {
                    // Match the HTML's custom colors for top 4
                    const barColors = ['bg-primary', 'bg-tertiary', 'bg-brand-teal-light', 'bg-secondary'];
                    const dotColors = ['bg-primary', 'bg-tertiary', 'bg-brand-teal-light', 'bg-secondary'];
                    const colorClass = barColors[i % barColors.length];
                    const dotClass = dotColors[i % dotColors.length];

                    return (
                      <div key={prov.provider_name}>
                        <div className="flex items-center justify-between font-label-sm text-label-sm mb-1">
                          <span className="text-on-surface font-semibold flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${dotClass}`}></span> {prov.provider_name}
                          </span>
                          <span className="font-mono-data text-secondary">
                            LKR {prov.amount.toLocaleString()} ({prov.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                          <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${prov.percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {data.provider_split.length === 0 && (
                     <div className="text-secondary font-body-sm italic">No insurance claims in this period.</div>
                  )}
                </div>
              </div>
              <div className="mt-space-md p-space-sm rounded-lg bg-surface-container-low flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">policy</span>
                <div className="text-on-surface">
                  <div className="font-label-sm text-label-sm font-semibold">Pre-Authorization Policy Note</div>
                  <div className="font-body-sm text-body-sm text-secondary leading-snug mt-0.5">
                    SLIC & Ceylinco direct billing requires real-time eligibility checks prior to specialist consultation checkout.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Period Data Table */}
          <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Monthly Settlement Ledger</h2>
                <p className="font-body-sm text-body-sm text-secondary">Exact breakdown of billing disbursements per monthly financial cycle</p>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left" id="insurance-table">
                <thead className="bg-canvas-bg font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-space-lg font-bold" scope="col">Billing Period</th>
                    <th className="py-3.5 px-space-md font-bold" scope="col">Insurance Covered (LKR)</th>
                    <th className="py-3.5 px-space-md font-bold" scope="col">Out-of-Pocket (LKR)</th>
                    <th className="py-3.5 px-space-md font-bold" scope="col">Total Invoiced</th>
                    <th className="py-3.5 px-space-md font-bold min-w-[200px]" scope="col">% Covered (Insurance)</th>
                    <th className="py-3.5 px-space-lg font-bold text-right" scope="col">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-transparent font-body-md text-body-md text-on-surface">
                  {data.ledger.map((item, idx) => {
                    const coveragePercent = item.total_revenue > 0 ? (item.total_insurance_covered / item.total_revenue) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-canvas-bg transition-colors">
                        <td className="py-4 px-space-lg">
                          <div className="flex items-center gap-2">
                            {idx === 0 && <span className="w-2 h-2 rounded-full bg-status-completed-text"></span>}
                            <span className={`font-label-lg text-label-lg ${idx === 0 ? 'font-bold' : ''} text-on-surface`}>{item.period}</span>
                            {idx === 0 && <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm">Active</span>}
                          </div>
                        </td>
                        <td className="py-4 px-space-md font-mono-data text-mono-data font-semibold text-primary">
                          LKR {item.total_insurance_covered.toLocaleString()}
                        </td>
                        <td className="py-4 px-space-md font-mono-data text-mono-data text-secondary">
                          LKR {item.total_out_of_pocket.toLocaleString()}
                        </td>
                        <td className="py-4 px-space-md font-mono-data text-mono-data font-bold text-on-surface">
                          LKR {item.total_revenue.toLocaleString()}
                        </td>
                        <td className="py-4 px-space-md">
                          <div className="flex items-center gap-3">
                            <span className="font-label-md text-label-md font-bold text-on-surface w-12">{coveragePercent.toFixed(1)}%</span>
                            <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${coveragePercent}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-space-lg text-right font-mono-data text-mono-data font-medium text-on-surface-variant">
                          {item.volume} invoices
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Table Footer */}
            <div className="p-space-lg bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md font-mono-data text-mono-data text-secondary">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
                <span>Showing {data.ledger.length} periods ({totalVolume} cumulative invoices)</span>
              </div>
              <div className="flex items-center gap-space-lg">
                <div>
                  <span>Total Ins: </span>
                  <span className="text-on-surface font-bold">LKR {totalInsurance.toLocaleString()}</span>
                </div>
                <div>
                  <span>Total OOP: </span>
                  <span className="text-on-surface font-bold">LKR {totalOutOfPocket.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Audit & Direct Settlement Verification Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
            {/* Settlement SLA Performance */}
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">speed</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Insurer Claim Turnaround Time</h3>
                  </div>
                  <span className="font-label-sm text-label-sm text-status-completed-text bg-status-completed-bg px-2 py-0.5 rounded-full font-semibold">Healthy Flow</span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mb-space-md">Real-time claim settlement times for processed invoices.</p>
                <div className="space-y-space-sm">
                  {data.claim_slas.map((sla, i) => {
                    const initials = sla.provider_name.substring(0, 2).toUpperCase();
                    const iconColors = ['bg-primary/10 text-primary', 'bg-tertiary/10 text-tertiary', 'bg-secondary/10 text-secondary'];
                    const colorClass = iconColors[i % iconColors.length];
                    const isHealthy = sla.avg_days <= 5.0;

                    return (
                      <div key={sla.provider_name} className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                        <div className="flex items-center gap-space-sm">
                          <span className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center font-bold text-xs`}>{initials}</span>
                          <div>
                            <div className="font-label-md text-label-md text-on-surface">{sla.provider_name}</div>
                            <div className="font-body-sm text-body-sm text-secondary">Direct Settlement API</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono-data text-mono-data font-bold text-on-surface">{sla.avg_days.toFixed(1)} Days</div>
                          <div className={`font-label-sm text-label-sm ${isHealthy ? 'text-status-completed-text' : 'text-status-pending-text'} font-semibold`}>
                            {isHealthy ? 'Under SLA (5d)' : 'Review Pending'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payment Gateway & Cashier Reconciliation */}
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">account_balance_wallet</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Out-of-Pocket Payment Modes</h3>
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mb-space-md">Distribution of patient payments collected at front-desk cashier counters.</p>
                <div className="grid grid-cols-3 gap-space-sm mb-space-md text-center">
                  {data.payment_modes.map((mode) => (
                    <div key={mode.payment_type} className="p-space-sm rounded-lg bg-surface-container-low">
                      <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary truncate">{mode.payment_type}</div>
                      <div className="font-headline-sm text-headline-sm text-on-surface mt-1">{mode.percentage.toFixed(1)}%</div>
                      <div className="font-mono-data text-mono-data text-primary text-xs mt-0.5">LKR {(mode.amount / 1000).toFixed(0)}K</div>
                    </div>
                  ))}
                  {data.payment_modes.length === 0 && (
                    <div className="col-span-3 text-secondary font-body-sm italic">No out-of-pocket payments recorded.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportPageShell>
  );
};
