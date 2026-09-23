import React, { useState } from 'react';
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
import { ReportPageShell } from '../../components/reports/ReportPageShell';
import { getAppointmentsSummary } from '../../api';
import type { AppointmentsSummaryResponse } from '../../api';

export const AppointmentSummary: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppointmentsSummaryResponse | null>(null);

  const handleFilterChange = async (filters: { branch?: number; from?: string; to?: string }) => {
    setLoading(true);
    setError(null);
    try {
      // The backend expects `date` instead of `from`/`to` for this specific endpoint
      // based on api-routes.md: /reports/appointments-summary?branch=&date=
      // But we use the generic from/to in the UI. Let's pass `from` as `date` for now,
      // or just pass both if backend supports it. The schema says `date`.
      const res = await getAppointmentsSummary({
        branch: filters.branch,
        date: filters.from, // using 'from' as the specific date if provided
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const hasData = data !== null && data.data.length > 0;

  // Transform data for the chart: group by status
  const chartData = hasData
    ? data.data.map((item) => ({
        name: item.status,
        count: item.count,
        type: item.appointment_type,
      }))
    : [];

  return (
    <ReportPageShell
      title="Branch Appointment Summary"
      subtitle="Scheduled, completed, and cancelled appointments by branch."
      loading={loading}
      error={error}
      hasData={hasData}
      onFilterChange={handleFilterChange}
      showDateRange={true} // The shell currently emits 'from' and 'to'. For this report, 'from' acts as the target date.
    >
      {hasData && (
        <div className="space-y-space-lg">
          {/* Chart */}
          <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs h-[400px]">
            <h3 className="font-headline-sm text-brand-navy-deep mb-4">Appointments Overview</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: '#565e74' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#565e74' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F1F5F9' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="count" name="Appointments" fill="#006194" radius={[4, 4, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-subtle">
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Status</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Type</th>
                    <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="py-3 px-space-md font-body-sm text-brand-navy-deep">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-label-sm ${
                            item.status === 'Completed'
                              ? 'bg-status-completed-bg text-status-completed-text'
                              : item.status === 'Cancelled'
                              ? 'bg-status-cancelled-bg text-status-cancelled-text'
                              : 'bg-status-scheduled-bg text-status-scheduled-text'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-space-md font-body-sm text-on-surface-variant">{item.appointment_type}</td>
                      <td className="py-3 px-space-md font-mono-data text-brand-navy-deep text-right">{item.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-subtle font-label-md text-brand-navy-deep border-t-2 border-border-subtle">
                    <td className="py-3 px-space-md" colSpan={2}>Total Appointments</td>
                    <td className="py-3 px-space-md text-right">{data.data.reduce((sum, item) => sum + item.count, 0)}</td>
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
