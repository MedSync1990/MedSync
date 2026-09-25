import React, { useState, useEffect, useMemo } from 'react';
import { treatmentService } from '../../services/treatmentService';
import type { TreatmentItem } from '../../types';

export const ManageTreatmentCatalogue: React.FC = () => {
  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Consultation',
    'Diagnostic',
    'Laboratory',
    'Preventive',
    'Procedure',
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedInsurance, setSelectedInsurance] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Drawer state (Add / Edit)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCode, setEditingCode] = useState<number | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Drawer Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formInsurance, setFormInsurance] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  // Deactivate modal state
  const [deactivatingItem, setDeactivatingItem] = useState<TreatmentItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch treatments and categories
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, cats] = await Promise.all([
        treatmentService.list({ active_only: false }),
        treatmentService.getCategories(),
      ]);
      setTreatments(items || []);
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load treatment catalogue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered treatments
  const filteredTreatments = useMemo(() => {
    return treatments.filter((item) => {
      // Category filter
      if (selectedCategory !== 'All' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Insurance filter
      if (selectedInsurance === 'Eligible' && !item.is_eligible_for_insurance) {
        return false;
      }
      if (selectedInsurance === 'Out-of-Pocket' && item.is_eligible_for_insurance) {
        return false;
      }
      // Status filter
      if (selectedStatus === 'Active' && !item.is_active) {
        return false;
      }
      if (selectedStatus === 'Deactivated' && item.is_active) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeStr = `SRV-${(item.category || '').slice(0, 3).toUpperCase()}-${String(item.treatment_code).padStart(2, '0')}`.toLowerCase();
        const matchesName = item.treatment_name.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesCode = codeStr.includes(q) || String(item.treatment_code) === q;
        if (!matchesName && !matchesCat && !matchesCode) {
          return false;
        }
      }
      return true;
    });
  }, [treatments, selectedCategory, selectedInsurance, selectedStatus, searchQuery]);

  // Summary Metrics
  const totalCount = treatments.length;
  const eligibleCount = treatments.filter((t) => t.is_eligible_for_insurance).length;
  const outOfPocketCount = totalCount - eligibleCount;
  const eligiblePercent = totalCount > 0 ? ((eligibleCount / totalCount) * 100).toFixed(1) : '0.0';

  // Open Drawer for Add
  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingCode(null);
    setFormName('');
    setFormCategory(categories[0] || 'Consultation');
    setFormPrice('');
    setFormInsurance(true);
    setFormNotes('');
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (item: TreatmentItem) => {
    setIsEditing(true);
    setEditingCode(item.treatment_code);
    setFormName(item.treatment_name);
    setFormCategory(item.category);
    setFormPrice(item.price);
    setFormInsurance(item.is_eligible_for_insurance);
    setFormNotes('');
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setDrawerError('Procedure name is required.');
      return;
    }
    if (!formCategory) {
      setDrawerError('Category is required.');
      return;
    }
    if (formPrice === '' || formPrice < 0) {
      setDrawerError('Please enter a valid price in LKR.');
      return;
    }

    setDrawerLoading(true);
    setDrawerError(null);

    try {
      if (isEditing && editingCode !== null) {
        await treatmentService.update(editingCode, {
          treatment_name: formName.trim(),
          category: formCategory.trim(),
          price: Number(formPrice),
          is_eligible_for_insurance: formInsurance,
        });
        showToast(`Treatment "${formName.trim()}" updated successfully.`);
      } else {
        await treatmentService.create({
          treatment_name: formName.trim(),
          category: formCategory.trim(),
          price: Number(formPrice),
          is_eligible_for_insurance: formInsurance,
        });
        showToast(`Treatment "${formName.trim()}" added to catalogue.`);
      }
      setIsDrawerOpen(false);
      await fetchData();
    } catch (err: any) {
      setDrawerError(err?.response?.data?.message || err?.message || 'Failed to save treatment.');
    } finally {
      setDrawerLoading(false);
    }
  };

  // Handle Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivatingItem) return;
    setIsDeactivating(true);
    try {
      await treatmentService.deactivate(deactivatingItem.treatment_code);
      showToast(`Treatment "${deactivatingItem.treatment_name}" deactivated.`);
      setDeactivatingItem(null);
      await fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to deactivate treatment.', 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!treatments.length) return;
    const headers = ['Code', 'Name', 'Category', 'Price (LKR)', 'Insurance Eligible', 'Status'];
    const rows = treatments.map((t) => [
      `SRV-${t.category.slice(0, 3).toUpperCase()}-${String(t.treatment_code).padStart(2, '0')}`,
      `"${t.treatment_name.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.price,
      t.is_eligible_for_insurance ? 'Yes' : 'No',
      t.is_active ? 'Active' : 'Deactivated',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medsync_treatment_catalogue_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto py-space-lg space-y-space-lg">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl text-white shadow-2xl flex items-center gap-3 animate-fade-in border ${
            toastMessage.type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toastMessage.type === 'success' ? 'task_alt' : 'error'}
          </span>
          <span className="font-semibold text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
              Clinical Operations &amp; Pricing
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
              FR-TCM-05 Protocol
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            Manage Treatment Catalogue
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Add or update treatments, prices, and insurance eligibility across all branches.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            className="inline-flex items-center gap-space-xs px-space-md h-[42px] rounded-lg bg-surface-card text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-subtle transition-colors border border-border-subtle"
            onClick={handleExportCSV}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">file_download</span>
            <span>Export Catalogue (CSV)</span>
          </button>
          <button
            className="inline-flex items-center gap-space-xs px-space-lg h-[42px] rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary-container transition-all active:scale-[0.99]"
            onClick={handleOpenAdd}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>+ Add Treatment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md">
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
              Total Catalogued
            </span>
            <span className="font-display-lg text-display-lg font-bold text-brand-navy-deep mt-1">
              {totalCount}
            </span>
            <span className="font-body-sm text-body-sm text-status-completed-text flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> Synchronised across branches
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">clinical_notes</span>
          </div>
        </div>

        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
              Insurance Eligible
            </span>
            <span className="font-display-lg text-display-lg font-bold text-primary mt-1">
              {eligibleCount}
            </span>
            <span className="font-body-sm text-body-sm text-primary font-medium mt-0.5">
              {eligiblePercent}% of catalogue
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-status-scheduled-bg flex items-center justify-center text-status-scheduled-text">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
        </div>

        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
              Out-of-Pocket Only
            </span>
            <span className="font-display-lg text-display-lg font-bold text-status-pending-text mt-1">
              {outOfPocketCount}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Self-pay &amp; elective items
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-status-pending-bg flex items-center justify-center text-status-pending-text">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
        </div>

        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
              Audit Retention
            </span>
            <span className="font-display-lg text-display-lg font-bold text-on-surface mt-1">
              100%
            </span>
            <span className="font-body-sm text-body-sm text-status-completed-text flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">shield</span> FR-TCM-05 Compliant
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-subtle flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="relative flex-1 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              search
            </span>
            <input
              className="w-full h-[42px] pl-10 pr-space-md bg-surface-subtle rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-card border border-border-subtle"
              id="catalogueSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by treatment name, code (e.g. SRV-CRD-01), or category..."
              type="text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">Category:</span>
              <select
                className="h-[42px] px-space-sm bg-surface-subtle rounded-lg text-body-md font-body-md text-on-surface focus:outline-none cursor-pointer border border-border-subtle"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">Insurance:</span>
              <select
                className="h-[42px] px-space-sm bg-surface-subtle rounded-lg text-body-md font-body-md text-on-surface focus:outline-none cursor-pointer border border-border-subtle"
                value={selectedInsurance}
                onChange={(e) => setSelectedInsurance(e.target.value)}
              >
                <option value="All">All Tiers</option>
                <option value="Eligible">Insurance Eligible</option>
                <option value="Out-of-Pocket">Patient Out-of-Pocket</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">Status:</span>
              <select
                className="h-[42px] px-space-sm bg-surface-subtle rounded-lg text-body-md font-body-md text-on-surface focus:outline-none cursor-pointer border border-border-subtle"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="underline font-bold hover:text-rose-900">
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
              <span className="text-sm font-semibold text-secondary">Loading treatment catalogue from database...</span>
            </div>
          ) : filteredTreatments.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-5xl mb-2 text-slate-300">medication</span>
              <h3 className="text-base font-bold text-brand-navy-deep">No Treatments Found</h3>
              <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">
                No procedures match your current filters. Try resetting the search or category filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-subtle h-[44px] border-b border-border-subtle">
                  <th className="px-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Code
                  </th>
                  <th className="px-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Treatment / Procedure Name
                  </th>
                  <th className="px-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Category
                  </th>
                  <th className="px-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Standard Price (LKR)
                  </th>
                  <th className="px-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Insurance Eligibility
                  </th>
                  <th className="px-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Status
                  </th>
                  <th className="px-space-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredTreatments.map((item) => {
                  const codeDisplay = `SRV-${(item.category || '').slice(0, 3).toUpperCase()}-${String(item.treatment_code).padStart(2, '0')}`;
                  return (
                    <tr key={item.treatment_code} className="hover:bg-surface-subtle/70 transition-colors group">
                      <td className="px-space-md py-3.5">
                        <span className="font-mono-data text-mono-data text-primary font-bold px-2 py-1 rounded bg-surface-container-low">
                          {codeDisplay}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg font-bold text-on-surface">
                            {item.treatment_name}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Code #{item.treatment_code} · {item.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-space-md py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-label-md font-label-md bg-secondary-container text-on-secondary-container">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5">
                        <span className="font-mono-data text-mono-data text-on-surface font-bold">
                          LKR {Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5">
                        {item.is_eligible_for_insurance ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm bg-status-scheduled-bg text-status-scheduled-text font-semibold">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Yes - Covered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label-sm bg-slate-100 text-slate-600 font-semibold">
                            Out-of-Pocket
                          </span>
                        )}
                      </td>
                      <td className="px-space-md py-3.5">
                        {item.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-md font-label-md bg-status-completed-bg text-status-completed-text font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-completed-text"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-md font-label-md bg-status-cancelled-bg text-status-cancelled-text font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-cancelled-text"></span> Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-space-md py-3.5 text-right">
                        <div className="inline-flex items-center gap-space-xs">
                          <button
                            className="px-2.5 py-1 rounded-lg text-primary hover:bg-surface-container-low font-label-md text-label-md transition-colors font-semibold"
                            onClick={() => handleOpenEdit(item)}
                            type="button"
                          >
                            Edit
                          </button>
                          {item.is_active && (
                            <button
                              className="px-2.5 py-1 rounded-lg text-error hover:bg-error-container/40 font-label-md text-label-md transition-colors font-semibold"
                              onClick={() => setDeactivatingItem(item)}
                              type="button"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-space-md bg-surface-subtle/70 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary">info</span>
            <p className="font-body-sm text-body-sm">
              <strong className="text-on-surface font-semibold">{filteredTreatments.length} treatments listed</strong> ·
              Standard tariff prices updated in real-time. Soft-delete retention policy enforced (FR-TCM-05).
            </p>
          </div>
          <div className="text-xs text-secondary font-mono">
            Database: Connected (Neon Cloud PostgreSQL)
          </div>
        </div>
      </div>

      {/* Add / Edit Slide-over Drawer */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-brand-navy-deep/40 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => !drawerLoading && setIsDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-[540px] bg-surface-card shadow-2xl z-50 flex flex-col border-l border-border-subtle animate-slide-left">
            {/* Drawer Header */}
            <div className="h-[68px] px-space-lg flex items-center justify-between bg-surface-subtle border-b border-border-subtle">
              <div className="flex items-center gap-space-xs">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {isEditing ? 'edit_note' : 'note_add'}
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {isEditing ? 'Edit Treatment Procedure' : 'Add Treatment Procedure'}
                  </h2>
                  <span className="font-label-sm text-label-sm text-outline">Clinical Pricing &amp; Billing Master</span>
                </div>
              </div>
              <button
                className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-card transition-colors"
                onClick={() => !drawerLoading && setIsDrawerOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer Form */}
            <form className="flex-1 overflow-y-auto p-space-lg flex flex-col gap-space-md" onSubmit={handleSaveTreatment}>
              {drawerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{drawerError}</span>
                </div>
              )}

              {isEditing && editingCode && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md font-bold text-on-surface">Treatment Code</label>
                  <input
                    className="w-full h-[42px] px-3.5 bg-surface-subtle rounded-lg text-body-md font-mono-data text-secondary focus:outline-none border border-border-subtle cursor-not-allowed"
                    readOnly
                    value={`SRV-${(formCategory || '').slice(0, 3).toUpperCase()}-${String(editingCode).padStart(2, '0')} (ID: ${editingCode})`}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-bold text-on-surface">
                  Procedure / Treatment Name <span className="text-error">*</span>
                </label>
                <input
                  className="w-full h-[42px] px-3.5 bg-surface-subtle rounded-lg text-body-md font-body-md text-on-surface focus:outline-none focus:bg-surface-card border border-border-subtle"
                  placeholder="e.g. 12-Lead Electrocardiogram (ECG)"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  type="text"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-bold text-on-surface">
                  Category <span className="text-error">*</span>
                </label>
                <select
                  className="w-full h-[42px] px-3.5 bg-surface-subtle rounded-lg text-body-md font-body-md text-on-surface focus:outline-none focus:bg-surface-card cursor-pointer border border-border-subtle"
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="">Select Treatment Category...</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="Consultation">Consultation</option>
                  <option value="Diagnostic">Diagnostic</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Procedure">Procedure</option>
                  <option value="Preventive">Preventive</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-bold text-on-surface">
                  Standard Unit Price (LKR) <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-label-md text-label-md font-bold text-outline">
                    LKR
                  </span>
                  <input
                    className="w-full h-[42px] pl-12 pr-3.5 bg-surface-subtle rounded-lg text-body-md font-mono-data text-on-surface focus:outline-none focus:bg-surface-card border border-border-subtle"
                    min="0"
                    placeholder="3500"
                    required
                    step="50"
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-subtle flex items-start justify-between gap-space-md border border-border-subtle">
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg font-bold text-on-surface">Insurance Eligibility</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Enables direct insurance claim calculation per policy coverage rules.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    checked={formInsurance}
                    onChange={(e) => setFormInsurance(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-bold text-on-surface">
                  Description / Clinical Indication Notes
                </label>
                <textarea
                  className="w-full p-3.5 bg-surface-subtle rounded-lg text-body-md font-body-md text-on-surface focus:outline-none focus:bg-surface-card resize-none border border-border-subtle"
                  placeholder="Specify equipment requirements, consumables included, or clinical guidelines..."
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="p-space-md rounded-xl bg-status-scheduled-bg text-status-scheduled-text flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] shrink-0">verified</span>
                <div className="flex flex-col text-left">
                  <span className="font-label-md text-label-md font-bold">Standard Hospital Synchronisation</span>
                  <span className="font-body-sm text-body-sm">
                    Pricing directory synchronises across all branches immediately upon saving.
                  </span>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="pt-space-md mt-auto flex items-center justify-end gap-space-sm border-t border-border-subtle">
                <button
                  className="px-space-md h-[42px] rounded-lg bg-surface-card text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-subtle transition-colors border border-border-subtle"
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={drawerLoading}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-space-lg h-[42px] rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary-container transition-all flex items-center gap-2"
                  disabled={drawerLoading}
                  type="submit"
                >
                  {drawerLoading && <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>}
                  <span>{isEditing ? 'Update Treatment' : 'Save Treatment'}</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingItem && (
        <div className="fixed inset-0 bg-brand-navy-deep/50 backdrop-blur-xs z-50 flex items-center justify-center p-space-md">
          <div className="bg-surface-card rounded-2xl max-w-[460px] w-full p-space-lg shadow-2xl flex flex-col border border-border-subtle animate-scale-up">
            <div className="w-12 h-12 rounded-xl bg-status-cancelled-bg text-status-cancelled-text flex items-center justify-center mb-space-md">
              <span className="material-symbols-outlined text-[26px]">warning</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Deactivate Treatment Procedure?
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Are you sure you want to deactivate{' '}
              <span className="font-bold text-on-surface">{deactivatingItem.treatment_name}</span> (
              <span className="font-mono-data font-bold">
                SRV-{(deactivatingItem.category || '').slice(0, 3).toUpperCase()}-
                {String(deactivatingItem.treatment_code).padStart(2, '0')}
              </span>
              )?
            </p>
            <div className="mt-space-md p-space-sm rounded-lg bg-surface-subtle flex items-start gap-2 text-outline border border-border-subtle">
              <span className="material-symbols-outlined text-[18px] shrink-0 text-primary">policy</span>
              <span className="font-body-sm text-body-sm">
                Historical records are preserved per FR-TCM-05. Existing invoices and completed consultation orders remain
                fully intact.
              </span>
            </div>
            <div className="mt-space-lg flex items-center justify-end gap-space-sm">
              <button
                className="px-space-md h-[40px] rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md hover:bg-surface-subtle/80 transition-colors border border-border-subtle"
                onClick={() => setDeactivatingItem(null)}
                disabled={isDeactivating}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-space-md h-[40px] rounded-lg bg-error text-on-error font-label-md text-label-md hover:bg-on-error-container transition-colors shadow-sm flex items-center gap-1.5"
                onClick={handleConfirmDeactivate}
                disabled={isDeactivating}
                type="button"
              >
                {isDeactivating && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
                <span>Deactivate Procedure</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTreatmentCatalogue;
