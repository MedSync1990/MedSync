import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadingState } from '../../components/LoadingState';
import { useToast } from '../../context/ToastContext';
import { appointmentService } from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { get } from '../../services/api';
import type {
  DoctorResponse,
  SpecialtyResponse,
  DoctorSlotResponse,
  PatientListItem,
  AppointmentType,
  BranchResponse,
} from '../../types';


// Helper: compute age from ISO date string
function getAge(dobStr: string): number {
  if (!dobStr) return 0;
  const dob = new Date(dobStr);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// Helper: format 24-hr time to 12-hr AM/PM
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

// Helper: current time as HH:MM
function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Helper: add minutes to HH:MM time string
function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let totalMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + minutes;
  totalMin = (totalMin + 1440) % 1440;
  const newH = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const newM = String(totalMin % 60).padStart(2, '0');
  return `${newH}:${newM}`;
}

// Helper: Check if two time ranges [start1, end1) and [start2, end2) overlap
function checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  if (!start1 || !end1 || !start2 || !end2) return false;
  const s1 = start1.slice(0, 5);
  const e1 = end1.slice(0, 5);
  const s2 = start2.slice(0, 5);
  const e2 = end2.slice(0, 5);
  return s1 < e2 && e1 > s2;
}

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // ─── Step 1: Patient Search & Selection State ──────────────────────────────
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientListItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = React.useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const prefillPatientId = searchParams.get('patient_id');

  useEffect(() => {
    if (prefillPatientId) {
      patientService.getById(prefillPatientId).then((res) => {
        const p: PatientListItem = {
          patient_id: res.patient_id,
          patient_code: res.patient_code,
          first_name: res.first_name,
          last_name: res.last_name,
          id_number: res.id_number,
          phone_number: res.phone_number,
          gender: res.gender,
          date_of_birth: res.date_of_birth,
          has_insurance: res.has_insurance,
          is_active: res.is_active,
        };
        setSelectedPatient(p);
        setPatientSearch(`${res.first_name} ${res.last_name} (${res.patient_code})`);
      }).catch(err => {
        showToast('Failed to load pre-filled patient', 'error');
      });
    }
  }, [prefillPatientId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Step 2: Category State ────────────────────────────────────────────────
  const [category, setCategory] = useState<AppointmentType>('Scheduled Visit');

  // ─── Step 3: Doctor, Branch, Specialty & Slot State ────────────────────────
  const [allDoctors, setAllDoctors] = useState<DoctorResponse[]>([]);
  const [allBranches, setAllBranches] = useState<BranchResponse[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [allSpecialties, setAllSpecialties] = useState<SpecialtyResponse[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponse | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Date selection for availability
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Standard pre-scheduled slots
  const [slots, setSlots] = useState<DoctorSlotResponse[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlotResponse | null>(null);

  // Walk-in manual time slot inputs
  const [walkInStartTime, setWalkInStartTime] = useState<string>(() => getCurrentTimeString());
  const [walkInEndTime, setWalkInEndTime] = useState<string>(() => addMinutesToTime(getCurrentTimeString(), 20));

  // Determine if entered walk-in time slot overlaps with an existing doctor slot
  const conflictingSlot = useMemo(() => {
    if (category !== 'Walk-in' || !walkInStartTime || !walkInEndTime || walkInEndTime <= walkInStartTime) {
      return null;
    }
    return slots.find((s) => checkTimeOverlap(walkInStartTime, walkInEndTime, s.start_time, s.end_time)) || null;
  }, [category, walkInStartTime, walkInEndTime, slots]);

  // Filter open slots for scheduled visit selection
  const openSlots = useMemo(() => {
    return slots.filter((s) => s.status?.toLowerCase() === 'open');
  }, [slots]);

  // Filter booked slots for schedule overview
  const bookedSlots = useMemo(() => {
    return slots.filter((s) => s.status?.toLowerCase() === 'booked');
  }, [slots]);

  // ─── Step 4: Submission & Confirmation State ───────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ─── Initial Data Fetching ─────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingDoctors(true);
      try {
        const [docsRes, specsRes, branchesRes] = await Promise.all([
          get<DoctorResponse[]>('/doctors').catch(() => []),
          get<SpecialtyResponse[]>('/specialties').catch(() => []),
          get<BranchResponse[]>('/branches').catch(() => []),
        ]);
        setAllDoctors(docsRes || []);
        setAllSpecialties(specsRes || []);

        if (branchesRes && branchesRes.length > 0) {
          setAllBranches(branchesRes);
        } else if (docsRes && docsRes.length > 0) {
          // Derive fallback branches from doctors list
          const unique = Array.from(new Set(docsRes.map((d) => d.branch_name).filter(Boolean)));
          setAllBranches(
            unique.map((bName, idx) => ({
              branch_id: idx + 1,
              name: bName as string,
              address: '',
              phone_number: '',
              is_active: true,
            }))
          );
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to load doctors or specialties', 'error');
      } finally {
        setLoadingDoctors(false);
      }
    };
    loadInitialData();
  }, []);

  // ─── Patient Search Functions ──────────────────────────────────────────────
  const searchPatients = async (query?: string) => {
    setSearchingPatients(true);
    try {
      const trimmed = query?.trim();
      const res = await patientService.list(trimmed ? { search: trimmed, limit: 10 } : { limit: 10 });
      setPatientResults(res?.data || []);
    } catch {
      setPatientResults([]);
    } finally {
      setSearchingPatients(false);
      setShowPatientDropdown(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch.trim()) {
        searchPatients(patientSearch);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  // ─── Fetch Availability Slots when Doctor or Date Changes ─────────────────
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await appointmentService.getAvailability(selectedDoctor.doctor_id, selectedDate, true);
        setSlots(res || []);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // ─── Filtered Doctors ──────────────────────────────────────────────────────
  const filteredDoctors = useMemo(() => {
    return allDoctors.filter((doc) => {
      const docName = doc.full_name;
      const matchesBranch =
        selectedBranch === 'All' ||
        doc.branch_name?.toLowerCase() === selectedBranch.toLowerCase() ||
        String(doc.branch_id) === selectedBranch;

      const matchesSpecialty =
        selectedSpecialty === 'All' ||
        (doc.specialties && doc.specialties.includes(selectedSpecialty));

      const matchesSearch =
        !doctorSearch.trim() ||
        docName.toLowerCase().includes(doctorSearch.trim().toLowerCase()) ||
        Boolean(doc.branch_name && doc.branch_name.toLowerCase().includes(doctorSearch.trim().toLowerCase()));

      return matchesBranch && matchesSpecialty && matchesSearch;
    });
  }, [allDoctors, selectedBranch, selectedSpecialty, doctorSearch]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectPatient = (patient: PatientListItem) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setShowPatientDropdown(false);
  };

  const handleResetForm = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setCategory('Scheduled Visit');
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setSelectedBranch('All');
    setSelectedSpecialty('All');
    setDoctorSearch('');
    setWalkInStartTime(getCurrentTimeString());
    setWalkInEndTime(addMinutesToTime(getCurrentTimeString(), 20));
  };

  const handleExecuteBooking = async () => {
    if (!selectedPatient) {
      showToast('Please search and select a patient first.', 'error');
      return;
    }
    if (!selectedDoctor) {
      showToast('Please choose an available doctor.', 'error');
      return;
    }

    if (category === 'Walk-in') {
      if (!walkInStartTime || !walkInEndTime) {
        showToast('Please enter both start time and end time for the walk-in appointment.', 'error');
        return;
      }
      if (walkInEndTime <= walkInStartTime) {
        showToast('Walk-in end time must be after start time.', 'error');
        return;
      }
      if (conflictingSlot) {
        showToast(
          `Cannot book walk-in: entered time overlaps with an existing ${conflictingSlot.status.toLowerCase()} slot (${formatTime(conflictingSlot.start_time)} – ${formatTime(conflictingSlot.end_time)}).`,
          'error',
        );
        return;
      }

      setSubmitting(true);
      try {
        const formattedStart = walkInStartTime.length === 5 ? `${walkInStartTime}:00` : walkInStartTime;
        const formattedEnd = walkInEndTime.length === 5 ? `${walkInEndTime}:00` : walkInEndTime;

        await appointmentService.createWalkIn({
          patient_id: selectedPatient.patient_id,
          doctor_id: selectedDoctor.doctor_id,
          date: selectedDate,
          start_time: formattedStart,
          end_time: formattedEnd,
        });

        showToast(
          `Walk-in appointment booked for ${selectedPatient.first_name} ${selectedPatient.last_name} with ${selectedDoctor.full_name} on ${selectedDate} (${formatTime(walkInStartTime)} – ${formatTime(walkInEndTime)}).`,
          'success',
        );

        setTimeout(() => {
          navigate('/receptionist/appointments');
        }, 1200);
      } catch (err: any) {
        const msg = err?.message || '';
        if (err?.isConflict || msg.includes('already booked') || msg.includes('overlap')) {
          showToast(
            'This doctor is already booked over this time range. Please choose another time.',
            'error',
          );
        } else {
          showToast(msg || 'Failed to create walk-in appointment', 'error');
        }
      } finally {
        setSubmitting(false);
        setShowConfirmModal(false);
      }
    } else {
      if (!selectedSlot) {
        showToast('Please pick an open time slot.', 'error');
        return;
      }

      setSubmitting(true);
      try {
        await appointmentService.book({
          patient_id: selectedPatient.patient_id,
          doctor_id: selectedDoctor.doctor_id,
          slot_id: selectedSlot.slot_id,
          appointment_type: category,
        });

        const formattedSlotTime = formatTime(selectedSlot.start_time);
        showToast(
          `Appointment booked for ${selectedPatient.first_name} ${selectedPatient.last_name} with ${selectedDoctor.full_name} on ${selectedSlot.date} at ${formattedSlotTime}.`,
          'success',
        );

        setTimeout(() => {
          navigate('/receptionist/appointments');
        }, 1200);
      } catch (err: any) {
        const msg = err?.message || '';
        if (err?.isConflict || msg.includes('no longer available') || msg.includes('exclusion')) {
          showToast(
            'This doctor is no longer available at the selected time. Please choose another slot.',
            'error',
          );
        } else {
          showToast(msg || 'Failed to book appointment', 'error');
        }

        // Refresh slots on collision
        if (selectedDoctor && selectedDate) {
          appointmentService.getAvailability(selectedDoctor.doctor_id, selectedDate, true).then(setSlots);
        }
      } finally {
        setSubmitting(false);
        setShowConfirmModal(false);
      }
    }
  };

  const isReadyToConfirm =
    category === 'Walk-in'
      ? Boolean(
          selectedPatient &&
          selectedDoctor &&
          walkInStartTime &&
          walkInEndTime &&
          walkInEndTime > walkInStartTime &&
          !conflictingSlot
        )
      : Boolean(selectedPatient && selectedDoctor && selectedSlot);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="py-space-lg lg:py-space-xl max-w-content-max-width mx-auto w-full space-y-space-xl">
      {/* Top Page Header */}
      <PageHeader
        title="Book an Appointment"
        subtitle="Schedule a consultation with an available doctor in real time."
        breadcrumbs={[
          { label: 'Home', href: '/receptionist/dashboard' },
          { label: 'Appointments', href: '/receptionist/appointments' },
          { label: 'Book an Appointment' },
        ]}
      />

      <div className="space-y-space-lg">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 1: FIND PATIENT                                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-md">
          {/* Step Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold leading-tight">
                  Find Patient
                </h2>
                <p className="font-body-sm text-body-sm text-outline">
                  Select registered patient records or onboard a new patient
                </p>
              </div>
            </div>
            <Link
              to="/receptionist/register-patient"
              className="flex items-center gap-1.5 font-label-md text-label-md text-primary hover:text-primary-container transition-colors font-semibold self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Register New Patient</span>
            </Link>
          </div>

          {!selectedPatient ? (
            /* Search Bar & Dropdown */
            <div className="relative" ref={patientDropdownRef}>
              <div className="flex flex-col sm:flex-row items-center gap-space-sm">
                <div className="relative flex-1 w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    onFocus={() => {
                      if (patientResults.length === 0) {
                        searchPatients(patientSearch);
                      } else {
                        setShowPatientDropdown(true);
                      }
                    }}
                    placeholder="Search by NIC, Patient Name, Phone, or ID (e.g. 198821400293 or Priyantha)..."
                    className="w-full h-[42px] pl-10 pr-4 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all"
                  />
                  {searchingPatients && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline font-label-sm text-label-sm animate-pulse flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      Searching...
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => searchPatients(patientSearch)}
                  className="w-full sm:w-auto h-[42px] px-space-lg bg-surface-subtle hover:bg-border-subtle border border-border-subtle text-brand-navy-deep font-label-md text-label-md rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">manage_search</span>
                  <span>Lookup</span>
                </button>
              </div>

              {/* Patient Autocomplete Results Dropdown */}
              {showPatientDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-surface-card rounded-xl border border-border-subtle shadow-lg divide-y divide-border-subtle overflow-hidden max-h-64 overflow-y-auto">
                  {searchingPatients && patientResults.length === 0 ? (
                    <div className="p-4 text-center text-outline text-body-sm flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Loading real patient records...</span>
                    </div>
                  ) : patientResults.length === 0 ? (
                    <div className="p-4 text-center text-secondary text-body-sm space-y-1">
                      <div>No registered patients found{patientSearch.trim() ? ` matching "${patientSearch.trim()}"` : ''}.</div>
                      <Link
                        to="/receptionist/register-patient"
                        className="text-primary hover:underline font-semibold text-label-sm inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        Register New Patient
                      </Link>
                    </div>
                  ) : (
                    patientResults.map((p) => (
                      <div
                        key={p.patient_id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-3 px-4 hover:bg-surface-subtle cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center font-bold text-label-md">
                            {p.first_name[0]}
                            {p.last_name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-brand-navy-deep font-label-md text-label-md flex items-center gap-2">
                              <span>{p.first_name} {p.last_name}</span>
                              {p.branch_name && (
                                <span className="px-1.5 py-0.2 rounded bg-surface-subtle border border-border-subtle text-[11px] text-secondary">
                                  {p.branch_name}
                                </span>
                              )}
                            </div>
                            <div className="text-outline text-body-sm flex items-center gap-2">
                              <span>NIC: {p.id_number}</span>
                              <span>•</span>
                              <span>{p.phone_number || 'No phone'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.has_insurance
                              ? 'bg-status-completed-bg text-status-completed-text'
                              : 'bg-surface-subtle text-secondary'
                              }`}
                          >
                            {p.has_insurance ? 'Insured' : 'Self-Pay'}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle font-mono-data text-[12px] text-secondary font-medium">
                            {p.patient_code || `PT-${String(p.patient_id).padStart(6, '0')}`}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Selected Patient Verified Card */
            <div className="rounded-xl border border-primary/20 bg-surface-container-low/40 p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-12 h-12 rounded-full bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center font-headline-md text-headline-md font-bold tracking-wider">
                  {selectedPatient.first_name[0]}
                  {selectedPatient.last_name[0]}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-card border border-border-subtle font-mono-data text-[11px] text-secondary">
                      {selectedPatient.patient_code || `PT-${String(selectedPatient.patient_id).padStart(6, '0')}`}
                    </span>
                    {selectedPatient.has_insurance ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-completed-text"></span>
                        Insured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-subtle text-secondary font-label-sm text-[11px] font-semibold">
                        Self-Pay
                      </span>
                    )}
                    {selectedPatient.branch_name && (
                      <span className="px-2 py-0.5 rounded-full bg-surface-card border border-border-subtle font-body-sm text-[11px] text-secondary">
                        {selectedPatient.branch_name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body-sm text-body-sm text-secondary">
                    {selectedPatient.date_of_birth && (
                      <>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-outline">cake</span>
                          {selectedPatient.date_of_birth} ({getAge(selectedPatient.date_of_birth)} yrs)
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-outline">male</span>
                      {selectedPatient.gender}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-outline">call</span>
                      {selectedPatient.phone_number || 'N/A'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-outline">badge</span>
                      {selectedPatient.id_number}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-card border border-border-subtle hover:bg-surface-subtle font-label-sm text-label-sm text-secondary hover:text-brand-navy-deep transition-all self-start md:self-auto font-semibold"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                <span>⇄ Change Patient</span>
              </button>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 2: APPOINTMENT CATEGORY                                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-md">
          {/* Step Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold leading-tight">
                  Appointment Category
                </h2>
                <p className="font-body-sm text-body-sm text-outline">
                  Pick the appointment type
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-surface-subtle font-label-sm text-label-sm text-secondary self-start sm:self-auto font-medium">
              Standard Protocol
            </span>
          </div>

          {/* Category Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* 1. Doctor Consultation */}
            <label
              onClick={() => setCategory('Scheduled Visit')}
              className={`relative flex flex-col p-space-md rounded-xl border-2 cursor-pointer shadow-sm transition-all ${category === 'Scheduled Visit'
                ? 'border-primary bg-status-scheduled-bg/30'
                : 'border-border-subtle bg-surface-card hover:bg-surface-subtle/50'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${category === 'Scheduled Visit'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-subtle text-secondary'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                </span>
                {category === 'Scheduled Visit' ? (
                  <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-outline"></span>
                )}
              </div>
              <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                Doctor Consultation
              </span>
              <span className="font-body-sm text-body-sm text-secondary mt-1">
                Scheduled specialized clinical visit
              </span>
            </label>

            {/* 2. Walk-in */}
            <label
              onClick={() => setCategory('Walk-in')}
              className={`relative flex flex-col p-space-md rounded-xl border-2 cursor-pointer shadow-sm transition-all ${category === 'Walk-in'
                ? 'border-primary bg-status-scheduled-bg/30'
                : 'border-border-subtle bg-surface-card hover:bg-surface-subtle/50'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${category === 'Walk-in'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-subtle text-secondary'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">directions_walk</span>
                </span>
                {category === 'Walk-in' ? (
                  <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-outline"></span>
                )}
              </div>
              <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                Walk-in
              </span>
              <span className="font-body-sm text-body-sm text-secondary mt-1">
                Immediate triaged OPD queue
              </span>
            </label>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 3: DOCTOR & SPECIALTY SELECTION                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-md">
          {/* Step Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                3
              </span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold leading-tight">
                  Doctor &amp; Specialty Selection
                </h2>
                <p className="font-body-sm text-body-sm text-outline">
                  Search doctor directly or browse specialists by clinical department
                </p>
              </div>
            </div>

            {/* Quick Date Switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1 rounded-md text-label-sm font-semibold transition-all ${selectedDate === todayStr
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-subtle text-outline hover:text-brand-navy-deep'
                  }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`px-3 py-1 rounded-md text-label-sm font-semibold transition-all ${selectedDate === tomorrowStr
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-subtle text-outline hover:text-brand-navy-deep'
                  }`}
              >
                Tomorrow
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-[32px] px-2 text-label-sm font-semibold bg-surface-subtle border border-border-subtle rounded-md text-brand-navy-deep focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Doctor Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-space-sm">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                person_search
              </span>
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search by doctor name or branch..."
                className="w-full h-[42px] pl-10 pr-4 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus"
              />
            </div>
          </div>

          {/* Clinic Branches Filter Pills */}
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-outline uppercase tracking-wider block font-semibold">
              Clinic Branch
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedBranch('All')}
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all flex items-center gap-1 ${selectedBranch === 'All'
                  ? 'bg-status-scheduled-bg border border-brand-teal-light/40 text-status-scheduled-text'
                  : 'bg-surface border border-border-subtle text-secondary hover:text-brand-navy-deep'
                  }`}
              >
                <span className="material-symbols-outlined text-[15px]">apartment</span>
                <span>All Branches</span>
                {selectedBranch === 'All' && (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                )}
              </button>
              {allBranches.map((b) => (
                <button
                  key={b.branch_id}
                  type="button"
                  onClick={() => setSelectedBranch(b.name)}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all flex items-center gap-1 ${selectedBranch.toLowerCase() === b.name.toLowerCase()
                    ? 'bg-status-scheduled-bg border border-brand-teal-light/40 text-status-scheduled-text'
                    : 'bg-surface border border-border-subtle text-secondary hover:text-brand-navy-deep'
                    }`}
                >
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  <span>{b.name} Branch</span>
                  {selectedBranch.toLowerCase() === b.name.toLowerCase() && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Departments / Specialties Filter Pills */}
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-outline uppercase tracking-wider block font-semibold">
              Clinical Departments
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSpecialty('All')}
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all flex items-center gap-1 ${selectedSpecialty === 'All'
                  ? 'bg-status-scheduled-bg border border-brand-teal-light/40 text-status-scheduled-text'
                  : 'bg-surface border border-border-subtle text-secondary hover:text-brand-navy-deep'
                  }`}
              >
                <span>All Specialties</span>
                {selectedSpecialty === 'All' && (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                )}
              </button>
              {allSpecialties.map((s) => (
                <button
                  key={s.specialty_id}
                  type="button"
                  onClick={() => setSelectedSpecialty(s.name)}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all flex items-center gap-1 ${selectedSpecialty === s.name
                    ? 'bg-status-scheduled-bg border border-brand-teal-light/40 text-status-scheduled-text'
                    : 'bg-surface border border-border-subtle text-secondary hover:text-brand-navy-deep'
                    }`}
                >
                  <span>{s.name}</span>
                  {selectedSpecialty === s.name && (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Doctors List Count Header */}
          <div className="flex items-center justify-between pt-space-xs text-secondary font-label-md text-label-md">
            <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
              Available Doctors ({filteredDoctors.length} found)
            </span>
            <span className="font-body-sm text-body-sm text-outline">
              Select a doctor &amp; {category === 'Walk-in' ? 'set walk-in time slot' : 'choose open slot'} to proceed
            </span>
          </div>

          {/* Doctors Stack */}
          {loadingDoctors ? (
            <LoadingState message="Loading available clinical specialists..." />
          ) : filteredDoctors.length === 0 ? (
            <div className="p-space-lg text-center border border-dashed border-border-subtle rounded-xl text-outline font-body-md text-body-md">
              No doctors found matching the selected branch, specialty, and search filter.
            </div>
          ) : (
            <div className="space-y-space-md max-h-[620px] overflow-y-auto pr-1.5 scrollbar-thin">
              {filteredDoctors.map((doc) => {
                const isDocSelected = selectedDoctor?.doctor_id === doc.doctor_id;
                return (
                  <div
                    key={doc.doctor_id}
                    className={`rounded-xl p-space-md lg:p-space-lg shadow-sm space-y-space-md transition-all ${isDocSelected
                      ? 'border-2 border-primary bg-surface-card'
                      : 'border border-border-subtle bg-surface-card hover:border-border-focus/40'
                      }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm border-b border-border-subtle">
                      <div className="flex items-center gap-space-md">
                        {/* Doctor Avatar / Initials */}
                        <div className="w-14 h-14 rounded-full bg-surface-container-high border border-border-subtle text-primary flex items-center justify-center font-headline-md text-headline-md font-bold ring-2 ring-primary/20">
                          <span className="material-symbols-outlined text-[28px]">
                            medical_services
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                              {doc.full_name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-semibold">
                              #{doc.license_number}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-[11px] font-semibold">
                              On Duty
                            </span>
                          </div>
                          <p className="font-body-sm text-body-sm text-secondary">
                            Specialties: {doc.specialties?.join(', ') || 'General Practice'}
                          </p>
                          <div className="flex items-center gap-3 font-body-sm text-body-sm text-outline">
                            <span className="flex items-center gap-1 text-secondary font-medium">
                              <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                              {doc.branch_name ? `${doc.branch_name} Branch` : 'Central Clinic'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Select Indicator */}
                      <div className="flex items-center justify-between lg:justify-end gap-space-lg self-stretch lg:self-auto">
                        {isDocSelected ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-[18px]">
                              check_circle
                            </span>
                            <span>Selected</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setSelectedSlot(null);
                            }}
                            className="px-3.5 py-1.5 rounded-lg border border-border-subtle hover:bg-surface-subtle font-label-sm text-label-sm text-secondary font-semibold transition-colors"
                          >
                            Select Doctor
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Time selection for Doctor when selected */}
                    {isDocSelected && (
                      <div className="space-y-space-sm pt-2 border-t border-border-subtle/80">
                        {category === 'Walk-in' ? (
                          /* Walk-in Manual Time Slot Config */
                          <div className="p-space-md rounded-xl bg-status-scheduled-bg/25 border border-brand-teal-light/40 space-y-space-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-brand-navy-deep font-headline-sm font-semibold">
                                <span className="material-symbols-outlined text-primary text-[22px]">
                                  more_time
                                </span>
                                <span>Manual Walk-in Time Slot</span>
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                                  Emergency / On-Demand
                                </span>
                              </div>
                              <span className="font-mono-data text-[12px] text-secondary">
                                Date: <strong>{selectedDate}</strong>
                              </span>
                            </div>
                            <p className="font-body-sm text-secondary">
                              Enter the consultation time slot window for {doc.full_name} ({doc.branch_name}). No pre-existing slot required.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm pt-1">
                              <div>
                                <label className="block font-label-sm text-outline mb-1 font-semibold">
                                  Start Time (HH:MM)
                                </label>
                                <input
                                  type="time"
                                  value={walkInStartTime}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setWalkInStartTime(val);
                                    if (val && (!walkInEndTime || walkInEndTime <= val)) {
                                      setWalkInEndTime(addMinutesToTime(val, 20));
                                    }
                                  }}
                                  className={`w-full h-[40px] px-3 rounded-lg border font-mono-data focus:outline-none font-semibold text-[15px] transition-colors ${
                                    conflictingSlot
                                      ? 'border-red-500 bg-red-50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                                      : 'bg-surface border-border-subtle text-brand-navy-deep focus:border-primary'
                                  }`}
                                />
                              </div>

                              <div>
                                <label className="block font-label-sm text-outline mb-1 font-semibold">
                                  End Time (HH:MM)
                                </label>
                                <input
                                  type="time"
                                  value={walkInEndTime}
                                  onChange={(e) => setWalkInEndTime(e.target.value)}
                                  className={`w-full h-[40px] px-3 rounded-lg border font-mono-data focus:outline-none font-semibold text-[15px] transition-colors ${
                                    conflictingSlot || (walkInEndTime && walkInStartTime && walkInEndTime <= walkInStartTime)
                                      ? 'border-red-500 bg-red-50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-500'
                                      : 'bg-surface border-border-subtle text-brand-navy-deep focus:border-primary'
                                  }`}
                                />
                              </div>

                              <div className="flex flex-col justify-end">
                                <label className="block font-label-sm text-outline mb-1 font-semibold">
                                  Quick Duration Presets
                                </label>
                                <div className="flex items-center gap-1.5 h-[40px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const now = getCurrentTimeString();
                                      setWalkInStartTime(now);
                                      setWalkInEndTime(addMinutesToTime(now, 15));
                                    }}
                                    className="flex-1 h-full rounded-lg bg-surface border border-border-subtle hover:bg-surface-subtle text-secondary hover:text-brand-navy-deep font-label-sm font-semibold transition-colors text-[12px] flex items-center justify-center gap-1"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">schedule</span>
                                    Now (+15m)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (walkInStartTime) setWalkInEndTime(addMinutesToTime(walkInStartTime, 20));
                                    }}
                                    className="flex-1 h-full rounded-lg bg-surface border border-border-subtle hover:bg-surface-subtle text-secondary hover:text-brand-navy-deep font-label-sm font-semibold transition-colors text-[12px]"
                                  >
                                    +20 min
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (walkInStartTime) setWalkInEndTime(addMinutesToTime(walkInStartTime, 30));
                                    }}
                                    className="flex-1 h-full rounded-lg bg-surface border border-border-subtle hover:bg-surface-subtle text-secondary hover:text-brand-navy-deep font-label-sm font-semibold transition-colors text-[12px]"
                                  >
                                    +30 min
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Time conflict and validation messages */}
                            {conflictingSlot && (
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[12px]">
                                <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">
                                  warning
                                </span>
                                <div>
                                  <span className="font-bold">Schedule Overlap Detected:</span> The entered walk-in window ({formatTime(walkInStartTime)} – {formatTime(walkInEndTime)}) overlaps with an existing{' '}
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold ${
                                      conflictingSlot.status?.toLowerCase() === 'booked' ? 'bg-red-200 text-red-950' : 'bg-teal-200 text-teal-950'
                                    }`}
                                  >
                                    {conflictingSlot.status}
                                  </span>{' '}
                                  slot ({formatTime(conflictingSlot.start_time)} – {formatTime(conflictingSlot.end_time)}). Choose a non-overlapping time window to avoid collision.
                                </div>
                              </div>
                            )}

                            {!conflictingSlot && walkInEndTime && walkInStartTime && walkInEndTime <= walkInStartTime && (
                              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[12px]">
                                <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">
                                  error
                                </span>
                                <span>Walk-in end time must be after start time ({formatTime(walkInStartTime)}).</span>
                              </div>
                            )}

                            {!conflictingSlot && walkInStartTime && walkInEndTime && walkInEndTime > walkInStartTime && (
                              <div className="flex items-center gap-1.5 text-status-completed-text text-[12px] font-medium">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Time slot available &amp; no schedule conflicts detected.
                              </div>
                            )}

                            {/* Reference: doctor's existing pre-scheduled slots */}
                            <div className="pt-2 border-t border-border-subtle/60 text-[12px] text-secondary space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-brand-navy-deep flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                                    Doctor's Existing Schedule on {selectedDate}:
                                  </span>
                                  {!loadingSlots && slots.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200">
                                        {bookedSlots.length} Booked
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold border border-teal-200">
                                        {openSlots.length} Open
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px]">
                                  <span className="inline-flex items-center gap-1.5 text-teal-700 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                    Open Slot
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Booked Slot
                                  </span>
                                </div>
                              </div>

                              {loadingSlots ? (
                                <span className="italic text-outline">Loading schedule...</span>
                              ) : slots.length === 0 ? (
                                <span className="italic text-outline">
                                  No pre-scheduled slots today (full schedule open for walk-ins).
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                  {slots.map((s) => {
                                    const isBooked = s.status?.toLowerCase() === 'booked';
                                    const isConflict = conflictingSlot?.slot_id === s.slot_id;

                                    return (
                                      <span
                                        key={s.slot_id}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono-data text-[11px] transition-all ${
                                          isConflict
                                            ? 'bg-red-100 border-2 border-red-500 text-red-900 shadow-sm ring-2 ring-red-400 font-bold'
                                            : isBooked
                                            ? 'bg-red-50 border border-red-200 text-red-700 font-medium'
                                            : 'bg-teal-50 border border-teal-200 text-teal-700 font-medium'
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            isConflict
                                              ? 'bg-red-600 animate-ping'
                                              : isBooked
                                              ? 'bg-red-500'
                                              : 'bg-teal-500'
                                          }`}
                                        />
                                        <span>
                                          {formatTime(s.start_time)} – {formatTime(s.end_time)}
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            isConflict
                                              ? 'bg-red-600 text-white'
                                              : isBooked
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-teal-100 text-teal-800'
                                          }`}
                                        >
                                          {isConflict ? 'Conflict' : s.status}
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Pre-scheduled Slots Chips */
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <span className="font-label-sm text-label-sm text-brand-navy-deep min-w-[140px] font-semibold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">
                                today
                              </span>
                              Open Slots on {selectedDate}:
                            </span>

                            {loadingSlots ? (
                              <span className="text-body-sm text-outline animate-pulse">
                                Loading open time slots...
                              </span>
                            ) : openSlots.length === 0 ? (
                              <span className="text-body-sm text-on-surface-variant italic">
                                No open slots found for this date. Try another date above or switch to Walk-in.
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {openSlots.map((s) => {
                                  const isSelectedSlot = selectedSlot?.slot_id === s.slot_id;
                                  return (
                                    <button
                                      key={s.slot_id}
                                      type="button"
                                      onClick={() => setSelectedSlot(s)}
                                      className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 font-semibold ${isSelectedSlot
                                        ? 'bg-primary text-on-primary shadow-sm'
                                        : 'bg-surface border border-border-subtle text-secondary hover:border-primary'
                                        }`}
                                    >
                                      <span>{formatTime(s.start_time)}</span>
                                      {isSelectedSlot && (
                                        <span className="material-symbols-outlined text-[14px]">
                                          check
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 4: CONFIRM BOOKING SUMMARY                                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-lg">
          {/* Step Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                4
              </span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep font-bold leading-tight">
                  Confirm Booking Summary
                </h2>
                <p className="font-body-sm text-body-sm text-outline">
                  Review consultation and details before confirmation
                </p>
              </div>
            </div>

            {isReadyToConfirm ? (
              <span className="px-3 py-1 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-label-sm font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-status-completed-text"></span>
                Ready to Confirm
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-status-pending-bg text-status-pending-text font-label-sm text-label-sm font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-status-pending-text"></span>
                Incomplete Selection
              </span>
            )}
          </div>

          {/* 4 Grid Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {/* Card 1: Patient Details */}
            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Patient Details
                </span>
                <span className="material-symbols-outlined text-[18px] text-primary">person</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                  {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : '—'}
                </p>
                <p className="font-mono-data text-mono-data text-secondary">
                  {selectedPatient?.patient_code || 'No patient selected'}
                </p>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <p>
                  {selectedPatient
                    ? `${getAge(selectedPatient.date_of_birth)} yrs, ${selectedPatient.gender}`
                    : 'Age / Gender'}
                </p>
                <p>{selectedPatient?.phone_number || 'Contact number'}</p>
                {selectedPatient?.has_insurance ? (
                  <p className="text-status-completed-text font-semibold flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-completed-text"></span>
                    Insured
                  </p>
                ) : (
                  <p className="text-secondary font-semibold flex items-center gap-1 mt-1">
                    Self-Pay
                  </p>
                )}
              </div>
            </div>

            {/* Card 2: Doctor & Specialty */}
            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Doctor &amp; Specialty
                </span>
                <span className="material-symbols-outlined text-[18px] text-primary">
                  medical_services
                </span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                  {selectedDoctor ? selectedDoctor.full_name : '—'}
                </p>
                <p className="font-body-sm text-body-sm text-secondary">
                  {selectedDoctor?.specialties?.join(', ') || 'No doctor selected'}
                </p>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <p className="font-semibold text-brand-navy-deep">
                  License #{selectedDoctor?.license_number || '—'}
                </p>
                <p>{selectedDoctor?.branch_name ? `${selectedDoctor.branch_name} Branch` : 'Clinic Branch'}</p>
              </div>
            </div>

            {/* Card 3: Date & Time Slot */}
            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Date &amp; Time Slot
                </span>
                <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                  {category === 'Walk-in' ? selectedDate : selectedSlot ? selectedSlot.date : selectedDate}
                </p>
                <p className="font-label-lg text-label-lg text-primary font-bold">
                  {category === 'Walk-in'
                    ? walkInStartTime && walkInEndTime
                      ? `${formatTime(walkInStartTime)} – ${formatTime(walkInEndTime)}`
                      : 'Enter time window'
                    : selectedSlot
                      ? formatTime(selectedSlot.start_time)
                      : 'No slot chosen'}
                </p>
              </div>
              <div className="pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <span className="inline-flex items-center gap-1 text-status-scheduled-text font-medium">
                  <span className="material-symbols-outlined text-[14px]">
                    {category === 'Walk-in' ? 'directions_walk' : 'timer'}
                  </span>
                  Category: {category}
                </span>
              </div>
            </div>

            {/* Card 4: Facility & Branch */}
            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Facility &amp; Branch
                </span>
                <span className="material-symbols-outlined text-[18px] text-primary">
                  local_hospital
                </span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                  {selectedDoctor?.branch_name ? `${selectedDoctor.branch_name} Branch` : 'Colombo Central Branch'}
                </p>
                <p className="font-body-sm text-body-sm text-secondary">Outpatient Clinic Wing</p>
              </div>
              <div className="pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <p className="text-[11px] leading-snug text-outline">
                  {category === 'Walk-in'
                    ? 'Walk-in triage queue with immediate consultation reservation.'
                    : 'Slots operate strictly on a 15-minute grace window per clinic guidelines.'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="pt-space-md border-t border-border-subtle flex flex-col sm:flex-row items-center justify-end gap-space-sm">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto h-[42px] px-space-lg rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-secondary hover:text-brand-navy-deep font-label-md text-label-md transition-all font-semibold"
            >
              Cancel &amp; Reset Form
            </button>

            <button
              type="button"
              disabled={!isReadyToConfirm || submitting}
              onClick={() => setShowConfirmModal(true)}
              className="w-full sm:w-auto h-[42px] px-space-xl rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm flex items-center justify-center gap-2 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
              <span>{submitting ? 'Booking...' : category === 'Walk-in' ? 'Book Walk-in' : 'Book Appointment'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedPatient && selectedDoctor && (category === 'Walk-in' ? (walkInStartTime && walkInEndTime) : selectedSlot) && (
        <ConfirmDialog
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleExecuteBooking}
          title={category === 'Walk-in' ? 'Confirm Walk-in Appointment' : 'Confirm Appointment Booking'}
          message={
            category === 'Walk-in'
              ? `Confirm booking a walk-in appointment for ${selectedPatient.first_name} ${selectedPatient.last_name} with ${selectedDoctor.full_name} (${selectedDoctor.branch_name || 'Clinic'}) on ${selectedDate} from ${formatTime(walkInStartTime)} to ${formatTime(walkInEndTime)}?`
              : `Confirm booking consultation for ${selectedPatient.first_name} ${selectedPatient.last_name} with ${selectedDoctor.full_name} on ${selectedSlot?.date} at ${selectedSlot ? formatTime(selectedSlot.start_time) : ''}?`
          }
          confirmLabel={category === 'Walk-in' ? 'Confirm Walk-in' : 'Confirm & Book'}
          cancelLabel="Review Details"
        />
      )}
    </div>
  );
};

export default BookAppointment;
