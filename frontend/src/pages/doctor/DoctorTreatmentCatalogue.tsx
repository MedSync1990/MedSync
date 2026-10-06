import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { createTreatment, deactivateTreatment, listTreatments, updateTreatment } from '../../api/treatments';

export interface TreatmentItem {
  code: string;
  name: string;
  description: string;
  category: string;
  price: string;
  insuranceEligible: boolean;
  isActive?: boolean;
}

export interface DoctorTreatmentCatalogueProps {
  canEdit?: boolean;
}

const mapTreatment = (item: Awaited<ReturnType<typeof listTreatments>>[number]): TreatmentItem => ({
  code: String(item.treatment_code),
  name: item.treatment_name,
  description: '',
  category: item.category,
  price: Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  insuranceEligible: item.is_eligible_for_insurance,
  isActive: item.is_active,
});

// ─── Stat Card Sub-component ───────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  valueColor,
}) => (
  <div className="bg-surface-card rounded-xl p-space-sm flex items-center gap-space-sm shadow-sm">
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <div>
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
        {label}
      </span>
      <span
        className={`font-headline-md text-headline-md font-bold ${valueColor ?? 'text-on-surface'}`}
      >
        {value}
      </span>
    </div>
  </div>
);

export const DoctorTreatmentCatalogue: React.FC<DoctorTreatmentCatalogueProps> = ({ canEdit: explicitCanEdit }) => {
  const { user } = useAuth();
  const canEdit = explicitCanEdit !== undefined
    ? explicitCanEdit
    : user?.role === 'Administrator' || user?.role === 'Branch Manager';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState('');

  const [treatments, setTreatments] = useState<TreatmentItem[]>([
    {
      code: 'SRV-CRD-01',
      name: 'Cardiology Specialist Consultation',
      description: 'Initial or follow-up physical examination with hemodynamics review',
      category: 'Consultation',
      price: '3,500.00',
      insuranceEligible: true,
      isActive: true,
    },
    {
      code: 'SRV-DIA-04',
      name: '12-Lead Electrocardiogram (ECG)',
      description: 'Standard digital resting rhythm trace with computer interpretation',
      category: 'Diagnostics',
      price: '1,800.00',
      insuranceEligible: true,
      isActive: true,
    },
    {
      code: 'SRV-CRD-08',
      name: '2D Transthoracic Echocardiogram',
      description: 'Complete spectral and color Doppler structural valve imaging',
      category: 'Cardiology',
      price: '8,500.00',
      insuranceEligible: true,
      isActive: true,
    },
    {
      code: 'SRV-LAB-12',
      name: 'Blood Glucose Random (RBS)',
      description: 'Immediate capillary blood glucose evaluation stat testing',
      category: 'Laboratory',
      price: '450.00',
      insuranceEligible: false,
      isActive: true,
    },
    {
      code: 'SRV-LAB-22',
      name: 'Lipid Profile Full Panel',
      description: 'Total cholesterol, HDL, LDL, VLDL, and serum triglycerides',
      category: 'Laboratory',
      price: '2,200.00',
      insuranceEligible: true,
      isActive: true,
    },
    {
      code: 'SRV-RAD-03',
      name: 'Chest X-Ray (PA View)',
      description: 'Standard digital thoracic radiographic exposure',
      category: 'Radiology',
      price: '2,400.00',
      insuranceEligible: true,
      isActive: true,
    },
    {
      code: 'SRV-PRC-09',
      name: 'Emergency Defibrillation & Cardioversion',
      description: 'Direct current synchronous restoration of sinus rhythm',
      category: 'Procedures',
      price: '12,000.00',
      insuranceEligible: true,
      isActive: true,
    },
  ]);

  // Derived Stats
  const totalCatalogued = treatments.length;
  const insuranceEligibleCount = treatments.filter((t) => t.insuranceEligible).length;
  const outOfPocketCount = treatments.filter((t) => !t.insuranceEligible).length;

  // Modal State for Admin Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TreatmentItem | null>(null);
  const [formData, setFormData] = useState<TreatmentItem>({
    code: '',
    name: '',
    description: '',
    category: 'Consultation',
    price: '',
    insuranceEligible: true,
  });
  const [formError, setFormError] = useState('');

  const categories = ['All', 'Cardiology', 'Consultation', 'Diagnostic', 'Laboratory', 'Radiology', 'Procedure', 'Preventive'];

  useEffect(() => {
    let mounted = true;
    listTreatments(true)
      .then((items) => {
        if (mounted) setTreatments(items.map(mapTreatment));
      })
      .catch(() => {
        if (mounted) setLoadError('Unable to load the treatment catalogue. Please try again.');
      });
    return () => {
      mounted = false;
    };
  }, []);

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

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: `SRV-NEW-0${treatments.length + 1}`,
      name: '',
      description: '',
      category: 'Consultation',
      price: '',
      insuranceEligible: true,
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: TreatmentItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setFormError('');
    setIsModalOpen(true);
  };

  // Confirm Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<TreatmentItem | null>(null);

  const handleDeleteClick = (item: TreatmentItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await deactivateTreatment(Number(deleteTarget.code));
        setTreatments((prev) => prev.map((item) => item.code === deleteTarget.code ? { ...item, isActive: false } : item));
        setDeleteTarget(null);
      } catch {
        setLoadError('Unable to deactivate this treatment. Please try again.');
      }
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = formData.code.trim().toUpperCase();
    const normalizedName = formData.name.trim();
    const normalizedPrice = formData.price.replace(/,/g, '').trim();
    const price = Number(normalizedPrice);
    const duplicateCode = treatments.some(
      (item) => item.code.toUpperCase() === normalizedCode && item.code !== editingItem?.code,
    );

    if (!normalizedCode || !normalizedName || !Number.isFinite(price) || price <= 0) {
      setFormError('Enter a treatment code, name, and a valid price greater than zero.');
      return;
    }
    if (duplicateCode) {
      setFormError('Treatment codes must be unique.');
      return;
    }

    const savedItem = {
      ...formData,
      code: normalizedCode,
      name: normalizedName,
      description: formData.description.trim(),
      price: price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
    try {
      const payload = {
        treatment_name: savedItem.name,
        category: savedItem.category,
        price,
        is_eligible_for_insurance: savedItem.insuranceEligible,
      };
      const response = editingItem
        ? await updateTreatment(Number(editingItem.code), payload)
        : await createTreatment(payload);
      const persistedItem = mapTreatment(response);
      if (editingItem) {
        setTreatments((current) => current.map((item) => item.code === editingItem.code ? persistedItem : item));
      } else {
        setTreatments((current) => [...current, persistedItem]);
      }
    } catch {
      setFormError('Unable to save this treatment. Please try again.');
      return;
    }
    setFormError('');
    setIsModalOpen(false);
  };

  const handleExport = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ['Code', 'Name', 'Description', 'Category', 'Price (LKR)', 'Insurance Eligible'],
      ...treatments.map((item) => [
        item.code,
        item.name,
        item.description,
        item.category,
        item.price,
        item.insuranceEligible ? 'Yes' : 'No',
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'treatment-catalogue.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const lines = String(reader.result || '').trim().split(/\r?\n/);
      const imported = lines.slice(1).map((line) => {
        const values = line.match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)?.map((value) => value.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
        return {
          code: values[0]?.trim().toUpperCase() || '',
          name: values[1]?.trim() || '',
          description: values[2]?.trim() || '',
          category: values[3]?.trim() || 'Consultation',
          price: values[4]?.trim() || '',
          insuranceEligible: values[5]?.trim().toLowerCase() === 'yes',
        };
      }).filter((item) => item.code && item.name && Number.isFinite(Number(item.price.replace(/,/g, ''))));

      if (imported.length === 0) return;
      try {
        const persisted = await Promise.all(imported.map((item) => createTreatment({
          treatment_name: item.name,
          category: item.category,
          price: Number(item.price.replace(/,/g, '')),
          is_eligible_for_insurance: item.insuranceEligible,
        })));
        setTreatments((current) => [...current, ...persisted.map(mapTreatment)]);
      } catch {
        setLoadError('Unable to import the treatment catalogue. Please check the CSV and try again.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-content-max-width mx-auto py-space-lg space-y-space-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-space-2xs">
            <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">Manage Treatment Catalogue</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md ${canEdit ? 'bg-primary/10 text-primary font-semibold' : 'bg-surface-subtle text-secondary'
              }`}>
              <span className="material-symbols-outlined text-[14px]">
                {canEdit ? 'admin_panel_settings' : 'lock'}
              </span>
              {canEdit ? 'Management Mode' : 'Reference Only'}
            </span>
          </div>
          <p className="font-body-md text-body-md text-secondary">
            {canEdit
              ? 'Add or update treatments, prices, and insurance eligibility.'
              : 'Reference list of available treatments and prices. Pre-configured for clinical consultations.'}
          </p>
        </div>

        {/* Quick Context Pill / Admin Action */}
        {canEdit ? (
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-card border border-border-subtle text-brand-navy-deep font-label-md text-label-md font-medium hover:bg-surface-subtle transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">file_upload</span>
              <span>Import Procedures</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-card border border-border-subtle text-brand-navy-deep font-label-md text-label-md font-medium hover:bg-surface-subtle transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
              <span>Export Catalogue (CSV)</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-label-lg text-label-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Add Treatment</span>
            </button>
            <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImport} className="hidden" />
          </div>
        ) : (
          <div className="flex items-center gap-space-sm bg-surface-card px-space-md py-space-xs rounded-xl shadow-sm border border-border-subtle">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">location_on</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Assigned Branch</span>
              <span className="font-label-lg text-label-lg text-brand-navy-deep">{user?.branchName || 'Colombo Central Branch'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat ribbon ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm mb-space-md">
        <StatCard
          icon="format_list_bulleted"
          label="Total Catalogued"
          value={totalCatalogued}
          iconBg="bg-status-scheduled-bg"
          iconColor="text-status-scheduled-text"
        />
        <StatCard
          icon="check_circle"
          label="Insurance Eligible"
          value={insuranceEligibleCount}
          iconBg="bg-status-completed-bg"
          iconColor="text-status-completed-text"
          valueColor="text-status-completed-text"
        />
        <StatCard
          icon="do_not_disturb_on"
          label="Out-of-Pocket Only"
          value={outOfPocketCount}
          iconBg="bg-status-cancelled-bg"
          iconColor="text-status-cancelled-text"
          valueColor="text-status-cancelled-text"
        />
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
          {loadError && (
            <p className="mt-space-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
          )}
        </div>

        {/* Category Filter Pills Bar */}
        <div className="px-space-md py-space-sm overflow-x-auto flex items-center gap-2 border-b border-border-subtle bg-surface-subtle/40">
          <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mr-1 shrink-0">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full font-label-md text-label-md transition-all shrink-0 ${selectedCategory === cat
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
                <th className="px-space-md py-2 w-40 text-center font-semibold" scope="col">Status</th>
                <th className="px-space-md py-2 w-48 text-center font-semibold" scope="col">Insurance-Eligible</th>
                <th className="px-space-md py-2 w-28 text-center font-semibold" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle font-body-md text-body-md text-on-surface">
              {filteredTreatments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-space-md py-space-xl text-center text-secondary">
                    No treatments match the current search or category filter.
                  </td>
                </tr>
              ) : filteredTreatments.map((item) => (
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
                    {item.isActive === false ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-slate-100 text-slate-600 font-semibold">
                        Inactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-md text-label-md bg-status-completed-bg text-status-completed-text font-semibold">
                        Active
                      </span>
                    )}
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
                    <div className="flex items-center justify-center gap-1">
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

                      {canEdit && (
                        <>
                          <button
                            className="p-1 rounded-md text-secondary hover:text-primary hover:bg-surface-variant transition-colors"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Treatment"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {item.isActive !== false && (
                            <button
                              className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              onClick={() => handleDeleteClick(item)}
                              title="Deactivate Treatment"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Add / Edit Modal */}
      <Modal
        isOpen={canEdit && isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Treatment Item' : 'Add New Treatment'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-space-md h-[42px] font-label-lg text-label-lg font-bold text-on-surface-variant bg-surface-card hover:bg-surface-subtle border border-border-subtle rounded-lg shadow-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              className="px-space-md h-[42px] font-label-lg text-label-lg font-bold bg-primary hover:bg-primary-container text-on-primary rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{editingItem ? 'Save Changes' : 'Add Treatment'}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-space-md">
          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}
          <div>
            <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
              Treatment Code
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-surface-card focus:outline-none text-body-md font-mono-data text-on-surface"
              placeholder="e.g. SRV-CRD-10"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
              Treatment / Service Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-surface-card focus:outline-none text-body-md text-on-surface"
              placeholder="e.g. Echocardiogram"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 rounded-lg border border-border-subtle bg-surface-card focus:outline-none text-body-md text-on-surface"
              placeholder="Brief service description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-space-md">
            <div>
              <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-surface-card focus:outline-none text-body-md text-on-surface"
              >
                {categories.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">
                Price (LKR)
              </label>
              <input
                type="text"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-surface-card focus:outline-none text-body-md font-mono-data text-on-surface"
                placeholder="e.g. 3,500.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="insuranceEligible"
              checked={formData.insuranceEligible}
              onChange={(e) => setFormData({ ...formData, insuranceEligible: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border-subtle cursor-pointer"
            />
            <label htmlFor="insuranceEligible" className="font-label-md text-label-md text-on-surface font-medium cursor-pointer">
              Eligible for Insurance Claim
            </label>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Deactivate / Delete Treatment"
        message={`Are you sure you want to deactivate treatment "${deleteTarget?.name}" (${deleteTarget?.code})? This procedure will no longer be prescribable.`}
        confirmLabel="Deactivate Treatment"
        isDestructive={true}
      />
    </div>
  );
};

