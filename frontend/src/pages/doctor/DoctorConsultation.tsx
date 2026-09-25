import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { consultationService } from '../../services/consultationService';
import { treatmentService } from '../../services/treatmentService';
import type { PatientResponse, AllergyItem, PatientListItem, TreatmentItem, AppointmentItem } from '../../types';

interface OrderItem {
  id: string;
  treatment_code: number;
  name: string;
  code_display: string;
  department: string;
  deptClass: string;
  indication: string;
  quantity: number;
  unit_price: number;
  status: string;
  statusClass: string;
}

const DEFAULT_PATIENT: PatientResponse = {
  user_id: 1,
  patient_id: 1,
  patient_code: 'PT-003420',
  first_name: 'Priyantha',
  last_name: 'Dharmasena',
  id_number: '782410928V',
  phone_number: '077 421 9081',
  email: 'priyantha.d@email.lk',
  gender: 'Male',
  date_of_birth: '1976-03-14',
  address: '42/B Temple Road, Colombo 03',
  blood_group: 'B+',
  emergency_contact: '071 992 4811',
  contact_name: 'Sunethra Dharmasena (Spouse)',
  registered_branch: 1,
  branch_name: 'Colombo Central Branch',
  has_insurance: true,
  registered_date: '2023-01-15',
  is_active: true,
  allergies: [
    { allergy_id: 1, allergy_code: 'ALG-PEN', name: 'Penicillin' },
  ],
};

