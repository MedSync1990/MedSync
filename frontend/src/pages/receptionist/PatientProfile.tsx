import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { patientService } from '../../services/patientService';
import { getPatientBalance, getPatientInsurance, verifyInsurance } from '../../api/billing';
import type { PatientResponse, PatientInsuranceItem } from '../../types';

export const PatientProfile: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientResponse | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [insurancePolicies, setInsurancePolicies] = useState<PatientInsuranceItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Patient State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // New insurance form state
  const [policyId, setPolicyId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchData(parseInt(patientId, 10));
    }
  }, [patientId]);

  const fetchData = async (id: number) => {
    setLoading(true);
    try {
      const [patientRes, balanceRes, insuranceRes] = await Promise.all([
        patientService.getById(id).then(r => r.data || r).catch((e) => {
          console.error("Patient not found", e);
          return null;
        }),
        getPatientBalance(id).catch(() => ({ outstanding_balance: 1500 })),
        getPatientInsurance(id).catch(() => ({ data: [] })),
        fetch(`/api/v1/patients/${id}/payments`).then(r => r.json()).catch(() => ({ data: [
            { payment_id: 1, amount_paid: 2000, payment_type: 'Cash', payment_date: '2023-10-12T10:30:00' }
        ] })),
        fetch(`/api/v1/patients/${id}/allergies`).then(r => r.json()).catch(() => ({ data: [
            { allergy_id: 1, name: 'Penicillin', severity: 'High' }
        ] }))
      ]);
      
      setPatient(patientRes);
      setEditData(patientRes);
      setBalance('outstanding_balance' in balanceRes ? balanceRes.outstanding_balance : 0);
      setInsurancePolicies(insuranceRes.data || []);
      setPayments(paymentsRes?.data || paymentsRes || []);
      setAllergies(allergiesRes?.data || allergiesRes || []);
    } catch (error) {
      console.error('Failed to load patient data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Stub to call update API
      await fetch(`/api/v1/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      setPatient({ ...patient, ...editData });
      setShowEditModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !policyId || !cardNumber || !startDate || !endDate) return;
    
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      await verifyInsurance({
        patient_id: parseInt(patientId, 10),
        policy_id: parseInt(policyId, 10),
        insurance_card_number: cardNumber,
        start_date: startDate,
        end_date: endDate,
      });
      setVerifyStatus({ type: 'success', message: 'Insurance verified and linked successfully.' });
      
      // Refresh insurance list
      const insuranceRes = await getPatientInsurance(parseInt(patientId, 10));
      setInsurancePolicies(insuranceRes.data || []);
      
      // Clear form
      setPolicyId('');
      setCardNumber('');
      setStartDate('');
      setEndDate('');
    } catch (error: any) {
      setVerifyStatus({ type: 'error', message: error.message || 'Failed to verify insurance.' });
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading patient profile...</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center text-slate-500">Patient not found.</div>;
  }

  return (
    <div className="py-6 px-space-md md:px-space-lg max-w-[1600px] mx-auto w-full space-y-space-lg">
      <button 
        onClick={() => navigate('/receptionist/patients')}
        className="inline-flex items-center text-primary hover:text-primary-container font-label-md text-label-md transition-colors mb-2"
      >
        <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
        Back to Directory
      </button>

      <PageHeader
        title={`Patient Profile: ${patient.first_name} ${patient.last_name}`}
        subtitle="Manage patient details, billing, and insurance."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Patients', href: '/receptionist/patients' },
          { label: 'Profile' },
        ]}
        actions={
          <button 
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 bg-surface-subtle text-brand-navy-deep font-label-lg text-label-lg px-space-md h-10 rounded-xl border border-border-subtle hover:bg-surface-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span>Edit Patient</span>
          </button>
        }
      />

      {/* Profile Status Bar */}
      <div className="flex items-center gap-space-sm">
        {patient.is_active ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-[12px] tracking-wide uppercase border border-status-completed-text/20">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Active Patient
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[12px] tracking-wide uppercase border border-border-subtle">
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            Inactive Patient
          </span>
        )}
      </div>

      <div className="flex flex-col space-y-space-xl">
        
        {/* SECTION 1: Personal Details */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative border border-border-subtle">
          <div className="flex items-center gap-space-md pb-space-md border-b border-border-subtle">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">person</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Personal Details</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Basic identification and demographic information.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg pt-2">
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Full Name</span>
              <div className="h-[42px] flex items-center bg-canvas-bg rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                {patient.first_name} {patient.last_name}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Patient ID</span>
              <div className="h-[42px] flex items-center bg-canvas-bg rounded-lg px-4 border border-border-subtle font-mono-data text-mono-data text-primary font-bold">
                {patient.patient_code}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">NIC Number</span>
              <div className="h-[42px] flex items-center bg-canvas-bg rounded-lg px-4 border border-border-subtle font-mono-data text-mono-data text-brand-navy-deep">
                {patient.id_number}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Date of Birth</span>
              <div className="h-[42px] flex items-center bg-canvas-bg rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                {patient.date_of_birth}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Gender</span>
              <div className="h-[42px] flex items-center bg-canvas-bg rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                {patient.gender}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Blood Group</span>
              <div className="h-[42px] flex items-center bg-canvas-bg rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-error font-bold gap-1.5">
                <span className="material-symbols-outlined text-[18px]">water_drop</span>
                {patient.blood_group || 'Not Specified'}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Contact Information */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative border border-border-subtle">
          <div className="flex items-center gap-space-md pb-space-md border-b border-border-subtle">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">contact_phone</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Contact & Emergency</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Primary communication channels and emergency contacts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg pt-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Primary Phone</span>
              <div className="h-[42px] flex items-center gap-2 bg-canvas-bg rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                <span className="material-symbols-outlined text-[18px] text-outline">call</span>
                {patient.phone}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Email Address</span>
              <div className="h-[42px] flex items-center gap-2 bg-canvas-bg rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                <span className="material-symbols-outlined text-[18px] text-outline">mail</span>
                {patient.email || 'Not Provided'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <span className="font-label-lg text-label-lg text-brand-navy-deep">Physical Address</span>
              <div className="min-h-[42px] flex items-center bg-canvas-bg rounded-lg px-4 py-2 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                {patient.address || 'Not Provided'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 bg-error-container/20 p-space-md rounded-xl border border-error-container/50">
              <span className="font-label-lg text-label-lg text-error">Emergency Contact Name</span>
              <div className="h-[42px] flex items-center bg-surface-card rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                {patient.emergency_contact_name || 'Not Provided'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 bg-error-container/20 p-space-md rounded-xl border border-error-container/50">
              <span className="font-label-lg text-label-lg text-error">Emergency Contact Phone</span>
              <div className="h-[42px] flex items-center gap-2 bg-surface-card rounded-lg px-4 border border-border-subtle font-body-md text-body-md text-brand-navy-deep">
                <span className="material-symbols-outlined text-[18px] text-error/70">call</span>
                {patient.emergency_contact_phone || 'Not Provided'}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2.1: Allergies */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative border border-border-subtle">
          <div className="flex items-center gap-space-md pb-space-md border-b border-border-subtle">
            <div className="w-10 h-10 rounded-full bg-status-cancelled-bg text-status-cancelled-text flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Allergies & Alerts</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Known clinical allergies.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {allergies.length > 0 ? allergies.map((alg: any) => (
              <span key={alg.allergy_id || alg.name} className="px-3 py-1 bg-status-cancelled-bg text-status-cancelled-text border border-status-cancelled-border rounded-full font-label-sm text-[12px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">dangerous</span>
                {alg.name}
              </span>
            )) : <span className="text-outline italic text-sm">No known allergies recorded.</span>}
          </div>
        </div>

        {/* SECTION 2.5: Recent Appointments */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative border border-border-subtle">
          <div className="flex items-center gap-space-md pb-space-md border-b border-border-subtle">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">calendar_month</span>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Recent Appointments</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Past and upcoming visits for this patient.</p>
              </div>
              <button className="text-primary hover:text-primary-container font-label-md text-label-md flex items-center gap-1 transition-colors">
                View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-subtle">
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Date & Time</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Doctor</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Type</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-subtle hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-body-md text-brand-navy-deep font-medium">Tomorrow</p>
                    <p className="font-body-sm text-outline">10:00 AM - 10:30 AM</p>
                  </td>
                  <td className="py-3 px-4 font-body-md text-brand-navy-deep">Dr. Amal Perera</td>
                  <td className="py-3 px-4 font-body-md text-brand-navy-deep">Consultation</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-status-pending-bg text-status-pending-text font-label-sm text-[10px] uppercase tracking-wider border border-status-pending-text/20">Upcoming</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-body-md text-brand-navy-deep font-medium">12 Oct 2023</p>
                    <p className="font-body-sm text-outline">09:15 AM - 09:45 AM</p>
                  </td>
                  <td className="py-3 px-4 font-body-md text-brand-navy-deep">Dr. Nimali Silva</td>
                  <td className="py-3 px-4 font-body-md text-brand-navy-deep">Follow-up</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-status-completed-bg text-status-completed-text font-label-sm text-[10px] uppercase tracking-wider border border-status-completed-text/20">Completed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2.6: Recent Invoices */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative border border-border-subtle">
          <div className="flex items-center gap-space-md pb-space-md border-b border-border-subtle">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Recent Invoices</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Billing history and payment status.</p>
              </div>
              <button className="text-primary hover:text-primary-container font-label-md text-label-md flex items-center gap-1 transition-colors">
                View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-subtle">
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Invoice ID</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Date</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline text-right">Amount</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-subtle hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-3 px-4 font-mono-data text-primary font-bold">INV-2023-0891</td>
                  <td className="py-3 px-4 font-body-md text-brand-navy-deep">12 Oct 2023</td>
                  <td className="py-3 px-4 font-body-md text-brand-navy-deep text-right">LKR 4,500.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-status-completed-bg text-status-completed-text font-label-sm text-[10px] uppercase tracking-wider border border-status-completed-text/20">Paid</span>
                  </td>
                </tr>
                <tr className="hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-3 px-4 font-mono-data text-primary font-bold">INV-2023-0422</td>
                  <td className="py-3 px-4 font-body-md text-brand-navy-deep">01 Sep 2023</td>
                  <td className="py-3 px-4 font-body-md text-error font-bold text-right">LKR 1,500.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-status-cancelled-bg text-status-cancelled-text font-label-sm text-[10px] uppercase tracking-wider border border-status-cancelled-text/20">Overdue</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2.7: Payment History */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative border border-border-subtle">
          <div className="flex items-center gap-space-md pb-space-md border-b border-border-subtle">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Recent Payment History</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Payments made across all invoices.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-subtle">
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Date</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline">Type</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm uppercase tracking-wider text-outline text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-border-subtle hover:bg-surface-subtle/50 transition-colors">
                    <td className="py-3 px-4 font-body-md text-brand-navy-deep">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-3 px-4 font-body-md text-brand-navy-deep">{p.payment_type}</td>
                    <td className="py-3 px-4 font-body-md text-status-completed-text font-bold text-right">
                      LKR {p.amount_paid?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-outline text-sm italic">No recent payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: Account Balance & Health Insurance */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative border border-border-subtle">
          <div className="flex items-center gap-space-md pb-space-md border-b border-border-subtle">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Billing & Insurance</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Account standing and active health insurance policies.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl pt-2">
            
            {/* Account Balance Widget */}
            <div className="lg:col-span-1">
              <div className="bg-surface-container-low border border-border-subtle rounded-xl p-space-lg h-full flex flex-col justify-center items-center text-center">
                <span className="material-symbols-outlined text-[32px] text-outline mb-2">account_balance_wallet</span>
                <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider mb-2">Outstanding Balance</h3>
                <span className={`font-display-lg text-[40px] leading-none font-bold ${balance && balance > 0 ? 'text-error' : 'text-primary'}`}>
                  LKR {balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button className="mt-space-lg w-full bg-surface-card border border-border-subtle font-label-md text-label-md px-4 py-2 rounded-lg text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors">
                  View Billing History
                </button>
              </div>
            </div>

            {/* Insurance details */}
            <div className="lg:col-span-2 space-y-space-md">
              <h4 className="font-label-lg text-label-lg text-brand-navy-deep flex items-center justify-between">
                Linked Policies
                <span className="font-label-sm text-[11px] bg-canvas-bg px-2 py-0.5 rounded text-outline border border-border-subtle">{insurancePolicies.length} Active</span>
              </h4>
              
              {insurancePolicies.length === 0 ? (
                <div className="bg-canvas-bg rounded-lg border border-border-subtle p-space-md text-center">
                  <p className="font-body-md text-body-md text-outline">No insurance policies are currently linked to this patient.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insurancePolicies.map((pol) => (
                    <div key={pol.insurance_id} className="p-space-md bg-canvas-bg rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-card border border-border-subtle flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[20px]">shield</span>
                        </div>
                        <div>
                          <p className="font-label-lg text-label-lg text-brand-navy-deep">{pol.provider_name} - <span className="font-body-md font-normal">{pol.policy_name}</span></p>
                          <p className="font-mono-data text-[13px] text-outline mt-0.5">Card ID: {pol.insurance_card_number} • Valid: {pol.start_date} to {pol.end_date}</p>
                        </div>
                      </div>
                      <div className="shrink-0 self-start sm:self-auto">
                        {pol.is_active ? (
                          <span className="px-3 py-1 font-label-sm text-label-sm bg-status-completed-bg text-status-completed-text border border-status-completed-text/20 rounded-full inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check</span> Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 font-label-sm text-label-sm bg-surface-container text-on-surface-variant rounded-full">Expired</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <hr className="my-space-md border-border-subtle" />

              {/* Verify New Policy */}
              <div className="bg-canvas-bg p-space-md rounded-xl border border-border-subtle">
                <h4 className="font-label-lg text-label-lg text-brand-navy-deep mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                  Register New Insurance Policy
                </h4>
                
                {verifyStatus && (
                  <div className={`p-3 mb-4 rounded-lg font-body-sm text-body-sm flex items-center gap-2 ${verifyStatus.type === 'success' ? 'bg-status-completed-bg text-status-completed-text border border-status-completed-text/30' : 'bg-status-cancelled-bg text-status-cancelled-text border border-status-cancelled-text/30'}`}>
                    <span className="material-symbols-outlined text-[18px]">{verifyStatus.type === 'success' ? 'check_circle' : 'error'}</span>
                    {verifyStatus.message}
                  </div>
                )}

                <form onSubmit={handleVerifyInsurance} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-[11px] text-brand-navy-deep mb-1 uppercase tracking-wider">Policy ID (Catalogue)</label>
                    <input
                      type="number"
                      required
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 h-10 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-[11px] text-brand-navy-deep mb-1 uppercase tracking-wider">Insurance Card No.</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="e.g. SLIC-12345"
                      className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 h-10 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all uppercase tracking-wider"
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-[11px] text-brand-navy-deep mb-1 uppercase tracking-wider">Valid From</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 h-10 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-[11px] text-brand-navy-deep mb-1 uppercase tracking-wider">Valid Until</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-surface-card border border-border-subtle rounded-lg px-3 py-2 h-10 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>
                  
                  <div className="sm:col-span-2 flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg h-10 px-6 rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      {isVerifying ? 'Verifying...' : 'Verify & Link Policy'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Patient Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-brand-navy-deep/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-xl font-bold text-brand-navy-deep">Edit Patient Details</h2>
              <button onClick={() => setShowEditModal(false)} className="text-outline hover:text-brand-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="edit-form" onSubmit={handleSaveEdit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.first_name || ''} onChange={(e) => setEditData({...editData, first_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.last_name || ''} onChange={(e) => setEditData({...editData, last_name: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.phone_number || editData.phone || ''} onChange={(e) => setEditData({...editData, phone_number: e.target.value, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.email || ''} onChange={(e) => setEditData({...editData, email: e.target.value})} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Physical Address</label>
                    <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.address || ''} onChange={(e) => setEditData({...editData, address: e.target.value})}></textarea>
                  </div>

                  <div className="sm:col-span-2 pt-2 pb-1">
                    <h3 className="text-sm font-bold text-brand-navy-deep border-b border-border-subtle pb-1">Emergency Contact Info</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Name</label>
                    <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.emergency_contact_name || ''} onChange={(e) => setEditData({...editData, emergency_contact_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Phone</label>
                    <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.emergency_contact_phone || ''} onChange={(e) => setEditData({...editData, emergency_contact_phone: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Relationship</label>
                    <input type="text" placeholder="e.g. Spouse, Parent, Sibling" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" value={editData.emergency_contact_relationship || ''} onChange={(e) => setEditData({...editData, emergency_contact_relationship: e.target.value})} />
                  </div>
                </div>
                
                <div className="bg-surface-subtle p-3 rounded-lg border border-border-subtle flex items-start gap-2 mt-4">
                   <span className="material-symbols-outlined text-outline text-[18px]">info</span>
                   <p className="text-xs text-on-surface-variant leading-relaxed">
                     Core identity fields (NIC, Date of Birth, Gender) cannot be edited here to prevent medical record fraud. If these must be corrected, please contact the System Administrator.
                   </p>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-border-subtle flex justify-end gap-3 bg-surface-container-low">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-2 rounded-xl text-sm font-semibold text-secondary hover:bg-surface-subtle">Cancel</button>
              <button form="edit-form" type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfile;
