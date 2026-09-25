import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { patientService } from '../../services/patientService';
import { getPatientBalance, getPatientInsurance, verifyInsurance } from '../../api/billing';
import type { PatientResponse, PatientInsuranceItem } from '../../types';

export const PatientProfile: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<PatientResponse | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [insurancePolicies, setInsurancePolicies] = useState<PatientInsuranceItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        patientService.getById(id),
        getPatientBalance(id).catch(() => ({ outstanding_balance: 0 })),
        getPatientInsurance(id).catch(() => ({ data: [] })),
      ]);
      
      setPatient(patientRes);
      setBalance('outstanding_balance' in balanceRes ? balanceRes.outstanding_balance : 0);
      setInsurancePolicies(insuranceRes.data || []);
    } catch (error) {
      console.error('Failed to load patient data', error);
    } finally {
      setLoading(false);
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
    <div className="py-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title={`Patient Profile: ${patient.first_name} ${patient.last_name}`}
        subtitle="Manage patient details, billing, and insurance."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Patients', href: '/receptionist/patients' },
          { label: 'Profile' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Balance */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Patient Information</h3>
            <div className="space-y-3 text-sm">
              <p><span className="font-medium text-slate-500">ID:</span> {patient.patient_code}</p>
              <p><span className="font-medium text-slate-500">NIC:</span> {patient.id_number}</p>
              <p><span className="font-medium text-slate-500">Phone:</span> {patient.phone_number}</p>
              <p><span className="font-medium text-slate-500">DOB:</span> {patient.date_of_birth}</p>
              <p><span className="font-medium text-slate-500">Gender:</span> {patient.gender}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Account Balance</h3>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${balance && balance > 0 ? 'text-rose-600' : 'text-teal-600'}`}>
                LKR {balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-500 text-sm mb-1">outstanding</span>
            </div>
          </div>
        </div>

        {/* Right Column: Insurance Registration Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Health Insurance</h3>
            </div>
            
            <div className="p-6">
              {/* Active / Past Policies */}
              <h4 className="font-medium text-slate-700 mb-3">Linked Policies</h4>
              {insurancePolicies.length === 0 ? (
                <p className="text-sm text-slate-500 italic mb-6">No insurance policies linked to this patient.</p>
              ) : (
                <ul className="space-y-3 mb-6">
                  {insurancePolicies.map((pol) => (
                    <li key={pol.insurance_id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{pol.provider_name} - {pol.policy_name}</p>
                        <p className="text-xs text-slate-500">Card: {pol.insurance_card_number} • {pol.start_date} to {pol.end_date}</p>
                      </div>
                      <div>
                        {pol.is_active ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">Active</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold bg-slate-200 text-slate-600 rounded-full">Expired</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <hr className="my-6 border-slate-200" />

              {/* Verify & Link New Policy Form */}
              <h4 className="font-medium text-slate-700 mb-4">Register New Insurance Policy</h4>
              
              {verifyStatus && (
                <div className={`p-3 mb-4 rounded-lg text-sm ${verifyStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {verifyStatus.message}
                </div>
              )}

              <form onSubmit={handleVerifyInsurance} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Policy ID (Catalogue)</label>
                    <input
                      type="number"
                      required
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                    <p className="text-xs text-slate-500 mt-1">ID of policy in hospital catalogue</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Card Number</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="e.g. SLIC-12345"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify & Link Insurance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
