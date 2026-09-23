import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReportPageShell } from '../../components/reports/ReportPageShell';
import { getTreatmentCategories } from '../../api';
import type { TreatmentCategoriesResponse } from '../../api';

export const TreatmentCategories: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TreatmentCategoriesResponse | null>(null);

  const handleFilterChange = async (filters: { branch?: number; from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTreatmentCategories({
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
  
  // Calculate total counts for percentages
  const totalUsageCount = hasData ? data.data.reduce((sum, item) => sum + item.usage_count, 0) : 0;
  const totalRevenue = hasData ? data.data.reduce((sum, item) => sum + item.total_revenue, 0) : 0;

  // Chart data
  const chartData = hasData
    ? data.data.map((item) => ({
        name: item.category,
        Usage: item.usage_count,
        Revenue: item.total_revenue,
      }))
    : [];

  return (
    <ReportPageShell
      title="Treatment Category Breakdown"
      subtitle="Number of treatments performed per category over a period."
      loading={loading}
      error={error}
      hasData={hasData}
      onFilterChange={handleFilterChange}
    >
      {hasData && (
        <div className="space-y-space-lg">
          {/* Chart */}
          <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs h-[400px]">
            <h3 className="font-headline-sm text-brand-navy-deep mb-4">Usage by Category</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fill: '#565e74' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#565e74', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Bar dataKey="Usage" fill="#0284C7" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-subtle">
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Category</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Usage Count</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">% of Total Usage</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Revenue (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="py-3 px-space-md font-body-sm text-brand-navy-deep font-medium">{item.category}</td>
                      <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right">{item.usage_count}</td>
                      <td className="py-3 px-space-md font-mono-data text-on-surface-variant text-right">
                        {totalUsageCount > 0 ? ((item.usage_count / totalUsageCount) * 100).toFixed(1) : '0.0'}%
                      </td>
                      <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right">
                        {item.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-subtle font-label-md text-brand-navy-deep border-t-2 border-border-subtle">
                    <td className="py-3 px-space-md">Total</td>
                    <td className="py-3 px-space-md text-right">{totalUsageCount}</td>
                    <td className="py-3 px-space-md text-right">100%</td>
                    <td className="py-3 px-space-md text-right font-bold text-primary">
                      LKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
