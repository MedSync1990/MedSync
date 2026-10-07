import type { FormEvent } from 'react';

interface InvoiceSearchProps {
  searchQuery: string;
  invoiceId?: string;
  onSearchQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onQuickLookup: () => void;
}

export default function InvoiceSearch({
  searchQuery,
  invoiceId,
  onSearchQueryChange,
  onSubmit,
  onQuickLookup,
}: InvoiceSearchProps) {
  return (
    <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-md">
      <form onSubmit={onSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-[20px] pointer-events-none">
            search
          </span>
          <input
            className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-10 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
            id="invoiceSearchInput"
            placeholder="Search by invoice code, patient name, patient code, NIC, or phone..."
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep transition-colors cursor-pointer"
              title="Clear search"
              onClick={() => onSearchQueryChange('')}
            >
              <span className="material-symbols-outlined text-[20px]">cancel</span>
            </button>
          )}
        </div>

        {/* Search button */}
        <button
          type="submit"
          className="h-[42px] px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
          <span>Search</span>
        </button>
      </form>

      {/* Quick lookup samples */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider mr-1">
          Quick Sample Invoices:
        </span>
        <button
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors cursor-pointer ${
            invoiceId === '2' || invoiceId === 'INV-000002'
              ? 'bg-status-scheduled-bg text-status-scheduled-text border border-brand-teal-light/30 shadow-sm'
              : 'bg-surface-subtle hover:bg-surface-container text-on-surface-variant'
          }`}
          onClick={onQuickLookup}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">receipt</span>
          <span>Invoice #2 (INV-000002)</span>
        </button>
      </div>
    </div>
  );
}