import React, { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { appointmentService } from '../../services/appointmentService';

export const BookAppointment: React.FC = () => {
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appointmentService.book({
        patient_id: Number(patientId),
        doctor_id: Number(doctorId),
        slot_id: Number(slotId),
      });
      setMessage('Appointment booked successfully!');
    } catch (err: any) {
      setMessage(err.message || 'Failed to book appointment.');
    }
  };

  return (
    <div className="py-6 max-w-4xl mx-auto">
      <PageHeader
        title="Book Appointment"
        subtitle="Schedule a consultation with an available doctor."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Book Appointment' }]}
      />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {message && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-sm">
            {message}
          </div>
        )}
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Patient ID *</label>
            <input
              type="number"
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Doctor ID *</label>
            <input
              type="number"
              required
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Slot ID *</label>
            <input
              type="number"
              required
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-700"
            />
          </div>
          <button
            type="submit"
            className="bg-teal-700 hover:bg-teal-800 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors"
          >
            Confirm Booking
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookAppointment;
