import React, { useState, useEffect } from 'react';
import { get, put, post, del } from '../../services/api';
import type {
  DoctorResponse,
  SpecialtyResponse,
  BranchResponse,
} from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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


// ─── Specialty chip (inside table row) ───────────────────────────────────────

interface SpecialtyChipProps {
  name: string;
}
const SpecialtyChip: React.FC<SpecialtyChipProps> = ({ name }) => (
  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
    {name}
  </span>
);



// ─── Manage Specialties Modal ─────────────────────────────────────────────────

interface ManageSpecialtiesModalProps {
  doctor: DoctorResponse | null;
  allSpecialties: SpecialtyResponse[];
  onClose: () => void;
  onSave: (doctorId: number, assigned: string[]) => void;
}

const ManageSpecialtiesModal: React.FC<ManageSpecialtiesModalProps> = ({
  doctor,
  allSpecialties,
  onClose,
  onSave,
}) => {
  const { showToast } = useToast();
  const [assigned, setAssigned] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (doctor) {
      const sps = doctor.specialties ?? [];
      setAssigned(sps);
      setSearchQuery('');
    }
  }, [doctor]);

  if (!doctor) return null;

  const filteredUnassigned = allSpecialties.filter(
    (s) =>
      !assigned.includes(s.name) &&
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const removeChip = (name: string) => {
    setAssigned((prev) => prev.filter((n) => n !== name));
  };

  const addChip = (name: string) => {
    if (!assigned.includes(name)) {
      setAssigned((prev) => [...prev, name]);
    }
  };

  const handleSave = async () => {
    if (assigned.length === 0) {
      showToast('A doctor must retain at least one specialty.', 'error');
      return;
    }
    setSaving(true);
    try {
      const allIds = allSpecialties.reduce<Record<string, number>>(
        (acc, s) => ({ ...acc, [s.name]: s.specialty_id }),
        {},
      );
      const currentIds = (doctor.specialties ?? []).map((n) => allIds[n]).filter(Boolean);
      const newIds = assigned.map((n) => allIds[n]).filter(Boolean);
      const add = newIds.filter((id) => !currentIds.includes(id));
      const remove = currentIds.filter((id) => !newIds.includes(id));
      await put(`/doctors/${doctor.doctor_id}/specialties`, { add, remove });
      showToast('Doctor specialties updated successfully!', 'success');
      onSave(doctor.doctor_id, assigned);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update specialties', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!doctor}
      onClose={onClose}
      title={`Manage Specialties — ${doctor.full_name} (#${doctor.license_number})`}
      footer={
        <>
          <button
            type="button"
            className="h-[42px] px-space-md rounded-lg bg-surface-card hover:bg-surface-subtle text-on-surface-variant font-label-lg text-label-lg font-bold border border-border-subtle transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="h-[42px] px-space-lg rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
            onClick={handleSave}
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-space-md">
        {/* Chip container */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface font-bold mb-2">
            Assigned Clinical Specialties ({assigned.length})
          </label>
          <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-subtle rounded-xl min-h-[52px]">
            {assigned.length === 0 ? (
              <span className="text-on-surface-variant font-body-sm text-body-sm">
                No specialties assigned yet. Select from below to assign.
              </span>
            ) : (
              assigned.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card text-on-surface font-label-md text-label-md font-bold shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>{name}</span>
                  <button
                    type="button"
                    className="w-4 h-4 rounded-full hover:bg-surface-subtle text-outline flex items-center justify-center transition-colors"
                    onClick={() => removeChip(name)}
                    title={`Remove ${name}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              ))
            )}
          </div>
          <span className="font-label-sm text-label-sm text-outline mt-1 block">
            Click "×" to detach a specialty from this doctor.
          </span>
        </div>

        {/* Add Specialty Search Box & List */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface font-bold mb-1.5">
            Add Specialty
          </label>
          <div className="relative mb-2">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search available specialties..."
              className="w-full h-[40px] pl-10 pr-8 bg-surface-subtle border border-border-subtle rounded-lg text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div className="border border-border-subtle rounded-xl max-h-48 overflow-y-auto divide-y divide-border-subtle bg-surface-subtle/50">
            {filteredUnassigned.length === 0 ? (
              <div className="p-4 text-center text-on-surface-variant font-body-sm text-body-sm">
                {allSpecialties.filter((s) => !assigned.includes(s.name)).length === 0
                  ? 'All available specialties are already assigned to this doctor.'
                  : 'No specialties match your search.'}
              </div>
            ) : (
              filteredUnassigned.map((s) => (
                <div
                  key={s.specialty_id}
                  className="p-2.5 px-3 flex items-center justify-between hover:bg-surface-subtle transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-bold">
                      {s.name}
                    </span>
                    {s.description && (
                      <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                        {s.description}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => addChip(s.name)}
                    className="h-7 px-2.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1 transition-all shrink-0 ml-2"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Add</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── Add Specialty Form ───────────────────────────────────────────────────────

interface AddSpecialtyFormProps {
  onAdded: () => void;
}
const AddSpecialtyForm: React.FC<AddSpecialtyFormProps> = ({ onAdded }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {

      // call the backend
      await post<SpecialtyResponse>('/specialties', {
        name: name.trim(),
        description: description.trim(),
      });

      setName('');
      setDescription('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);

      showToast('Specialty registered successfully!', 'success');
      onAdded();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create specialty', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface-subtle rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm">
      <div className="flex items-center gap-space-xs">
        <span className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
        </span>
        <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
          Add New Specialty
        </h3>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Create a new doctor specialty.
      </p>
      <form onSubmit={handleSubmit} className="space-y-space-sm">
        <div>
          <label className="block font-label-md text-label-md text-on-surface font-bold mb-1">
            Specialty Name *
          </label>
          <input
            required
            minLength={2}
            maxLength={100}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dermatology & Cosmetology"
            className="w-full h-[42px] px-3 bg-surface-card rounded-lg text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none"
          />
          <span className="font-label-sm text-label-sm text-on-surface-variant/70 mt-1 block">
            Must be between 2 and 100 characters.
          </span>
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface font-bold mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Information about the specialty..."
            rows={10}
            className="w-full p-3 bg-surface-card rounded-lg text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none resize-none"
          />
        </div>
        <div className="pt-space-xs">
          <button
            type="submit"
            disabled={saving}
            className="w-full h-[42px] rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{saving ? 'Saving…' : 'Save Specialty'}</span>
          </button>
        </div>
      </form>
      {success && (
        <div className="p-space-sm rounded-lg bg-status-completed-bg text-status-completed-text flex items-center gap-2 font-label-md text-label-md font-bold">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Specialty registered successfully.
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export const ManageDoctors: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrator';

  const [activeTab, setActiveTab] = useState<'doctors' | 'specialties'>('doctors');

  // Doctors state
  const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Specialties state
  const [specialties, setSpecialties] = useState<SpecialtyResponse[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [specialtySearch, setSpecialtySearch] = useState('');

  // Modal state
  const [modalDoctor, setModalDoctor] = useState<DoctorResponse | null>(null);

  // Edit / Delete Specialty State
  const [editingSpecialty, setEditingSpecialty] = useState<SpecialtyResponse | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingSpecialty, setDeletingSpecialty] = useState<SpecialtyResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenEditSpecialty = (sp: SpecialtyResponse) => {
    setEditingSpecialty(sp);
    setEditName(sp.name);
    setEditDescription(sp.description ?? '');
  };

  const handleSaveEditSpecialty = async () => {
    if (!editingSpecialty) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      showToast('Specialty name must be at least 2 characters long.', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      await put<SpecialtyResponse>(`/specialties/${editingSpecialty.specialty_id}`, {
        name: trimmed,
        description: editDescription.trim() || undefined,
      });
      showToast('Specialty updated successfully!', 'success');
      setEditingSpecialty(null);
      fetchSpecialties();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update specialty', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeleteSpecialty = async () => {
    if (!deletingSpecialty) return;
    setDeleting(true);
    try {
      await del(`/specialties/${deletingSpecialty.specialty_id}`);
      showToast(`Specialty '${deletingSpecialty.name}' deleted successfully!`, 'success');
      setDeletingSpecialty(null);
      fetchSpecialties();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete specialty', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Fetchers ───────────────────────────────────────────────────────────────

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await get<DoctorResponse[]>('/doctors');
      setDoctors(res ?? []);
    } catch {
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await get<BranchResponse[]>('/branches');
      setBranches(res ?? []);
    } catch {
      setBranches([]);
    }
  };

  const fetchSpecialties = async () => {
    setLoadingSpecialties(true);
    try {
      const res = await get<SpecialtyResponse[]>('/specialties');
      setSpecialties(res ?? []);
    } catch (err: any) {
      setSpecialties([]);
      const errorMessage = err?.message || String(err);
      showToast(`Failed to fetch specialties from server: ${errorMessage}`, 'error');
    } finally {
      setLoadingSpecialties(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchBranches();
    fetchSpecialties();
  }, []);

  // ─── Derived data ────────────────────────────────────────────────────────────

  const filtered = doctors.filter((d) => {
    const matchBranch = isAdmin
      ? branchFilter === 'all' || String(d.branch_id) === branchFilter
      : user?.branchId
        ? d.branch_id === user.branchId
        : true;
    const matchSearch =
      !search ||
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number.toLowerCase().includes(search.toLowerCase());
    return matchBranch && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = doctors.filter((d) => d.is_active).length;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleModalSave = (doctorId: number, assigned: string[]) => {
    setDoctors((prev) =>
      prev.map((d) =>
        d.doctor_id === doctorId ? { ...d, specialties: assigned } : d,
      ),
    );
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleBranchFilter = (v: string) => {
    setBranchFilter(v);
    setPage(1);
  };

  const switchToSpecialtiesTab = () => setActiveTab('specialties');

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full">
      {/* ── Stat ribbon ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm mb-space-md">
        <StatCard
          icon="stethoscope"
          label="Total Doctors"
          value={doctors.length}
          iconBg="bg-status-scheduled-bg"
          iconColor="text-status-scheduled-text"
        />
        <StatCard
          icon="category"
          label="Clinical Specialties"
          value={specialties.length}
          iconBg="bg-surface-container-high"
          iconColor="text-primary"
        />
        <StatCard
          icon="check_circle"
          label="Active On-Duty"
          value={activeCount}
          iconBg="bg-status-completed-bg"
          iconColor="text-status-completed-text"
          valueColor="text-status-completed-text"
        />
        <StatCard
          icon="do_not_disturb_on"
          label="Inactive / Deactivated"
          value={doctors.length - activeCount}
          iconBg="bg-status-cancelled-bg"
          iconColor="text-status-cancelled-text"
          valueColor="text-status-cancelled-text"
        />
      </div>

      {/* ── Main card ── */}
      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-space-lg bg-surface-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div>
              <div className="flex items-center gap-space-xs">
              </div>
              <h1 className="font-display-lg text-display-lg text-brand-navy-deep font-bold tracking-tight">
                Manage Doctors &amp; Specialties
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Assign specialties and manage doctor availability.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-space-xs p-1 bg-surface-subtle rounded-xl self-start lg:self-center">
              <button
                id="tabBtnDoctors"
                type="button"
                onClick={() => setActiveTab('doctors')}
                className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-label-lg text-label-lg font-bold transition-all ${activeTab === 'doctors'
                  ? 'bg-surface-card text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">badge</span>
                <span>Doctors</span>
                <span className="px-2 py-0.5 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-bold">
                  {doctors.length}
                </span>
              </button>
              <button
                id="tabBtnSpecialties"
                type="button"
                onClick={() => setActiveTab('specialties')}
                className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-label-lg text-label-lg font-bold transition-all ${activeTab === 'specialties'
                  ? 'bg-surface-card text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">category</span>
                <span>Specialties</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold">
                  {specialties.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ─────────── TAB 1: DOCTORS ─────────── */}
        {activeTab === 'doctors' && (
          <div id="tabContentDoctors" className="p-space-lg pt-0">
            {/* Action bar (Doctor Search & Filters) */}
            <div className="mb-space-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md bg-surface-subtle p-space-sm rounded-xl">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                {/* Search */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                    search
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search doctor by name or licence number…"
                    className="w-full h-[42px] pl-10 pr-4 bg-surface-card rounded-lg text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none"
                  />
                </div>
                {/* Branch filter */}
                {isAdmin ? (
                  <div className="relative min-w-[200px]">
                    <select
                      aria-label="Branch Filter"
                      value={branchFilter}
                      onChange={(e) => handleBranchFilter(e.target.value)}
                      className="w-full h-[42px] px-3 bg-surface-card rounded-lg text-on-surface font-body-md text-body-md shadow-sm focus:outline-none appearance-none cursor-pointer border border-border-subtle"
                    >
                      <option value="all">All Branches (Islandwide)</option>
                      {branches.map((b) => (
                        <option key={b.branch_id} value={String(b.branch_id)}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-space-2xs px-3 h-[42px] bg-surface-card rounded-lg border border-border-subtle shadow-sm shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-brand-teal-light">
                      location_on
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-bold">
                      {branches.find((b) => b.branch_id === user?.branchId)?.name ||
                        (user?.branchName && !user.branchName.startsWith('Branch #') ? user.branchName : null) ||
                        (user?.branchId ? `Branch #${user.branchId}` : 'Assigned Branch')}
                    </span>
                  </div>
                )}
              </div>
              {/* Add specialty shortcut (Admin only) */}
              {isAdmin && (
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    onClick={switchToSpecialtiesTab}
                    className="h-[42px] px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center gap-space-xs shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    <span>Add Specialty</span>
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-subtle">
                  <tr>
                    <th className="h-11 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">
                      Doctor &amp; Licence No.
                    </th>
                    <th className="h-11 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">
                      Branch Location
                    </th>
                    <th className="h-11 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">
                      Assigned Specialties
                    </th>
                    <th className="h-11 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">
                      Clinical Status
                    </th>
                    <th className="h-11 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDoctors ? (
                    <tr>
                      <td colSpan={5} className="p-space-lg">
                        <LoadingState message="Loading doctors list…" rows={3} />
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-space-lg">
                        <EmptyState
                          title="No Doctors Found"
                          message="No doctors match your search query or selected branch filter."
                          icon="person_search"
                        />
                      </td>
                    </tr>
                  ) : (
                    paginated.map((doctor) => {
                      const sps = doctor.specialties ?? [];
                      return (
                        <tr
                          key={doctor.doctor_id}
                          className="hover:bg-surface-subtle transition-colors group border-t border-border-subtle first:border-t-0"
                        >
                          {/* Doctor name + licence */}
                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-space-sm">
                              {/* Avatar */}
                              <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold shadow-sm select-none">
                                  {initials(doctor.full_name)}
                                </div>
                                <span
                                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-surface-card ${doctor.is_active
                                    ? 'bg-status-completed-text'
                                    : 'bg-outline'
                                    }`}
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-label-lg text-label-lg text-on-surface font-bold">
                                  {doctor.full_name}
                                </span>
                                <span className="font-mono-data text-mono-data text-outline">
                                  Lic. #{doctor.license_number}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-space-2xs">
                              <span className="material-symbols-outlined text-[18px] text-outline">
                                apartment
                              </span>
                              <span className="font-body-md text-body-md text-on-surface font-medium">
                                {doctor.branch_name ?? '—'}
                              </span>
                            </div>
                          </td>

                          {/* Specialties */}
                          <td className="py-space-md px-space-md">
                            <div className="flex flex-wrap items-center gap-1.5 max-w-[340px]">
                              {sps.length === 0 ? (
                                <span className="text-outline font-body-sm text-body-sm">
                                  None assigned
                                </span>
                              ) : (
                                sps.map((name) => (
                                  <SpecialtyChip key={name} name={name} />
                                ))
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-space-md px-space-md">
                            <StatusBadge status={doctor.is_active ? 'Active' : 'Inactive'} />
                          </td>

                          {/* Actions */}
                          <td className="py-space-md px-space-md text-right">
                            <div className="flex items-center justify-end gap-space-xs">
                              <button
                                type="button"
                                onClick={() => setModalDoctor(doctor)}
                                className="px-space-sm h-8 rounded-lg bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary font-label-md text-label-md font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  edit_note
                                </span>
                                <span>Manage Specialties</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loadingDoctors && filtered.length > 0 && (
              <div className="p-space-md bg-surface-card flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-border-subtle">
                <span className="font-label-md text-label-md text-on-surface-variant">
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
                  {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} doctor
                  {filtered.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-8 px-3 rounded-lg bg-surface-subtle text-outline font-label-md text-label-md flex items-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    <span>Prev</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-lg font-label-md text-label-md font-bold flex items-center justify-center transition-colors ${p === page
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-subtle text-on-surface hover:bg-surface-container'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 px-3 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md hover:bg-surface-container flex items-center gap-1 font-bold disabled:opacity-50"
                  >
                    <span>Next</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────── TAB 2: SPECIALTIES (Viewable by Admin & Branch Manager) ─────────── */}
        {activeTab === 'specialties' && (
          <div id="tabContentSpecialties" className="p-space-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md mb-space-md">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-brand-navy-deep font-bold">
                  Doctor Specialties Directory
                </h1>
              </div>
              {/* Specialty Search Bar */}
              <div className="relative min-w-[260px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  search
                </span>
                <input
                  type="text"
                  value={specialtySearch}
                  onChange={(e) => setSpecialtySearch(e.target.value)}
                  placeholder="Search specialty by name..."
                  className="w-full h-[40px] pl-10 pr-4 bg-surface-subtle rounded-lg text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg">
              {/* Specialties table */}
              <div className={`${isAdmin ? 'xl:col-span-2' : 'xl:col-span-3'} flex flex-col gap-space-md`}>
                <div className="overflow-x-auto rounded-xl bg-surface-subtle p-1">
                  <table className="w-full text-left bg-surface-card rounded-lg overflow-hidden">
                    <thead className="bg-surface-subtle">
                      <tr>
                        <th className="h-10 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">
                          Specialty Name
                        </th>
                        <th className="h-10 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold">
                          Doctors
                        </th>
                        {isAdmin && (
                          <th className="h-10 px-space-md font-label-sm text-label-sm text-outline uppercase tracking-wider font-bold text-right">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSpecialties ? (
                        <tr>
                          <td colSpan={isAdmin ? 3 : 2} className="p-space-md">
                            <LoadingState message="Loading specialties list…" rows={2} />
                          </td>
                        </tr>
                      ) : specialties.filter((s) => !specialtySearch || s.name.toLowerCase().includes(specialtySearch.toLowerCase()) || (s.description ?? '').toLowerCase().includes(specialtySearch.toLowerCase())).length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 3 : 2} className="p-space-md">
                            <EmptyState
                              title="No Specialties Found"
                              message="No medical specialties match your search query."
                              icon="category"
                            />
                          </td>
                        </tr>
                      ) : (
                        specialties
                          .filter((s) => !specialtySearch || s.name.toLowerCase().includes(specialtySearch.toLowerCase()) || (s.description ?? '').toLowerCase().includes(specialtySearch.toLowerCase()))
                          .map((sp) => (
                            <tr
                              key={sp.specialty_id}
                              className="hover:bg-surface-subtle transition-colors border-t border-border-subtle first:border-t-0"
                            >
                              <td className="py-3 px-space-md">
                                <div className="flex items-center gap-space-xs">
                                  <div className="w-8 h-8 rounded-lg bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[16px]">
                                      healing
                                    </span>
                                  </div>
                                  <span className="font-label-lg text-label-lg text-on-surface font-bold">
                                    {sp.name}
                                  </span>
                                </div>
                                {sp.description && (
                                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 pl-10">
                                    {sp.description}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-space-md">
                                <span className="px-2 py-0.5 rounded-md bg-surface-container font-mono-data text-mono-data text-on-surface font-bold">
                                  {sp.doctor_count} Doctor{sp.doctor_count !== 1 ? 's' : ''}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="py-3 px-space-md text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      title="Edit Specialty"
                                      onClick={() => handleOpenEditSpecialty(sp)}
                                      className="w-7 h-7 rounded-md hover:bg-surface-container text-primary flex items-center justify-center transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        edit
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      title="Delete Specialty"
                                      onClick={() => setDeletingSpecialty(sp)}
                                      className="w-7 h-7 rounded-md hover:bg-status-cancelled-bg text-status-cancelled-text flex items-center justify-center transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        delete
                                      </span>
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add specialty form (1/3 — Admin only) */}
              {isAdmin && <AddSpecialtyForm onAdded={fetchSpecialties} />}
            </div>
          </div>
        )}
      </div>

      {/* Manage Specialties Modal */}
      {modalDoctor && (
        <ManageSpecialtiesModal
          doctor={modalDoctor}
          allSpecialties={specialties}
          onClose={() => setModalDoctor(null)}
          onSave={handleModalSave}
        />
      )}

      {/* Edit Specialty Modal */}
      <Modal
        isOpen={!!editingSpecialty}
        onClose={() => setEditingSpecialty(null)}
        title="Edit Specialty"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingSpecialty(null)}
              className="px-space-md h-[42px] font-label-lg text-label-lg font-bold text-on-surface-variant bg-surface-card hover:bg-surface-subtle border border-border-subtle rounded-lg shadow-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEditSpecialty}
              disabled={savingEdit}
              className="px-space-md h-[42px] font-label-lg text-label-lg font-bold rounded-lg shadow-sm transition-all bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{savingEdit ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEditSpecialty();
          }}
          className="space-y-space-md"
        >
          <div>
            <label className="block font-label-md text-label-md text-on-surface font-bold mb-1">
              Specialty Name *
            </label>
            <input
              required
              minLength={2}
              maxLength={100}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-[42px] px-3 bg-surface-subtle border border-border-subtle rounded-lg text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface font-bold mb-1">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full p-3 bg-surface-subtle border border-border-subtle rounded-lg text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Specialty Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingSpecialty}
        onClose={() => setDeletingSpecialty(null)}
        onConfirm={handleConfirmDeleteSpecialty}
        isDestructive={true}
        title="Delete Specialty"
        message={
          deletingSpecialty?.doctor_count && deletingSpecialty.doctor_count > 0
            ? `Cannot delete '${deletingSpecialty.name}' because it is assigned to ${deletingSpecialty.doctor_count} doctor(s). Reassign them first.`
            : `Are you sure you want to delete the specialty '${deletingSpecialty?.name}'? This action cannot be undone.`
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete Specialty'}
      />
    </div>
  );
};

export default ManageDoctors;
