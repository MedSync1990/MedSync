import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ReportPageShell } from '../../components/reports/ReportPageShell';
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

  const hasData = data !== null && data.data.length > 0;

  // Calculate totals across all branches in the result set
  const totalInsurance = hasData ? data.data.reduce((sum, item) => sum + item.total_insurance_covered, 0) : 0;
  const totalOutOfPocket = hasData ? data.data.reduce((sum, item) => sum + item.total_out_of_pocket, 0) : 0;
  const grandTotal = totalInsurance + totalOutOfPocket;

  // Chart data
  const chartData = hasData
    ? [
        { name: 'Insurance Covered', value: totalInsurance },
        { name: 'Out-of-Pocket', value: totalOutOfPocket },
      ]
    : [];

  const COLORS = ['#006194', '#38BDF8'];

  return (
    <ReportPageShell
      title="Insurance vs. Out-of-Pocket"
      subtitle="Coverage split between insurance and patient payments over a period."
      loading={loading}
      error={error}
      hasData={hasData}
      onFilterChange={handleFilterChange}
    >
      {hasData && (
        <div className="space-y-space-lg">
          {/* Chart */}
          <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs h-[400px] flex flex-col items-center">
            <h3 className="font-headline-sm text-brand-navy-deep self-start mb-2">Overall Revenue Split</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `LKR ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-subtle">
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Branch</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Insurance Covered</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Out-of-Pocket</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Total Revenue</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">% Covered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.data.map((item, idx) => {
                    const coveragePercent = item.total_revenue > 0 ? (item.total_insurance_covered / item.total_revenue) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-3 px-space-md font-body-sm text-brand-navy-deep font-medium">{item.branch_name}</td>
                        <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right">
                          {item.total_insurance_covered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right">
                          {item.total_out_of_pocket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right font-medium">
                          {item.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-space-md font-mono-data text-brand-teal-light text-right font-bold">
                          {coveragePercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-surface-subtle font-label-md text-brand-navy-deep border-t-2 border-border-subtle">
                    <td className="py-3 px-space-md">Overall Total</td>
                    <td className="py-3 px-space-md text-right">
                      {totalInsurance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-space-md text-right">
                      {totalOutOfPocket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-space-md text-right font-bold text-primary">
                      LKR {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-space-md text-right text-brand-teal-light font-bold">
                      {grandTotal > 0 ? ((totalInsurance / grandTotal) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ReportPageShell>
  );
};
