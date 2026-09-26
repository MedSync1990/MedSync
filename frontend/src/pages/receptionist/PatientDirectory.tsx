import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { patientService } from '../../services/patientService';
import type { PatientListItem } from '../../api/types';

export const PatientDirectory: React.FC = () => {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, [search, branchFilter, insuranceFilter]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await patientService.list({ search, branch: branchFilter, insurance: insuranceFilter });
      setPatients(res.data || []);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching patients:', e);
      setPatients([]);
      setLoading(false);
    }
  };

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff); 
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const columns: Column<PatientListItem>[] = [
    { 
      key: 'patient_code', 
      header: 'Patient ID',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface-container-low text-primary flex items-center justify-center font-mono-data text-label-sm font-semibold">
            {getInitials(r.first_name, r.last_name)}
          </div>
          <span className="font-mono-data text-mono-data font-semibold text-primary">{r.patient_code}</span>
        </div>
      )
    },
    { 
      key: 'first_name', 
      header: 'Patient Name', 
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-label-lg text-label-lg text-brand-navy-deep font-semibold group-hover:text-primary transition-colors">{r.first_name} {r.last_name}</span>
          <span className="font-body-sm text-body-sm text-outline mt-0.5">{calculateAge(r.date_of_birth)} yrs · {r.gender}</span>
        </div>
      ) 
    },
    { 
      key: 'id_number', 
      header: 'NIC Number',
      render: (r) => <span className="font-mono-data text-mono-data text-on-surface-variant">{r.id_number}</span>
    },
    { 
      key: 'phone_number', 
      header: 'Contact Phone',
      render: (r) => (
        <div className="flex items-center gap-1.5 font-body-md text-body-md text-on-surface">
          <span className="material-symbols-outlined text-[16px] text-outline">call</span>
          <span>{r.phone_number}</span>
        </div>
      )
    },
    {
      key: 'registered_branch',
      header: 'Registered Branch',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-canvas-bg text-on-surface-variant font-label-sm text-label-sm">
          <span className={`w-1.5 h-1.5 rounded-full ${r.registered_branch === 1 ? 'bg-primary' : 'bg-status-pending-text'}`}></span>
          {r.registered_branch === 1 ? 'Colombo Central' : 'Kandy General'}
        </span>
      )
    },
    {
      key: 'insurance',
      header: 'Insurance',
      render: (r) => (
        r.has_insurance ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[12px]">check</span> Insured
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-subtle text-outline font-label-sm text-label-sm">
            Self-Pay
          </span>
        )
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <button 
            onClick={() => navigate(`/receptionist/patients/${r.patient_code}`)}
            className="w-8 h-8 rounded-lg bg-surface-subtle text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center"
            title="View Profile"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
          </button>
          
          <button 
            onClick={() => navigate(`/receptionist/patients/${r.patient_code}#edit`)}
            className="w-8 h-8 rounded-lg bg-surface-subtle text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center justify-center"
            title="Edit Patient"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>

          <button 
            onClick={() => navigate(`/receptionist/book-appointment?patient_id=${r.patient_id}`)}
            className="px-2.5 h-8 rounded-lg bg-status-scheduled-bg text-status-scheduled-text hover:bg-primary hover:text-on-primary font-label-sm text-label-sm transition-all flex items-center gap-1 ml-1"
            title="Book Appointment"
          >
            <span className="material-symbols-outlined text-[15px]">event_available</span>
            <span>Book</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="py-6 px-space-md md:px-space-lg max-w-content-max-width mx-auto w-full space-y-space-lg">
      {/* Top Summary & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-1">
            <span className="font-headline-lg text-headline-lg text-brand-navy-deep tracking-tight">Patient Directory</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Search and manage patient records.</p>
        </div>
        
        <div className="flex items-center gap-space-md flex-wrap">
          <div className="flex items-center gap-space-sm bg-surface-card px-space-md py-2 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-brand-navy-deep leading-tight font-semibold">1,428</span>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Registered Patients</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/receptionist/register-patient')}
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-lg text-label-lg px-space-lg h-[42px] rounded-xl hover:bg-primary-container shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Quick Controls Bar */}
      <div className="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle flex flex-col gap-space-md relative overflow-hidden">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[24px] text-primary">search</span>
          <input
            type="text"
            placeholder="Search by NIC, name, or contact number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-28 bg-canvas-bg rounded-xl font-body-md text-body-md text-brand-navy-deep placeholder:text-outline focus:outline-none focus:bg-surface-card ring-1 ring-border-subtle focus:ring-2 focus:ring-border-focus transition-all shadow-inner"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button onClick={() => setSearch('')} className="w-7 h-7 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-outline hover:text-brand-navy-deep transition-colors">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
            <div className="h-5 w-px bg-border-subtle"></div>
            <span className="px-2 py-0.5 rounded bg-surface-card border border-border-subtle font-mono-data text-[11px] text-outline shadow-sm">ESC</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 flex-wrap">
          </div>

          <div className="flex items-center gap-space-xs flex-wrap">
             <div className="flex items-center bg-canvas-bg p-1 rounded-xl border border-border-subtle">
               <button onClick={() => setBranchFilter('all')} className={`px-3 py-1 rounded-lg font-label-md text-label-md transition-all ${branchFilter === 'all' ? 'bg-surface-card text-primary shadow-sm' : 'text-on-surface-variant hover:text-brand-navy-deep'}`}>All Branches</button>
               <button onClick={() => setBranchFilter('colombo')} className={`px-3 py-1 rounded-lg font-label-md text-label-md transition-all ${branchFilter === 'colombo' ? 'bg-surface-card text-primary shadow-sm' : 'text-on-surface-variant hover:text-brand-navy-deep'}`}>Colombo Central</button>
             </div>
             
             <div className="relative">
               <select 
                 value={insuranceFilter}
                 onChange={(e) => setInsuranceFilter(e.target.value)}
                 className="h-9 px-3 pr-8 bg-canvas-bg border border-border-subtle rounded-xl font-label-md text-label-md text-on-surface-variant appearance-none cursor-pointer focus:outline-none shadow-sm"
               >
                  <option value="all">Insurance: All</option>
                  <option value="yes">Insured Only</option>
                  <option value="no">Self-Pay Only</option>
               </select>
               <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">expand_more</span>
             </div>

             <button onClick={() => { setBranchFilter('all'); setInsuranceFilter('all'); }} className="w-9 h-9 rounded-xl bg-canvas-bg hover:bg-surface-subtle border border-border-subtle flex items-center justify-center text-outline hover:text-brand-navy-deep transition-colors shadow-sm" title="Clear Filters">
               <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
             </button>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden flex flex-col border border-border-subtle">
        <DataTable
          columns={columns}
          data={patients}
          keyExtractor={(r) => r.patient_id.toString()}
          emptyMessage={loading ? 'Loading patients...' : 'No matching patient records found.'}
        />
      </div>
    </div>
  );
};

export default PatientDirectory;
