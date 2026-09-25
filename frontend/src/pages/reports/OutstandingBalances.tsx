import React, { useState } from 'react';
import { ReportPageShell } from '../../components/ReportPageShell';
import { getOutstandingBalances } from '../../api';
import type { OutstandingBalancesResponse } from '../../api';

export const OutstandingBalances: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OutstandingBalancesResponse | null>(null);

  const handleFilterChange = async (filters: { branch?: number }) => {
    setLoading(true);
    setError(null);
    try {
      // This report only filters by branch, not dates
      const res = await getOutstandingBalances({ branch: filters.branch });
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
      title="Outstanding Balances"
      subtitle="Patients with unpaid or partially paid invoices."
      loading={loading}
      error={error}
      hasData={hasData}
      onFilterChange={handleFilterChange}
      showDateRange={false} // Only branch filter applies here
    >
      {hasData && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-bg font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                  <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Patient Name</th>
                  <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider">Contact Number</th>
                  <th className="py-3 px-space-md font-label-sm text-secondary uppercase tracking-wider text-right">Outstanding Balance (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {data.data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-canvas-bg transition-colors">
                    <td className="py-3 px-space-md font-body-sm text-on-surface font-medium">{item.patient_name}</td>
                    <td className="py-3 px-space-md font-mono-data text-secondary">{item.contact_number}</td>
                    <td className="py-3 px-space-md font-mono-data text-status-cancelled-text text-right font-medium">
                      {item.outstanding_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface-subtle font-label-md text-on-surface border-t-2 border-surface-container">
                  <td className="py-3 px-space-md" colSpan={2}>Total Outstanding</td>
                  <td className="py-3 px-space-md text-right font-bold text-status-cancelled-text">
                    LKR {data.data.reduce((sum, item) => sum + item.outstanding_balance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
