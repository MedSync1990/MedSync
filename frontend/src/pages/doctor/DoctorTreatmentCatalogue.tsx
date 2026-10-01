import React, { useState } from 'react';

interface TreatmentItem {
  code: string;
  name: string;
  description: string;
  category: string;
  price: string;
  insuranceEligible: boolean;
}

export const DoctorTreatmentCatalogue: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const treatments: TreatmentItem[] = [
    {
      code: 'SRV-CRD-01',
      name: 'Cardiology Specialist Consultation',
      description: 'Initial or follow-up physical examination with hemodynamics review',
      category: 'Consultation',
      price: '3,500.00',
      insuranceEligible: true,
    },
    {
      code: 'SRV-DIA-04',
      name: '12-Lead Electrocardiogram (ECG)',
      description: 'Standard digital resting rhythm trace with computer interpretation',
      category: 'Diagnostics',
      price: '1,800.00',
      insuranceEligible: true,
    },
    {
      code: 'SRV-CRD-08',
      name: '2D Transthoracic Echocardiogram',
      description: 'Complete spectral and color Doppler structural valve imaging',
      category: 'Cardiology',
      price: '8,500.00',
      insuranceEligible: true,
    },
    {
      code: 'SRV-LAB-12',
      name: 'Blood Glucose Random (RBS)',
      description: 'Immediate capillary blood glucose evaluation stat testing',
      category: 'Laboratory',
      price: '450.00',
      insuranceEligible: false,
    },
    {
      code: 'SRV-LAB-22',
      name: 'Lipid Profile Full Panel',
      description: 'Total cholesterol, HDL, LDL, VLDL, and serum triglycerides',
      category: 'Laboratory',
      price: '2,200.00',
      insuranceEligible: true,
    },
    {
      code: 'SRV-RAD-03',
      name: 'Chest X-Ray (PA View)',
      description: 'Standard digital thoracic radiographic exposure',
      category: 'Radiology',
      price: '2,400.00',
      insuranceEligible: true,
    },
    {
      code: 'SRV-PRC-09',
      name: 'Emergency Defibrillation & Cardioversion',
      description: 'Direct current synchronous restoration of sinus rhythm',
      category: 'Procedures',
      price: '12,000.00',
      insuranceEligible: true,
    },
  ];

  const categories = ['All', 'Cardiology', 'Consultation', 'Diagnostics', 'Laboratory', 'Radiology', 'Procedures'];

  const filteredTreatments = treatments.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="w-full max-w-content-max-width mx-auto py-space-lg space-y-space-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-space-2xs">
            <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">Treatment Catalogue</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Reference Only
            </span>
          </div>
          <p className="font-body-md text-body-md text-secondary">
            Reference list of available treatments and prices. Pre-configured for clinical consultations.
          </p>
        </div>

        {/* Quick Context Pill */}
        <div className="flex items-center gap-space-sm bg-surface-card px-space-md py-space-xs rounded-xl shadow-sm border border-border-subtle">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">clinical_notes</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Assigned Department</span>
            <span className="font-label-lg text-label-lg text-brand-navy-deep">Cardiology · Wing B (Central)</span>
          </div>
        </div>
      </div>

      {/* Main Data Table & Interactive Controls Section */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col">
        {/* Search & Filters Toolbar */}
        <div className="p-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-card border-b border-border-subtle">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-secondary">
              search
            </span>
            <input
              className="w-full h-[42px] pl-10 pr-10 rounded-lg bg-surface-subtle text-brand-navy-deep font-body-md text-body-md placeholder-secondary focus:bg-surface-card focus:outline-none transition-colors border border-border-subtle"
              id="catalogue-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by treatment name, code (e.g. SRV-CRD-01)..."
              type="text"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-brand-navy-deep"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
          </div>

          {/* Meta Controls (Print & View Count) */}
          <div className="flex items-center gap-space-sm justify-between lg:justify-end">
            <div className="text-secondary font-label-md text-label-md">
              Showing <span className="font-bold text-brand-navy-deep">{filteredTreatments.length}</span> items
            </div>
            <div className="h-5 w-[1px] bg-surface-variant hidden sm:block"></div>
            <button
              className="inline-flex items-center gap-1.5 px-space-sm h-[38px] rounded-lg bg-surface-subtle hover:bg-surface-variant text-brand-navy-deep font-label-md text-label-md transition-colors border border-border-subtle"
              onClick={() => window.print()}
              title="Print treatment reference"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">print</span>
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="px-space-md py-space-sm overflow-x-auto flex items-center gap-2 border-b border-border-subtle bg-surface-subtle/40">
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mr-1 shrink-0">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full font-label-md text-label-md transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-status-scheduled-bg text-status-scheduled-text font-bold shadow-xs'
                  : 'bg-surface-card text-secondary hover:text-brand-navy-deep hover:bg-surface-subtle border border-border-subtle'
              }`}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Treatment Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider h-11 border-b border-border-subtle">
                <th className="px-space-md py-2 w-36 font-semibold" scope="col">Code</th>
                <th className="px-space-md py-2 font-semibold" scope="col">Treatment / Service Name</th>
                <th className="px-space-md py-2 w-40 font-semibold" scope="col">Category</th>
                <th className="px-space-md py-2 w-44 text-right font-semibold" scope="col">Price (LKR)</th>
                <th className="px-space-md py-2 w-48 text-center font-semibold" scope="col">Insurance-Eligible</th>
                <th className="px-space-md py-2 w-28 text-center font-semibold" scope="col">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle font-body-md text-body-md text-on-surface">
              {filteredTreatments.map((item) => (
                <tr key={item.code} className="hover:bg-surface-subtle/70 transition-colors group">
                  <td className="px-space-md py-3.5 font-mono-data text-mono-data font-semibold text-primary">
                    {item.code}
                  </td>
                  <td className="px-space-md py-3.5">
                    <div className="font-headline-sm text-headline-sm text-brand-navy-deep leading-snug">{item.name}</div>
                    <div className="font-body-sm text-body-sm text-secondary">{item.description}</div>
                  </td>
                  <td className="px-space-md py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-label-md text-label-md bg-surface-subtle text-secondary border border-border-subtle">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-space-md py-3.5 text-right font-mono-data text-mono-data font-semibold text-brand-navy-deep">
                    {item.price}
                  </td>
                  <td className="px-space-md py-3.5 text-center">
                    {item.insuranceEligible ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-status-completed-bg text-status-completed-text font-semibold">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-slate-100 text-slate-600 font-semibold">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-space-md py-3.5 text-center">
                    <button
                      className="p-1 rounded-md text-secondary hover:text-primary hover:bg-surface-variant transition-colors"
                      onClick={() => handleCopyCode(item.code)}
                      title="Copy Service Code"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {copiedCode === item.code ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
