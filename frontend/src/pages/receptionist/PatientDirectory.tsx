import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import type { PatientResponse, AllergyItem } from '../../types';

interface PatientRecord {
  id: string;
  internalId?: number;
  initials: string;
  name: string;
  ageGender: string;
  nic: string;
  phone: string;
  branch: string;
  branchName: string;
  branchColor: string;
  avatarBg: string;
  insurance: 'yes' | 'no';
  isAltRow: boolean;
}

const DEFAULT_PATIENTS: PatientRecord[] = [
  {
    id: 'PT-003420',
    internalId: 1,
    initials: 'PD',
    name: 'Priyantha Dharmasena',
    ageGender: '48 yrs · Male',
    nic: '881920391V',
    phone: '077 123 4567',
    branch: 'colombo',
    branchName: 'Colombo Central Branch',
    branchColor: 'bg-primary',
    avatarBg: 'bg-surface-container-low text-primary',
    insurance: 'yes',
    isAltRow: false,
  },
  {
    id: 'PT-003419',
    internalId: 2,
    initials: 'DS',
    name: 'Dinuka Senanayake',
    ageGender: '32 yrs · Female',
    nic: '199283019283',
    phone: '071 892 3451',
    branch: 'colombo',
    branchName: 'Colombo Central Branch',
    branchColor: 'bg-primary',
    avatarBg: 'bg-surface-container-low text-primary',
    insurance: 'yes',
    isAltRow: true,
  },
  {
    id: 'PT-003418',
    internalId: 3,
    initials: 'CW',
    name: 'Chathura Wickramasinghe',
    ageGender: '47 yrs · Male',
    nic: '762910482V',
    phone: '076 554 1290',
    branch: 'kandy',
    branchName: 'Kandy General Branch',
    branchColor: 'bg-status-pending-text',
    avatarBg: 'bg-secondary-container text-secondary',
    insurance: 'no',
    isAltRow: false,
  },
  {
    id: 'PT-003415',
    internalId: 4,
    initials: 'SR',
    name: 'Sanduni Rathnayake',
    ageGender: '29 yrs · Female',
    nic: '199572019482',
    phone: '070 334 8912',
    branch: 'colombo',
    branchName: 'Colombo Central Branch',
    branchColor: 'bg-primary',
    avatarBg: 'bg-surface-container-low text-primary',
    insurance: 'yes',
    isAltRow: true,
  },
  {
    id: 'PT-003410',
    internalId: 5,
    initials: 'RG',
    name: 'Rohan Gunasekara',
    ageGender: '58 yrs · Male',
    nic: '651029384V',
    phone: '072 445 6789',
    branch: 'galle',
    branchName: 'Galle Branch',
    branchColor: 'bg-tertiary',
    avatarBg: 'bg-surface-container-low text-primary',
    insurance: 'yes',
    isAltRow: false,
  },
  {
    id: 'PT-003401',
    internalId: 6,
    initials: 'ND',
    name: 'Nirosha De Silva',
    ageGender: '36 yrs · Female',
    nic: '198854019284',
    phone: '077 889 1234',
    branch: 'colombo',
    branchName: 'Colombo Central Branch',
    branchColor: 'bg-primary',
    avatarBg: 'bg-secondary-container text-secondary',
    insurance: 'no',
    isAltRow: true,
  },
  {
    id: 'PT-003392',
    internalId: 7,
    initials: 'KW',
    name: 'Kamal Wickramasinghe',
    ageGender: '44 yrs · Male',
    nic: '801938472V',
    phone: '071 223 9988',
    branch: 'kandy',
    branchName: 'Kandy General Branch',
    branchColor: 'bg-status-pending-text',
    avatarBg: 'bg-surface-container-low text-primary',
    insurance: 'yes',
    isAltRow: false,
  },
  {
    id: 'PT-003387',
    internalId: 8,
    initials: 'SK',
    name: 'Sunil Karunaratne',
    ageGender: '71 yrs · Male',
    nic: '521092837V',
    phone: '075 667 8901',
    branch: 'colombo',
    branchName: 'Colombo Central Branch',
    branchColor: 'bg-primary',
    avatarBg: 'bg-secondary-container text-secondary',
    insurance: 'no',
    isAltRow: true,
  },
];

