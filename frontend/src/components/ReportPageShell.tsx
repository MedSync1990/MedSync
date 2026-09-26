import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { get } from '../api/client';
import type { BranchResponse } from '../api/types';

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-xl">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
            {title}
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            {subtitle}
          </p>
        </div>
        <button
          className="flex items-center gap-2 h-[42px] px-4 rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-all shadow-sm"
          onClick={() => window.print()}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">
            print
          </span>
          <span className="font-label-lg text-label-lg">Print Report</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm mb-space-xl">
        {!isBranchManager && (
          <div className="flex-1 w-full flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">Branch</label>
            <div className="relative">
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full h-[42px] px-3.5 pr-9 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest transition-all appearance-none outline-none cursor-pointer"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary text-[20px]">expand_more</span>
            </div>
          </div>
        )}

        {showDateRange && (
          <>
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">From Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest transition-all outline-none"
                />
              </div>
            </div>
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">To Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest transition-all outline-none"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyFilters}
            className="h-[42px] px-6 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg hover:bg-primary-container active:scale-[0.99] transition-all flex items-center gap-2 shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            Apply Filters
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-full">
        {loading ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-body-lg text-on-surface">Loading report data...</p>
          </div>
        ) : error ? (
          <div className="bg-error-container/50 text-error rounded-xl p-8 text-center space-y-3 shadow-sm">
            <span className="material-symbols-outlined text-[42px]">error</span>
            <h3 className="font-headline-md">Error Loading Report</h3>
            <p className="font-body-md">{error}</p>
          </div>
        ) : !hasData ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[36px]">search_off</span>
            </div>
            <h3 className="font-headline-md text-on-surface">
              No data available for the selected criteria.
            </h3>
            <p className="font-body-md text-secondary max-w-md mx-auto">
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
