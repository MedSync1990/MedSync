import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { appointmentService } from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { get } from '../../services/api';
import type {
  AppointmentResponse,
  DoctorResponse,
  BranchResponse,
  DoctorSlotResponse,
  PatientResponse,
} from '../../types';

// Helper: Format 24h time to 12h AM/PM
function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour.toString().padStart(2, '0')}:${min} ${ampm}`;
}

// Helper: Format YYYY-MM-DD date to clinical readable string (e.g. Sep 25, 2026)
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper: Calculate age from DOB
function getAge(dobString?: string): number {
  if (!dobString) return 0;
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
}

// Helper: Get initials for avatar
function getInitials(name: string): string {
  if (!name) return 'PT';
  const parts = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '').trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const ManageAppointments: React.FC = () => {
  const { showToast } = useToast();

  // ─── Data State ────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [allDoctors, setAllDoctors] = useState<DoctorResponse[]>([]);
  const [allBranches, setAllBranches] = useState<BranchResponse[]>([]);

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState<string>('');
  const [isDoctorOpen, setIsDoctorOpen] = useState<boolean>(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'today' | 'tomorrow' | 'this_week' | 'all' | 'custom'>('all');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // ─── Interactive Modal & Drawer State ──────────────────────────────────────
  // Reschedule Modal
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentResponse | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<DoctorSlotResponse[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedNewSlot, setSelectedNewSlot] = useState<DoctorSlotResponse | null>(null);
  const [submittingReschedule, setSubmittingReschedule] = useState<boolean>(false);

  // Cancel Modal
  const [cancelApt, setCancelApt] = useState<AppointmentResponse | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);

  // Patient Card Quick View Drawer
  const [drawerApt, setDrawerApt] = useState<AppointmentResponse | null>(null);
  const [drawerPatient, setDrawerPatient] = useState<PatientResponse | null>(null);
  const [loadingDrawerPatient, setLoadingDrawerPatient] = useState<boolean>(false);

  // ─── Initial Reference Data Fetching ───────────────────────────────────────
  useEffect(() => {
    const loadReferences = async () => {
      try {
        const [docsRes, branchesRes] = await Promise.all([
          get<DoctorResponse[]>('/doctors').catch(() => []),
          get<BranchResponse[]>('/branches').catch(() => []),
        ]);
        setAllDoctors(docsRes || []);
        setAllBranches(branchesRes || []);
      } catch {
        // Silently handle reference load
      }
    };
    loadReferences();
  }, []);

  // Close doctor dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target as Node)) {
        setIsDoctorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Currently selected doctor object (if any)
  const selectedDoctorObj = useMemo(() => {
    if (selectedDoctor === 'all') return null;
    return allDoctors.find((d) => String(d.doctor_id) === String(selectedDoctor));
  }, [allDoctors, selectedDoctor]);

  // Filtered doctors based on search bar query & selected branch
  const filteredDoctors = useMemo(() => {
    const q = doctorSearchQuery.toLowerCase().trim();
    return allDoctors.filter((doc) => {
      const branchMatch = selectedBranch === 'all' || String(doc.branch_id) === String(selectedBranch);
      if (!branchMatch) return false;
      if (!q) return true;
      const nameMatch = doc.full_name.toLowerCase().includes(q);
      const specMatch = doc.specialties?.some((s) => s.toLowerCase().includes(q));
      const branchNameMatch = (doc.branch_name || '').toLowerCase().includes(q);
      return nameMatch || specMatch || branchNameMatch;
    });
  }, [allDoctors, selectedBranch, doctorSearchQuery]);

  // ─── Fetch Appointments ────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (selectedBranch !== 'all') {
        params.branch = parseInt(selectedBranch, 10);
      }
      if (selectedDoctor !== 'all') {
        params.doctor = parseInt(selectedDoctor, 10);
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      if (selectedDate) {
        params.date = selectedDate;
      }

      const res = await appointmentService.list(params);
      setAppointments(res.data || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setAppointments([]);
      setTotalCount(0);
      showToast(err?.message || 'Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedBranch, selectedDoctor, selectedStatus, selectedDate, showToast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ─── Filtered by Search on Client ──────────────────────────────────────────
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase().trim();
    return appointments.filter((apt) => {
      const code = (apt.appointment_code || '').toLowerCase();
      const patient = (apt.patient_name || '').toLowerCase();
      const doctor = (apt.doctor_name || '').toLowerCase();
      const branch = (apt.branch_name || '').toLowerCase();
      const idStr = String(apt.patient_id);
      return (
        code.includes(q) ||
        patient.includes(q) ||
        doctor.includes(q) ||
        branch.includes(q) ||
        idStr.includes(q)
      );
    });
  }, [appointments, searchQuery]);

  // ─── Summary Statistics ────────────────────────────────────────────────────
  const scheduledCount = useMemo(() => {
    return appointments.filter((a) => a.status?.toLowerCase() === 'scheduled').length;
  }, [appointments]);

  const completedCount = useMemo(() => {
    return appointments.filter((a) => a.status?.toLowerCase() === 'completed').length;
  }, [appointments]);

  const cancelledCount = useMemo(() => {
    return appointments.filter((a) => a.status?.toLowerCase() === 'cancelled').length;
  }, [appointments]);

  // ─── Date Preset Handler ───────────────────────────────────────────────────
  const handleDatePreset = (preset: 'today' | 'tomorrow' | 'this_week' | 'all') => {
    setDatePreset(preset);
    setPage(1);
    if (preset === 'today') {
      setSelectedDate(todayStr);
    } else if (preset === 'tomorrow') {
      setSelectedDate(tomorrowStr);
    } else if (preset === 'all') {
      setSelectedDate('');
    } else if (preset === 'this_week') {
      // Show today onwards or reset to today
      setSelectedDate(todayStr);
    }
  };

  // ─── Reset Filters ─────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('all');
    setSelectedDoctor('all');
    setDoctorSearchQuery('');
    setIsDoctorOpen(false);
    setSelectedStatus('all');
    setDatePreset('all');
    setSelectedDate('');
    setPage(1);
  };

  // ─── Reschedule Logic ──────────────────────────────────────────────────────
  const openRescheduleModal = (apt: AppointmentResponse) => {
    setRescheduleApt(apt);
    const initialDate = apt.appointment_date || todayStr;
    setRescheduleDate(initialDate);
    setSelectedNewSlot(null);
  };

  useEffect(() => {
    if (!rescheduleApt || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }

    const fetchSlotsForReschedule = async () => {
      setLoadingSlots(true);
      try {
        const slots = await appointmentService.getAvailability(
          rescheduleApt.doctor_id,
          rescheduleDate,
          false // only open slots for rescheduling
        );
        setRescheduleSlots(slots || []);
      } catch {
        setRescheduleSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlotsForReschedule();
  }, [rescheduleApt, rescheduleDate]);

  const handleConfirmReschedule = async () => {
    if (!rescheduleApt) return;
    if (!selectedNewSlot) {
      showToast('Please select a new available time slot.', 'error');
      return;
    }

    setSubmittingReschedule(true);
    try {
      await appointmentService.reschedule(rescheduleApt.appointment_id, {
        new_slot_id: selectedNewSlot.slot_id,
      });

      showToast(
        `Consultation slot successfully rescheduled to ${formatDate(rescheduleDate)} at ${formatTime(selectedNewSlot.start_time)}. Patient SMS notification dispatched.`,
        'success'
      );
      setRescheduleApt(null);
      setSelectedNewSlot(null);
      fetchAppointments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to reschedule appointment', 'error');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  // ─── Cancel Logic ──────────────────────────────────────────────────────────
  const openCancelModal = (apt: AppointmentResponse) => {
    setCancelApt(apt);
  };

  const handleConfirmCancellation = async () => {
    if (!cancelApt) return;

    setSubmittingCancel(true);
    try {
      await appointmentService.cancel(cancelApt.appointment_id);
      showToast(
        `Appointment ${cancelApt.appointment_code} for ${cancelApt.patient_name} has been safely cancelled. Time slot released.`,
        'success'
      );
      setCancelApt(null);
      fetchAppointments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel appointment', 'error');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // ─── Details Drawer Logic ──────────────────────────────────────────────────
  const openDetailsDrawer = async (apt: AppointmentResponse) => {
    setDrawerApt(apt);
    setDrawerPatient(null);
    setLoadingDrawerPatient(true);

    try {
      const patient = await patientService.getById(apt.patient_id);
      setDrawerPatient(patient);
    } catch {
      // Fallback
    } finally {
      setLoadingDrawerPatient(false);
    }
  };

  // ─── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredAppointments.length === 0) {
      showToast('No records available to export.', 'error');
      return;
    }

    const headers = [
      'Appointment Code',
      'Patient ID',
      'Patient Name',
      'Doctor Name',
      'Branch',
      'Date',
      'Start Time',
      'End Time',
      'Type',
      'Status',
    ];

    const rows = filteredAppointments.map((apt) => [
      `"${apt.appointment_code || ''}"`,
      `"${apt.patient_id || ''}"`,
      `"${apt.patient_name || ''}"`,
      `"${apt.doctor_name || ''}"`,
      `"${apt.branch_name || ''}"`,
      `"${apt.appointment_date || ''}"`,
      `"${apt.start_time || ''}"`,
      `"${apt.end_time || ''}"`,
      `"${apt.appointment_type || ''}"`,
      `"${apt.status || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Appointments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Appointment records exported to CSV successfully.', 'success');
  };

  // ─── Print Sheet ───────────────────────────────────────────────────────────
  const handlePrintSheet = () => {
    window.print();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full space-y-space-lg">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: HEADER, BREADCRUMBS & LIVE METRICS                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline uppercase tracking-wider">
            <Link to="/receptionist/dashboard" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Appointments</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Manage Appointments</span>
          </div>

          {/* Title & Live Status Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight font-bold">
              Manage Appointments
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-scheduled-text animate-pulse"></span>
              Live Queue Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              {completedCount} Completed
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-cancelled-bg text-status-cancelled-text font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[14px]">event_busy</span>
              {cancelledCount} Cancelled
            </span>
            {scheduledCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-subtle text-brand-navy-deep font-label-sm text-label-sm font-semibold border border-border-subtle">
                <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                {scheduledCount} Scheduled
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            View, reschedule, or cancel patient appointments.
          </p>
        </div>

        {/* Action Button: Book Appointment */}
        <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-center">
          <Link
            to="/receptionist/book-appointment"
            className="h-11 px-space-lg rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
            <span>Book Appointment</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: COMPREHENSIVE MULTI-CRITERIA FILTER CONSOLE              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle p-space-md space-y-space-md">
        {/* Row 1: Search, Branch, Doctor, Reset */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Patient / NIC / ID Search */}
          <div className="lg:col-span-4 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, NIC, or Appointment ID..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-subtle focus:bg-surface-card text-brand-navy-deep placeholder-outline font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Branch Selector */}
          <div className="lg:col-span-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                apartment
              </span>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setPage(1);
                }}
                className="w-full h-11 pl-9 pr-8 rounded-xl bg-surface-subtle border border-transparent focus:border-primary font-body-md text-body-md text-brand-navy-deep appearance-none focus:outline-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {allBranches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name} Branch
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Doctor Filter (Search Bar + Scrollable List) */}
          <div className="lg:col-span-4 relative" ref={doctorDropdownRef}>
            <div
              onClick={() => setIsDoctorOpen(true)}
              className={`w-full h-11 px-3 rounded-xl bg-surface-subtle hover:bg-surface-container/60 border transition-all flex items-center gap-2 cursor-pointer ${isDoctorOpen ? 'border-primary ring-1 ring-primary bg-surface-card' : 'border-transparent'
                }`}
            >
              <span className="material-symbols-outlined text-[18px] text-outline shrink-0">
                stethoscope
              </span>

              {!isDoctorOpen && selectedDoctorObj ? (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-label-md text-label-md text-brand-navy-deep font-semibold truncate">
                      {selectedDoctorObj.full_name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-label-sm text-[11px] font-semibold shrink-0">
                      {selectedDoctorObj.specialties?.[0] || 'OPD'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDoctor('all');
                      setDoctorSearchQuery('');
                      setPage(1);
                    }}
                    className="text-outline hover:text-brand-navy-deep p-0.5 rounded-full hover:bg-surface-subtle"
                    title="Clear doctor filter"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={doctorSearchQuery}
                  onChange={(e) => {
                    setDoctorSearchQuery(e.target.value);
                    if (!isDoctorOpen) setIsDoctorOpen(true);
                  }}
                  onFocus={() => setIsDoctorOpen(true)}
                  placeholder={
                    selectedDoctorObj
                      ? `Selected: ${selectedDoctorObj.full_name}`
                      : 'Search doctor by name, specialty...'
                  }
                  className="w-full bg-transparent font-body-md text-body-md text-brand-navy-deep placeholder-outline focus:outline-none"
                />
              )}

              <div className="flex items-center gap-1 shrink-0">
                {doctorSearchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDoctorSearchQuery('');
                    }}
                    className="text-outline hover:text-brand-navy-deep"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                <span
                  className={`material-symbols-outlined text-[18px] text-outline transition-transform duration-200 ${isDoctorOpen ? 'rotate-180' : ''
                    }`}
                >
                  expand_more
                </span>
              </div>
            </div>

            {/* Scrollable Doctor Dropdown */}
            {isDoctorOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-surface-card rounded-2xl shadow-xl border border-border-subtle p-2 space-y-1.5 w-full min-w-[300px] animate-in fade-in duration-100">
                <div className="flex items-center justify-between px-2 pt-1 pb-1 border-b border-border-subtle/50 text-label-sm font-semibold text-outline">
                  <span>CONSULTANT DIRECTORY</span>
                  <span>{filteredDoctors.length} specialists</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoctor('all');
                      setDoctorSearchQuery('');
                      setIsDoctorOpen(false);
                      setPage(1);
                    }}
                    className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${selectedDoctor === 'all'
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-surface-subtle text-brand-navy-deep font-medium'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-surface-subtle text-outline flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">groups</span>
                      </div>
                      <div>
                        <div className="font-label-md text-label-md">All Doctors</div>
                        <div className="text-[11px] text-outline font-normal">
                          Show appointments for all doctors
                        </div>
                      </div>
                    </div>
                    {selectedDoctor === 'all' && (
                      <span className="material-symbols-outlined text-[18px] text-primary">check</span>
                    )}
                  </button>

                  {filteredDoctors.length === 0 ? (
                    <div className="p-4 text-center space-y-1">
                      <span className="material-symbols-outlined text-[24px] text-outline">search_off</span>
                      <div className="text-outline font-body-sm text-body-sm">
                        No doctors found matching "{doctorSearchQuery}"
                      </div>
                      {selectedBranch !== 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBranch('all');
                            setPage(1);
                          }}
                          className="text-[12px] text-primary hover:underline font-semibold"
                        >
                          Show across all branches
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredDoctors.map((doc) => {
                      const isSelected = String(selectedDoctor) === String(doc.doctor_id);
                      const initials = doc.full_name
                        .replace('Dr.', '')
                        .trim()
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <button
                          key={doc.doctor_id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctor(String(doc.doctor_id));
                            setDoctorSearchQuery('');
                            setIsDoctorOpen(false);
                            setPage(1);
                          }}
                          className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${isSelected
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'hover:bg-surface-subtle text-brand-navy-deep'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-label-sm shrink-0 ${isSelected
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-surface-subtle text-secondary'
                                }`}
                            >
                              {initials || 'DR'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-label-md text-label-md text-brand-navy-deep font-semibold truncate">
                                {doc.full_name}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-outline">
                                <span className="text-secondary font-medium">
                                  {doc.specialties?.[0] || 'General Medicine'}
                                </span>
                                {doc.branch_name && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.branch_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isSelected && (
                              <span className="material-symbols-outlined text-[18px] text-primary">check</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          <div className="lg:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              title="Clear all filters"
              className="h-11 px-3 w-full rounded-xl bg-surface-subtle hover:bg-surface-container text-outline hover:text-brand-navy-deep font-label-md text-label-md flex items-center justify-center gap-1 transition-colors border border-border-subtle"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span className="lg:hidden">Reset</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Tabs & Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-2 border-t border-border-subtle/50">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-surface-subtle rounded-xl p-1 border border-border-subtle">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'Scheduled', label: 'Scheduled' },
              { id: 'Completed', label: 'Completed' },
              { id: 'Cancelled', label: 'Cancelled' },
            ].map((tab) => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all font-semibold ${isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-brand-navy-deep hover:bg-surface-card'
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Date Range Quick Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-subtle font-label-md text-label-md text-brand-navy-deep border border-border-subtle">
              <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
              <span>
                {selectedDate
                  ? formatDate(selectedDate)
                  : datePreset === 'all'
                    ? 'All Scheduled Dates'
                    : 'Select Date'}
              </span>
            </div>

            <div className="flex bg-surface-subtle rounded-xl p-1 border border-border-subtle">
              <button
                type="button"
                onClick={() => handleDatePreset('all')}
                className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm transition-all font-semibold ${datePreset === 'all'
                  ? 'bg-surface-card text-brand-navy-deep shadow-xs'
                  : 'text-outline hover:text-brand-navy-deep'
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('today')}
                className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm transition-all font-semibold ${datePreset === 'today'
                  ? 'bg-surface-card text-brand-navy-deep shadow-xs'
                  : 'text-outline hover:text-brand-navy-deep'
                  }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('tomorrow')}
                className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm transition-all font-semibold ${datePreset === 'tomorrow'
                  ? 'bg-surface-card text-brand-navy-deep shadow-xs'
                  : 'text-outline hover:text-brand-navy-deep'
                  }`}
              >
                Tomorrow
              </button>
            </div>

            {/* Custom Date Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDatePreset('custom');
                setPage(1);
              }}
              className="h-9 px-2.5 rounded-xl bg-surface-subtle border border-border-subtle font-body-sm text-body-sm text-brand-navy-deep focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: MAIN CLINICAL APPOINTMENTS DATA TABLE CARD               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col">
        {/* Table Header & Utility Toolbar */}
        <div className="px-space-md py-space-sm bg-surface-subtle flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
              Scheduled Queue
            </span>
            <span className="font-label-sm text-label-sm text-outline px-2.5 py-0.5 rounded-md bg-surface-card border border-border-subtle font-semibold">
              Showing {filteredAppointments.length} of {totalCount} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-label-sm text-label-sm px-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle hover:border-primary transition-colors font-semibold"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">file_download</span>
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrintSheet}
              className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-label-sm text-label-sm px-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle hover:border-primary transition-colors font-semibold"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">print</span>
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Scrollable Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-subtle/60 h-11 font-label-sm text-label-sm text-outline uppercase tracking-wider border-b border-border-subtle">
                <th className="px-space-md w-[260px]">Patient Information</th>
                <th className="px-space-md w-[220px]">Consultant</th>
                <th className="px-space-md w-[130px]">Specialty</th>
                <th className="px-space-md w-[200px]">Date / Time Slot</th>
                <th className="px-space-md w-[130px]">Status</th>
                <th className="px-space-md w-[160px]">Branch</th>
                <th className="px-space-md w-[140px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/70 font-body-md text-body-md">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-space-md py-12 text-center text-outline">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
                        progress_activity
                      </span>
                      <span className="font-body-sm text-body-sm font-medium">
                        Loading scheduled appointments...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-space-md py-12 text-center text-outline">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-outline/60">
                        calendar_today
                      </span>
                      <span className="font-headline-sm text-brand-navy-deep font-semibold">
                        No appointments found
                      </span>
                      <p className="font-body-sm text-body-sm max-w-sm">
                        Try adjusting search terms, clearing branch/doctor filters, or select another date.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-surface-subtle border border-border-subtle hover:bg-surface-container font-label-sm text-primary font-bold transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const isScheduled = apt.status?.toLowerCase() === 'scheduled';
                  const isCompleted = apt.status?.toLowerCase() === 'completed';
                  const isCancelled = apt.status?.toLowerCase() === 'cancelled';

                  // Specialty lookup
                  const doc = allDoctors.find((d) => d.doctor_id === apt.doctor_id);
                  const specialty = doc?.specialties?.[0] || 'General OPD';

                  return (
                    <tr
                      key={apt.appointment_id}
                      className={`hover:bg-surface-subtle/70 transition-colors group ${isCancelled ? 'opacity-80' : ''
                        }`}
                    >
                      {/* 1. Patient Information */}
                      <td className="px-space-md py-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-label-lg text-label-lg font-semibold ${isCancelled ? 'text-brand-navy-deep line-through' : 'text-brand-navy-deep'
                                }`}
                            >
                              {apt.patient_name}
                            </span>
                            <span className="font-mono-data text-mono-data text-outline text-[12px] px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle">
                              {apt.appointment_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant font-body-sm text-body-sm">
                            <span className="px-1.5 py-0.2 rounded bg-surface-subtle text-outline text-[11px] font-mono-data font-semibold">
                              PID #{apt.patient_id}
                            </span>
                            <span className="text-outline">·</span>
                            <span className="text-[12px] text-secondary font-medium">
                              {apt.appointment_type || 'Consultation'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Consultant */}
                      <td className="px-space-md py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-label-sm text-[12px] font-bold shrink-0">
                            {getInitials(apt.doctor_name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md text-brand-navy-deep font-semibold">
                              {apt.doctor_name}
                            </span>
                            <span className="font-body-sm text-[12px] text-outline">
                              Consultant Specialist
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Specialty */}
                      <td className="px-space-md py-3.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-surface-container-low text-primary font-label-sm text-[12px] font-bold border border-primary/10">
                          {specialty}
                        </span>
                      </td>

                      {/* 4. Date / Time Slot */}
                      <td className="px-space-md py-3.5">
                        <div className="flex flex-col">
                          <span
                            className={`font-label-md text-label-md flex items-center gap-1.5 font-semibold ${isCancelled
                              ? 'text-on-surface-variant line-through'
                              : 'text-brand-navy-deep'
                              }`}
                          >
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              schedule
                            </span>
                            {formatTime(apt.start_time)}
                            <span className="px-1.5 py-0.2 rounded bg-surface-subtle text-[11px] text-outline font-semibold border border-border-subtle">
                              Slot #{apt.slot_id}
                            </span>
                          </span>
                          <span className="font-body-sm text-[12px] text-outline mt-0.5 font-medium">
                            {formatDate(apt.appointment_date)}
                          </span>
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="px-space-md py-3.5">
                        <StatusBadge status={apt.status} />
                      </td>

                      {/* 6. Facility / Wing */}
                      <td className="px-space-md py-3.5 font-body-sm text-body-sm text-on-surface-variant">
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md text-brand-navy-deep font-medium">
                            {apt.branch_name || 'Unknown Branch'}
                          </span>
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td className="px-space-md py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isScheduled && (
                            <>
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(apt)}
                                title="Reschedule Appointment"
                                className="p-1.5 rounded-lg text-primary hover:bg-status-scheduled-bg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  edit_calendar
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openCancelModal(apt)}
                                title="Cancel Appointment"
                                className="p-1.5 rounded-lg text-error hover:bg-error-container transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  event_busy
                                </span>
                              </button>
                            </>
                          )}

                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded bg-surface-subtle font-label-sm text-[11px] text-outline font-semibold cursor-not-allowed">
                              Consulted
                            </span>
                          )}

                          {isCancelled && (
                            <Link
                              to="/receptionist/book-appointment"
                              className="h-7 px-2.5 rounded-lg bg-surface-subtle hover:bg-status-scheduled-bg text-primary font-label-sm text-[11px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <span>Rebook</span>
                            </Link>
                          )}

                          {/* View Encounter Card Drawer */}
                          <button
                            type="button"
                            onClick={() => openDetailsDrawer(apt)}
                            title="View Patient Encounter Card"
                            className="p-1.5 rounded-lg text-outline hover:text-brand-navy-deep hover:bg-surface-subtle transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
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

        {/* Table Footer / Pagination */}
        <div className="p-space-md bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 font-body-sm text-body-sm text-outline">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-surface-card rounded-lg px-2 py-1 text-brand-navy-deep font-medium border border-border-subtle focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2 font-medium">
              {filteredAppointments.length > 0
                ? `${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount} appointments`
                : '0 appointments'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center text-outline hover:text-brand-navy-deep border border-border-subtle shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="px-3 py-1 text-label-sm font-bold text-brand-navy-deep bg-surface-card rounded-lg border border-border-subtle shadow-xs">
              Page {page} of {Math.max(1, Math.ceil(totalCount / limit))}
            </span>
            <button
              type="button"
              disabled={page * limit >= totalCount}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center text-outline hover:text-brand-navy-deep border border-border-subtle shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE MODAL 1: RESCHEDULE CONSULTATION MODAL                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {rescheduleApt &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setRescheduleApt(null);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy-deep/60 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div className="bg-surface-card rounded-2xl shadow-2xl max-w-lg w-full p-space-lg space-y-space-md border border-border-subtle">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[22px]">calendar_clock</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">
                      Reschedule Consultation
                    </h3>
                    <span className="font-body-sm text-body-sm text-outline">
                      {rescheduleApt.patient_name} · {rescheduleApt.appointment_code}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="p-1.5 rounded-lg text-outline hover:text-brand-navy-deep hover:bg-surface-subtle transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4">
                <div>
                  <label className="font-label-sm text-label-sm text-outline uppercase tracking-wider block mb-1 font-semibold">
                    Assigned Consultant
                  </label>
                  <div className="p-3 rounded-xl bg-surface-subtle font-label-md text-label-md text-brand-navy-deep flex items-center gap-2 border border-border-subtle font-semibold">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      stethoscope
                    </span>
                    <span>{rescheduleApt.doctor_name}</span>
                  </div>
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-outline uppercase tracking-wider block mb-1 font-semibold">
                    New Consultation Date
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    min={todayStr}
                    onChange={(e) => {
                      setRescheduleDate(e.target.value);
                      setSelectedNewSlot(null);
                    }}
                    className="w-full h-11 px-3 rounded-xl bg-surface-subtle border border-border-subtle text-brand-navy-deep font-body-md text-body-md focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-outline uppercase tracking-wider block mb-1 font-semibold">
                    Select Available Time Slot
                  </label>
                  {loadingSlots ? (
                    <div className="p-4 rounded-xl bg-surface-subtle text-center text-outline font-body-sm text-body-sm flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px] animate-spin text-primary">
                        progress_activity
                      </span>
                      <span>Checking doctor availability...</span>
                    </div>
                  ) : rescheduleSlots.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface-subtle border border-dashed border-border-subtle text-center text-outline font-body-sm text-body-sm">
                      No open consultation slots found on this date. Please pick another date above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1">
                      {rescheduleSlots.map((slot) => {
                        const isSelected = selectedNewSlot?.slot_id === slot.slot_id;
                        return (
                          <button
                            key={slot.slot_id}
                            type="button"
                            onClick={() => setSelectedNewSlot(slot)}
                            className={`py-2 px-3 rounded-xl text-center font-label-sm text-label-sm transition-all font-semibold border ${isSelected
                                ? 'bg-primary text-on-primary border-primary shadow-sm'
                                : 'bg-surface-subtle hover:bg-surface-container text-brand-navy-deep border-border-subtle'
                              }`}
                          >
                            {formatTime(slot.start_time)} (Slot #{slot.slot_id})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="h-10 px-4 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-label-md font-semibold transition-colors border border-border-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedNewSlot || submittingReschedule}
                  onClick={handleConfirmReschedule}
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>{submittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE MODAL 2: CANCEL APPOINTMENT CONFIRMATION DIALOGUE       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {cancelApt &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setCancelApt(null);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy-deep/60 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div className="bg-surface-card rounded-2xl shadow-2xl max-w-md w-full p-space-lg space-y-space-md border border-border-subtle">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[28px]">warning</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">
                    Cancel this appointment?
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    You are about to cancel{' '}
                    <strong className="text-brand-navy-deep">{cancelApt.appointment_code}</strong> for{' '}
                    <strong className="text-brand-navy-deep">{cancelApt.patient_name}</strong>. This
                    action will release their time slot immediately.
                  </p>
                </div>
              </div>

              {/* Action Confirmation Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelApt(null)}
                  className="h-10 px-4 rounded-xl bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-label-md text-label-md font-semibold transition-colors border border-border-subtle"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  disabled={submittingCancel}
                  onClick={handleConfirmCancellation}
                  className="h-10 px-5 rounded-xl bg-error hover:bg-error/90 text-on-error font-label-md text-label-md shadow-sm transition-colors flex items-center gap-1.5 font-bold disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">event_busy</span>
                  <span>{submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE FLYOUT DRAWER: QUICK PATIENT DETAILS CARD               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {drawerApt &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setDrawerApt(null);
            }}
            className="fixed inset-0 z-[100] flex justify-end bg-brand-navy-deep/40 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="w-full max-w-md bg-surface-card shadow-2xl h-full flex flex-col border-l border-border-subtle animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-space-lg border-b border-border-subtle flex items-center justify-between bg-surface-subtle">
                <div className="space-y-0.5">
                  <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                    Patient Card
                  </span>
                  <h3 className="font-headline-md text-headline-md text-brand-navy-deep font-bold">
                    {drawerApt.appointment_code}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerApt(null)}
                  className="p-2 rounded-xl text-outline hover:text-brand-navy-deep hover:bg-surface-card transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-space-lg flex-1 overflow-y-auto space-y-6">
                {/* Patient Identity Details */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-headline-sm border border-primary/20">
                      {getInitials(drawerApt.patient_name)}
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                        {drawerApt.patient_name}
                      </h4>
                      <span className="font-body-sm text-body-sm text-outline">
                        {loadingDrawerPatient ? (
                          'Loading patient profile...'
                        ) : drawerPatient ? (
                          `NIC: ${drawerPatient.id_number || 'N/A'} · ${drawerPatient.address || 'Address unlisted'}`
                        ) : (
                          `Patient ID #${drawerApt.patient_id}`
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-body-sm pt-2 border-t border-border-subtle/50">
                    <div>
                      <span className="font-label-sm text-outline block font-semibold">Age / Gender</span>
                      <span className="text-brand-navy-deep font-medium">
                        {drawerPatient
                          ? `${getAge(drawerPatient.date_of_birth)} Yrs · ${drawerPatient.gender}`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-sm text-outline block font-semibold">Contact Phone</span>
                      <span className="text-brand-navy-deep font-medium">
                        {drawerPatient?.phone_number || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consultation Particulars */}
                <div className="space-y-3">
                  <h5 className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                    Consultation Particulars
                  </h5>
                  <div className="space-y-2 text-body-sm">
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-outline">Attending Doctor</span>
                      <span className="font-label-md text-brand-navy-deep font-semibold">
                        {drawerApt.doctor_name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-outline">Type</span>
                      <span className="font-label-md text-brand-navy-deep font-semibold">
                        {drawerApt.appointment_type || 'Scheduled Visit'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-outline">Branch</span>
                      <span className="font-label-md text-brand-navy-deep font-semibold">
                        {drawerApt.branch_name || 'Unknown Branch'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-outline">Scheduled Slot</span>
                      <span className="font-label-md text-primary font-bold">
                        {formatTime(drawerApt.start_time)} · Slot #{drawerApt.slot_id}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-outline">Consultation Date</span>
                      <span className="font-label-md text-brand-navy-deep font-semibold">
                        {formatDate(drawerApt.appointment_date)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-outline">Appointment Status</span>
                      <StatusBadge status={drawerApt.status} />
                    </div>
                  </div>
                </div>

                {/* Medical Safety & Allergy Notes */}
                <div className="p-3.5 rounded-xl bg-status-cancelled-bg/40 border border-status-cancelled-text/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-status-cancelled-text font-label-sm uppercase font-bold">
                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                    <span>Medical Flags &amp; Allergies</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-brand-navy-deep font-medium">
                    {drawerPatient?.allergies && drawerPatient.allergies.length > 0
                      ? `Recorded Allergies: ${drawerPatient.allergies.map((a) => a.name).join(', ')}`
                      : 'No critical drug allergies recorded in medical profile.'}
                  </p>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-space-md border-t border-border-subtle flex gap-2 bg-surface-subtle">
                <Link
                  to="/receptionist/invoices"
                  className="flex-1 h-10 rounded-xl bg-surface-card hover:bg-surface-container text-brand-navy-deep font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors border border-border-subtle font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    receipt_long
                  </span>
                  <span>Invoices</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerApt(null)}
                  className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md transition-colors font-bold shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ManageAppointments;