export const PatientDirectory: React.FC = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [patients, setPatients] = useState<PatientRecord[]>(DEFAULT_PATIENTS);
  const [totalCount, setTotalCount] = useState<number>(1428);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [activeBranch, setActiveBranch] = useState<string>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selected patient for View Profile modal
  const [selectedPatientForView, setSelectedPatientForView] = useState<PatientRecord | null>(null);
  const [profileDetail, setProfileDetail] = useState<PatientResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Selected patient for Edit modal
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [masterAllergies, setMasterAllergies] = useState<AllergyItem[]>([]);
  const [loadingEdit, setLoadingEdit] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Edit form fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editEmergencyRelation, setEditEmergencyRelation] = useState('');
  const [editSelectedAllergies, setEditSelectedAllergies] = useState<number[]>([]);

  // Debounce search query changes (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Keyboard shortcut: ESC to clear search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Map backend item to PatientRecord
  const mapBackendItem = (p: any, idx: number): PatientRecord => {
    const initials = `${p.first_name?.[0] || 'P'}${p.last_name?.[0] || 'T'}`.toUpperCase();
    const branchMap: Record<number, { name: string; slug: string; color: string }> = {
      1: { name: 'Colombo Central Branch', slug: 'colombo', color: 'bg-primary' },
      2: { name: 'Kandy General Branch', slug: 'kandy', color: 'bg-status-pending-text' },
      3: { name: 'Galle Branch', slug: 'galle', color: 'bg-tertiary' },
    };
    const b = branchMap[p.registered_branch || 1] || {
      name: p.branch_name || 'Colombo Central Branch',
      slug: (p.branch_name || '').toLowerCase().includes('kandy')
        ? 'kandy'
        : (p.branch_name || '').toLowerCase().includes('galle')
        ? 'galle'
        : 'colombo',
      color: (p.branch_name || '').toLowerCase().includes('kandy')
        ? 'bg-status-pending-text'
        : (p.branch_name || '').toLowerCase().includes('galle')
        ? 'bg-tertiary'
        : 'bg-primary',
    };

    let ageStr = '';
    if (p.date_of_birth) {
      const birth = new Date(p.date_of_birth);
      const age = new Date().getFullYear() - birth.getFullYear();
      ageStr = !isNaN(age) ? `${age} yrs · ` : '';
    }

    return {
      id: p.patient_code || `PT-${String(p.patient_id).padStart(6, '0')}`,
      internalId: p.patient_id,
      initials,
      name: `${p.first_name} ${p.last_name}`.trim(),
      ageGender: `${ageStr}${p.gender || 'Unknown'}`,
      nic: p.id_number,
      phone: p.phone_number || 'N/A',
      branch: b.slug,
      branchName: b.name,
      branchColor: b.color,
      avatarBg:
        idx % 2 === 0
          ? 'bg-surface-container-low text-primary'
          : 'bg-secondary-container text-secondary',
      insurance: p.has_insurance ? 'yes' : 'no',
      isAltRow: idx % 2 === 1,
    };
  };

  // Primary API fetch function connected to backend
  const fetchDirectory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await patientService.list({
        search: debouncedSearch.trim() || undefined,
        branch: activeBranch !== 'all' ? activeBranch : undefined,
        insurance: insuranceFilter !== 'all' ? insuranceFilter : undefined,
        page: currentPage,
        limit: 8,
      });

      if (res && res.data && Array.isArray(res.data)) {
        if (res.data.length > 0) {
          const mapped = res.data.map(mapBackendItem);
          setPatients(mapped);
          setTotalCount(typeof res.total === 'number' ? res.total : mapped.length);
        } else {
          setPatients([]);
          setTotalCount(0);
        }
      }
    } catch {
      // Backend offline or error: fall back to local client filter over DEFAULT_PATIENTS
      const q = debouncedSearch.trim().toLowerCase();
      const cleanQ = q.replace(/\s+/g, '');
      const filtered = DEFAULT_PATIENTS.filter((item) => {
        const nameMatch = !q || item.name.toLowerCase().includes(q) || item.nic.toLowerCase().includes(q) || item.phone.replace(/\s+/g, '').includes(cleanQ);
        const branchMatch = activeBranch === 'all' || item.branch === activeBranch;
        const insMatch = insuranceFilter === 'all' || item.insurance === insuranceFilter;
        return nameMatch && branchMatch && insMatch;
      });
      setPatients(filtered);
      setTotalCount(filtered.length);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, activeBranch, insuranceFilter, currentPage]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Load detailed patient profile when View Profile is clicked
  const handleOpenProfileModal = async (patient: PatientRecord) => {
    setSelectedPatientForView(patient);
    setProfileDetail(null);
    setLoadingProfile(true);
    try {
      const full = await patientService.getById(patient.id);
      if (full) {
        setProfileDetail(full);
      }
    } catch {
      // fallback: use the patient record data
    } finally {
      setLoadingProfile(false);
    }
  };

  // Open Edit Modal and prefill form
  const handleOpenEditModal = async (patient: PatientRecord) => {
    setEditingPatient(patient);
    setEditError(null);
    setEditSuccess(null);
    setLoadingEdit(true);

    // Fetch master allergies list if not cached
    if (masterAllergies.length === 0) {
      try {
        const al = await patientService.getAllergies();
        if (Array.isArray(al)) setMasterAllergies(al);
      } catch {
        // ignore
      }
    }

    try {
      const full = await patientService.getById(patient.id);
      if (full) {
        setEditFirstName(full.first_name || '');
        setEditMiddleName(full.middle_name || '');
        setEditLastName(full.last_name || '');
        setEditPhone(full.phone_number || '');
        setEditEmail(full.email || '');
        setEditAddress(full.address || '');
        setEditBloodGroup(full.blood_group || '');
        setEditContactName(full.contact_name || '');
        setEditEmergencyPhone(full.emergency_contact || '');
        setEditEmergencyRelation('');
        const activeIds = (full.allergies || []).map((a) => a.allergy_id);
        setEditSelectedAllergies(activeIds);
      } else {
        const parts = patient.name.split(' ');
        setEditFirstName(parts[0] || '');
        setEditLastName(parts.slice(1).join(' ') || '');
        setEditPhone(patient.phone || '');
        setEditAddress('');
        setEditSelectedAllergies([]);
      }
    } catch {
      const parts = patient.name.split(' ');
      setEditFirstName(parts[0] || '');
      setEditLastName(parts.slice(1).join(' ') || '');
      setEditPhone(patient.phone || '');
      setEditAddress('');
      setEditSelectedAllergies([]);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditError('First name and last name are required.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await patientService.update(editingPatient.id, {
        first_name: editFirstName.trim(),
        middle_name: editMiddleName.trim() || undefined,
        last_name: editLastName.trim(),
        phone_number: editPhone.trim(),
        email: editEmail.trim() || undefined,
        address: editAddress.trim(),
        blood_group: editBloodGroup.trim() || undefined,
        contact_name: editContactName.trim() || undefined,
        emergency_contact: editEmergencyPhone.trim() || undefined,
        emergency_contact_relationship: editEmergencyRelation.trim() || undefined,
        allergy_ids: editSelectedAllergies,
      });

      setEditSuccess('Patient profile updated successfully.');
      if (selectedPatientForView && selectedPatientForView.id === editingPatient.id) {
        setProfileDetail(updated);
      }
      await fetchDirectory();

      setTimeout(() => {
        setEditingPatient(null);
        setEditSuccess(null);
      }, 700);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update patient profile. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleAllergySelection = (allergyId: number) => {
    setEditSelectedAllergies((prev) =>
      prev.includes(allergyId) ? prev.filter((id) => id !== allergyId) : [...prev, allergyId]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setActiveBranch('all');
    setInsuranceFilter('all');
    setCurrentPage(1);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleRecentClick = (val: string) => {
    setSearchQuery(val);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / 8));

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg max-w-content-max-width mx-auto w-full space-y-space-lg">
        {/* Top Summary & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-1">
              <span className="font-headline-lg text-headline-lg text-brand-navy-deep tracking-tight">
                Patient Directory
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Search and manage patient records.
            </p>
          </div>
          <div className="flex items-center gap-space-md flex-wrap">
            <div className="flex items-center gap-space-sm bg-surface-card px-space-md py-2 rounded-xl shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-brand-navy-deep leading-tight font-semibold">
                  {totalCount.toLocaleString()}
                </span>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  Registered Patients
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/receptionist/register-patient')}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-lg text-label-lg px-space-lg h-[42px] rounded-xl hover:bg-primary-container shadow-sm transition-all transform hover:-translate-y-0.5"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Register Patient</span>
            </button>
          </div>
        </div>

        {/* Search, Filter & Quick Controls Bar */}
        <div className="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle flex flex-col gap-space-md relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pb-1 border-b border-border-subtle">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider mr-1">
                Search Patients:
              </span>
            </div>
            <div className="flex items-center gap-2 text-outline font-body-sm text-body-sm"></div>
          </div>

          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[24px] text-primary">
              search
            </span>
            <input
              ref={searchInputRef}
              className="w-full h-12 pl-12 pr-28 bg-canvas-bg rounded-xl font-body-md text-body-md text-brand-navy-deep placeholder:text-outline focus:outline-none focus:bg-surface-card ring-1 ring-border-subtle focus:ring-2 focus:ring-border-focus transition-all shadow-inner"
              id="patientSearchInput"
              placeholder="Search by NIC, name, or contact number..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery && (
                <button
                  className="w-7 h-7 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-outline hover:text-brand-navy-deep transition-colors"
                  onClick={() => setSearchQuery('')}
                  title="Clear Search"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
              <div className="h-5 w-px bg-border-subtle"></div>
              <span className="px-2 py-0.5 rounded bg-surface-card border border-border-subtle font-mono-data text-[11px] text-outline shadow-sm">
                ESC
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label-sm text-label-sm text-outline flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">history</span>Recent:
              </span>
              <button
                className="px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface-container text-on-surface-variant font-mono-data text-[12px] transition-colors"
                onClick={() => handleRecentClick('199283019283')}
                type="button"
              >
                199283019283
              </button>
              <button
                className="px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface-container text-on-surface-variant font-body-sm text-body-sm transition-colors"
                onClick={() => handleRecentClick('Priyantha')}
                type="button"
              >
                Priyantha Dharmasena
              </button>
              <button
                className="px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface-container text-primary font-mono-data text-[12px] transition-colors"
                onClick={() => handleRecentClick('PT-003420')}
                type="button"
              >
                PT-003420
              </button>
              <button
                className="px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface-container text-on-surface-variant font-mono-data text-[12px] transition-colors"
                onClick={() => handleRecentClick('077')}
                type="button"
              >
                077 Hotline
              </button>
            </div>

            <div className="flex items-center gap-space-xs flex-wrap">
              <div className="flex items-center bg-canvas-bg p-1 rounded-xl border border-border-subtle">
                <button
                  className={`branch-pill px-3 py-1 rounded-lg font-label-md text-label-md transition-all ${
                    activeBranch === 'all'
                      ? 'bg-surface-card text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-brand-navy-deep'
                  }`}
                  onClick={() => {
                    setActiveBranch('all');
                    setCurrentPage(1);
                  }}
                  type="button"
                >
                  All Branches
                </button>
                <button
                  className={`branch-pill px-3 py-1 rounded-lg font-label-md text-label-md transition-all ${
                    activeBranch === 'colombo'
                      ? 'bg-surface-card text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-brand-navy-deep'
                  }`}
                  onClick={() => {
                    setActiveBranch('colombo');
                    setCurrentPage(1);
                  }}
                  type="button"
                >
                  Colombo Central
                </button>
                <button
                  className={`branch-pill px-3 py-1 rounded-lg font-label-md text-label-md transition-all ${
                    activeBranch === 'kandy'
                      ? 'bg-surface-card text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-brand-navy-deep'
                  }`}
                  onClick={() => {
                    setActiveBranch('kandy');
                    setCurrentPage(1);
                  }}
                  type="button"
                >
                  Kandy General
                </button>
                <button
                  className={`branch-pill px-3 py-1 rounded-lg font-label-md text-label-md transition-all ${
                    activeBranch === 'galle'
                      ? 'bg-surface-card text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-brand-navy-deep'
                  }`}
                  onClick={() => {
                    setActiveBranch('galle');
                    setCurrentPage(1);
                  }}
                  type="button"
                >
                  Galle
                </button>
              </div>

              <div className="relative">
                <select
                  className="h-9 px-3 pr-8 bg-canvas-bg border border-border-subtle rounded-xl font-label-md text-label-md text-on-surface-variant appearance-none cursor-pointer focus:outline-none shadow-sm"
                  id="insuranceFilter"
                  value={insuranceFilter}
                  onChange={(e) => {
                    setInsuranceFilter(e.target.value as 'all' | 'yes' | 'no');
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">Insurance: All</option>
                  <option value="yes">Insured Only</option>
                  <option value="no">Self-Pay Only</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
                  expand_more
                </span>
              </div>

              <button
                className="w-9 h-9 rounded-xl bg-canvas-bg hover:bg-surface-subtle border border-border-subtle flex items-center justify-center text-outline hover:text-brand-navy-deep transition-colors shadow-sm"
                id="resetFilters"
                onClick={handleResetFilters}
                title="Reset Filters"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-body-sm text-body-sm">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-primary animate-ping' : 'bg-status-completed-text animate-pulse'}`}></span>
              <span>
                {isLoading
                  ? 'Querying MedSync directory records...'
                  : 'Live directory query: showing matching patients across all connected branches'}
              </span>
            </div>
            <button
              className="text-primary hover:text-primary-container font-label-sm text-label-sm flex items-center gap-1 transition-colors"
              onClick={handleResetFilters}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              Clear active search
            </button>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-bg h-11 text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="px-space-md py-3 font-semibold">Patient ID</th>
                  <th className="px-space-md py-3 font-semibold">Patient Name</th>
                  <th className="px-space-md py-3 font-semibold">NIC Number</th>
                  <th className="px-space-md py-3 font-semibold">Contact Phone</th>
                  <th className="px-space-md py-3 font-semibold">Registered Branch</th>
                  <th className="px-space-md py-3 font-semibold">Insurance</th>
                  <th className="px-space-md py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-0 text-on-surface font-body-md text-body-md" id="patientTableBody">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr
                      key={`skeleton-row-${idx}`}
                      className={`animate-pulse border-b border-border-subtle/30 ${idx % 2 === 1 ? 'bg-canvas-bg/30' : ''}`}
                    >
                      <td className="px-space-md py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-surface-container-low" />
                          <div className="w-20 h-4 rounded bg-surface-subtle" />
                        </div>
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <div className="w-36 h-4 rounded bg-surface-subtle" />
                          <div className="w-24 h-3 rounded bg-surface-subtle" />
                        </div>
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="w-28 h-4 rounded bg-surface-subtle" />
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="w-28 h-4 rounded bg-surface-subtle" />
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="w-32 h-6 rounded-md bg-surface-subtle" />
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="w-16 h-6 rounded-full bg-surface-subtle" />
                      </td>
                      <td className="px-space-md py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <div className="w-8 h-8 rounded-lg bg-surface-subtle" />
                          <div className="w-8 h-8 rounded-lg bg-surface-subtle" />
                          <div className="w-16 h-8 rounded-lg bg-surface-subtle" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : patients.length > 0 ? (
                  patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className={`patient-row hover:bg-surface-subtle transition-colors group ${
                        patient.isAltRow ? 'bg-canvas-bg/30' : ''
                      }`}
                    >
                      <td className="px-space-md py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono-data text-label-sm font-semibold ${patient.avatarBg}`}
                          >
                            {patient.initials}
                          </div>
                          <span className="font-mono-data text-mono-data font-semibold text-primary">
                            {patient.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg text-brand-navy-deep font-semibold group-hover:text-primary transition-colors">
                            {patient.name}
                          </span>
                          <span className="font-body-sm text-body-sm text-outline">
                            {patient.ageGender}
                          </span>
                        </div>
                      </td>
                      <td className="px-space-md py-3.5">
                        <span className="font-mono-data text-mono-data text-on-surface-variant">
                          {patient.nic}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5">
                        <div className="flex items-center gap-1.5 font-body-md text-body-md text-on-surface">
                          <span className="material-symbols-outlined text-[16px] text-outline">call</span>
                          <span>{patient.phone}</span>
                        </div>
                      </td>
                      <td className="px-space-md py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-canvas-bg text-on-surface-variant font-label-sm text-label-sm">
                          <span className={`w-1.5 h-1.5 rounded-full ${patient.branchColor}`}></span>{' '}
                          {patient.branchName}
                        </span>
                      </td>
                      <td className="px-space-md py-3.5">
                        {patient.insurance === 'yes' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-label-sm">
                            <span className="material-symbols-outlined text-[12px]">check</span> Insured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-subtle text-outline font-label-sm text-label-sm">
                            Self-Pay
                          </span>
                        )}
                      </td>
                      <td className="px-space-md py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            className="w-8 h-8 rounded-lg bg-surface-subtle text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center"
                            onClick={() => handleOpenProfileModal(patient)}
                            title="View Profile"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            className="w-8 h-8 rounded-lg bg-surface-subtle text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center"
                            onClick={() => handleOpenEditModal(patient)}
                            title="Edit Record"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            className="px-2.5 h-8 rounded-lg bg-status-scheduled-bg text-status-scheduled-text hover:bg-primary hover:text-on-primary font-label-sm text-label-sm transition-all flex items-center gap-1"
                            onClick={() => navigate(`/receptionist/book-appointment?patientId=${patient.id}`)}
                            title="Book Appointment"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px]">event_available</span>
                            <span>Book</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Empty State Container */}
          {patients.length === 0 && !isLoading && (
            <div className="p-space-2xl text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[28px]">search_off</span>
              </div>
              <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                No patients found. Try a different search, or register a new patient.
              </p>
              <p className="font-body-md text-body-md text-outline max-w-sm">
                Check your search query or add a new patient record to the system.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/receptionist/register-patient')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Register New Patient</span>
                </button>
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-space-md py-3.5 bg-canvas-bg/60 flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              Showing{' '}
              <span className="font-semibold text-brand-navy-deep">
                {patients.length > 0 ? `${(currentPage - 1) * 8 + 1} to ${(currentPage - 1) * 8 + patients.length}` : '0'}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-brand-navy-deep">
                {totalCount.toLocaleString()}
              </span>{' '}
              patients
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="font-body-sm text-body-sm text-outline mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="w-8 h-8 rounded-lg bg-surface-card text-outline hover:text-brand-navy-deep hover:bg-surface-subtle flex items-center justify-center shadow-sm disabled:opacity-50 transition-colors"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {[1, 2, 3].filter((p) => p <= totalPages).map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 rounded-lg font-label-sm text-label-sm flex items-center justify-center shadow-sm transition-colors ${
                    currentPage === p
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-card text-on-surface-variant hover:text-brand-navy-deep hover:bg-surface-subtle'
                  }`}
                  onClick={() => setCurrentPage(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
              {totalPages > 3 && (
                <>
                  <span className="text-outline px-1">...</span>
                  <button
                    className={`w-8 h-8 rounded-lg font-label-sm text-label-sm flex items-center justify-center shadow-sm transition-colors ${
                      currentPage === totalPages
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-card text-on-surface-variant hover:text-brand-navy-deep hover:bg-surface-subtle'
                    }`}
                    onClick={() => setCurrentPage(totalPages)}
                    type="button"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                className="w-8 h-8 rounded-lg bg-surface-card text-outline hover:text-brand-navy-deep hover:bg-surface-subtle flex items-center justify-center shadow-sm disabled:opacity-50 transition-colors"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Profile Detailed View Modal */}
      {selectedPatientForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl border border-border-subtle overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-space-lg border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono-data text-label-lg font-bold ${selectedPatientForView.avatarBg}`}
                >
                  {selectedPatientForView.initials}
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                    {profileDetail ? `${profileDetail.first_name} ${profileDetail.last_name}` : selectedPatientForView.name}
                  </h3>
                  <p className="font-mono-data text-mono-data text-primary text-xs">
                    {selectedPatientForView.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPatientForView(null);
                  setProfileDetail(null);
                }}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-outline hover:text-brand-navy-deep transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-lg space-y-4 text-sm">
              {loadingProfile ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-outline">
                  <span className="material-symbols-outlined text-[24px] animate-spin text-primary">
                    refresh
                  </span>
                  <span className="text-xs">Loading patient medical profile...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                      <span className="text-outline text-xs block mb-0.5">Demographics</span>
                      <span className="font-semibold text-brand-navy-deep">
                        {profileDetail ? `${profileDetail.gender} · DOB: ${profileDetail.date_of_birth}` : selectedPatientForView.ageGender}
                      </span>
                    </div>
                    <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                      <span className="text-outline text-xs block mb-0.5">NIC Number</span>
                      <span className="font-mono-data font-semibold text-brand-navy-deep">
                        {profileDetail ? profileDetail.id_number : selectedPatientForView.nic}
                      </span>
                    </div>
                    <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                      <span className="text-outline text-xs block mb-0.5">Contact Phone</span>
                      <span className="font-semibold text-brand-navy-deep flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-outline">call</span>
                        {profileDetail ? profileDetail.phone_number : selectedPatientForView.phone}
                      </span>
                    </div>
                    <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                      <span className="text-outline text-xs block mb-0.5">Registered Branch</span>
                      <span className="font-semibold text-brand-navy-deep">
                        {profileDetail?.branch_name || selectedPatientForView.branchName}
                      </span>
                    </div>
                  </div>

                  {profileDetail?.blood_group && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                        <span className="text-outline text-xs block mb-0.5">Blood Group</span>
                        <span className="font-semibold text-brand-navy-deep">
                          {profileDetail.blood_group}
                        </span>
                      </div>
                      <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                        <span className="text-outline text-xs block mb-0.5">Emergency Contact</span>
                        <span className="font-semibold text-brand-navy-deep">
                          {profileDetail.contact_name || 'Emergency'}: {profileDetail.emergency_contact || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  {profileDetail?.address && (
                    <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                      <span className="text-outline text-xs block mb-0.5">Residential Address</span>
                      <span className="font-semibold text-brand-navy-deep">
                        {profileDetail.address}
                      </span>
                    </div>
                  )}

                  <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50 flex items-center justify-between">
                    <div>
                      <span className="text-outline text-xs block mb-0.5">Insurance Coverage</span>
                      <span className="font-semibold text-brand-navy-deep">
                        {(profileDetail?.has_insurance ?? selectedPatientForView.insurance === 'yes')
                          ? 'Active Policy Coverage'
                          : 'Self-Pay Account'}
                      </span>
                    </div>
                    {(profileDetail?.has_insurance ?? selectedPatientForView.insurance === 'yes') ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text text-xs font-semibold">
                        <span className="material-symbols-outlined text-[12px]">check</span> Insured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-subtle text-outline text-xs font-semibold">
                        Self-Pay
                      </span>
                    )}
                  </div>

                  {/* Allergies / Clinical Alerts Section */}
                  <div className="bg-canvas-bg/60 p-3 rounded-xl border border-border-subtle/50">
                    <span className="text-outline text-xs block mb-1.5 font-medium">
                      Known Drug & Environmental Allergies
                    </span>
                    {profileDetail?.allergies && profileDetail.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profileDetail.allergies.map((alg) => (
                          <span
                            key={alg.allergy_id}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-cancelled-bg text-status-cancelled-text text-xs font-semibold border border-status-cancelled-border/40"
                          >
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            Allergy: {alg.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-outline italic">
                        No known drug or environmental allergies recorded.
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-space-md bg-canvas-bg/40 border-t border-border-subtle flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPatientForView(null);
                  setProfileDetail(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-subtle transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedPatientForView;
                  setSelectedPatientForView(null);
                  handleOpenEditModal(target);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-border-subtle text-brand-navy-deep hover:bg-surface-subtle transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit Record</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = selectedPatientForView.id;
                  setSelectedPatientForView(null);
                  navigate(`/receptionist/book-appointment?patientId=${id}`);
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">event_available</span>
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Edit Record Modal */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border-subtle overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-space-lg border-b border-border-subtle flex items-center justify-between bg-canvas-bg/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                    Edit Patient Record
                  </h3>
                  <p className="font-mono-data text-mono-data text-primary text-xs">
                    {editingPatient.id} · {editingPatient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingPatient(null);
                  setEditError(null);
                  setEditSuccess(null);
                }}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-outline hover:text-brand-navy-deep transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePatient}>
              <div className="p-space-lg space-y-5 max-h-[72vh] overflow-y-auto">
                {editError && (
                  <div className="p-3.5 rounded-xl bg-status-cancelled-bg/60 border border-status-cancelled-border/40 text-status-cancelled-text text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{editError}</span>
                  </div>
                )}
                {editSuccess && (
                  <div className="p-3.5 rounded-xl bg-status-completed-bg/60 border border-status-completed-border/40 text-status-completed-text text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>{editSuccess}</span>
                  </div>
                )}

                {loadingEdit ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-outline">
                    <span className="material-symbols-outlined text-[28px] animate-spin text-primary">refresh</span>
                    <span className="text-xs">Loading patient details...</span>
                  </div>
                ) : (
                  <>
                    {/* Section 1: Personal Details */}
                    <div>
                      <h4 className="font-label-lg text-label-lg text-brand-navy-deep font-semibold mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={editMiddleName}
                            onChange={(e) => setEditMiddleName(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Primary Phone Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="077 123 4567"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-mono-data"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="patient@example.com"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Residential Address *
                          </label>
                          <input
                            type="text"
                            required
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="Street, City"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Blood Group
                          </label>
                          <select
                            value={editBloodGroup}
                            onChange={(e) => setEditBloodGroup(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          >
                            <option value="">Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Emergency Contact */}
                    <div className="pt-2 border-t border-border-subtle/70">
                      <h4 className="font-label-lg text-label-lg text-brand-navy-deep font-semibold mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-primary">emergency</span>
                        Emergency Contact Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Contact Person Name
                          </label>
                          <input
                            type="text"
                            value={editContactName}
                            onChange={(e) => setEditContactName(e.target.value)}
                            placeholder="e.g. Anoma Dharmasena"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Relationship
                          </label>
                          <select
                            value={editEmergencyRelation}
                            onChange={(e) => setEditEmergencyRelation(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-body-md"
                          >
                            <option value="">Select relationship</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Child">Child</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Emergency Phone Number
                          </label>
                          <input
                            type="text"
                            value={editEmergencyPhone}
                            onChange={(e) => setEditEmergencyPhone(e.target.value)}
                            placeholder="077 129 4811"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-canvas-bg/50 focus:bg-surface-card focus:outline-none focus:border-primary transition-all font-mono-data"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Allergies Multi-Select Selector */}
                    <div className="pt-2 border-t border-border-subtle/70">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-label-lg text-label-lg text-brand-navy-deep font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-status-cancelled-text">warning</span>
                          Known Allergies & Clinical Alerts
                        </h4>
                        <span className="text-xs text-outline">Click chip to toggle</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mb-3">
                        Assigned allergies appear as prominent red alerts on the Doctor's Consultation and Treatment screens.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {masterAllergies.length > 0 ? (
                          masterAllergies.map((alg) => {
                            const isSelected = editSelectedAllergies.includes(alg.allergy_id);
                            return (
                              <button
                                key={alg.allergy_id}
                                type="button"
                                onClick={() => toggleAllergySelection(alg.allergy_id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-status-cancelled-bg text-status-cancelled-text border border-status-cancelled-border shadow-xs'
                                    : 'bg-canvas-bg text-on-surface-variant hover:bg-surface-subtle border border-border-subtle'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {isSelected ? 'check_circle' : 'add_circle'}
                                </span>
                                <span>{alg.name}</span>
                                <span className="opacity-60 text-[10px]">({alg.allergy_code})</span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-xs text-outline italic">
                            Loading master allergies catalogue...
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-space-md bg-canvas-bg/50 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => {
                    setEditingPatient(null);
                    setEditError(null);
                    setEditSuccess(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-subtle transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || loadingEdit}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDirectory;
