import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStaffList, createStaff, deactivateStaff } from '../../api';
import type { StaffResponse } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { get } from '../../api/client';

// Helper functions
const initials = (first: string, last: string) => (first[0] + last[0]).toUpperCase();
const timeAgo = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} days ago`;
};

export const ManageStaff: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Data options
  const [roles, setRoles] = useState<{role_id: number, role_name: string}[]>([]);
  const [specialties, setSpecialties] = useState<{specialty_id: number, name: string}[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  // Form State
  const [fFirst, setFFirst] = useState('');
  const [fMid, setFMid] = useState('');
  const [fLast, setFLast] = useState('');
  const [fNic, setFNic] = useState('');
  const [fDob, setFDob] = useState('');
  const [fGender, setFGender] = useState('');
  const [fMarital, setFMarital] = useState('');
  const [fAddr, setFAddr] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fRole, setFRole] = useState('');
  const [fPhones, setFPhones] = useState<string[]>(['']);
  
  // Doctor specific fields
  const [fLicense, setFLicense] = useState('');
  const [fSpecialty, setFSpecialty] = useState('');

  const [saving, setSaving] = useState(false);
  const [credsModal, setCredsModal] = useState<{username: string, tempPw: string, name: string} | null>(null);
  
  // Actions state
  const [deactivatingStaff, setDeactivatingStaff] = useState<StaffResponse | null>(null);

  useEffect(() => {
    fetchData();
    get<{role_id: number, role_name: string}[]>('/auth/roles').then(setRoles).catch(() => {});
    get<{specialty_id: number, name: string}[]>('/specialties').then(setSpecialties).catch(() => {});
    
    const handleHash = () => {
      const match = location.hash.match(/^#staff\/(\d+)$/);
      setSelectedStaffId(match ? Number(match[1]) : null);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, [user]);

  const fetchData = () => {
    setLoading(true);
    getStaffList(user?.role === 'Administrator' ? undefined : user?.branch_id).then(res => {
      setStaff(res.data);
      setLoading(false);
    }).catch(err => {
      showToast('Failed to load staff list', 'error');
      setLoading(false);
    });
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staff.filter(s => {
      const matchQ = !q || [s.first_name, s.last_name, s.username, s.id_number, s.email, s.phone_number].some(v => v?.toLowerCase().includes(q));
      const matchR = !roleFilter || s.role_name === roleFilter;
      const matchT = activeTab === 'all' || (activeTab === 'active' && s.is_active) || (activeTab === 'inactive' && !s.is_active);
      return matchQ && matchR && matchT;
    });
  }, [staff, searchQuery, roleFilter, activeTab]);

  const activeCount = staff.filter(s => s.is_active).length;
  const lockedCount = 0; // Not fully tracked in backend list endpoint yet

  const handleAddPhone = () => {
    if (fPhones.length < 3) setFPhones([...fPhones, '']);
    else showToast('Up to 3 phone numbers per person', 'info');
  };
  const handleRemovePhone = (idx: number) => setFPhones(fPhones.filter((_, i) => i !== idx));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ph = fPhones.map(p => p.trim()).filter(Boolean);
    if (!ph.length) { showToast('At least one phone number is required.', 'error'); return; }
    
    const selectedRole = roles.find(r => r.role_id === Number(fRole));
    if (!selectedRole) { showToast('Please select a valid role.', 'error'); return; }

    if (selectedRole.role_name === 'Doctor' && (!fLicense.trim() || !fSpecialty)) {
      showToast('Doctors must have a specialty and a medical license number.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        role_id: Number(fRole),
        branch_id: user?.branch_id || 1, // Using logged in branch or default 1 for demo
        first_name: fFirst.trim(),
        middle_name: fMid.trim() || undefined,
        last_name: fLast.trim(),
        id_number: fNic.trim(),
        address: fAddr.trim(),
        birthdate: fDob,
        gender: fGender,
        email: fEmail.trim() || undefined,
        phone_number: ph[0],
        specialty: selectedRole.role_name === 'Doctor' ? fSpecialty : undefined,
        license_number: selectedRole.role_name === 'Doctor' ? fLicense.trim() : undefined,
      };

      const res = await createStaff(payload);
      showToast('Staff account created successfully', 'success');
      setIsDrawerOpen(false);
      fetchData();
      setCredsModal({ username: res.username, tempPw: res.temporary_password, name: `${fFirst} ${fLast}` });
      resetForm();
    } catch (err: any) {
      showToast(err.message || 'Failed to create staff account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFFirst(''); setFMid(''); setFLast(''); setFNic(''); setFDob('');
    setFGender(''); setFMarital(''); setFAddr(''); setFEmail(''); setFRole('');
    setFPhones(['']); setFLicense(''); setFSpecialty('');
  };

  const handleDeactivate = async () => {
    if (!deactivatingStaff) return;
    try {
      await deactivateStaff(deactivatingStaff.user_id);
      showToast(`${deactivatingStaff.first_name} deactivated`, 'success');
      setDeactivatingStaff(null);
      fetchData();
      if (selectedStaffId === deactivatingStaff.user_id) window.location.hash = '';
    } catch(err: any) {
      showToast(err.message || 'Failed to deactivate', 'error');
    }
  };

  const copyPw = () => {
    if (credsModal && navigator.clipboard) {
      navigator.clipboard.writeText(credsModal.tempPw).then(() => showToast('Password copied!', 'success'));
    }
  };

  const selectedStaff = selectedStaffId ? staff.find(s => s.user_id === selectedStaffId) : null;

  return (
    <div className="flex flex-col w-full min-h-screen bg-canvas-bg font-sans text-brand-navy-deep antialiased">
      {selectedStaff ? (
        // DETAIL VIEW
        <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full">
          <div className="space-y-1 mb-space-lg">
            <div className="flex items-center gap-1.5 text-label-sm text-outline uppercase tracking-wider">
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash=''; }} className="hover:text-primary">Manage Staff</a>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-bold">{selectedStaff.first_name} {selectedStaff.last_name}</span>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash=''; }} className="inline-flex items-center gap-1 text-label-md text-primary hover:underline">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>Back to staff list
            </a>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-space-lg items-start">
            <aside className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
              <div className="p-space-lg flex items-center gap-space-md">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-headline-md shrink-0 ${selectedStaff.is_active ? 'bg-secondary-container text-on-secondary-fixed' : 'bg-surface-subtle text-outline'}`}>
                  {initials(selectedStaff.first_name, selectedStaff.last_name)}
                </div>
                <div className="min-w-0 space-y-1">
                  <h1 className="text-headline-md leading-tight">{selectedStaff.first_name} {selectedStaff.last_name}</h1>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-label-sm ${selectedStaff.is_active ? 'bg-surface-container text-primary' : 'bg-surface-subtle text-outline'}`}>{selectedStaff.role_name}</span>
                </div>
              </div>
              <div className="px-space-lg divide-y divide-surface-subtle border-t border-surface-subtle">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-on-surface-variant">Status</span>
                  <span className="text-right font-medium">{selectedStaff.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-on-surface-variant">Username</span>
                  <span className="text-right font-medium font-mono">@{selectedStaff.username}</span>
                </div>
              </div>
              <div className="p-space-lg space-y-2 border-t border-surface-subtle bg-surface-subtle/50">
                {selectedStaff.is_active && (
                  <button onClick={() => setDeactivatingStaff(selectedStaff)} className="w-full h-10 px-space-md rounded-xl bg-error-container/60 hover:bg-error-container text-error text-label-md flex items-center justify-center gap-1.5 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">person_off</span>Deactivate account
                  </button>
                )}
              </div>
            </aside>
            <div className="space-y-space-md min-w-0">
              <section className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                <div className="px-space-md py-space-sm bg-surface-subtle flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">person</span>
                  <h2 className="text-headline-sm">Personal information</h2>
                </div>
                <dl className="divide-y divide-surface-subtle">
                  <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                    <dt className="text-on-surface-variant">Full name</dt>
                    <dd className="text-label-md font-medium">{selectedStaff.first_name} {selectedStaff.last_name}</dd>
                  </div>
                  <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                    <dt className="text-on-surface-variant">NIC</dt>
                    <dd className="text-label-md font-medium font-mono">{selectedStaff.id_number}</dd>
                  </div>
                  <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                    <dt className="text-on-surface-variant">Date of birth</dt>
                    <dd className="text-label-md font-medium">{selectedStaff.birthdate ? new Date(selectedStaff.birthdate).toLocaleDateString() : 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                    <dt className="text-on-surface-variant">Gender</dt>
                    <dd className="text-label-md font-medium">{selectedStaff.gender || 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                    <dt className="text-on-surface-variant">Address</dt>
                    <dd className="text-label-md font-medium">{selectedStaff.address || 'N/A'}</dd>
                  </div>
                </dl>
              </section>
              <section className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                <div className="px-space-md py-space-sm bg-surface-subtle flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">contacts</span>
                  <h2 className="text-headline-sm">Contact</h2>
                </div>
                <dl className="divide-y divide-surface-subtle">
                  <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                    <dt className="text-on-surface-variant">Phone number</dt>
                    <dd className="text-label-md font-medium font-mono">{selectedStaff.phone_number || 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                    <dt className="text-on-surface-variant">Email</dt>
                    <dd className="text-label-md font-medium">{selectedStaff.email || 'N/A'}</dd>
                  </div>
                </dl>
              </section>
              {selectedStaff.role_name === 'Doctor' && (
                <section className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                  <div className="px-space-md py-space-sm bg-status-scheduled-bg border-b border-brand-teal-light/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-primary">local_hospital</span>
                    <h2 className="text-headline-sm text-primary">Clinical Details</h2>
                  </div>
                  <dl className="divide-y divide-surface-subtle">
                    <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant">License Number</dt>
                      <dd className="text-label-md font-medium font-mono">{selectedStaff.license_number || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-4 px-space-md py-3">
                      <dt className="text-on-surface-variant">Specialty</dt>
                      <dd className="text-label-md font-medium">{selectedStaff.specialty || 'N/A'}</dd>
                    </div>
                  </dl>
                </section>
              )}
            </div>
          </div>
        </div>
      ) : (
        // LIST VIEW
        <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full space-y-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-label-sm text-outline uppercase tracking-wider">
                <span className="text-primary font-bold">Manage Staff</span>
              </div>
              <h1 className="text-display-lg tracking-tight">Manage Staff</h1>
              <p className="text-body-md text-on-surface-variant">Doctors and receptionists with access to the branch. Add accounts, update details, and deactivate leavers.</p>
            </div>
            <div className="flex gap-space-sm">
              <button onClick={() => { resetForm(); setIsDrawerOpen(true); }} className="h-10 px-space-lg rounded-xl bg-border-focus hover:bg-status-scheduled-text text-on-primary text-label-md shadow-sm flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[20px]">person_add</span>Add staff
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
            <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">badge</span></div>
              <div><p className="text-label-sm uppercase text-outline tracking-wider">Total accounts</p><div className="flex items-baseline gap-2"><span className="text-headline-md">{staff.length}</span><span className="text-body-sm text-on-surface-variant">{activeCount} active</span></div></div>
            </div>
            <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">stethoscope</span></div>
              <div><p className="text-label-sm uppercase text-outline tracking-wider">Doctors</p><div className="flex items-baseline gap-2"><span className="text-headline-md">{staff.filter(s => s.role_name === 'Doctor').length}</span></div></div>
            </div>
            <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-status-pending-bg text-status-pending-text flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">support_agent</span></div>
              <div><p className="text-label-sm uppercase text-outline tracking-wider">Receptionists</p><div className="flex items-baseline gap-2"><span className="text-headline-md">{staff.filter(s => s.role_name === 'Receptionist').length}</span></div></div>
            </div>
            <div className="px-space-md py-space-sm rounded-xl bg-surface-card shadow-sm flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-surface-subtle text-outline flex items-center justify-center"><span className="material-symbols-outlined text-[22px]">person_off</span></div>
              <div><p className="text-label-sm uppercase text-outline tracking-wider">Inactive</p><div className="flex items-baseline gap-2"><span className="text-headline-md">{staff.length - activeCount}</span></div></div>
            </div>
          </div>

          <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-space-md py-space-sm bg-surface-subtle flex items-center gap-2 border-b border-border-subtle">
              <span className="text-headline-sm">Branch staff</span>
              <span className="text-label-sm text-outline px-2 py-0.5 rounded bg-surface-card">Showing {filteredStaff.length} of {staff.length}</span>
            </div>
            
            <div className="px-space-md border-b border-border-subtle flex gap-space-lg overflow-x-auto">
              {[
                { id: 'all', label: 'All', count: staff.length },
                { id: 'active', label: 'Active', count: activeCount },
                { id: 'inactive', label: 'Inactive', count: staff.length - activeCount }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`h-11 -mb-px border-b-2 text-label-md whitespace-nowrap ${activeTab === tab.id ? 'border-border-focus text-brand-navy-deep' : 'border-transparent text-outline hover:text-brand-navy-deep'}`}>
                  {tab.label} <span className="ml-1 text-label-sm text-outline">{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="p-space-md grid grid-cols-1 lg:grid-cols-12 gap-3 items-center border-b border-surface-subtle">
              <div className="lg:col-span-6 relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-subtle focus:bg-surface-card placeholder-outline focus:outline-none shadow-inner" placeholder="Search name, NIC, username..." />
              </div>
              <div className="lg:col-span-3 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">badge</span>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full h-10 pl-9 pr-8 rounded-xl bg-surface-subtle appearance-none cursor-pointer outline-none">
                  <option value="">All roles</option>
                  {roles.map(r => <option key={r.role_id} value={r.role_name}>{r.role_name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">expand_more</span>
              </div>
              <div className="lg:col-span-3">
                <button onClick={() => { setSearchQuery(''); setRoleFilter(''); setActiveTab('all'); }} className="h-10 px-3 rounded-xl bg-surface-subtle hover:bg-surface-container text-outline hover:text-brand-navy-deep text-label-md flex items-center gap-1.5 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>Clear filters
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle h-11 text-label-sm text-outline uppercase tracking-wider">
                    <th className="px-space-md font-semibold">Staff member</th>
                    <th className="px-space-md font-semibold">Role</th>
                    <th className="px-space-md font-semibold">NIC</th>
                    <th className="px-space-md font-semibold">Contact</th>
                    <th className="px-space-md font-semibold">Status</th>
                    <th className="px-space-md font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-subtle">
                  {filteredStaff.map(s => (
                    <tr key={s.user_id} className="hover:bg-surface-subtle/70 cursor-pointer" onClick={() => window.location.hash = `staff/${s.user_id}`}>
                      <td className="px-space-md py-3">
                        <div className="flex items-center gap-space-sm">
                          <div className={`w-10 h-10 rounded-xl ${s.is_active ? 'bg-secondary-container text-on-secondary-fixed' : 'bg-surface-subtle text-outline'} text-label-md flex items-center justify-center shrink-0`}>{initials(s.first_name, s.last_name)}</div>
                          <div className="min-w-0">
                            <span className="text-label-lg hover:text-border-focus font-medium">{s.first_name} {s.last_name}</span>
                            <div className="text-body-sm text-outline font-mono">@{s.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-space-md py-3 whitespace-nowrap"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-label-sm ${s.is_active ? 'bg-surface-container text-primary' : 'bg-surface-subtle text-outline'}`}>{s.role_name}</span></td>
                      <td className="px-space-md py-3 text-mono-data whitespace-nowrap">{s.id_number}</td>
                      <td className="px-space-md py-3">
                        <div className="text-mono-data">{s.phone_number || 'N/A'}</div>
                        <div className="text-body-sm text-outline">{s.email || 'No email'}</div>
                      </td>
                      <td className="px-space-md py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm ${s.is_active ? 'bg-status-completed-bg text-status-completed-text' : 'bg-surface-subtle text-outline'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-status-completed-text' : 'bg-outline'}`}></span>{s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-space-md py-3 text-right whitespace-nowrap">
                        <button onClick={(e) => { e.stopPropagation(); window.location.hash = `staff/${s.user_id}`; }} className="p-1.5 rounded-lg text-outline hover:text-brand-navy-deep hover:bg-surface-subtle transition-colors">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStaff.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-space-xl text-center">
                        <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center text-outline mx-auto mb-space-sm"><span className="material-symbols-outlined text-[28px]">search_off</span></div>
                        <h3 className="text-headline-sm">No staff match these filters</h3>
                        <p className="text-body-sm text-on-surface-variant mt-1 mb-space-md">Try a different search term or clear the filters.</p>
                        <button onClick={() => { setSearchQuery(''); setRoleFilter(''); setActiveTab('all'); }} className="h-10 px-space-md rounded-xl bg-border-focus text-on-primary text-label-md">Clear filters</button>
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr><td colSpan={6} className="p-space-xl text-center"><span className="material-symbols-outlined text-[32px] animate-spin text-primary">refresh</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER FOR ADD/EDIT STAFF */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-brand-navy-deep/40 backdrop-blur-sm z-[60] transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-surface-card shadow-2xl z-[70] flex flex-col overflow-y-auto animate-slide-in-right">
            <div className="p-space-lg bg-surface-subtle flex items-center justify-between shrink-0 border-b border-surface-subtle">
              <div className="space-y-0.5">
                <span className="text-label-sm text-primary uppercase tracking-wider">New account</span>
                <h2 className="text-headline-md font-bold">Add staff member</h2>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 rounded-xl text-outline hover:text-brand-navy-deep hover:bg-surface-card transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
              <div className="p-space-lg space-y-space-md flex-1 overflow-y-auto">
                <h3 className="text-label-sm text-primary uppercase tracking-wider pb-1 border-b border-surface-subtle font-bold">Personal information</h3>
                <div className="grid grid-cols-3 gap-space-sm">
                  <div className="space-y-1.5"><label className="text-label-md font-semibold">First name <span className="text-error">*</span></label><input required value={fFirst} onChange={e=>setFFirst(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" /></div>
                  <div className="space-y-1.5"><label className="text-label-md font-semibold">Middle name</label><input value={fMid} onChange={e=>setFMid(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" /></div>
                  <div className="space-y-1.5"><label className="text-label-md font-semibold">Last name <span className="text-error">*</span></label><input required value={fLast} onChange={e=>setFLast(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" /></div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-label-md font-semibold">NIC <span className="text-error">*</span></label>
                  <input required value={fNic} onChange={e=>setFNic(e.target.value.toUpperCase())} placeholder="199071400234 or 925430188V" className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono" />
                  <p className="text-body-sm text-outline">9 digits + V/X, or 12 digits</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                  <div className="space-y-1.5"><label className="text-label-md font-semibold">Date of birth <span className="text-error">*</span></label><input type="date" required value={fDob} onChange={e=>setFDob(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" /></div>
                  <div className="space-y-1.5"><label className="text-label-md font-semibold">Gender <span className="text-error">*</span></label><select required value={fGender} onChange={e=>setFGender(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                  <div className="space-y-1.5"><label className="text-label-md font-semibold">Marital status</label><select value={fMarital} onChange={e=>setFMarital(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus"><option value="">Not provided</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option></select></div>
                </div>

                <h3 className="text-label-sm text-primary uppercase tracking-wider pb-1 border-b border-surface-subtle font-bold mt-space-lg">Contact</h3>
                <div className="space-y-1.5"><label className="text-label-md font-semibold">Address <span className="text-error">*</span></label><textarea required value={fAddr} onChange={e=>setFAddr(e.target.value)} rows={2} className="w-full p-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus resize-none" placeholder="Street, city" /></div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between"><span className="text-label-md font-semibold">Phone numbers <span className="text-error">*</span></span><button type="button" onClick={handleAddPhone} className="text-label-md text-primary flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-[16px]">add</span>Add number</button></div>
                  <div className="space-y-2">
                    {fPhones.map((p, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input required value={p} onChange={e=>{const t=[...fPhones];t[idx]=e.target.value.replace(/\D/g,'');setFPhones(t)}} maxLength={10} placeholder="0771234567" className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono" />
                        {fPhones.length > 1 && <button type="button" onClick={()=>handleRemovePhone(idx)} className="w-10 h-10 rounded-xl bg-surface-subtle hover:bg-error-container text-error flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[18px]">close</span></button>}
                      </div>
                    ))}
                  </div>
                  <p className="text-body-sm text-outline">10 digits each, starting with 0.</p>
                </div>
                
                <div className="space-y-1.5"><label className="text-label-md font-semibold">Email</label><input type="email" value={fEmail} onChange={e=>setFEmail(e.target.value)} placeholder="name@medsync.lk" className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" /><p className="text-body-sm text-outline">Optional</p></div>

                <h3 className="text-label-sm text-primary uppercase tracking-wider pb-1 border-b border-surface-subtle font-bold mt-space-lg">Account</h3>
                <div className="grid grid-cols-1 gap-space-md">
                  <div className="space-y-1.5">
                    <label className="text-label-md font-semibold">Role <span className="text-error">*</span></label>
                    <select required value={fRole} onChange={e=>setFRole(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus">
                      <option value="">Select a role</option>
                      {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                    </select>
                  </div>
                </div>

                {roles.find(r => r.role_id === Number(fRole))?.role_name === 'Doctor' && (
                  <div className="p-4 bg-status-scheduled-bg border border-brand-teal-light/30 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold text-label-md">
                      <span className="material-symbols-outlined">local_hospital</span> Doctor Specific Details
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-label-md font-semibold">Medical License Number <span className="text-error">*</span></label>
                      <input required value={fLicense} onChange={e=>setFLicense(e.target.value)} placeholder="e.g. SLMC-12345" className="w-full h-10 px-3.5 rounded-xl bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-label-md font-semibold">Primary Specialty <span className="text-error">*</span></label>
                      <select required value={fSpecialty} onChange={e=>setFSpecialty(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus">
                        <option value="">Select a specialty</option>
                        {specialties.map(s => <option key={s.specialty_id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-body-sm text-on-surface-variant p-3 bg-surface-subtle rounded-xl mt-4 border border-border-subtle">
                  <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
                  <span>Branch: <strong>{user?.branch_name || 'Assigned Branch'}</strong> · A temporary password and auto-generated username will be provided upon creation.</span>
                </div>
              </div>
              <div className="p-space-md border-t border-surface-subtle flex justify-end gap-3 shrink-0 bg-white">
                <button type="button" onClick={() => setIsDrawerOpen(false)} className="h-10 px-space-md rounded-xl text-label-md bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-bold transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="h-10 px-space-md rounded-xl text-label-md bg-border-focus hover:bg-status-scheduled-text text-on-primary shadow-sm flex items-center gap-2 font-bold transition-colors disabled:opacity-70">
                  <span className="material-symbols-outlined text-[18px]">save</span>{saving ? 'Creating...' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* CREDENTIALS MODAL */}
      <Modal isOpen={!!credsModal} onClose={() => setCredsModal(null)} title="Account Created Successfully" footer={
        <>
          <button onClick={copyPw} className="h-10 px-space-md rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">content_copy</span>Copy Password</button>
          <button onClick={() => setCredsModal(null)} className="h-10 px-space-md rounded-xl bg-border-focus hover:bg-status-scheduled-text text-on-primary font-bold">Done</button>
        </>
      }>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-status-completed-bg text-status-completed-text flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[28px]">vpn_key</span></div>
          <div className="space-y-1">
            <h3 className="text-headline-md font-bold">Temporary Credentials</h3>
            <p className="text-body-md text-on-surface-variant">Give these to <strong>{credsModal?.name}</strong> in person or over a secure channel. The password must be changed at first sign-in.</p>
          </div>
        </div>
        <div className="p-space-md rounded-xl bg-surface-subtle space-y-2 text-mono-data border border-border-subtle">
          <div className="flex justify-between items-center"><span className="text-outline font-sans font-bold">Username</span><span className="bg-white px-2 py-1 rounded shadow-sm border border-border-subtle">{credsModal?.username}</span></div>
          <div className="flex justify-between items-center"><span className="text-outline font-sans font-bold">Temporary password</span><span className="font-bold tracking-wider text-lg text-primary bg-white px-2 py-1 rounded shadow-sm border border-border-subtle">{credsModal?.tempPw}</span></div>
        </div>
      </Modal>

      {/* CONFIRM DEACTIVATE */}
      <ConfirmDialog 
        isOpen={!!deactivatingStaff} 
        onClose={() => setDeactivatingStaff(null)} 
        onConfirm={handleDeactivate} 
        title="Deactivate this account?" 
        message={<strong>{deactivatingStaff?.first_name} {deactivatingStaff?.last_name}</strong> + " will lose access immediately. Their record and history are kept, and you can reactivate the account later. Reassign any upcoming appointments first if they are a doctor."}
        confirmLabel="Deactivate"
        isDestructive={true}
      />
    </div>
  );
};

export default ManageStaff;
