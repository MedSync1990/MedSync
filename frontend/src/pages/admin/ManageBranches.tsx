import React, { useState, useEffect, useMemo } from 'react';
import {
  listBranches,
  createBranch,
  updateBranch,
  deactivateBranch,
  reactivateBranch,
} from '../../api/branches';
import type { BranchCreatePayload } from '../../api/branches';
import { getStaffList } from '../../api/staff';
import type { BranchResponse, StaffResponse } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../api/client';

export const ManageBranches: React.FC = () => {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [managersList, setManagersList] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Drawer / Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formManagerId, setFormManagerId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Deactivation Dialog State
  const [deactivatingBranch, setDeactivatingBranch] = useState<BranchResponse | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);

  // Reactivation Dialog State
  const [reactivatingBranch, setReactivatingBranch] = useState<BranchResponse | null>(null);
  const [isReactivating, setIsReactivating] = useState<boolean>(false);

  // Fetch Branches & Eligible Branch Managers on Mount
  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchData, staffData] = await Promise.all([
        listBranches(),
        getStaffList().catch(() => ({ data: [], total: 0 })),
      ]);
      setBranches(Array.isArray(branchData) ? branchData : []);

      const staffList = Array.isArray(staffData?.data)
        ? staffData.data
        : Array.isArray((staffData as any)?.staff)
        ? (staffData as any).staff
        : [];

      // Filter staff members who strictly have the Branch Manager role
      const eligibleManagers = staffList.filter(
        (s: StaffResponse) => s.role_name === 'Branch Manager' && s.is_active
      );
      setManagersList(eligibleManagers);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load branches data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Drawer for Creating New Branch
  const handleOpenAddDrawer = () => {
    setEditingBranch(null);
    setFormName('');
    setFormAddress('');
    setFormPhone('');
    setFormManagerId('');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Editing Branch
  const handleOpenEditDrawer = (branch: BranchResponse) => {
    setEditingBranch(branch);
    setFormName(branch.name);
    setFormAddress(branch.address);
    const cleanPhone = branch.phone_number.replace(/\D/g, '').slice(-10);
    setFormPhone(cleanPhone || branch.phone_number);
    setFormManagerId(branch.branch_manager_id ? String(branch.branch_manager_id) : '');
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingBranch(null);
    setFormError(null);
  };

  // Handle Form Submission (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Branch name is required.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError('Branch address is required.');
      return;
    }

    const cleanPhone = formPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFormError('Contact phone number must be exactly 10 digits (e.g., 0112589901).');
      return;
    }

    const payload: BranchCreatePayload = {
      name: formName.trim(),
      address: formAddress.trim(),
      phone_number: cleanPhone,
      branch_manager_id: formManagerId ? parseInt(formManagerId, 10) : null,
    };

    try {
      setIsSubmitting(true);
      if (editingBranch) {
        await updateBranch(editingBranch.branch_id, payload);
        showToast(`Branch "${payload.name}" updated successfully`, 'success');
      } else {
        await createBranch(payload);
        showToast(`Branch "${payload.name}" created successfully`, 'success');
      }
      handleCloseDrawer();
      fetchData();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(err?.message || 'Failed to save branch. Please check inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Deactivation Action
  const handleConfirmDeactivate = async () => {
    if (!deactivatingBranch) return;

    try {
      setIsDeactivating(true);
      await deactivateBranch(deactivatingBranch.branch_id);
      showToast(`Branch "${deactivatingBranch.name}" deactivated`, 'success');
      setDeactivatingBranch(null);
      fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to deactivate branch', 'error');
      setDeactivatingBranch(null);
    } finally {
      setIsDeactivating(false);
    }
  };

  // Confirm Reactivation Action
  const handleConfirmReactivate = async () => {
    if (!reactivatingBranch) return;

    try {
      setIsReactivating(true);
      await reactivateBranch(reactivatingBranch.branch_id);
      showToast(`Branch "${reactivatingBranch.name}" reactivated successfully`, 'success');
      setReactivatingBranch(null);
      fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to reactivate branch', 'error');
      setReactivatingBranch(null);
    } finally {
      setIsReactivating(false);
    }
  };

  // Filtered Branches List
  const filteredBranches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return branches.filter((b) => {
      const matchQ =
        !q ||
        [b.name, b.address, b.phone_number, b.branch_manager_name].some((v) =>
          v?.toLowerCase().includes(q)
        );
      const matchS =
        statusFilter === 'all' ||
        (statusFilter === 'active' && b.is_active) ||
        (statusFilter === 'inactive' && !b.is_active);
      return matchQ && matchS;
    });
  }, [branches, statusFilter, searchQuery]);

  // Derived KPI Stats
  const activeCount = useMemo(() => branches.filter((b) => b.is_active).length, [branches]);
  const totalStaffCount = useMemo(
    () => branches.reduce((acc, b) => acc + (b.staff_count || 0), 0),
    [branches]
  );

  return (
    <div className="flex flex-col w-full min-h-screen bg-canvas-bg font-sans text-brand-navy-deep antialiased">
      <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full space-y-space-lg">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-label-sm text-outline uppercase tracking-wider">
              <span className="text-primary font-bold">Manage Branches</span>
            </div>
            <h1 className="text-display-lg tracking-tight">Manage Branches</h1>
            <p className="text-body-md text-on-surface-variant">
              Clinic branch locations across the healthcare network. Add locations, assign managers, and manage branch statuses.
            </p>
          </div>
          <div className="flex gap-space-sm">
            <button
              type="button"
              onClick={handleOpenAddDrawer}
              className="h-10 px-space-lg rounded-xl bg-border-focus hover:bg-status-scheduled-text text-on-primary text-label-md shadow-sm flex items-center gap-2 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[20px]">add_business</span>
              Add branch
            </button>
          </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">domain</span>
            </div>
            <div>
              <p className="text-label-sm uppercase text-outline tracking-wider">Total branches</p>
              <div className="flex items-baseline gap-2">
                <span className="text-headline-md">{branches.length}</span>
                <span className="text-body-sm text-on-surface-variant">{activeCount} active</span>
              </div>
            </div>
          </div>

          <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-xl bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">apartment</span>
            </div>
            <div>
              <p className="text-label-sm uppercase text-outline tracking-wider">Active hubs</p>
              <div className="flex items-baseline gap-2">
                <span className="text-headline-md">{activeCount}</span>
              </div>
            </div>
          </div>

          <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-xl bg-status-pending-bg text-status-pending-text flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">groups</span>
            </div>
            <div>
              <p className="text-label-sm uppercase text-outline tracking-wider">Staff assigned</p>
              <div className="flex items-baseline gap-2">
                <span className="text-headline-md">{totalStaffCount}</span>
              </div>
            </div>
          </div>

          <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-xl bg-surface-subtle text-outline flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">domain_disabled</span>
            </div>
            <div>
              <p className="text-label-sm uppercase text-outline tracking-wider">Inactive</p>
              <div className="flex items-baseline gap-2">
                <span className="text-headline-md">{branches.length - activeCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-space-md py-space-sm bg-surface-subtle flex items-center gap-2 border-b border-border-subtle">
            <span className="text-headline-sm">Clinic branches</span>
            <span className="text-label-sm text-outline px-2 py-0.5 rounded bg-surface-card">
              Showing {filteredBranches.length} of {branches.length}
            </span>
          </div>

          {/* Underline Tabs */}
          <div className="px-space-md border-b border-border-subtle flex gap-space-lg overflow-x-auto">
            {[
              { id: 'all', label: 'All', count: branches.length },
              { id: 'active', label: 'Active', count: activeCount },
              { id: 'inactive', label: 'Inactive', count: branches.length - activeCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`h-11 -mb-px border-b-2 text-label-md whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'border-border-focus text-brand-navy-deep font-semibold'
                    : 'border-transparent text-outline hover:text-brand-navy-deep'
                }`}
              >
                {tab.label} <span className="ml-1 text-label-sm text-outline">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="p-space-md grid grid-cols-1 lg:grid-cols-12 gap-3 items-center border-b border-surface-subtle">
            <div className="lg:col-span-8 relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-subtle focus:bg-surface-card placeholder-outline focus:outline-none shadow-inner text-body-md"
                placeholder="Search branch name, address, manager, phone..."
              />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="h-10 px-3 rounded-xl bg-surface-subtle hover:bg-surface-container text-outline hover:text-brand-navy-deep text-label-md flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>Clear filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-subtle h-11 text-label-sm text-outline uppercase tracking-wider">
                  <th className="px-space-md font-semibold">Branch</th>
                  <th className="px-space-md font-semibold">Address</th>
                  <th className="px-space-md font-semibold">Manager</th>
                  <th className="px-space-md font-semibold">Staff count</th>
                  <th className="px-space-md font-semibold">Status</th>
                  <th className="px-space-md font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle">
                {filteredBranches.map((branch) => (
                  <tr
                    key={branch.branch_id}
                    className="hover:bg-surface-subtle/70 transition-colors"
                  >
                    {/* Branch (NO profile picture or initials circle) */}
                    <td className="px-space-md py-3">
                      <div className="min-w-0">
                        <span className="text-label-lg font-medium text-brand-navy-deep hover:text-border-focus block">
                          {branch.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-label-sm px-1.5 py-0.5 rounded bg-surface-container font-semibold text-primary">
                            BR-{branch.branch_id}
                          </span>
                          <span className="text-body-sm text-outline font-mono">
                            · {branch.phone_number}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-space-md py-3">
                      <span className="text-body-md text-brand-navy-deep">{branch.address}</span>
                    </td>

                    <td className="px-space-md py-3 whitespace-nowrap">
                      {branch.branch_manager_name ? (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-outline">
                            account_circle
                          </span>
                          <span className="text-label-md font-medium text-brand-navy-deep">
                            {branch.branch_manager_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-body-sm text-outline italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-space-md py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-label-md font-medium text-brand-navy-deep">
                        <span className="material-symbols-outlined text-[18px] text-outline">groups</span>
                        {branch.staff_count || 0}
                      </span>
                    </td>

                    <td className="px-space-md py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm ${
                          branch.is_active
                            ? 'bg-status-completed-bg text-status-completed-text'
                            : 'bg-surface-subtle text-outline'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            branch.is_active ? 'bg-status-completed-text' : 'bg-outline'
                          }`}
                        />
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-space-md py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditDrawer(branch)}
                          title="Edit details"
                          className="p-1.5 rounded-lg text-outline hover:text-brand-navy-deep hover:bg-surface-subtle transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {branch.is_active ? (
                          <button
                            type="button"
                            onClick={() => setDeactivatingBranch(branch)}
                            title="Deactivate branch"
                            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/60 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">domain_disabled</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReactivatingBranch(branch)}
                            title="Reactivate branch"
                            className="p-1.5 rounded-lg text-status-completed-text hover:bg-status-completed-bg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">domain_verification</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredBranches.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="p-space-xl text-center">
                      <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center text-outline mx-auto mb-space-sm">
                        <span className="material-symbols-outlined text-[28px]">search_off</span>
                      </div>
                      <h3 className="text-headline-sm">No branches match these filters</h3>
                      <p className="text-body-sm text-on-surface-variant mt-1 mb-space-md">
                        Try a different search term or clear the filters.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="h-10 px-space-md rounded-xl bg-border-focus text-on-primary text-label-md"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={6} className="p-space-xl text-center">
                      <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
                        hourglass_empty
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer for Add/Edit Branch */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-brand-navy-deep/40 backdrop-blur-sm z-[60] transition-opacity"
            onClick={handleCloseDrawer}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-surface-card shadow-2xl z-[70] flex flex-col overflow-y-auto animate-slide-in-right">
            <div className="p-space-lg bg-surface-subtle flex items-center justify-between shrink-0 border-b border-surface-subtle">
              <div className="space-y-0.5">
                <span className="text-label-sm text-primary uppercase tracking-wider">
                  {editingBranch ? 'Update location' : 'New branch'}
                </span>
                <h2 className="text-headline-md font-bold">
                  {editingBranch ? `Edit: ${editingBranch.name}` : 'Add clinic branch'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="p-2 rounded-xl text-outline hover:text-brand-navy-deep hover:bg-surface-card transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0">
              <div className="p-space-lg space-y-space-md flex-1 overflow-y-auto">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-error-container/60 border border-error/20 text-error text-body-sm font-medium">
                    {formError}
                  </div>
                )}

                <h3 className="text-label-sm text-primary uppercase tracking-wider pb-1 border-b border-surface-subtle font-bold">
                  Branch Information
                </h3>

                <div className="space-y-1.5">
                  <label className="text-label-md font-semibold">
                    Branch name <span className="text-error">*</span>
                  </label>
                  <input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Colombo Central Hub"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-label-md font-semibold">
                    Contact phone <span className="text-error">*</span>
                  </label>
                  <input
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    placeholder="0112589901"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono"
                  />
                  <p className="text-body-sm text-outline">10 digits starting with 0</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-label-md font-semibold">
                    Address <span className="text-error">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Street address, city, province"
                    className="w-full p-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus resize-none"
                  />
                </div>

                <h3 className="text-label-sm text-primary uppercase tracking-wider pb-1 border-b border-surface-subtle font-bold mt-space-lg">
                  Operations & Management
                </h3>

                <div className="space-y-1.5">
                  <label className="text-label-md font-semibold">Branch manager</label>
                  <select
                    value={formManagerId}
                    onChange={(e) => setFormManagerId(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus"
                  >
                    <option value="">Select a manager (Optional)</option>
                    {managersList.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.first_name} {m.last_name} {m.branch_name ? `(Current branch: ${m.branch_name})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-body-sm text-outline">
                    Selecting a manager will switch their assigned branch to this branch.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-body-sm text-on-surface-variant p-3 bg-surface-subtle rounded-xl mt-4 border border-border-subtle">
                  <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
                  <span>
                    Saving branch configuration binds appointment availability slots and doctor schedules automatically.
                  </span>
                </div>
              </div>

              <div className="p-space-md border-t border-surface-subtle flex justify-end gap-3 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="h-10 px-space-md rounded-xl text-label-md bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-space-md rounded-xl text-label-md bg-border-focus hover:bg-status-scheduled-text text-on-primary shadow-sm flex items-center gap-2 font-bold transition-colors disabled:opacity-70"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {isSubmitting ? 'Saving...' : editingBranch ? 'Save changes' : 'Create branch'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Deactivation Confirmation / Warning Dialog */}
      {deactivatingBranch && (() => {
        const hasMembers = Boolean(deactivatingBranch.staff_count && deactivatingBranch.staff_count > 0);
        return (
          <ConfirmDialog
            isOpen={Boolean(deactivatingBranch)}
            onClose={() => setDeactivatingBranch(null)}
            onConfirm={handleConfirmDeactivate}
            title={
              hasMembers
                ? `Cannot Deactivate Branch: ${deactivatingBranch.name}`
                : `Deactivate Branch: ${deactivatingBranch.name}`
            }
            message={
              hasMembers
                ? `This branch currently has ${(deactivatingBranch.staff_count ?? 0)} active staff member${(deactivatingBranch.staff_count ?? 0) > 1 ? 's' : ''} assigned. Branches with active staff cannot be deactivated. Please reassign or deactivate all staff members before deactivating this branch.`
                : `Are you sure you want to deactivate "${deactivatingBranch.name}"? This location will no longer accept new appointments.`
            }
            confirmLabel={isDeactivating ? 'Deactivating...' : 'Deactivate branch'}
            cancelLabel={hasMembers ? 'Close' : 'Cancel'}
            isDestructive={true}
            showConfirm={!hasMembers}
          />
        );
      })()}

      {/* Reactivation Confirmation Dialog */}
      {reactivatingBranch && (
        <ConfirmDialog
          isOpen={Boolean(reactivatingBranch)}
          onClose={() => setReactivatingBranch(null)}
          onConfirm={handleConfirmReactivate}
          title={`Reactivate Branch: ${reactivatingBranch.name}`}
          message={`Are you sure you want to reactivate "${reactivatingBranch.name}"? This location will become active and resume accepting appointments and doctor schedules.`}
          confirmLabel={isReactivating ? 'Reactivating...' : 'Reactivate branch'}
          cancelLabel="Cancel"
          isDestructive={false}
          showConfirm={true}
        />
      )}
    </div>
  );
};

export default ManageBranches;
