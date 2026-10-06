import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useToast } from '../context/ToastContext';
import { patientService } from '../services/patientService';
import type { Gender } from '../api/types';

export interface CompleteRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    patient_id: number;
    first_name: string;
    last_name: string;
    id_number?: string;
    phone_number?: string;
    gender?: string;
    date_of_birth?: string;
    address?: string;
  } | null;
  onSuccess?: () => void;
}

export const CompleteRegistrationModal: React.FC<CompleteRegistrationModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    address: '',
    gender: 'Male' as Gender,
    date_of_birth: '',
    phone_number: '',
  });

  useEffect(() => {
    if (patient) {
      setForm({
        first_name: patient.first_name || '',
        last_name: patient.last_name === '(Walk-in Patient)' ? '' : patient.last_name || '',
        id_number: patient.id_number?.startsWith('999') ? '' : patient.id_number || '',
        address: patient.address === 'Address Pending' ? '' : patient.address || '',
        gender: (patient.gender as Gender) || 'Male',
        date_of_birth: patient.date_of_birth && patient.date_of_birth !== '1995-01-01' ? patient.date_of_birth : '',
        phone_number: patient.phone_number || '',
      });
    }
  }, [patient]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      showToast('First Name and Last Name are required.', 'error');
      return;
    }
    if (!form.id_number.trim()) {
      showToast('Valid NIC or Passport Number is required for full registration.', 'error');
      return;
    }
    if (!form.address.trim()) {
      showToast('Physical Address is required for full registration.', 'error');
      return;
    }

    setLoading(true);
    try {
      await patientService.update(patient.patient_id, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        id_number: form.id_number.trim().toUpperCase(),
        address: form.address.trim(),
        gender: form.gender,
        birthdate: form.date_of_birth || undefined,
        phone_number: form.phone_number.trim() || undefined,
      });

      showToast(`Full registration completed for ${form.first_name} ${form.last_name}!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to complete registration', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Patient Registration"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-space-md h-[42px] font-label-lg text-label-lg font-bold text-on-surface-variant bg-surface-card hover:bg-surface-subtle border border-border-subtle rounded-lg shadow-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="complete-registration-form"
            disabled={loading}
            className="px-space-md h-[42px] font-label-lg text-label-lg font-bold rounded-lg shadow-sm transition-all bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Save Full Registration</span>
              </>
            )}
          </button>
        </>
      }
    >
      <form id="complete-registration-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-body-sm flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">bolt</span>
          <div>
            <span className="font-bold">Converting Walk-in Profile:</span> Please fill in the patient's official NIC/Passport and residential address to upgrade this account to a fully registered patient.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-label-sm font-semibold text-brand-navy-deep mb-1">
              First Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full h-[40px] px-3 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-brand-navy-deep mb-1">
              Last Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="e.g. Perera"
              className="w-full h-[40px] px-3 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus"
            />
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-brand-navy-deep mb-1">
            NIC or Passport Number <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            value={form.id_number}
            onChange={(e) => setForm({ ...form, id_number: e.target.value })}
            placeholder="e.g. 199012345678 or 921400293V"
            className="w-full h-[40px] px-3 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus font-mono-data"
          />
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-brand-navy-deep mb-1">
            Residential Address <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="e.g. 123 Main Street, Colombo 03"
            className="w-full h-[40px] px-3 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-label-sm font-semibold text-brand-navy-deep mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
              className="w-full h-[40px] px-3 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-brand-navy-deep mb-1">Date of Birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className="w-full h-[40px] px-3 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-brand-navy-deep mb-1">Phone Number</label>
            <input
              type="tel"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              placeholder="e.g. 0771234567"
              className="w-full h-[40px] px-3 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
