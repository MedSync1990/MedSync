import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { DataTable, type Column } from '../../components/DataTable';
import { patientService } from '../../services/patientService';
import type { PatientResponse } from '../../types';

export const PatientDirectory: React.FC = () => {
  const [patients, setPatients] = useState<PatientResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [search]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await patientService.list({ search });
      setPatients(res.data || []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<PatientResponse>[] = [
    { key: 'patient_code', header: 'Patient ID' },
    { key: 'first_name', header: 'Name', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'id_number', header: 'NIC' },
    { key: 'phone_number', header: 'Phone' },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <a href={`/receptionist/patients/${r.user_id}`} className="text-teal-600 hover:underline">
          View Profile
        </a>
      ),
    },
  ];

  return (
    <div className="py-6 max-w-6xl mx-auto">
      <PageHeader
        title="Patient Directory"
        subtitle="Search and view patient records."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Patient Directory' }]}
      />
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by NIC, name, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-teal-700"
        />
      </div>
      <DataTable
        columns={columns}
        data={patients}
        keyExtractor={(r) => r.user_id}
        emptyMessage={loading ? 'Loading patients...' : 'No patients found.'}
      />
    </div>
  );
};

export default PatientDirectory;
