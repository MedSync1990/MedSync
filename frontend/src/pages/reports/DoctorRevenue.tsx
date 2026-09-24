import React, { useState } from 'react';
import { ReportPageShell } from '../../components/ReportPageShell';
import { getDoctorRevenue } from '../../api';
import type { DoctorRevenueResponse } from '../../api';

export const DoctorRevenue: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DoctorRevenueResponse | null>(null);

  const handleFilterChange = async (filters: { branch?: number; from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDoctorRevenue({
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

  return (
    <ReportPageShell
      title="Doctor Revenue"
      subtitle="Revenue generated per doctor over a date range."
      loading={loading}
      error={error}
      hasData={hasData}
      onFilterChange={handleFilterChange}
    >
      {hasData && (
        <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-border-subtle">
                  <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Doctor</th>
                  <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Branch</th>
                  <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Appointments Completed</th>
                  <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Revenue (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {data.data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="py-3 px-space-md font-body-sm text-brand-navy-deep font-medium">{item.doctor_name}</td>
                    <td className="py-3 px-space-md font-body-sm text-on-surface-variant">{item.branch_name}</td>
                    <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right">{item.total_appointments}</td>
                    <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right font-medium">
                      {item.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface-subtle font-label-md text-brand-navy-deep border-t-2 border-border-subtle">
                  <td className="py-3 px-space-md" colSpan={2}>Total</td>
                  <td className="py-3 px-space-md text-right">{data.data.reduce((sum, item) => sum + item.total_appointments, 0)}</td>
                  <td className="py-3 px-space-md text-right font-bold text-primary">
                    LKR {data.data.reduce((sum, item) => sum + item.total_revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportPageShell>
  );
};
