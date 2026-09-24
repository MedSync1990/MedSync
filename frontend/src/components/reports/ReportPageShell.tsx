import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { get } from '../../api/client';
import type { BranchResponse } from '../../api/types';

interface ReportPageShellProps {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onFilterChange: (filters: { branch?: number; from?: string; to?: string }) => void;
  children: React.ReactNode;
  showDateRange?: boolean;
}

export const ReportPageShell: React.FC<ReportPageShellProps> = ({
  title,
  subtitle,
  loading,
  error,
  hasData,
  onFilterChange,
  children,
  showDateRange = true,
}) => {
  const { user } = useAuth();
  const isBranchManager = user?.role === 'Branch Manager';

  // Filters state
  const [branch, setBranch] = useState<string>(isBranchManager ? String(user?.branchId) : '');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  // Branches list for dropdown
  const [branches, setBranches] = useState<BranchResponse[]>([]);

  useEffect(() => {
    // Only load branches if admin
    if (!isBranchManager) {
      get<{ data: BranchResponse[] }>('/branches')
        .then((res: any) => {
          // Admin endpoint returns array or paginated response, assuming paginated pattern based on other endpoints
          // Actually, api-routes says GET /branches returns list, but we can handle both
          if (Array.isArray(res)) setBranches(res);
          else if (res.data) setBranches(res.data);
        })
        .catch((err: any) => console.error('Failed to load branches:', err));
    }
  }, [isBranchManager]);

  // Apply initial filters on mount
  useEffect(() => {
    handleApplyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    onFilterChange({
      branch: branch ? parseInt(branch, 10) : undefined,
      from: from || undefined,
      to: to || undefined,
    });
  };

  return (
    <div className="flex flex-col w-full px-space-md md:px-space-xl py-space-lg max-w-content-max-width mx-auto space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">
            {title}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {subtitle}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-surface-card hover:bg-surface-subtle text-brand-navy-deep font-label-md px-4 py-2 rounded-xl border border-border-subtle shadow-sm transition-all"
          onClick={() => window.print()}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px] text-outline">
            print
          </span>
          <span>Print Report</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs flex flex-col sm:flex-row items-end gap-space-md">
        {!isBranchManager && (
          <div className="flex-1 w-full sm:w-auto">
            <label className="block font-label-sm text-secondary mb-1">Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-brand-navy-deep focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showDateRange && (
          <>
            <div className="flex-1 w-full sm:w-auto">
              <label className="block font-label-sm text-secondary mb-1">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-brand-navy-deep focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label className="block font-label-sm text-secondary mb-1">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-brand-navy-deep focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </>
        )}

        <button
          onClick={handleApplyFilters}
          className="h-10 px-6 rounded-lg bg-primary hover:bg-primary-container text-white font-label-md transition-colors w-full sm:w-auto shrink-0"
          type="button"
        >
          Apply Filters
        </button>
      </div>

      {/* Content Area */}
      <div className="w-full">
        {loading ? (
          <div className="bg-surface-card rounded-2xl border border-border-subtle p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-body-lg text-brand-navy-deep">Loading report data...</p>
          </div>
        ) : error ? (
          <div className="bg-error-container/50 border border-error/20 text-error rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <span className="material-symbols-outlined text-[42px]">error</span>
            <h3 className="font-headline-md">Error Loading Report</h3>
            <p className="font-body-md">{error}</p>
          </div>
        ) : !hasData ? (
          <div className="bg-surface-card rounded-2xl border border-dashed border-border-subtle p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[36px]">search_off</span>
            </div>
            <h3 className="font-headline-md text-brand-navy-deep">
              No data available for the selected criteria.
            </h3>
            <p className="font-body-md text-on-surface-variant max-w-md mx-auto">
              Try adjusting your filters (branch or date range) and applying again.
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
