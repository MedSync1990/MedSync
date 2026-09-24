import React, { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { patientService } from '../../services/patientService';

export const RegisterPatient: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    birthdate: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await patientService.create(formData);
      setMessage('Patient registered successfully.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to register patient.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <PageHeader
        title="Register Patient"
        subtitle="Create a new permanent patient record."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Register Patient' }]}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {message && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-sm">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name *</label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name *</label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">National ID (NIC) *</label>
            <input
              type="text"
              required
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Birthdate *</label>
            <input
              type="date"
              required
              value={formData.birthdate}
              onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Address *</label>
            <textarea
              required
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors"
            >
              Register Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPatient;
