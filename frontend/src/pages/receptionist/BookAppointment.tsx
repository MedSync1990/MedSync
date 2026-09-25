import React, { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { appointmentService } from '../../services/appointmentService';

export const BookAppointment: React.FC = () => {
  const [patientId, setPatientId] = useState('PT-003420');
  const [doctorId, setDoctorId] = useState('1');
  const [slotId, setSlotId] = useState('3');
  const [appointmentCategory, setAppointmentCategory] = useState<'consultation' | 'walkin'>('consultation');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>('Cardiology');
  
  const [message, setMessage] = useState<string | null>(null);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appointmentService.book({
        patient_id: 1, // Mock
        doctor_id: 1, // Mock
        slot_id: 3, // Mock
      });
      setMessage('Appointment booked successfully!');
    } catch (err: any) {
      setMessage(err.message || 'Failed to book appointment.');
    }
  };

  return (
    <div className="py-space-lg lg:py-space-xl max-w-content-max-width mx-auto w-full space-y-space-xl px-space-md lg:px-space-xl">
      <PageHeader
        title="Book an Appointment"
        subtitle="Schedule a consultation with an available doctor in real time."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Appointments' }, { label: 'Book an Appointment' }]}
      />

      {message && (
        <div className="p-4 bg-status-completed-bg text-status-completed-text rounded-lg border border-status-completed-text/20 font-label-md">
          {message}
        </div>
      )}

      {/* Booking Flow Container (Steps 1 to 4) */}
      <div className="space-y-space-lg">
        
        {/* STEP 1: FIND PATIENT */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">1</span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Find Patient</h2>
                <p className="font-body-sm text-body-sm text-outline">Select registered patient records or onboard a new patient</p>
              </div>
            </div>
            <a className="flex items-center gap-1.5 font-label-md text-label-md text-primary hover:text-primary-container transition-colors font-semibold self-start sm:self-auto" href="/patients/register">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Register New Patient</span>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-space-sm">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input 
                className="w-full h-[42px] pl-10 pr-4 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all" 
                placeholder="Search by NIC, Patient Name, or ID..." 
                type="text" 
                defaultValue="762271890V (Priyantha Dharmasena)"
              />
            </div>
            <button className="w-full sm:w-auto h-[42px] px-space-lg bg-surface-subtle hover:bg-border-subtle border border-border-subtle text-brand-navy-deep font-label-md text-label-md rounded-lg flex items-center justify-center gap-1.5 transition-all" type="button">
              <span className="material-symbols-outlined text-[18px]">manage_search</span>
              <span>Lookup</span>
            </button>
          </div>

          <div className="rounded-xl border border-primary/20 bg-surface-container-low/40 p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-full bg-status-scheduled-bg text-status-scheduled-text flex items-center justify-center font-headline-md text-headline-md font-bold tracking-wider">
                PD
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Priyantha Dharmasena</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-card border border-border-subtle font-mono-data text-[11px] text-secondary">PT-003420</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-completed-text"></span>
                    SLIC Insured
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body-sm text-body-sm text-secondary">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-outline">cake</span>Aug 14, 1976 (48 yrs)</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-outline">male</span>Male</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-outline">call</span>077 123 4567</span>
                </div>
              </div>
            </div>
            <button className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-card border border-border-subtle hover:bg-surface-subtle font-label-sm text-label-sm text-secondary hover:text-brand-navy-deep transition-all self-start md:self-auto" type="button">
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              <span>⇄ Change Patient</span>
            </button>
          </div>
        </div>

        {/* STEP 2: APPOINTMENT CATEGORY */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">2</span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Appointment Category</h2>
                <p className="font-body-sm text-body-sm text-outline">Define the workflow profile and queue handling logic</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-surface-subtle font-label-sm text-label-sm text-secondary self-start sm:self-auto">
              Standard Protocol
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <label className={`relative flex flex-col p-space-md rounded-xl cursor-pointer shadow-sm transition-all ${appointmentCategory === 'consultation' ? 'border-2 border-primary bg-status-scheduled-bg/30' : 'border border-border-subtle bg-surface-card hover:bg-surface-subtle/50'}`}>
              <input type="radio" name="appointment_category" className="sr-only" checked={appointmentCategory === 'consultation'} onChange={() => setAppointmentCategory('consultation')} />
              <div className="flex items-center justify-between mb-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${appointmentCategory === 'consultation' ? 'bg-primary text-on-primary' : 'bg-surface-subtle text-secondary'}`}>
                  <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                </span>
                {appointmentCategory === 'consultation' ? (
                  <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-outline"></span>
                )}
              </div>
              <span className="font-headline-sm text-headline-sm text-brand-navy-deep">Doctor Consultation</span>
              <span className="font-body-sm text-body-sm text-secondary mt-1">Scheduled specialized clinical visit</span>
            </label>

            <label className={`relative flex flex-col p-space-md rounded-xl cursor-pointer shadow-sm transition-all ${appointmentCategory === 'walkin' ? 'border-2 border-primary bg-status-scheduled-bg/30' : 'border border-border-subtle bg-surface-card hover:bg-surface-subtle/50'}`}>
              <input type="radio" name="appointment_category" className="sr-only" checked={appointmentCategory === 'walkin'} onChange={() => setAppointmentCategory('walkin')} />
              <div className="flex items-center justify-between mb-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${appointmentCategory === 'walkin' ? 'bg-primary text-on-primary' : 'bg-surface-subtle text-secondary'}`}>
                  <span className="material-symbols-outlined text-[20px]">directions_walk</span>
                </span>
                {appointmentCategory === 'walkin' ? (
                  <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-outline"></span>
                )}
              </div>
              <span className="font-headline-sm text-headline-sm text-brand-navy-deep">Walk-in</span>
              <span className="font-body-sm text-body-sm text-secondary mt-1">Immediate triaged OPD queue</span>
            </label>
          </div>
        </div>

        {/* STEP 3: DOCTOR & SPECIALTY SELECTION */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">3</span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Doctor & Specialty Selection</h2>
                <p className="font-body-sm text-body-sm text-outline">Search doctor directly or browse specialists by clinical department</p>
              </div>
            </div>
            <div className="inline-flex rounded-lg bg-surface-subtle p-1 border border-border-subtle self-start sm:self-auto">
              <button className="px-3 py-1 rounded-md bg-surface-card text-brand-navy-deep font-label-sm text-label-sm shadow-sm font-semibold" type="button">Search Doctor Directly</button>
              <button className="px-3 py-1 rounded-md text-outline hover:text-brand-navy-deep font-label-sm text-label-sm transition-colors" type="button">Browse by Specialty</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-space-sm">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">person_search</span>
              <input 
                className="w-full h-[42px] pl-10 pr-4 rounded-lg bg-surface border border-border-subtle font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus" 
                placeholder="Search by doctor name..." 
                type="text" 
                defaultValue="Dr. Anura Bandara"
              />
            </div>
            <button className="w-full sm:w-auto h-[42px] px-space-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md rounded-lg flex items-center justify-center gap-1.5 transition-all" type="button">
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>Search</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Clinical Departments</label>
            <div className="flex flex-wrap items-center gap-2">
              {['Cardiology', 'General Med', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology'].map(dept => (
                <button 
                  key={dept}
                  onClick={() => setSelectedSpecialty(dept)}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors flex items-center gap-1 ${selectedSpecialty === dept ? 'bg-status-scheduled-bg border border-brand-teal-light/40 text-status-scheduled-text font-semibold' : 'bg-surface border border-border-subtle text-secondary hover:text-brand-navy-deep'}`}
                  type="button"
                >
                  <span>{dept}</span>
                  {selectedSpecialty === dept && <span className="material-symbols-outlined text-[14px]">check</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-space-xs text-secondary font-label-md text-label-md">
            <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-medium">Available {selectedSpecialty} Doctors (3 doctors found)</span>
            <span className="font-body-sm text-body-sm text-outline">Select a doctor & slot to assign</span>
          </div>

          <div className="space-y-space-md">
            {/* DOCTOR 1 */}
            <div className={`rounded-xl p-space-md lg:p-space-lg shadow-sm space-y-space-md relative transition-all ${doctorId === '1' ? 'border-2 border-primary bg-surface-card' : 'border border-border-subtle bg-surface-card hover:border-border-focus/40'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm border-b border-border-subtle">
                <div className="flex items-center gap-space-md">
                  <img className={`w-14 h-14 rounded-full object-cover border border-border-subtle ${doctorId === '1' ? 'ring-2 ring-primary/20' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAN6jdsIhB_dG8Xi1_BLx_Ei7-tDFJau1Yw9elHfdeXGT3L5mwff2LlsWNV9IU0C33ESCE2FuPxMJxaLkzIiBYT47oqLtEOoJjkWNCXNy78ykxh7xCjxF-qLOf4SVg1Bw6HXWRfIxfMFtAoz2LOHwTaRgcp0UyGv5DvDsFOIXLgWFg9Eea7QGbWJKc9nV1097wO2wPzEC1ZMqxl4_gLcuLPtNc8nw14EQ22XtneLgB2Ma9oAlqMOFLtkw" alt="Dr" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Dr. Anura Bandara</h3>
                      {doctorId === '1' && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-semibold">Direct Match</span>}
                      <span className="px-2 py-0.5 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-[11px] font-semibold">On Duty</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-secondary">Consultant Cardiologist · MBBS, MD, FRCP</p>
                    <div className="flex items-center gap-3 font-body-sm text-body-sm text-outline">
                      <span className="text-amber-500 font-semibold flex items-center gap-0.5"><span className="material-symbols-outlined text-[16px] fill-amber-500">star</span>4.9 (142 reviews)</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-secondary"><span className="material-symbols-outlined text-[16px]">meeting_room</span>Room 204</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between lg:justify-end gap-space-lg self-stretch lg:self-auto">
                  <div className="text-left lg:text-right">
                    <span className="font-label-sm text-label-sm text-outline uppercase block">Consultation Fee</span>
                    <span className="font-headline-md text-headline-md text-brand-navy-deep font-bold">LKR 3,500</span>
                  </div>
                  {doctorId === '1' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Selected</span>
                    </div>
                  ) : (
                    <button onClick={() => setDoctorId('1')} className="px-3.5 py-1.5 rounded-lg border border-border-subtle hover:bg-surface-subtle font-label-sm text-label-sm text-secondary font-semibold transition-colors" type="button">Select Doctor</button>
                  )}
                </div>
              </div>
              {doctorId === '1' && (
                <div className="space-y-space-sm pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="font-label-sm text-label-sm text-brand-navy-deep min-w-[130px] font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">today</span>
                      Today · Thu, Sep 3:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['09:00 AM', '09:30 AM', '10:00 AM', '11:15 AM', '02:30 PM'].map(time => (
                        <button 
                          key={time}
                          onClick={() => setSlotId(time)}
                          className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all ${slotId === time ? 'bg-primary text-on-primary font-semibold shadow-sm flex items-center gap-1' : 'bg-surface border border-border-subtle text-secondary hover:border-primary'}`} 
                          type="button"
                        >
                          <span>{time}</span>
                          {slotId === time && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DOCTOR 2 */}
            <div className={`rounded-xl p-space-md lg:p-space-lg shadow-sm space-y-space-md relative transition-all ${doctorId === '2' ? 'border-2 border-primary bg-surface-card' : 'border border-border-subtle bg-surface-card hover:border-border-focus/40'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm border-b border-border-subtle">
                <div className="flex items-center gap-space-md">
                  <img className={`w-14 h-14 rounded-full object-cover border border-border-subtle ${doctorId === '2' ? 'ring-2 ring-primary/20' : ''}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUEOmnQjMM6PHNuUrcdXi7FEEN0ZcRMzAhTNWMopRWKuPBfNd5rLRLxoZfU1XByj4Twpi_orqmRj_BDA6MbHLpfnp8Fb7eHfBTB8xabaQXGWQeMF_722zH8jnoOorgcbty8aqWnLWyxO6AG7zqp-nzLFWZMk8IXF7E9bimThzqzO8fWX8HKGQOXPUwLgob1hQzX4o9LIR9houq0l0bFw1u2r-puTg-DkCjDRRFqHr9ZTDiL98szhQifw" alt="Dr" />
                  <div className="space-y-1">
                    <h3 className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Dr. Malini Senanayake</h3>
                    <p className="font-body-sm text-body-sm text-secondary">Senior Cardiologist · MBBS, MRCP (UK)</p>
                    <div className="flex items-center gap-3 font-body-sm text-body-sm text-outline">
                      <span className="text-amber-500 font-semibold flex items-center gap-0.5"><span className="material-symbols-outlined text-[16px] fill-amber-500">star</span>4.8 (98 reviews)</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-secondary"><span className="material-symbols-outlined text-[16px]">meeting_room</span>Room 208</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between lg:justify-end gap-space-lg self-stretch lg:self-auto">
                  <div className="text-left lg:text-right">
                    <span className="font-label-sm text-label-sm text-outline uppercase block">Consultation Fee</span>
                    <span className="font-headline-md text-headline-md text-brand-navy-deep font-bold">LKR 3,800</span>
                  </div>
                  {doctorId === '2' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Selected</span>
                    </div>
                  ) : (
                    <button onClick={() => setDoctorId('2')} className="px-3.5 py-1.5 rounded-lg border border-border-subtle hover:bg-surface-subtle font-label-sm text-label-sm text-secondary font-semibold transition-colors" type="button">Select Doctor</button>
                  )}
                </div>
              </div>
              {doctorId === '2' && (
                <div className="space-y-space-sm pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="font-label-sm text-label-sm text-brand-navy-deep min-w-[130px] font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">today</span>
                      Today · Thu, Sep 3:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['10:30 AM', '11:00 AM', '03:00 PM', '04:15 PM'].map(time => (
                        <button 
                          key={time}
                          onClick={() => setSlotId(time)}
                          className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all ${slotId === time ? 'bg-primary text-on-primary font-semibold shadow-sm flex items-center gap-1' : 'bg-surface border border-border-subtle text-secondary hover:border-primary'}`} 
                          type="button"
                        >
                          <span>{time}</span>
                          {slotId === time && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 4: CONFIRM BOOKING SUMMARY */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-space-lg lg:p-space-xl shadow-sm space-y-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-7 h-7 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">4</span>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Step 4: Confirm Booking Summary</h2>
                <p className="font-body-sm text-body-sm text-outline">Review consultation and billing details before final issuance</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-status-completed-bg text-status-completed-text font-label-sm text-label-sm font-semibold flex items-center gap-1.5 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-status-completed-text"></span>
              Ready to Confirm
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Patient Details</span>
                <span className="material-symbols-outlined text-[18px] text-primary">person</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Priyantha Dharmasena</p>
                <p className="font-mono-data text-mono-data text-secondary">PT-003420</p>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <p>48 yrs, Male</p>
                <p>077 123 4567</p>
                <p className="text-status-completed-text font-semibold flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-completed-text"></span>
                  SLIC Insured
                </p>
              </div>
            </div>

            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Doctor & Specialty</span>
                <span className="material-symbols-outlined text-[18px] text-primary">medical_services</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Dr. Anura Bandara</p>
                <p className="font-body-sm text-body-sm text-secondary">Cardiology Department</p>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <p className="font-semibold text-brand-navy-deep">Room 204</p>
                <p>OPD Special Clinic Wing</p>
              </div>
            </div>

            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Date & Time Slot</span>
                <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Thursday, Sep 3, 2026</p>
                <p className="font-label-lg text-label-lg text-primary font-bold">{slotId || '09:30 AM'} (Slot #03)</p>
              </div>
              <div className="pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <span className="inline-flex items-center gap-1 text-status-scheduled-text font-medium">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  Estimated Wait: &lt; 10 mins
                </span>
              </div>
            </div>

            <div className="p-space-md rounded-xl bg-surface border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Facility & Policy</span>
                <span className="material-symbols-outlined text-[18px] text-primary">local_hospital</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-brand-navy-deep font-semibold">Colombo Central Branch</p>
                <p className="font-body-sm text-body-sm text-secondary">Cardiology OPD Wing</p>
              </div>
              <div className="pt-1 border-t border-border-subtle font-body-sm text-body-sm text-secondary">
                <p className="text-[11px] leading-snug text-outline">
                  Cardiology OPD slots operate strictly on a 15-minute grace window.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-surface-subtle p-space-md border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body-md text-body-md text-secondary">
              <span>Consultation Fee: <strong className="text-brand-navy-deep">LKR 3,500.00</strong></span>
              <span className="text-outline">|</span>
              <span>Hospital Charge: <strong className="text-brand-navy-deep">LKR 0.00</strong></span>
              <span className="text-outline">|</span>
              <span>Net Payable: <strong className="text-primary font-bold">LKR 3,500.00</strong></span>
            </div>
            <div className="font-label-sm text-label-sm text-secondary bg-surface-card px-2.5 py-1 rounded-md border border-border-subtle self-start md:self-auto">
              Payment Mode: <strong className="text-brand-navy-deep font-semibold">Pay at Cashier Desk</strong>
            </div>
          </div>

          <div className="rounded-lg bg-status-scheduled-bg/40 border border-brand-teal-light/30 p-space-sm flex items-center gap-space-sm text-status-scheduled-text">
            <span className="material-symbols-outlined text-[20px] text-primary">sms</span>
            <span className="font-body-sm text-body-sm">
              A confirmation SMS with e-Token <strong>#C-204-03</strong> will be automatically sent to patient's mobile <strong>077 123 4567</strong>.
            </span>
          </div>

          <div className="pt-space-md border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div className="flex items-center gap-2 font-mono-data text-mono-data text-secondary">
              <span className="material-symbols-outlined text-[18px] text-outline">receipt</span>
              <span>Billing & Payment Breakdown: <strong>OPD-DIR-2026-904</strong></span>
            </div>
            <div className="flex items-center gap-space-sm justify-end">
              <button className="h-[42px] px-space-lg rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-secondary hover:text-brand-navy-deep font-label-md text-label-md transition-all" type="button">
                Cancel & Reset Form
              </button>
              <button onClick={handleBook} className="h-[42px] px-space-xl rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm flex items-center gap-2 transition-all" type="button">
                <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookAppointment;
