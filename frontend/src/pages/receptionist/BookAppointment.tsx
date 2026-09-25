import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // ─── Step 1: Patient Search & Selection State ──────────────────────────────
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientListItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // ─── Step 2: Category State ────────────────────────────────────────────────
  const [category, setCategory] = useState<AppointmentType>('Scheduled Visit');

  // ─── Step 3: Doctor, Specialty & Slot State ────────────────────────────────
  const [allDoctors, setAllDoctors] = useState<DoctorResponse[]>([]);
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

  // Slots
  const [slots, setSlots] = useState<DoctorSlotResponse[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlotResponse | null>(null);

  // ─── Step 4: Submission & Confirmation State ───────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ─── Initial Data Fetching ─────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingDoctors(true);
      try {
        const [docsRes, specsRes] = await Promise.all([
          get<DoctorResponse[]>('/doctors').catch(() => []),
          get<SpecialtyResponse[]>('/specialties').catch(() => []),
        ]);
        setAllDoctors(docsRes || []);
        setAllSpecialties(specsRes || []);
      } catch (err: any) {
        showToast(err?.message || 'Failed to load doctors or specialties', 'error');
      } finally {
        setLoadingDoctors(false);
      }
    };
    loadInitialData();
  }, []);

  // ─── Patient Search Effect ─────────────────────────────────────────────────
  useEffect(() => {
    const trimmed = patientSearch.trim().toLowerCase();
    if (!trimmed) {
      setPatientResults([]);
      setShowPatientDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await patientService.list({ search: trimmed });
        setPatientResults(res?.data || []);
      } catch {
        setPatientResults([]);
      } finally {
        setSearchingPatients(false);
        setShowPatientDropdown(true);
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
        const res = await appointmentService.getAvailability(selectedDoctor.doctor_id, selectedDate);
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
      const matchesSpecialty =
        selectedSpecialty === 'All' ||
        (doc.specialties && doc.specialties.includes(selectedSpecialty));

      const matchesSearch =
        !doctorSearch.trim() ||
        docName.toLowerCase().includes(doctorSearch.trim().toLowerCase()) ||
        Boolean(doc.branch_name && doc.branch_name.toLowerCase().includes(doctorSearch.trim().toLowerCase()));

      return matchesSpecialty && matchesSearch;
    });
  }, [allDoctors, selectedSpecialty, doctorSearch]);

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
    setSelectedSpecialty('All');
    setDoctorSearch('');
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

      // Navigate to appointments management page
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
        appointmentService.getAvailability(selectedDoctor.doctor_id, selectedDate).then(setSlots);
      }
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const isReadyToConfirm = Boolean(selectedPatient && selectedDoctor && selectedSlot);

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
            <div className="relative">
              <div className="flex flex-col sm:flex-row items-center gap-space-sm">
                <div className="relative flex-1 w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    onFocus={() => setShowPatientDropdown(patientResults.length > 0)}
                    placeholder="Search by NIC, Patient Name, or ID (e.g. 762271890V or Priyantha)..."
                    className="w-full h-[42px] pl-10 pr-4 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all"
                  />
                  {searchingPatients && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline font-label-sm text-label-sm animate-pulse">
                      Searching...
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPatientDropdown(true)}
                  className="w-full sm:w-auto h-[42px] px-space-lg bg-surface-subtle hover:bg-border-subtle border border-border-subtle text-brand-navy-deep font-label-md text-label-md rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">manage_search</span>
                  <span>Lookup</span>
                </button>
              </div>

              {/* Patient Autocomplete Results Dropdown */}
              {showPatientDropdown && patientResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-surface-card rounded-xl border border-border-subtle shadow-lg divide-y divide-border-subtle overflow-hidden max-h-64 overflow-y-auto">
                  {patientResults.map((p) => (
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
                          <div className="font-semibold text-brand-navy-deep font-label-md text-label-md">
                            {p.first_name} {p.last_name}
                          </div>
                          <div className="text-outline text-body-sm flex items-center gap-2">
                            <span>NIC: {p.id_number}</span>
                            <span>•</span>
                            <span>{p.phone_number}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle font-mono-data text-[12px] text-secondary font-medium">
                        {p.patient_code || `PT-${String(p.patient_id).padStart(6, '0')}`}
                      </span>
                    </div>
                  ))}
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-completed-text"></span>
                      SLIC Insured
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body-sm text-body-sm text-secondary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-outline">cake</span>
                      {selectedPatient.date_of_birth} ({getAge(selectedPatient.date_of_birth)} yrs)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-outline">male</span>
                      {selectedPatient.gender}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-outline">call</span>
                      {selectedPatient.phone_number}
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

          {/* Clinical Departments / Specialties Filter Pills */}
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
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
              Select a doctor &amp; time slot to proceed
            </span>
          </div>

          {/* Doctors Stack */}
          {loadingDoctors ? (
            <LoadingState message="Loading available clinical specialists..." />
          ) : filteredDoctors.length === 0 ? (
            <div className="p-space-lg text-center border border-dashed border-border-subtle rounded-xl text-outline font-body-md text-body-md">
              No doctors found matching this specialty and search filter.
            </div>
          ) : (
            <div className="space-y-space-md">
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
                            <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[16px]">star</span>
                              4.9
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-secondary">
                              <span className="material-symbols-outlined text-[16px]">apartment</span>
                              {doc.branch_name || 'Central Clinic'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Fee & Select Indicator */}
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

                    {/* Slots for Doctor when selected */}
                    {isDocSelected && (
                      <div className="space-y-space-sm pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <span className="font-label-sm text-label-sm text-brand-navy-deep min-w-[140px] font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              today
                            </span>
                            Slots on {selectedDate}:
                          </span>

                          {loadingSlots ? (
                            <span className="text-body-sm text-outline animate-pulse">
                              Loading open time slots...
                            </span>
                          ) : slots.length === 0 ? (
                            <span className="text-body-sm text-on-surface-variant italic">
                              No open slots found for this date. Try another date above.
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {slots.map((s) => {
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
                  Review consultation and billing details before final issuance
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
                <p className="text-status-completed-text font-semibold flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-completed-text"></span>
                  SLIC Insured
                </p>
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
                <p>{selectedDoctor?.branch_name || 'Central Clinic Wing'}</p>
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
                  {selectedSlot ? selectedSlot.date : selectedDate}
                </p>
                <p className="font-label-lg text-label-lg text-primary font-bold">
                  {selectedSlot ? formatTime(selectedSlot.start_time) : 'No slot chosen'}
                </p>
              </div>
              <div className="pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <span className="inline-flex items-center gap-1 text-status-scheduled-text font-medium">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Category: {category}
                </span>
              </div>
            </div>

            {/* Card 4: Facility & Policy */}
            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Facility &amp; Policy
                </span>
                <span className="material-symbols-outlined text-[18px] text-primary">
                  local_hospital
                </span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">
                  {selectedDoctor?.branch_name || 'Colombo Central Branch'}
                </p>
                <p className="font-body-sm text-body-sm text-secondary">Outpatient Clinic Wing</p>
              </div>
              <div className="pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <p className="text-[11px] leading-snug text-outline">
                  Slots operate strictly on a 15-minute grace window per clinic guidelines.
                </p>
              </div>
            </div>
          </div>

          {/* Fee Summary Inline Bar */}
          <div className="rounded-xl bg-surface-subtle p-space-md border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body-md text-body-md text-secondary">
              <span>
                Consultation Fee: <strong className="text-brand-navy-deep">LKR 3,500.00</strong>
              </span>
              <span className="text-outline">|</span>
              <span>
                Hospital Charge: <strong className="text-brand-navy-deep">LKR 0.00</strong>
              </span>
              <span className="text-outline">|</span>
              <span>
                Net Payable: <strong className="text-primary font-bold">LKR 3,500.00</strong>
              </span>
            </div>
            <div className="font-label-sm text-label-sm text-secondary bg-surface-card px-2.5 py-1 rounded-md border border-border-subtle self-start md:self-auto font-medium">
              Payment Mode: <strong className="text-brand-navy-deep font-semibold">Pay at Cashier Desk</strong>
            </div>
          </div>

          {/* SMS Notification Callout Note */}
          <div className="rounded-lg bg-status-scheduled-bg/40 border border-brand-teal-light/30 p-space-sm flex items-center gap-space-sm text-status-scheduled-text">
            <span className="material-symbols-outlined text-[20px] text-primary">sms</span>
            <span className="font-body-sm text-body-sm">
              A confirmation SMS with e-Token will be automatically sent to patient's mobile{' '}
              <strong>{selectedPatient?.phone_number || '(No phone number)'}</strong> upon booking.
            </span>
          </div>

          {/* Bottom Actions Bar */}
          <div className="pt-space-md border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div className="flex items-center gap-2 font-mono-data text-mono-data text-secondary">
              <span className="material-symbols-outlined text-[18px] text-outline">receipt</span>
              <span>
                Workflow Category: <strong>{category}</strong>
              </span>
            </div>

            <div className="flex items-center gap-space-sm justify-end">
              <button
                type="button"
                onClick={handleResetForm}
                className="h-[42px] px-space-lg rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-secondary hover:text-brand-navy-deep font-label-md text-label-md transition-all font-semibold"
              >
                Cancel &amp; Reset Form
              </button>

              <button
                type="button"
                disabled={!isReadyToConfirm || submitting}
                onClick={() => setShowConfirmModal(true)}
                className="h-[42px] px-space-xl rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm flex items-center gap-2 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                <span>{submitting ? 'Booking...' : 'Book Appointment'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedPatient && selectedDoctor && selectedSlot && (
        <ConfirmDialog
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleExecuteBooking}
          title="Confirm Appointment Booking"
          message={`Confirm booking consultation for ${selectedPatient.first_name} ${selectedPatient.last_name} with ${selectedDoctor.full_name} on ${selectedSlot.date} at ${formatTime(selectedSlot.start_time)}?`}
          confirmLabel="Confirm & Book"
          cancelLabel="Review Details"
        />
      )}
    </div>
  );
};

export default BookAppointment;
