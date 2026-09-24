import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { appointmentService } from '../../services/appointmentService';
import type { AppointmentResponse } from '../../types';

export const ManageAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentService.list();
      setAppointments(res.data || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<AppointmentResponse>[] = [
    { key: 'appointment_code', header: 'Appointment #' },
    { key: 'patient_name', header: 'Patient' },
    { key: 'doctor_name', header: 'Doctor' },
    { key: 'appointment_date', header: 'Date' },
    { key: 'start_time', header: 'Time' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="py-6 max-w-6xl mx-auto">
      <PageHeader
        title="Manage Appointments"
        subtitle="View, reschedule, or cancel scheduled appointments."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Manage Appointments' }]}
      />
      <DataTable
        columns={columns}
        data={appointments}
        keyExtractor={(r) => r.appointment_id}
        emptyMessage={loading ? 'Loading appointments...' : 'No appointments found.'}
      />
    </div>
  );
};

export default ManageAppointments;
