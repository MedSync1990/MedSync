import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, type Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { get } from '../../services/api';
import type { DoctorResponse } from '../../types';

export const ManageDoctors: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await get<DoctorResponse[]>('/doctors');
      setDoctors(res || []);
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<DoctorResponse>[] = [
    { key: 'full_name', header: 'Doctor Name' },
    { key: 'license_number', header: 'License #' },
    { key: 'branch_name', header: 'Branch' },
    {
      key: 'specialties',
      header: 'Specialties',
      render: (r) => (r.specialties || []).join(', ') || 'None',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (r) => <StatusBadge status={r.is_active ? 'Active' : 'Inactive'} />,
    },
  ];

  return (
    <div className="py-6 max-w-6xl mx-auto">
      <PageHeader
        title="Manage Doctors"
        subtitle="Manage doctor profiles, branches, and assigned medical specialties."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Manage Doctors' }]}
      />
      <DataTable
        columns={columns}
        data={doctors}
        keyExtractor={(r) => r.doctor_id}
        emptyMessage={loading ? 'Loading doctors...' : 'No doctors found.'}
      />
    </div>
  );
};

export default ManageDoctors;