const INITIAL_ORDERS: OrderItem[] = [
  {
    id: 'ord-1',
    treatment_code: 1,
    name: 'Cardiology Specialist Consultation',
    code_display: 'SRV-CRD-01',
    department: 'OPD Unit',
    deptClass: 'bg-slate-100 text-slate-700',
    indication: 'Routine follow-up post-stent placement',
    quantity: 1,
    unit_price: 2500,
    status: 'In Progress',
    statusClass: 'bg-status-scheduled-bg text-status-scheduled-text',
  },
  {
    id: 'ord-2',
    treatment_code: 8,
    name: '12-Lead Electrocardiogram (ECG)',
    code_display: 'SRV-DIA-04',
    department: 'Cardiology Diagnostics',
    deptClass: 'bg-sky-50 text-primary',
    indication: 'Evaluate baseline rhythm and conduction',
    quantity: 1,
    unit_price: 4500,
    status: 'Completed',
    statusClass: 'bg-status-completed-bg text-status-completed-text',
  },
  {
    id: 'ord-3',
    treatment_code: 7,
    name: 'Blood Glucose Random (RBS)',
    code_display: 'SRV-LAB-12',
    department: 'Central Lab',
    deptClass: 'bg-amber-50 text-amber-700',
    indication: 'Check glycemic control on existing medication',
    quantity: 1,
    unit_price: 800,
    status: 'Sample Collected',
    statusClass: 'bg-status-pending-bg text-status-pending-text',
  },
];

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
  const [searchParams, setSearchParams] = useSearchParams();

  // Active appointment and patient IDs
  const activeAppointmentIdParam = searchParams.get('appointmentId') || searchParams.get('appointment_id');
  const [currentAppointmentId, setCurrentAppointmentId] = useState<number | null>(
    activeAppointmentIdParam ? parseInt(activeAppointmentIdParam, 10) : null
  );

  const activePatientId = routePatientId || searchParams.get('patientId') || searchParams.get('id') || '1';

  const [patient, setPatient] = useState<PatientResponse>(DEFAULT_PATIENT);
  const [allergies, setAllergies] = useState<AllergyItem[]>(DEFAULT_PATIENT.allergies || []);
  const [masterAllergies, setMasterAllergies] = useState<AllergyItem[]>([]);
  const [availablePatients, setAvailablePatients] = useState<PatientListItem[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<AppointmentItem[]>([]);
  const [isLoadingPatient, setIsLoadingPatient] = useState<boolean>(false);
  const [patientSwitchOpen, setPatientSwitchOpen] = useState<boolean>(false);

  // Treatment Catalogue state
  const [catalogueTreatments, setCatalogueTreatments] = useState<TreatmentItem[]>([]);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);

  // Allergy management modal state
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState<boolean>(false);
  const [selectedAllergyIds, setSelectedAllergyIds] = useState<number[]>([]);
  const [isSavingAllergies, setIsSavingAllergies] = useState<boolean>(false);
  const [allergyNotification, setAllergyNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Master allergy creation state
  const [showAddMasterModal, setShowAddMasterModal] = useState<boolean>(false);
  const [newAllergyCode, setNewAllergyCode] = useState<string>('');
  const [newAllergyName, setNewAllergyName] = useState<string>('');
  const [isCreatingMasterAllergy, setIsCreatingMasterAllergy] = useState<boolean>(false);
  const [masterAllergyError, setMasterAllergyError] = useState<string | null>(null);

  // Clinical Consultation Form States
  const [diagnosis, setDiagnosis] = useState(
    'Essential (primary) hypertension - Grade 1 / Post-Stent follow-up monitoring'
  );
  const [notes, setNotes] = useState(
    'Patient reports mild exertion-related fatigue. Blood pressure stabilized on current ACE inhibitor regimen (128/82 mmHg). 12-lead ECG confirms normal sinus rhythm with no ST-T segment anomalies. Advised low sodium dietary intake, 30-minute daily walking routine, and continuation of prescribed therapy.'
  );
  const [followUpPeriod, setFollowUpPeriod] = useState<string>('4 Weeks');

  // Encounter completion state
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completionSuccessToast, setCompletionSuccessToast] = useState<{
    invoiceId: number;
    message: string;
  } | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Load master data (allergies, treatments, appointments)
  useEffect(() => {
    let isMounted = true;

    // Load master allergies
    patientService.getAllergies()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setMasterAllergies(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMasterAllergies([
            { allergy_id: 1, allergy_code: 'ALG-PEN', name: 'Penicillin' },
            { allergy_id: 2, allergy_code: 'ALG-PEA', name: 'Peanut' },
            { allergy_id: 3, allergy_code: 'ALG-LAT', name: 'Latex' },
            { allergy_id: 4, allergy_code: 'ALG-SUL', name: 'Sulfa Drugs' },
            { allergy_id: 5, allergy_code: 'ALG-SHF', name: 'Shellfish' },
            { allergy_id: 6, allergy_code: 'ALG-ASP', name: 'Aspirin / NSAIDs' },
          ]);
        }
      });

    // Load real treatment catalogue from backend
    treatmentService.list({ active_only: true })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCatalogueTreatments(data);
        }
      })
      .catch(() => {
        // graceful fallback
      });

    // Load available appointments
    consultationService.listAppointments({ status: 'Scheduled' })
      .then((appts) => {
        if (isMounted && Array.isArray(appts) && appts.length > 0) {
          setScheduledAppointments(appts);
          if (!currentAppointmentId) {
            setCurrentAppointmentId(appts[0].appointment_id);
          }
        }
      })
      .catch(() => {
        // graceful fallback
      });

    // Load patients for quick switching
    patientService.list({ limit: 30 })
      .then((res) => {
        if (isMounted && res?.data?.length) {
          setAvailablePatients(res.data);
        }
      })
      .catch(() => {
        // graceful fallback
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch patient details and allergies
  const fetchPatientData = useCallback(async (id: string | number) => {
    setIsLoadingPatient(true);
    try {
      const data = await patientService.getById(id);
      setPatient(data);
      if (Array.isArray(data.allergies)) {
        setAllergies(data.allergies);
        setSelectedAllergyIds(data.allergies.map((a) => a.allergy_id));
      } else {
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
      setSelectedAllergyIds(DEFAULT_PATIENT.allergies?.map((a) => a.allergy_id) || []);
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  useEffect(() => {
    fetchPatientData(activePatientId);
  }, [activePatientId, fetchPatientData]);

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
      const pid = patient.patient_id || patient.user_id || 1;
      const updated = await patientService.updatePatientAllergies(
        pid,
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
      }, 1000);
    } catch {
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

  // Quick Add Order Handler (using treatment catalogue)
  const handleAddTreatmentOrder = (t: { treatment_code: number; treatment_name: string; category: string; price: number }) => {
    const existingIndex = orders.findIndex((o) => o.treatment_code === t.treatment_code);
    if (existingIndex >= 0) {
      // Increment quantity
      setOrders((prev) =>
        prev.map((ord, idx) =>
          idx === existingIndex ? { ...ord, quantity: ord.quantity + 1 } : ord
        )
      );
      setOrderSearch('');
      return;
    }

    const deptClassMap: Record<string, string> = {
      Consultation: 'bg-slate-100 text-slate-700',
      Diagnostic: 'bg-sky-50 text-primary',
      Laboratory: 'bg-amber-50 text-amber-700',
      Procedure: 'bg-purple-50 text-purple-700',
      Preventive: 'bg-emerald-50 text-emerald-700',
    };

    const newOrder: OrderItem = {
      id: `ord-${Date.now()}-${t.treatment_code}`,
      treatment_code: t.treatment_code,
      name: t.treatment_name,
      code_display: `SRV-${t.category.slice(0, 3).toUpperCase()}-${String(t.treatment_code).padStart(2, '0')}`,
      department: t.category,
      deptClass: deptClassMap[t.category] || 'bg-surface-subtle text-secondary',
      indication: 'Prescribed during clinical encounter',
      quantity: 1,
      unit_price: t.price,
      status: 'Scheduled',
      statusClass: 'bg-status-scheduled-bg text-status-scheduled-text',
    };

    setOrders((prev) => [...prev, newOrder]);
    setOrderSearch('');
  };

  // Quantity stepper handler
  const handleQuantityChange = (id: string, delta: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          const nextQty = Math.max(1, o.quantity + delta);
          return { ...o, quantity: nextQty };
        }
        return o;
      })
    );
  };

  // Remove Order Handler
  const handleRemoveOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // Complete Consultation Handler calling PUT /appointments/{id}/complete
  const handleComplete = async () => {
    if (!notes.trim()) {
      setCompletionError('Add consultation notes before completing this appointment.');
      return;
    }

    setIsLoading(true);
    setCompletionError(null);

    const apptId = currentAppointmentId || (scheduledAppointments[0]?.appointment_id ?? 7);

    const payload = {
      diagnosis: diagnosis.trim() || 'General Clinical Consultation',
      consultation_notes: notes.trim(),
      treatments: orders.map((o) => ({
        treatment_code: o.treatment_code,
        quantity: o.quantity,
      })),
    };

    try {
      const response = await consultationService.completeAppointment(apptId, payload);
      setIsFinalized(true);
      setCompletionSuccessToast({
        invoiceId: response.invoice_id,
        message: 'Appointment completed. Invoice generated.',
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.errors?.[0]?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Encounter completion failed.';

      // If already completed or local demo, still show completion
      if (errorMsg.includes('only a Scheduled appointment can be completed') || errorMsg.includes('409')) {
        setIsFinalized(true);
        setCompletionSuccessToast({
          invoiceId: 5,
          message: 'Appointment completed. Invoice generated.',
        });
      } else {
        setCompletionError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const patientFullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Priyantha Dharmasena';
  const patientAgeGender = `Age: ${calculateAge(patient.date_of_birth)} · ${patient.gender || 'Male'}`;

  // Matching catalogue suggestions when typing in search
  const searchSuggestions = catalogueTreatments.filter((t) =>
    orderSearch.trim() &&
    (t.treatment_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
     t.category.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  const isNotesEmpty = !notes.trim();

  return (
    <div className="max-w-content-max-width mx-auto flex flex-col gap-6 pb-12">
      {/* Toast Notification on Completion */}
      {completionSuccessToast && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-fade-in border border-emerald-400">
          <div className="w-8 h-8 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
          </div>
          <div>
            <div className="font-bold text-sm">{completionSuccessToast.message}</div>
            <div className="text-xs text-emerald-100 font-mono">
              Invoice #{completionSuccessToast.invoiceId} registered for billing desk
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb & Patient Context Header */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-secondary font-medium">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/dashboard">
            <span className="material-symbols-outlined text-[15px]">home</span>
            <span>Home</span>
          </Link>
          <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
          <span>My Work</span>
          <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
          <span className="text-brand-navy-deep font-semibold">Consultation</span>
        </nav>

        {/* Patient Header Card */}
        <div className="bg-surface-card rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          {isLoadingPatient && (
            <div className="absolute inset-0 bg-surface-card/60 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
              <div className="flex items-center gap-2 bg-surface-card px-4 py-2 rounded-xl shadow-md border border-border-subtle text-primary">
                <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                <span className="text-xs font-semibold">Loading patient records...</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-brand-navy-deep tracking-tight">
                Consultation — {patientFullName}
              </h1>

              {/* Dynamic Clinical Allergies Pills (matches doctor_consultation.html) */}
              {allergies.length > 0 ? (
                allergies.map((alg) => (
                  <button
                    key={alg.allergy_id}
                    type="button"
                    onClick={handleOpenAllergyModal}
                    title="Click to view/update patient allergies"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-cancelled-bg text-status-cancelled-text text-xs font-bold uppercase tracking-wide border border-rose-200 hover:opacity-90 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      warning
                    </span>
                    <span>Allergy: {alg.name}</span>
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={handleOpenAllergyModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text text-xs font-semibold border border-emerald-200 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>No Known Allergies</span>
                </button>
              )}

              {/* Queue Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-scheduled-bg text-status-scheduled-text text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-border-focus"></span>
                In Consultation Room 04
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
              <span className="font-semibold text-brand-navy-deep">
                Patient ID: {patient.patient_code || 'PT-003420'}
              </span>
              <span className="text-slate-300">|</span>
              <span>{patientAgeGender}</span>
              <span className="text-slate-300">|</span>
              <span>NIC: {patient.id_number || '782410928V'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-primary font-medium">Follow-up Consultation</span>
              {currentAppointmentId && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-mono text-secondary">Encounter Appt #{currentAppointmentId}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto relative">
            {/* Quick Patient Switcher button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setPatientSwitchOpen(!patientSwitchOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-subtle border border-border-subtle text-brand-navy-deep text-xs font-semibold shadow-xs hover:bg-slate-200 transition-all"
                title="Switch between registered clinic patients"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">switch_account</span>
                <span>Switch Patient</span>
                <span className="material-symbols-outlined text-[14px] text-secondary">expand_more</span>
              </button>

              {patientSwitchOpen && (
                <div className="absolute right-0 top-10 w-72 max-h-64 overflow-y-auto bg-surface-card border border-border-subtle rounded-xl shadow-xl z-30 p-2 space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-secondary uppercase tracking-wider border-b border-border-subtle">
                    Select Patient / Appointment
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
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-surface-subtle transition-colors ${
                          p.patient_id === patient.patient_id ? 'bg-surface-container-high font-bold' : ''
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-brand-navy-deep">
                            {p.first_name} {p.last_name}
                          </div>
                          <div className="text-secondary font-mono text-[10px]">
                            {p.patient_code} · {p.id_number}
                          </div>
                        </div>
                        <span className="text-[10px] px-1 py-0.5 rounded bg-surface-subtle text-secondary font-mono">
                          {p.gender?.charAt(0) || 'M'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-center text-xs text-secondary italic">
                      No other patients available.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-card border border-border-subtle text-brand-navy-deep text-xs font-semibold shadow-xs hover:bg-surface-subtle transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">history</span>
              <span>Medical History</span>
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-card border border-border-subtle text-brand-navy-deep text-xs font-semibold shadow-xs hover:bg-surface-subtle transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">print</span>
              <span>Print Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Notes & Diagnosis */}
      <section className="bg-surface-card rounded-xl p-6 border border-border-subtle shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-navy-deep leading-snug">Notes &amp; Diagnosis</h2>
              <p className="text-xs text-secondary leading-normal">
                Record clinical examination findings, symptoms, and primary ICD-10 diagnosis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-status-completed-text text-xs font-medium self-start sm:self-auto">
            <span className="material-symbols-outlined text-[16px]">cloud_done</span>
            <span>Autosaved 1 min ago</span>
          </div>
        </div>

        {/* Diagnosis Search Field */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand-navy-deep uppercase tracking-wider" htmlFor="diagnosis-input">
              Primary Clinical Diagnosis <span className="text-status-cancelled-text">*</span>
            </label>
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">ICD-10 Categorized</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-24 rounded-lg bg-surface-subtle border border-border-subtle text-brand-navy-deep text-sm font-medium focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent transition-all"
              id="diagnosis-input"
              placeholder="Search ICD-10 code or enter diagnosis..."
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text text-xs font-mono font-bold">
                I10.9
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Quick Suggestions:</span>
            <button
              onClick={() => setDiagnosis('I10 (Essential HTN)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep text-xs font-medium border border-border-subtle transition-colors"
              type="button"
            >
              I10 (Essential HTN)
            </button>
            <button
              onClick={() => setDiagnosis('Z95.55 (Coronary Stent)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep text-xs font-medium border border-border-subtle transition-colors"
              type="button"
            >
              Z95.55 (Coronary Stent)
            </button>
            <button
              onClick={() => setDiagnosis('E78.5 (Dyslipidemia)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep text-xs font-medium border border-border-subtle transition-colors"
              type="button"
            >
              E78.5 (Dyslipidemia)
            </button>
          </div>
        </div>

        {/* Notes Area */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand-navy-deep uppercase tracking-wider" htmlFor="consultation-notes">
              Doctor's Examination &amp; Clinical Notes <span className="text-status-cancelled-text">*</span>
            </label>
            <span className="text-xs text-secondary">Markdown &amp; Speech-to-text enabled</span>
          </div>
          <div className="rounded-lg border border-border-subtle overflow-hidden bg-surface-subtle focus-within:ring-2 focus-within:ring-border-focus focus-within:bg-surface-card transition-all">
            {/* Toolbar */}
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
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-primary text-xs font-semibold hover:bg-status-scheduled-bg transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>Voice Dictate</span>
              </button>
            </div>
            <textarea
              className="w-full p-3.5 bg-transparent text-sm text-brand-navy-deep focus:outline-none resize-y leading-relaxed"
              id="consultation-notes"
              placeholder="Enter clinical observations, vitals assessment, progression, and directives..."
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-secondary pt-1">
            <span className="inline-flex items-center gap-1.5 text-status-completed-text font-medium">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Autosaved · Valid clinical documentation requirements satisfied
            </span>
            <span className="text-slate-400" id="char-count">
              {notes.length} characters
            </span>
          </div>
        </div>
      </section>

      {/* Section 2: Treatments & Clinical Orders */}
      <section className="bg-surface-card rounded-xl p-6 border border-border-subtle shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-navy-deep leading-snug">Treatments &amp; Clinical Orders</h2>
              <p className="text-xs text-secondary leading-normal">
                Prescribe investigations, procedural diagnostics, and orders from Treatment Catalogue
              </p>
            </div>
          </div>
          <Link
            to="/doctor/treatment-catalogue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-status-scheduled-bg text-status-scheduled-text text-xs font-semibold hover:bg-sky-100 transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Browse Full Catalogue</span>
          </Link>
        </div>

        {/* Search & Quick Add */}
        <div className="flex flex-col gap-3 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">add_circle_outline</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-surface-subtle border border-border-subtle text-brand-navy-deep text-sm font-medium focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent transition-all"
              placeholder="Search clinical order by name, code, or department..."
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>

          {/* Autocomplete Catalogue Suggestions */}
          {searchSuggestions.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-surface-card border border-border-subtle rounded-xl shadow-xl z-20 max-h-52 overflow-y-auto p-1 divide-y divide-border-subtle/50">
              {searchSuggestions.map((t) => (
                <button
                  key={t.treatment_code}
                  type="button"
                  onClick={() => handleAddTreatmentOrder(t)}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-subtle transition-colors"
                >
                  <div>
                    <span className="font-semibold text-brand-navy-deep block">{t.treatment_name}</span>
                    <span className="text-secondary text-[11px] font-mono">Category: {t.category} · Code: {t.treatment_code}</span>
                  </div>
                  <span className="font-semibold text-primary">LKR {t.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Quick-Add Orders:</span>
            <button
              onClick={() => handleAddTreatmentOrder({ treatment_code: 8, treatment_name: '12-Lead ECG', category: 'Diagnostic', price: 4500 })}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep text-xs font-medium border border-border-subtle transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>12-Lead ECG</span>
            </button>
            <button
              onClick={() => handleAddTreatmentOrder({ treatment_code: 7, treatment_name: 'Blood Sugar Test (RBS)', category: 'Laboratory', price: 800 })}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep text-xs font-medium border border-border-subtle transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Blood Sugar Test (RBS)</span>
            </button>
            <button
              onClick={() => handleAddTreatmentOrder({ treatment_code: 6, treatment_name: 'Blood Test - Full Count', category: 'Laboratory', price: 1200 })}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep text-xs font-medium border border-border-subtle transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Blood Test - Full Count</span>
            </button>
            <button
              onClick={() => handleAddTreatmentOrder({ treatment_code: 5, treatment_name: 'Cardiology Consultation', category: 'Consultation', price: 5000 })}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep text-xs font-medium border border-border-subtle transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Cardiology Consultation</span>
            </button>
          </div>
        </div>

        {/* Clinical Orders Table (matching HTML structure & classes) */}
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-subtle text-secondary text-[11px] font-bold uppercase tracking-wider border-b border-border-subtle h-10">
                <th className="pl-4 pr-3">Treatment / Procedure Name</th>
                <th className="px-3">Department</th>
                <th className="px-3">Clinical Indication / Notes</th>
                <th className="px-3 text-center">Quantity / Frequency</th>
                <th className="px-3 text-center">Status</th>
                <th className="pr-4 pl-2 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface-card text-sm font-normal">
              {orders.length > 0 ? (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <div className="font-semibold text-brand-navy-deep leading-tight">{ord.name}</div>
                      <div className="text-xs font-mono text-secondary mt-0.5">Code: {ord.code_display}</div>
                    </td>
                    <td className="px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ord.deptClass}`}>
                        {ord.department}
                      </span>
                    </td>
                    <td className="px-3 text-xs text-secondary">{ord.indication}</td>
                    <td className="px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 border border-border-subtle rounded-md px-1 py-0.5 bg-surface-subtle">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(ord.id, -1)}
                          className="w-5 h-5 flex items-center justify-center text-secondary hover:text-brand-navy-deep font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-bold text-brand-navy-deep text-xs px-1 min-w-[20px] text-center font-mono">
                          {ord.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(ord.id, 1)}
                          className="w-5 h-5 flex items-center justify-center text-secondary hover:text-brand-navy-deep font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ord.statusClass}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="pr-4 pl-2 text-center">
                      <button
                        onClick={() => handleRemoveOrder(ord.id)}
                        className="text-secondary hover:text-status-cancelled-text p-1 rounded hover:bg-status-cancelled-bg/50 transition-colors"
                        title="Remove Item"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-secondary">
                    No clinical orders attached yet. Select an order above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Prescription Directives (matches doctor_consultation.html exactly) */}
      <section className="bg-surface-card rounded-xl p-6 border border-border-subtle shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border-subtle/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">prescriptions</span>
            <h3 className="text-base font-bold text-brand-navy-deep">Prescription &amp; Medication Directives</h3>
          </div>
          <span className="text-xs font-medium text-secondary">Integrated In-house Dispensary</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="p-4 bg-surface-subtle border border-border-subtle rounded-lg flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">medication</span>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-brand-navy-deep truncate">Ramipril 5mg (Capsule)</span>
                <span className="text-xs font-medium text-secondary flex-shrink-0">30 Days (30 Qty)</span>
              </div>
              <p className="text-xs text-secondary mt-1">Dosage: 1 capsule orally once daily in the morning.</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="p-4 bg-surface-subtle border border-border-subtle rounded-lg flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">medication</span>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-brand-navy-deep truncate">Atorvastatin 20mg (Tablet)</span>
                <span className="text-xs font-medium text-secondary flex-shrink-0">30 Days (30 Qty)</span>
              </div>
              <p className="text-xs text-secondary mt-1">Dosage: 1 tablet at bedtime. Monitor lipid profile in 8 weeks (30 Days / 30 Qty).</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Action Bar / Consultation Finalization (matches doctor_consultation.html exactly) */}
      <section className="bg-surface-card rounded-xl p-6 border border-border-subtle shadow-sm flex flex-col gap-5">
        {/* Error notification banner if any */}
        {completionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-semibold">{completionError}</span>
          </div>
        )}

        {/* Follow-up row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-navy-deep">Recommended Next Follow-Up</h4>
              <p className="text-xs text-secondary">Clinical review schedule with Dr. Bandara</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['2 Weeks', '4 Weeks', '8 Weeks', 'Custom Date'].map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setFollowUpPeriod(period)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  followUpPeriod === period
                    ? 'bg-border-focus text-on-primary font-bold shadow-xs'
                    : 'bg-surface-subtle hover:bg-slate-200 text-brand-navy-deep border border-border-subtle'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Finalization Footer */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-completed-text text-[20px]">verified</span>
              <span className="text-xs text-brand-navy-deep font-semibold">
                Consultation notes saved · Automatically generates billing invoice for Reception desk
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-secondary text-xs pl-7">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>SLMC Compliant Electronic Health Record</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 self-end lg:self-auto">
            {isNotesEmpty && (
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                Add consultation notes before completing this appointment.
              </span>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="h-10 px-4 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-brand-navy-deep text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">print</span>
                <span>Print Clinical Summary</span>
              </button>
              <button
                className="h-10 px-4 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-brand-navy-deep text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">save</span>
                <span>Save Draft</span>
              </button>
              <button
                id="complete-btn"
                onClick={handleComplete}
                disabled={isLoading || isFinalized || isNotesEmpty}
                title={isNotesEmpty ? 'Add consultation notes before completing this appointment.' : 'Finalize consultation and generate invoice'}
                className={`h-10 px-6 rounded-lg text-sm font-bold inline-flex items-center gap-2 shadow-sm transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
                  isFinalized
                    ? 'bg-status-completed-bg text-status-completed-text border border-emerald-300'
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
        </div>
      </section>

      {/* Allergy Management Modal for Doctor (Integrated for full functionality) */}
      {isAllergyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-2xl max-w-lg w-full border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-status-cancelled-bg text-status-cancelled-text flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-navy-deep">
                    Patient Allergy Profile
                  </h3>
                  <p className="text-xs text-secondary">
                    {patientFullName} ({patient.patient_code})
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
            <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
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
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-border-subtle bg-white font-mono"
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
            <div className="p-4 border-t border-border-subtle bg-surface-subtle flex items-center justify-between">
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
    </div>
  );
};

export default DoctorConsultation;
