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
    <div className="bg-surface-card rounded-2xl p-space-lg border border-border-subtle shadow-sm space-y-4">
      <form onSubmit={onSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-shrink-0 flex bg-surface-subtle p-1 rounded-xl border border-border-subtle h-14">
          <button
            type="button"
            className={`flex-1 px-4 rounded-lg font-label-lg transition-all ${searchType === 'invoice' ? 'bg-surface-card shadow-sm text-brand-navy-deep' : 'text-outline hover:text-brand-navy-deep'}`}
            onClick={() => handleTypeChange('invoice')}
          >
            Invoice
          </button>
          <button
            type="button"
            className={`flex-1 px-4 rounded-lg font-label-lg transition-all ${searchType === 'nic' ? 'bg-surface-card shadow-sm text-brand-navy-deep' : 'text-outline hover:text-brand-navy-deep'}`}
            onClick={() => handleTypeChange('nic')}
          >
            NIC
          </button>
        </div>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-[26px]">search</span>
          <input
            className="w-full h-14 pl-12 pr-10 rounded-xl bg-surface-subtle text-brand-navy-deep placeholder:text-outline font-body-md text-[18px] focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus border border-border-subtle transition-all"
            id="invoiceSearchInput"
            placeholder={searchType === 'invoice' ? 'Enter Invoice Code (e.g. INV-000002)...' : 'Enter Patient NIC (e.g. 900000000001)...'}
            type="text"
            value={searchQuery}
            onChange={(event) => handleQueryChange(event.target.value)}
          />
          {searchQuery && searchQuery !== 'INV-' && (
            <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep" title="Clear search" onClick={() => onSearchQueryChange(searchType === 'invoice' ? 'INV-' : '')}>
              <span className="material-symbols-outlined text-[22px]">cancel</span>
            </button>
          )}
        </div>
        <button type="submit" className="h-14 px-7 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-[18px] inline-flex items-center justify-center gap-2 shadow-sm transition-all">
          <span className="material-symbols-outlined text-[22px]">search</span>
          <span>Search</span>
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="font-label-sm text-[15px] text-outline uppercase tracking-wider mr-1">Quick Sample Invoices:</span>
        <button
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-[16px] transition-colors ${invoiceId === '2' || invoiceId === 'INV-000002' ? 'bg-status-scheduled-bg text-status-scheduled-text border border-brand-teal-light/30 shadow-sm' : 'bg-surface-subtle hover:bg-surface-container text-on-surface-variant'}`}
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