import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const DoctorConsultation: React.FC = () => {
  const [diagnosis, setDiagnosis] = useState(
    'Essential (primary) hypertension - Grade 1 / Post-Stent follow-up monitoring'
  );
  const [notes, setNotes] = useState(
    'Patient reports mild exertion-related fatigue. Blood pressure stabilized on current ACE inhibitor regimen (128/82 mmHg). 12-lead ECG confirms normal sinus rhythm with no ST-T segment anomalies. Advised low sodium dietary intake, 30-minute daily walking routine, and continuation of prescribed therapy.'
  );
  const [followUpWeek, setFollowUpWeek] = useState<string>('4');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsFinalized(true);
    }, 700);
  };

  return (
    <div className="max-w-content-max-width mx-auto flex flex-col gap-space-lg pb-space-3xl">
      {/* Breadcrumb & Patient Context Header */}
      <div className="flex flex-col gap-space-sm">
        <nav className="flex items-center gap-space-2xs font-label-md text-label-md text-secondary">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/dashboard">
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
          </Link>
          <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
          <span>My Work</span>
          <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
          <span className="text-brand-navy-deep font-semibold">Consultation</span>
        </nav>

        {/* Patient Header Card (Enlarged with structured, high-visibility clinical details) */}
        <div className="bg-surface-card rounded-2xl p-space-lg sm:p-space-xl border border-border-subtle shadow-sm flex flex-col gap-space-md">
          {/* Top Row: Patient Name, Queue Status, and Action Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm border-b border-border-subtle/70">
            <div className="flex flex-wrap items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg text-brand-navy-deep font-bold tracking-tight">
                Consultation — Priyantha Dharmasena
              </h1>
              {/* Queue Status Pill */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-scheduled-bg text-status-scheduled-text font-label-md text-label-md font-semibold border border-status-scheduled-bg">
                <span className="w-2 h-2 rounded-full bg-border-focus"></span>
                In Consultation Room 04
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-space-xs self-start lg:self-auto shrink-0">
              <button
                className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-card border border-border-subtle text-brand-navy-deep font-label-md text-label-md font-semibold shadow-xs hover:bg-surface-subtle transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">history</span>
                <span>Medical History</span>
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-card border border-border-subtle text-brand-navy-deep font-label-md text-label-md font-semibold shadow-xs hover:bg-surface-subtle transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">print</span>
                <span>Print Summary</span>
              </button>
            </div>
          </div>

          {/* Bottom Grid: Clear, High-Visibility Patient Detail Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-sm">
            {/* Tile 1: Patient ID */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Patient ID
              </span>
              <span className="font-mono-data text-mono-data font-bold text-primary text-base">
                PT-003420
              </span>
            </div>

            {/* Tile 2: Age & Gender */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Demographics
              </span>
              <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                48 yrs · Male
              </span>
            </div>

            {/* Tile 3: Blood Group */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Blood Group
              </span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-rose-500">bloodtype</span>
                <span className="font-headline-sm text-headline-sm text-brand-navy-deep font-bold">
                  B Rh+ (Positive)
                </span>
              </div>
            </div>

            {/* Tile 4: NIC */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                National ID (NIC)
              </span>
              <span className="font-mono-data text-mono-data font-bold text-brand-navy-deep text-base">
                782410928V
              </span>
            </div>

            {/* Tile 5: Visit Type */}
            <div className="p-space-sm rounded-xl bg-surface-subtle border border-border-subtle/70 flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">
                Encounter Type
              </span>
              <span className="font-label-md text-label-md font-semibold text-primary">
                Follow-up Cardiology
              </span>
            </div>
          </div>

          {/* Critical Allergy Alert Bar - Highlighted & Prominent */}
          <div className="p-space-sm sm:px-space-md sm:py-2.5 rounded-xl bg-status-cancelled-bg border border-status-cancelled-bg flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-status-cancelled-text text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px] font-bold">warning</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-label-sm text-label-sm font-bold text-status-cancelled-text uppercase tracking-wider">
                  ALLERGIES RECORDED:
                </span>
                <span className="font-headline-sm text-headline-sm font-bold text-brand-navy-deep">
                  Penicillin & Beta-Lactam Antibiotics (Severe Hypersensitivity)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-white/90 text-status-cancelled-text font-label-sm text-label-sm font-bold border border-status-cancelled-bg shrink-0">
              Contraindicated: Avoid Amoxicillin / Ampicillin
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Notes & Diagnosis */}
      <section className="bg-surface-card rounded-xl p-space-md sm:p-space-lg border border-border-subtle shadow-xs flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
              1
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-brand-navy-deep leading-snug">Notes & Diagnosis</h2>
              <p className="font-body-sm text-body-sm text-secondary leading-normal">
                Record clinical examination findings, symptoms, and primary ICD-10 diagnosis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-status-completed-text font-body-sm text-body-sm font-medium self-start sm:self-auto">
            <span className="material-symbols-outlined text-[16px]">cloud_done</span>
            <span>Autosaved 1 min ago</span>
          </div>
        </div>

        {/* Diagnosis Search Field */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <label className="font-label-sm text-label-sm text-brand-navy-deep uppercase tracking-wider" htmlFor="diagnosis-input">
              Primary Clinical Diagnosis <span className="text-status-cancelled-text">*</span>
            </label>
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">ICD-10 Categorized</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-24 rounded-lg bg-surface-subtle border border-border-subtle text-brand-navy-deep font-body-md text-body-md focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
              id="diagnosis-input"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Search ICD-10 code or enter diagnosis..."
              type="text"
            />
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-status-scheduled-bg text-status-scheduled-text font-mono-data text-mono-data font-bold">
                I10.9
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Quick Suggestions:</span>
            <button
              onClick={() => setDiagnosis('I10 (Essential HTN)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors"
              type="button"
            >
              I10 (Essential HTN)
            </button>
            <button
              onClick={() => setDiagnosis('Z95.55 (Coronary Stent)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors"
              type="button"
            >
              Z95.55 (Coronary Stent)
            </button>
            <button
              onClick={() => setDiagnosis('E78.5 (Dyslipidemia)')}
              className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors"
              type="button"
            >
              E78.5 (Dyslipidemia)
            </button>
          </div>
        </div>

        {/* Notes Area */}
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <label className="font-label-sm text-label-sm text-brand-navy-deep uppercase tracking-wider" htmlFor="consultation-notes">
              Doctor's Examination & Clinical Notes <span className="text-status-cancelled-text">*</span>
            </label>
            <span className="font-body-sm text-body-sm text-secondary">Markdown & Speech-to-text enabled</span>
          </div>
          <div className="rounded-lg border border-border-subtle overflow-hidden bg-surface-subtle focus-within:ring-2 focus-within:ring-border-focus focus-within:bg-surface-card transition-all">
            <div className="flex items-center justify-between px-3 py-2 bg-surface-subtle border-b border-border-subtle">
              <div className="flex items-center gap-1 text-secondary">
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Bold" type="button">
                  <span className="material-symbols-outlined text-[18px]">format_bold</span>
                </button>
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Italic" type="button">
                  <span className="material-symbols-outlined text-[18px]">format_italic</span>
                </button>
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Bullet List" type="button">
                  <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                </button>
                <div className="h-4 w-[1px] bg-border-subtle mx-1"></div>
                <button className="p-1 rounded hover:bg-surface-card hover:text-brand-navy-deep transition-colors" title="Insert Template" type="button">
                  <span className="material-symbols-outlined text-[18px]">post_add</span>
                </button>
              </div>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-primary font-label-sm text-label-sm font-semibold hover:bg-status-scheduled-bg transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>Voice Dictate</span>
              </button>
            </div>
            <textarea
              className="w-full p-3.5 bg-transparent font-body-md text-body-md text-brand-navy-deep focus:outline-none resize-y leading-relaxed"
              id="consultation-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter clinical observations, vitals assessment, progression, and directives..."
            />
          </div>
          <div className="flex items-center justify-between font-body-sm text-body-sm text-secondary pt-1">
            <span className="inline-flex items-center gap-1.5 text-status-completed-text font-medium">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Autosaved · Valid clinical documentation requirements satisfied
            </span>
            <span className="text-secondary font-mono-data">{notes.length} characters</span>
          </div>
        </div>
      </section>

      {/* Section 2: Treatments & Clinical Orders */}
      <section className="bg-surface-card rounded-xl p-space-md sm:p-space-lg border border-border-subtle shadow-xs flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-border-subtle pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
              2
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-brand-navy-deep leading-snug">Treatments & Clinical Orders</h2>
              <p className="font-body-sm text-body-sm text-secondary leading-normal">
                Prescribe investigations, procedural diagnostics, and orders from Treatment Catalogue
              </p>
            </div>
          </div>
          <Link
            to="/treatment-catalogue"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-status-scheduled-bg text-status-scheduled-text font-label-md text-label-md font-semibold hover:bg-sky-100 transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span>Browse Full Catalogue</span>
          </Link>
        </div>

        {/* Quick Add Search */}
        <div className="flex flex-col gap-space-xs">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary">
              <span className="material-symbols-outlined text-[18px]">add_circle_outline</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-surface-subtle border border-border-subtle text-brand-navy-deep font-body-md text-body-md focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
              placeholder="Search clinical order by name, code, or department..."
              type="text"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm font-bold text-secondary uppercase tracking-wider">Quick-Add Orders:</span>
            <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors" type="button">
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>2D Echo (Transthoracic)</span>
            </button>
            <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors" type="button">
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Lipid Profile Full Panel</span>
            </button>
            <button className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-subtle hover:bg-status-scheduled-bg hover:text-status-scheduled-text text-brand-navy-deep font-label-md text-label-md border border-border-subtle transition-colors" type="button">
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Serum Electrolytes</span>
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-subtle text-secondary font-label-sm text-label-sm uppercase tracking-wider border-b border-border-subtle h-10">
                <th className="pl-4 pr-3">Treatment / Procedure Name</th>
                <th className="px-3">Department</th>
                <th className="px-3">Clinical Indication / Notes</th>
                <th className="px-3 text-center">Quantity / Frequency</th>
                <th className="px-3 text-center">Status</th>
                <th className="pr-4 pl-2 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-surface-card font-body-sm text-body-sm">
              <tr className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 pl-4 pr-3">
                  <div className="font-semibold text-brand-navy-deep leading-tight font-headline-sm text-headline-sm">Cardiology Specialist Consultation</div>
                  <div className="font-mono-data text-mono-data text-secondary mt-0.5">Code: SRV-CRD-01</div>
                </td>
                <td className="px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm font-medium bg-surface-subtle text-secondary">OPD Unit</span>
                </td>
                <td className="px-3 text-secondary">Routine follow-up post-stent placement</td>
                <td className="px-3 text-center font-medium text-brand-navy-deep">1 Session</td>
                <td className="px-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-scheduled-bg text-status-scheduled-text">
                    In Progress
                  </span>
                </td>
                <td className="pr-4 pl-2 text-center">
                  <button className="text-secondary hover:text-status-cancelled-text p-1 rounded hover:bg-status-cancelled-bg/50 transition-colors" title="Remove Item" type="button">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 pl-4 pr-3">
                  <div className="font-semibold text-brand-navy-deep leading-tight font-headline-sm text-headline-sm">12-Lead Electrocardiogram (ECG)</div>
                  <div className="font-mono-data text-mono-data text-secondary mt-0.5">Code: SRV-DIA-04</div>
                </td>
                <td className="px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm font-medium bg-status-scheduled-bg text-status-scheduled-text">Cardiology Diagnostics</span>
                </td>
                <td className="px-3 text-secondary">Evaluate baseline rhythm and conduction</td>
                <td className="px-3 text-center font-medium text-brand-navy-deep">1 Test</td>
                <td className="px-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-completed-bg text-status-completed-text">
                    Completed
                  </span>
                </td>
                <td className="pr-4 pl-2 text-center">
                  <button className="text-secondary hover:text-status-cancelled-text p-1 rounded hover:bg-status-cancelled-bg/50 transition-colors" title="Remove Item" type="button">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-3 pl-4 pr-3">
                  <div className="font-semibold text-brand-navy-deep leading-tight font-headline-sm text-headline-sm">Blood Glucose Random (RBS)</div>
                  <div className="font-mono-data text-mono-data text-secondary mt-0.5">Code: SRV-LAB-12</div>
                </td>
                <td className="px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm font-medium bg-status-pending-bg text-status-pending-text">Central Lab</span>
                </td>
                <td className="px-3 text-secondary">Check glycemic control on existing medication</td>
                <td className="px-3 text-center font-medium text-brand-navy-deep">1 Stat Test</td>
                <td className="px-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold bg-status-pending-bg text-status-pending-text">
                    Sample Collected
                  </span>
                </td>
                <td className="pr-4 pl-2 text-center">
                  <button className="text-secondary hover:text-status-cancelled-text p-1 rounded hover:bg-status-cancelled-bg/50 transition-colors" title="Remove Item" type="button">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Action Bar / Consultation Finalization */}
      <section className="bg-surface-card rounded-xl p-space-md sm:p-space-lg border border-border-subtle shadow-xs flex flex-col gap-space-md">
        {/* Follow-up directive control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-border-subtle">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-primary">event_repeat</span>
            <div>
              <span className="font-label-md text-label-md font-bold text-brand-navy-deep block">Recommended Follow-up Schedule</span>
              <span className="font-body-sm text-body-sm text-secondary">Auto-prompts reception desk during patient discharge</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            {['1', '2', '4', '8', 'None'].map((wk) => (
              <button
                key={wk}
                type="button"
                onClick={() => setFollowUpWeek(wk)}
                className={`px-3 py-1 rounded-lg font-label-sm text-label-sm font-semibold transition-all ${followUpWeek === wk
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-subtle text-secondary hover:text-brand-navy-deep hover:bg-surface-variant'
                  }`}
              >
                {wk === 'None' ? 'No Follow-up' : `${wk} Weeks`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-status-completed-text text-[20px]">verified</span>
              <span className="font-body-sm text-body-sm text-brand-navy-deep font-semibold">
                Consultation notes saved · Automatically generates billing invoice for Reception desk
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-secondary font-body-sm text-body-sm pl-7">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>SLMC Compliant Electronic Health Record</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm self-end lg:self-auto">
            <button
              className="h-10 px-4 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">print</span>
              <span>Print Clinical Summary</span>
            </button>
            <button
              className="h-10 px-4 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">save</span>
              <span>Save Draft</span>
            </button>
            <button
              onClick={handleComplete}
              disabled={isLoading || isFinalized}
              className={`h-10 px-6 rounded-lg font-label-lg text-label-lg font-bold inline-flex items-center gap-2 shadow-xs transition-all transform active:scale-[0.99] ${isFinalized
                ? 'bg-status-completed-bg text-status-completed-text border border-status-completed-text/30'
                : 'bg-primary hover:bg-primary-container text-on-primary'
                }`}
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>Finalizing Encounter...</span>
                </>
              ) : isFinalized ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <span>Consultation Completed!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>Complete Consultation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
