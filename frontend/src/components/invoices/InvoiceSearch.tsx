import type { FormEvent } from 'react';

interface InvoiceSearchProps {
  searchQuery: string;
  searchType: 'invoice' | 'nic';
  invoiceId?: string;
  onSearchQueryChange: (value: string) => void;
  onSearchTypeChange: (type: 'invoice' | 'nic') => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onQuickLookup: () => void;
}

export default function InvoiceSearch({
  searchQuery,
  searchType,
  invoiceId,
  onSearchQueryChange,
  onSearchTypeChange,
  onSubmit,
  onQuickLookup,
}: InvoiceSearchProps) {
  const handleQueryChange = (value: string) => {
    let nextValue = value;
    if (searchType === 'invoice') {
      nextValue = value.toUpperCase();
      if (!nextValue.startsWith('INV-')) return;
    }
    onSearchQueryChange(nextValue);
  };

  const handleTypeChange = (type: 'invoice' | 'nic') => {
    onSearchTypeChange(type);
    onSearchQueryChange(type === 'invoice' ? 'INV-' : '');
  };

  return (
    <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-md">
      <form onSubmit={onSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search type toggle */}
        <div className="flex-shrink-0 flex bg-surface-subtle p-1 rounded-lg h-[42px]">
          <button
            type="button"
            className={`flex-1 px-4 rounded-md font-label-md text-label-md transition-all ${
              searchType === 'invoice'
                ? 'bg-surface-card shadow-sm text-primary font-semibold'
                : 'text-on-surface-variant hover:text-brand-navy-deep'
            }`}
            onClick={() => handleTypeChange('invoice')}
          >
            Invoice
          </button>
          <button
            type="button"
            className={`flex-1 px-4 rounded-md font-label-md text-label-md transition-all ${
              searchType === 'nic'
                ? 'bg-surface-card shadow-sm text-primary font-semibold'
                : 'text-on-surface-variant hover:text-brand-navy-deep'
            }`}
            onClick={() => handleTypeChange('nic')}
          >
            NIC
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-[20px] pointer-events-none">
            search
          </span>
          <input
            className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-10 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
            id="invoiceSearchInput"
            placeholder={
              searchType === 'invoice'
                ? 'Enter Invoice Code (e.g. INV-000002)...'
                : 'Enter Patient NIC (e.g. 900000000001)...'
            }
            type="text"
            value={searchQuery}
            onChange={(event) => handleQueryChange(event.target.value)}
          />
          {searchQuery && searchQuery !== 'INV-' && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep transition-colors cursor-pointer"
              title="Clear search"
              onClick={() => onSearchQueryChange(searchType === 'invoice' ? 'INV-' : '')}
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