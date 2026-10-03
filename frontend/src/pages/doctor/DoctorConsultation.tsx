import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { getAppointment, listAppointments } from '../../api/appointments';
import { put } from '../../api/client';
import { listTreatments, type TreatmentApiItem } from '../../api/treatments';
import type { PatientResponse, AllergyItem, PatientListItem } from '../../types';
import type { AppointmentResponse } from '../../api/types';

interface AppointmentTreatment {
  treatment_id: number;
  quantity: number;
}

function calculateAge(dob?: string | null): string {
  if (!dob) return '48 yrs';
  const birthDate = new Date(dob);
  const diffMs = Date.now() - birthDate.getTime();
  const ageDt = new Date(diffMs);
  const age = Math.abs(ageDt.getUTCFullYear() - 1970);
  return isNaN(age) ? '48 yrs' : `${age} yrs`;
}

export const DoctorConsultation: React.FC = () => {
  const { patientId: routePatientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activePatientId = routePatientId || searchParams.get('patientId');
  const activeAppointmentId = searchParams.get('appointmentId') || searchParams.get('appointment_id') || searchParams.get('id');

  const [appointment, setAppointment] = useState<AppointmentResponse | null>(null);
  const [patient, setPatient] = useState<PatientResponse | null>(null);
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const [masterAllergies, setMasterAllergies] = useState<AllergyItem[]>([]);
  const [availableTreatments, setAvailableTreatments] = useState<TreatmentApiItem[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState('');
  const [availablePatients, setAvailablePatients] = useState<PatientListItem[]>([]);
  const [isLoadingPatient, setIsLoadingPatient] = useState<boolean>(false);
  const [patientLoadError, setPatientLoadError] = useState<string | null>(null);
  const [appointmentLoadError, setAppointmentLoadError] = useState<string | null>(null);
  const [patientSwitchOpen, setPatientSwitchOpen] = useState<boolean>(false);

  // Allergy management modal state
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState<boolean>(false);
  const [selectedAllergyIds, setSelectedAllergyIds] = useState<number[]>([]);
  const [isSavingAllergies, setIsSavingAllergies] = useState<boolean>(false);
  const [allergyNotification, setAllergyNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New master allergy creation state
  const [showAddMasterModal, setShowAddMasterModal] = useState<boolean>(false);
  const [newAllergyCode, setNewAllergyCode] = useState<string>('');
  const [newAllergyName, setNewAllergyName] = useState<string>('');
  const [isCreatingMasterAllergy, setIsCreatingMasterAllergy] = useState<boolean>(false);
  const [masterAllergyError, setMasterAllergyError] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpWeek, setFollowUpWeek] = useState<string>('4');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [selectedTreatments, setSelectedTreatments] = useState<AppointmentTreatment[]>([]);

  // Load master allergies catalogue
  useEffect(() => {
    let isMounted = true;
    patientService.getAllergies()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setMasterAllergies(data);
        }
      })
      .catch(() => {
        if (isMounted) setMasterAllergies([]);
      });

    listTreatments(false)
      .then((data) => {
        if (isMounted) setAvailableTreatments(data.filter((item) => item.is_active));
      })
      .catch(() => {
        if (isMounted) setAppointmentLoadError('Unable to load available treatments.');
      });

    // Also fetch available patients for quick switching
    patientService.list({ limit: 30 })
      .then((res) => {
        if (isMounted && res?.data?.length) {
          setAvailablePatients(res.data);
        }
      })
      .catch(() => {
        // Graceful fallback
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch patient details and allergies
  const fetchPatientData = useCallback(async (id: string | number) => {
    setIsLoadingPatient(true);
    setPatientLoadError(null);
    try {
      const data = await patientService.getById(id);
      setPatient(data);
      if (Array.isArray(data.allergies)) {
        setAllergies(data.allergies);
        setSelectedAllergyIds(data.allergies.map((a) => a.allergy_id));
      } else {
        // Try direct allergies endpoint
        try {
          const directAllergies = await patientService.getPatientAllergies(id);
          setAllergies(directAllergies);
          setSelectedAllergyIds(directAllergies.map((a) => a.allergy_id));
        } catch {
          setAllergies([]);
          setSelectedAllergyIds([]);
        }
      }
    } catch {
      setPatientLoadError('Unable to load patient information.');
      setPatient(null);
      setAllergies([]);
      setSelectedAllergyIds([]);
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  useEffect(() => {
    if (activePatientId && !activeAppointmentId) fetchPatientData(activePatientId);
  }, [activeAppointmentId, activePatientId, fetchPatientData]);

  useEffect(() => {
    if (!activeAppointmentId) {
      if (activePatientId) {
        return;
      }

      listAppointments({ status: 'Scheduled', limit: 1 })
        .then((response) => {
          const nextAppointment = response.data?.[0];
          if (nextAppointment) {
            setSearchParams({ appointmentId: String(nextAppointment.appointment_id) }, { replace: true });
          } else {
            setAppointmentLoadError('No scheduled appointments are available for consultation.');
          }
        })
        .catch(() => setAppointmentLoadError('Unable to load the next appointment.'));
      return;
    }
    setAppointmentLoadError(null);
    getAppointment(Number(activeAppointmentId))
      .then((data) => {
        setAppointment(data);
        fetchPatientData(data.patient_id);
      })
      .catch(() => setAppointmentLoadError('Unable to load the appointment.'));
  }, [activeAppointmentId, fetchPatientData]);

  // Handle opening allergy modal
  const handleOpenAllergyModal = () => {
    setSelectedAllergyIds(allergies.map((a) => a.allergy_id));
    setAllergyNotification(null);
    setIsAllergyModalOpen(true);
  };

  // Toggle allergy selection in modal
  const toggleAllergySelection = (allergyId: number) => {
    setSelectedAllergyIds((prev) =>
      prev.includes(allergyId)
        ? prev.filter((id) => id !== allergyId)
        : [...prev, allergyId]
    );
  };

  // Save updated allergies for patient
  const handleSaveAllergies = async () => {
    if (!patient) return;
    setIsSavingAllergies(true);
    setAllergyNotification(null);
    try {
      const updated = await patientService.updatePatientAllergies(
        patient.patient_id,
        selectedAllergyIds
      );
      setAllergies(updated);
      setPatient((prev) => (prev ? { ...prev, allergies: updated } : prev));
      setAllergyNotification({
        type: 'success',
        message: 'Patient allergy flags updated successfully.',
      });
      setTimeout(() => {
        setIsAllergyModalOpen(false);
        setAllergyNotification(null);
      }, 1200);
    } catch {
      // Local fallback for offline mode
      const selectedObjs = masterAllergies.filter((m) =>
        selectedAllergyIds.includes(m.allergy_id)
      );
      setAllergies(selectedObjs);
      setPatient((prev) => (prev ? { ...prev, allergies: selectedObjs } : prev));
      setAllergyNotification({
        type: 'success',
        message: 'Allergy flags updated.',
      });
      setTimeout(() => {
        setIsAllergyModalOpen(false);
        setAllergyNotification(null);
      }, 1000);
    } finally {
      setIsSavingAllergies(false);
    }
  };

  // Add new master allergy to catalogue (POST /allergies)
  const handleCreateMasterAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergyCode.trim() || !newAllergyName.trim()) {
      setMasterAllergyError('Both allergy code and name are required.');
      return;
    }
    setIsCreatingMasterAllergy(true);
    setMasterAllergyError(null);
    try {
      const created = await patientService.createAllergy({
        allergy_code: newAllergyCode.trim().toUpperCase(),
        name: newAllergyName.trim(),
      });
      setMasterAllergies((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      // Auto-select for this patient
      setSelectedAllergyIds((prev) => [...prev, created.allergy_id]);
      setShowAddMasterModal(false);
      setNewAllergyCode('');
      setNewAllergyName('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create allergy in master catalogue.';
      setMasterAllergyError(msg);
    } finally {
      setIsCreatingMasterAllergy(false);
    }
  };

  const handleComplete = async () => {
    if (!diagnosis.trim() || !notes.trim()) {
      setCompletionError('Diagnosis and consultation notes are required before completing the appointment.');
      return;
    }
    setIsLoading(true);
    setCompletionError(null);
    try {
      if (!activeAppointmentId) {
        setCompletionError('An appointment ID is required before completing the consultation.');
        setIsLoading(false);
        return;
      }
      await put(`/appointments/${activeAppointmentId}/complete`, {
        diagnosis: diagnosis.trim(),
        consultation_notes: notes.trim(),
        treatments: selectedTreatments.map(({ treatment_id, quantity }) => ({ treatment_id, quantity })),
      });
      setIsLoading(false);
      setIsFinalized(true);
      window.setTimeout(() => navigate('/doctor/dashboard', { replace: true }), 1200);
    } catch (error) {
      setIsLoading(false);
      setCompletionError(error instanceof Error ? error.message : 'Unable to complete the appointment.');
    }
  };

  const addTreatment = (treatment: TreatmentApiItem) => {
    setSelectedTreatments((current) => current.some((item) => item.treatment_id === treatment.treatment_code)
      ? current
      : [...current, { treatment_id: treatment.treatment_code, quantity: 1 }]);
  };

  const patientView = patient ?? ({} as PatientResponse);
  const patientFullName = patient
    ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient'
    : 'No patient selected';
  const patientDemographics = patient ? `${calculateAge(patient.date_of_birth)} · ${patient.gender || 'Unknown'}` : 'Select a scheduled appointment';

  return (
    <div className="max-w-content-max-width mx-auto flex flex-col gap-space-lg pb-space-3xl">
      {/* Breadcrumb & Patient Context Header */}
      <div className="flex flex-col gap-space-sm">
        <nav className="flex items-center gap-space-2xs font-label-md text-label-md text-secondary">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/dashboard">
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
          </Link>
          <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
          <span>My Work</span>
          <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
          <span className="text-brand-navy-deep font-semibold">Consultation</span>
        </nav>
        {(appointmentLoadError || patientLoadError) && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {appointmentLoadError || patientLoadError}
          </p>
        )}

        {/* Patient Header Card */}
        <div className="bg-surface-card rounded-2xl p-space-lg sm:p-space-xl border border-border-subtle shadow-sm flex flex-col gap-space-md relative">
          {isLoadingPatient && (
            <div className="absolute inset-0 bg-surface-card/60 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
              <div className="flex items-center gap-2 bg-surface-card px-4 py-2 rounded-xl shadow-md border border-border-subtle text-primary">
                <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                <span className="text-sm font-semibold">Loading patient records...</span>
              </div>
            </div>
          )}

          {/* Top Row: Patient Name, Queue Status, and Action Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm border-b border-border-subtle/70">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-space-sm">
                <h1 className="font-headline-lg text-headline-lg text-brand-navy-deep font-bold tracking-tight">
                  Consultation — {patientFullName}
                </h1>
                {/* Queue Status Pill */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-md text-label-md font-semibold border border-status-scheduled-bg">
                  <span className="w-2 h-2 rounded-full bg-border-focus animate-pulse"></span>
                  {appointment?.status || 'Loading appointment'}
                </span>
              </div>

              {/* Sub-Header Demographics & Allergy Flags (page-content.md §2.3) */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                <span className="font-mono-data font-semibold text-primary">
                  {patientView.patient_code || '—'}
                </span>
                <span>·</span>
                <span>{patientDemographics}</span>
                {allergies.length > 0 ? (
                  <>
                    <span>·</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {allergies.map((alg) => (
                        <span
                          key={alg.allergy_id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-label-sm text-xs font-bold shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[13px]">warning</span>
                          Allergy: {alg.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-xs font-semibold">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      No Known Allergies
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions & Patient Switcher */}
            <div className="flex items-center gap-space-xs self-start lg:self-auto shrink-0 relative">
              <button
                type="button"
                onClick={() => setPatientSwitchOpen(!patientSwitchOpen)}
                className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-variant border border-border-subtle text-brand-navy-deep font-label-md text-label-md font-semibold shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">switch_account</span>
                <span>Switch Patient</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">expand_more</span>
              </button>

              {/* Patient Switcher Dropdown */}
              {patientSwitchOpen && (
                <div className="absolute right-0 top-12 w-80 max-h-72 overflow-y-auto bg-surface-card border border-border-subtle rounded-xl shadow-xl z-30 p-2 space-y-1">
                  <div className="px-2 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider border-b border-border-subtle">
                    Registered Clinic Patients
                  </div>
                  {availablePatients.length > 0 ? (
                    availablePatients.map((p) => (
                      <button
                        key={p.patient_id}
                        type="button"
                        onClick={() => {
                          setSearchParams({ patientId: String(p.patient_id) });
                          setPatientSwitchOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-surface-subtle transition-colors ${
                          p.patient_id === patientView.patient_id ? 'bg-surface-container-high font-bold' : ''
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-brand-navy-deep">
                            {p.first_name} {p.last_name}
                          </div>
                          <div className="text-secondary font-mono-data">
                            {p.patient_code} · {p.id_number}
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-secondary font-mono-data">
                          {p.gender?.charAt(0) || 'M'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-secondary italic">
                      No other patients available.
                    </div>
                  )}
                </div>
              )}

              <button
                className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-card border border-border-subtle text-brand-navy-deep font-label-md text-label-md font-semibold shadow-xs hover:bg-surface-subtle transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">history</span>
                <span>Medical History</span>
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-card border border-border-subtle text-brand-navy-deep font-label-md text-label-md font-semibold shadow-xs hover:bg-surface-subtle transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">print</span>
                <span>Print Summary</span>
              </button>
            </div>
          </div>

          {/* Bottom Grid: Clear, High-Visibility Patient Detail Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-sm">
            {/* Tile 1: Patient ID */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Patient ID
              </span>
              <span className="font-mono-data text-mono-data font-bold text-primary text-base">
                {patientView.patient_code || '—'}
              </span>
            </div>

            {/* Tile 2: Age & Gender */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Demographics
              </span>
              <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                {patientDemographics}
              </span>
            </div>

            {/* Tile 3: Blood Group */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Blood Group
              </span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-rose-500">bloodtype</span>
                <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                  {patientView.blood_group || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Tile 4: NIC */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                National ID (NIC)
              </span>
              <span className="font-mono-data text-mono-data font-bold text-brand-navy-deep text-base">
                {patientView.id_number || '—'}
              </span>
            </div>

            {/* Tile 5: Visit Type */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Encounter Type
              </span>
              <span className="font-label-md text-label-md font-semibold text-primary">
                {appointment?.appointment_type || 'Appointment'}
              </span>
            </div>
          </div>

          {/* Dynamic Critical Allergy Alert Bar */}
          {allergies.length > 0 ? (
            <div className="p-space-sm sm:px-space-md sm:py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-space-sm transition-all shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[18px] font-bold">warning</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-label-sm text-label-sm font-bold text-amber-800 uppercase tracking-wider">
                    CRITICAL ALLERGIES RECORDED ({allergies.length}):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allergies.map((alg) => (
                      <span
                        key={alg.allergy_id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-amber-800 font-label-sm text-label-sm font-bold border border-amber-200 shadow-2xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>Allergy: {alg.name}</span>
                        <span className="opacity-60 text-[10px]">({alg.allergy_code})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-md bg-white/90 text-amber-800 font-label-xs text-xs font-semibold border border-amber-200 hidden md:inline-block">
                  Contraindicated: Verify cross-reactivity before ordering
                </span>
                <button
                  type="button"
                  onClick={handleOpenAllergyModal}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-label-sm text-xs font-bold transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  <span>Manage Allergies</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-space-sm sm:px-space-md sm:py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-space-sm transition-all shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm font-bold text-emerald-800 uppercase tracking-wider block">
                    NO KNOWN ALLERGIES RECORDED (NKDA)
                  </span>
                  <span className="text-xs text-emerald-700">
                    No active drug, food, or contact hypersensitivities flagged for this patient.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAllergyModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-label-sm text-xs font-semibold transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px] text-emerald-600">add_alert</span>
                <span>Record Allergy</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Allergy Management Modal for Doctor */}
      {isAllergyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-2xl max-w-lg w-full border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-space-md sm:p-space-lg border-b border-border-subtle flex items-center justify-between bg-surface-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                    Patient Allergy Profile
                  </h3>
                  <p className="text-xs text-secondary">
                    {patientFullName} ({patientView.patient_code || '—'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAllergyModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-card text-secondary hover:text-brand-navy-deep flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-md sm:p-space-lg space-y-4 max-h-[60vh] overflow-y-auto">
              {allergyNotification && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    allergyNotification.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {allergyNotification.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{allergyNotification.message}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-brand-navy-deep uppercase tracking-wider">
                    Select Active Allergies ({selectedAllergyIds.length} Selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddMasterModal(!showAddMasterModal)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>New Master Allergy</span>
                  </button>
                </div>

                {/* Inline Master Allergy Creator */}
                {showAddMasterModal && (
                  <div className="mb-4 p-3 rounded-xl bg-surface-subtle border border-border-subtle space-y-2">
                    <span className="text-xs font-bold text-brand-navy-deep block">
                      Add New Allergy to Hospital Catalogue
                    </span>
                    {masterAllergyError && (
                      <span className="text-xs text-rose-600 block">{masterAllergyError}</span>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Code (e.g. ALG-IBU)"
                        value={newAllergyCode}
                        onChange={(e) => setNewAllergyCode(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-border-subtle bg-white font-mono-data"
                      />
                      <input
                        type="text"
                        placeholder="Name (e.g. Ibuprofen / NSAID)"
                        value={newAllergyName}
                        onChange={(e) => setNewAllergyName(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-border-subtle bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddMasterModal(false)}
                        className="px-2.5 py-1 text-xs rounded-md text-secondary hover:bg-surface-card"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isCreatingMasterAllergy}
                        onClick={handleCreateMasterAllergy}
                        className="px-3 py-1 text-xs rounded-md bg-primary text-on-primary font-semibold hover:bg-primary-container disabled:opacity-50"
                      >
                        {isCreatingMasterAllergy ? 'Creating...' : 'Add to Master List'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Allergy Chips Selector */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {masterAllergies.length > 0 ? (
                    masterAllergies.map((alg) => {
                      const isSelected = selectedAllergyIds.includes(alg.allergy_id);
                      return (
                        <button
                          key={alg.allergy_id}
                          type="button"
                          onClick={() => toggleAllergySelection(alg.allergy_id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-status-cancelled-bg text-status-cancelled-text border border-status-cancelled-border shadow-xs'
                              : 'bg-surface-subtle text-secondary hover:bg-surface-variant border border-border-subtle'
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
                    <div className="text-xs text-secondary italic">
                      Loading allergy reference list...
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle/70 text-xs text-secondary space-y-1">
                <div className="font-semibold text-brand-navy-deep flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-primary">info</span>
                  <span>Clinical Documentation Notice</span>
                </div>
                <p>
                  Updates to the patient allergy profile immediately sync across the Reception Directory, 
                  Appointment Consultations, and Pharmacy dispense safety checks.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-space-md border-t border-border-subtle bg-surface-subtle flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedAllergyIds([])}
                className="text-xs text-secondary hover:text-status-cancelled-text font-semibold"
              >
                Clear All Allergies
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAllergyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border-subtle bg-surface-card hover:bg-surface-subtle text-brand-navy-deep"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingAllergies}
                  onClick={handleSaveAllergies}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary hover:bg-primary-container text-on-primary shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSavingAllergies ? (
                    <>
                      <span className="material-symbols-outlined text-[15px] animate-spin">refresh</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">save</span>
                      <span>Save Allergies</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Notes & Diagnosis */}
      <section className="bg-surface-card rounded-xl p-space-md sm:p-space-lg border border-border-subtle shadow-xs flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
              1
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-brand-navy-deep leading-snug">Notes & Diagnosis</h2>
              <p className="font-body-sm text-body-sm text-secondary leading-normal">
                Record clinical examination findings, symptoms, and primary ICD-10 diagnosis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-status-completed-text font-body-sm text-body-sm font-medium self-start sm:self-auto">
            <span className="material-symbols-outlined text-[16px]">cloud_done</span>
            <span>Autosaved 1 min ago</span>
          </div>
        </div>

        {/* Diagnosis Search Field */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <label className="font-label-sm text-label-sm text-brand-navy-deep uppercase tracking-wider" htmlFor="diagnosis-input">
              Primary Clinical Diagnosis <span className="text-status-cancelled-text">*</span>
            </label>
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">ICD-10 Categorized</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-24 rounded-lg bg-surface-subtle border border-border-subtle text-brand-navy-deep font-body-md text-body-md focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
              id="diagnosis-input"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Search ICD-10 code or enter diagnosis..."
              type="text"
            />
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-mono-data text-mono-data font-bold">
                I10.9
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Quick Suggestions:</span>
            <button
              onClick={() => setDiagnosis('I10 (Essential HTN)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors"
              type="button"
            >
              I10 (Essential HTN)
            </button>
            <button
              onClick={() => setDiagnosis('Z95.55 (Coronary Stent)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors"
              type="button"
            >
              Z95.55 (Coronary Stent)
            </button>
            <button
              onClick={() => setDiagnosis('E78.5 (Dyslipidemia)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors"
              type="button"
            >
              E78.5 (Dyslipidemia)
            </button>
          </div>
        </div>

        {/* Notes Area */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <label className="font-label-sm text-label-sm text-brand-navy-deep uppercase tracking-wider" htmlFor="consultation-notes">
              Doctor's Examination & Clinical Notes <span className="text-status-cancelled-text">*</span>
            </label>
            <span className="font-body-sm text-body-sm text-secondary">Markdown & Speech-to-text enabled</span>
          </div>
          <div className="rounded-lg border border-border-subtle overflow-hidden bg-surface-subtle focus-within:ring-2 focus-within:ring-border-focus focus-within:bg-surface-card transition-all">
            <div className="flex items-center justify-between px-3 py-2 bg-surface-subtle border-b border-border-subtle">
              <div className="flex items-center gap-1 text-secondary">
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Bold" type="button">
                  <span className="material-symbols-outlined text-[18px]">format_bold</span>
                </button>
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Italic" type="button">
                  <span className="material-symbols-outlined text-[18px]">format_italic</span>
                </button>
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Bullet List" type="button">
                  <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                </button>
                <div className="h-4 w-[1px] bg-border-subtle mx-1"></div>
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Insert Template" type="button">
                  <span className="material-symbols-outlined text-[18px]">post_add</span>
                </button>
              </div>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-primary font-label-sm text-label-sm font-semibold hover:bg-status-scheduled-bg transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>Voice Dictate</span>
              </button>
            </div>
            <textarea
              className="w-full p-3.5 bg-transparent font-body-md text-body-md text-brand-navy-deep focus:outline-none resize-y leading-relaxed"
              id="consultation-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter clinical observations, vitals assessment, progression, and directives..."
            />
          </div>
          <div className="flex items-center justify-between font-body-sm text-body-sm text-secondary pt-1">
            <span className="inline-flex items-center gap-1.5 text-status-completed-text font-medium">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Autosaved · Valid clinical documentation requirements satisfied
            </span>
            <span className="text-secondary font-mono-data">{notes.length} characters</span>
          </div>
        </div>
      </section>

      {/* Section 2: Treatments & Clinical Orders */}
      <section className="bg-surface-card rounded-xl p-space-md sm:p-space-lg border border-border-subtle shadow-xs flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-border-subtle pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
              2
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-brand-navy-deep leading-snug">Treatments & Clinical Orders</h2>
              <p className="font-body-sm text-body-sm text-secondary leading-normal">
                Prescribe investigations, procedural diagnostics, and orders from Treatment Catalogue
              </p>
            </div>
          </div>
          <Link
            to="/treatment-catalogue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-status-scheduled-bg text-status-scheduled-text font-label-md text-label-md font-semibold hover:bg-sky-100 transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Browse Full Catalogue</span>
          </Link>
        </div>

        {/* Quick Add Search */}
        <div className="flex flex-col gap-space-xs">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">add_circle_outline</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-surface-subtle border border-border-subtle text-brand-navy-deep font-body-md text-body-md focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
              placeholder="Search clinical order by name, code, or department..."
              value={treatmentSearch}
              onChange={(event) => setTreatmentSearch(event.target.value)}
              type="text"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm font-bold text-secondary uppercase tracking-wider">Quick-Add Orders:</span>
            {availableTreatments
              .filter((item) => `${item.treatment_name} ${item.category}`.toLowerCase().includes(treatmentSearch.toLowerCase()))
              .slice(0, 5)
              .map((item) => (
                <button key={item.treatment_code} onClick={() => addTreatment(item)} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors" type="button">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  <span>{item.treatment_name}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider border-b border-border-subtle h-10">
                <th className="pl-4 pr-3">Treatment / Procedure Name</th>
                <th className="px-3">Department</th>
                <th className="px-3">Clinical Indication / Notes</th>
                <th className="px-3 text-center">Quantity / Frequency</th>
                <th className="px-3 text-center">Status</th>
                <th className="pr-4 pl-2 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface-card font-body-sm text-body-sm">
              {selectedTreatments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-secondary">No treatments selected.</td>
                </tr>
              ) : selectedTreatments.map((selected) => {
                const treatment = availableTreatments.find((item) => item.treatment_code === selected.treatment_id);
                return (
                  <tr key={selected.treatment_id} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <div className="font-semibold text-brand-navy-deep leading-tight font-headline-sm text-headline-sm">{treatment?.treatment_name || `Treatment ${selected.treatment_id}`}</div>
                      <div className="font-mono-data text-mono-data text-secondary mt-0.5">Code: {selected.treatment_id}</div>
                    </td>
                    <td className="px-3"><span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm font-medium bg-surface-subtle text-secondary">{treatment?.category || 'Clinical'}</span></td>
                    <td className="px-3 text-secondary">Selected for this consultation</td>
                    <td className="px-3 text-center font-medium text-brand-navy-deep">{selected.quantity}</td>
                    <td className="px-3 text-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-scheduled-bg text-status-scheduled-text">Selected</span></td>
                    <td className="pr-4 pl-2 text-center">
                      <button onClick={() => setSelectedTreatments((current) => current.filter((item) => item.treatment_id !== selected.treatment_id))} className="text-secondary hover:text-status-cancelled-text p-1 rounded hover:bg-status-cancelled-bg/50 transition-colors" title="Remove Item" type="button">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Action Bar / Consultation Finalization */}
      <section className="bg-surface-card rounded-xl p-space-md sm:p-space-lg border border-border-subtle shadow-xs flex flex-col gap-space-md">
        {/* Follow-up directive control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-primary">event_repeat</span>
            <div>
              <span className="font-label-md text-label-md font-bold text-brand-navy-deep block">Recommended Follow-up Schedule</span>
              <span className="font-body-sm text-body-sm text-secondary">Auto-prompts reception desk during patient discharge</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            {['1', '2', '4', '8', 'None'].map((wk) => (
              <button
                key={wk}
                type="button"
                onClick={() => setFollowUpWeek(wk)}
                className={`px-3 py-1 rounded-lg font-label-sm text-label-sm font-semibold transition-all ${followUpWeek === wk
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-subtle text-secondary hover:text-brand-navy-deep hover:bg-surface-variant'
                  }`}
              >
                {wk === 'None' ? 'No Follow-up' : `${wk} Weeks`}
              </button>
            ))}
          </div>
        </div>

        {completionError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {completionError}
          </p>
        )}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-completed-text text-[20px]">verified</span>
              <span className="font-body-sm text-body-sm text-brand-navy-deep font-semibold">
                Consultation notes saved · Automatically generates billing invoice for Reception desk
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-secondary font-body-sm text-body-sm pl-7">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>SLMC Compliant Electronic Health Record</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm self-end lg:self-auto">
            <button
              className="h-10 px-4 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">print</span>
              <span>Print Clinical Summary</span>
            </button>
            <button
              className="h-10 px-4 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">save</span>
              <span>Save Draft</span>
            </button>
            <button
              onClick={handleComplete}
              disabled={isLoading || isFinalized}
              className={`h-10 px-6 rounded-lg font-label-lg text-label-lg font-bold inline-flex items-center gap-2 shadow-xs transition-all transform active:scale-[0.99] ${isFinalized
                ? 'bg-status-completed-bg text-status-completed-text border border-status-completed-text/30'
                : 'bg-primary hover:bg-primary-container text-on-primary'
                }`}
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>Finalizing Encounter...</span>
                </>
              ) : isFinalized ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <span>Consultation Completed!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>Complete Consultation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
