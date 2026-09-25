import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import type { AllergyItem } from '../../types';

type Gender = 'Male' | 'Female';

interface SecondaryPhone {
  number: string;
  type: string;
}

export const RegisterPatient: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);

  // Form states matching register_patient.html
  const [fullName, setFullName] = useState(editId ? '' : 'Priyantha Dharmasena');
  const [nicNumber, setNicNumber] = useState(editId ? '' : '198821400293');
  const [dateOfBirth, setDateOfBirth] = useState(editId ? '' : '1988-04-12');
  const [gender, setGender] = useState<Gender>('Male');
  const [bloodGroup, setBloodGroup] = useState(editId ? '' : 'A+');
  const [emailAddress, setEmailAddress] = useState(editId ? '' : 'priyantha.dharmasena@outlook.com');
  const [streetAddress, setStreetAddress] = useState(editId ? '' : 'No. 54/2, Dharmapala Mawatha');
  const [cityDistrict, setCityDistrict] = useState(editId ? '' : 'Colombo 07');

  // Allergy states
  const [masterAllergies, setMasterAllergies] = useState<AllergyItem[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<number[]>([]);
  const [loadingEditData, setLoadingEditData] = useState<boolean>(false);

  // Phone numbers
  const [primaryPhone, setPrimaryPhone] = useState('077 482 9104');
  const [primaryPhoneType, setPrimaryPhoneType] = useState('mobile');
  const [secondaryPhones, setSecondaryPhones] = useState<SecondaryPhone[]>([]);

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('Anoma Dharmasena');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('077 129 4811');
  const [showAlternateContact, setShowAlternateContact] = useState(false);
  const [altContactName, setAltContactName] = useState('');
  const [altRelation, setAltRelation] = useState('');
  const [altPhone, setAltPhone] = useState('');

  // Insurance
  const [insuranceEnabled, setInsuranceEnabled] = useState(true);
  const [insuranceProvider, setInsuranceProvider] = useState('SLIC');
  const [policyNumber, setPolicyNumber] = useState('POL-SLIC-8491024');
  const [policyStartDate, setPolicyStartDate] = useState('2023-01-01');
  const [policyEndDate, setPolicyEndDate] = useState('2025-12-31');
  const [corporateAffiliation, setCorporateAffiliation] = useState('Hayleys Group PLC');

  // Submission / feedback state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; name: string; nic: string } | null>(null);

  // Load master allergies catalogue
  useEffect(() => {
    patientService
      .getAllergies()
      .then((al) => {
        if (Array.isArray(al)) setMasterAllergies(al);
      })
      .catch(() => {});
  }, []);

  // If in edit mode, fetch patient profile and populate fields
  useEffect(() => {
    if (!editId) return;
    setLoadingEditData(true);
    patientService
      .getById(editId)
      .then((p) => {
        if (p) {
          setFullName(`${p.first_name || ''} ${p.last_name || ''}`.trim());
          setNicNumber(p.id_number || '');
          setDateOfBirth(p.date_of_birth || '');
          setGender((p.gender as Gender) || 'Male');
          setBloodGroup(p.blood_group || '');
          setEmailAddress(p.email || '');
          setStreetAddress(p.address || '');
          setCityDistrict('');
          setPrimaryPhone(p.phone_number || '');
          setEmergencyName(p.contact_name || '');
          setEmergencyPhone(p.emergency_contact || '');
          if (p.allergies && Array.isArray(p.allergies)) {
            setSelectedAllergies(p.allergies.map((a) => a.allergy_id));
          }
        }
      })
      .catch(() => {
        setError('Failed to load patient profile for editing.');
      })
      .finally(() => {
        setLoadingEditData(false);
      });
  }, [editId]);

  // Age calculation badge
  const age = useMemo(() => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    if (
      today.getMonth() < dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
    ) {
      years -= 1;
    }
    return years >= 0 && !isNaN(years) ? years : null;
  }, [dateOfBirth]);

  // NIC validation check
  const isValidNic = useMemo(() => {
    return /^([0-9]{9}[VvXx]|[0-9]{12})$/.test(nicNumber.trim());
  }, [nicNumber]);

  const addSecondaryPhone = () => {
    setSecondaryPhones((prev) => [...prev, { number: '', type: 'alternate' }]);
  };

  const removeSecondaryPhone = (index: number) => {
    setSecondaryPhones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSecondaryPhone = (index: number, field: keyof SecondaryPhone, value: string) => {
    setSecondaryPhones((prev) =>
      prev.map((phone, i) => (i === index ? { ...phone, [field]: value } : phone))
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    // Split Full Name into first_name and last_name for backend compatibility
    const trimmedName = fullName.trim();
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'Patient';

    const allPhones = [primaryPhone, ...secondaryPhones.map((p) => p.number)]
      .map((p) => p.replace(/\D/g, ''))
      .filter(Boolean);

    try {
      if (isEditMode && editId) {
        const response = await patientService.update(editId, {
          first_name: firstName,
          last_name: lastName,
          address: cityDistrict ? `${streetAddress}, ${cityDistrict}` : streetAddress,
          birthdate: dateOfBirth,
          gender: gender,
          email: emailAddress || null,
          phone_number: primaryPhone.replace(/\D/g, ''),
          blood_group: bloodGroup || null,
          emergency_contact: emergencyPhone.replace(/\D/g, ''),
          contact_name: emergencyName,
          allergy_ids: selectedAllergies,
        });

        setSuccess({
          id: response.patient_code || editId,
          name: `${response.first_name} ${response.last_name}`,
          nic: response.id_number,
        });
      } else {
        const response = (await patientService.create({
          first_name: firstName,
          middle_name: null,
          last_name: lastName,
          id_number: nicNumber.trim().toUpperCase(),
          address: cityDistrict ? `${streetAddress}, ${cityDistrict}` : streetAddress,
          birthdate: dateOfBirth,
          gender: gender,
          email: emailAddress || null,
          phone_numbers: allPhones,
          blood_group: bloodGroup || null,
          emergency_contact: emergencyPhone.replace(/\D/g, ''),
          contact_name: emergencyName,
          registered_branch: 1,
          allergy_ids: selectedAllergies,
          insurance:
            insuranceEnabled && policyNumber
              ? {
                  provider_name: insuranceProvider,
                  insurance_card_number: policyNumber,
                  start_date: policyStartDate || null,
                  end_date: policyEndDate || null,
                  corporate_affiliation: corporateAffiliation || null,
                }
              : null,
        })) as { patient_code?: string; patient_id?: number };

        const assignedId =
          response.patient_code ||
          (response.patient_id ? `MS-2025-${String(response.patient_id).padStart(5, '0')}` : 'MS-2025-08492');

        setSuccess({
          id: assignedId,
          name: trimmedName,
          nic: nicNumber.trim().toUpperCase(),
        });
      }
    } catch (err: any) {
      const message =
        err?.body?.errors?.[0]?.message ||
        err?.body?.message ||
        (err instanceof Error ? err.message : 'Failed to save patient profile');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-space-md sm:px-space-lg lg:px-space-xl py-space-lg space-y-space-xl">
      {/* Page header / breadcrumb */}
      <div className="flex flex-col gap-1 pb-space-xs">
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider"
        >
          <Link
            to="/receptionist/dashboard"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">home</span>
            <span>Home</span>
          </Link>
          <span className="text-outline/50">/</span>
          <Link to="/receptionist/patients" className="hover:text-primary transition-colors cursor-pointer">
            Patients
          </Link>
          <span className="text-outline/50">/</span>
          <span className="text-primary font-bold">
            {isEditMode ? 'Update Patient Profile' : 'Register Patient'}
          </span>
        </nav>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">
            {isEditMode ? 'Update Patient Profile' : 'Register Patient'}
          </h1>
          {isEditMode && editId && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono-data font-semibold">
              ID: {editId}
            </span>
          )}
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {isEditMode
            ? 'Update personal, contact, emergency, and allergy information for this patient record.'
            : 'Add a new patient record accessible across all island branches with centralized synchronization.'}
        </p>
      </div>

      {loadingEditData && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-space-lg py-3 text-primary font-label-md text-label-md flex items-center gap-2 animate-pulse">
          <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
          <span>Loading patient profile for editing...</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/20 bg-error-container px-space-lg py-3 text-error font-label-md text-label-md"
        >
          {error}
        </div>
      )}

      {/* Main Patient Registration Multi-section Form */}
      <form id="patientRegistrationForm" className="space-y-space-xl" onSubmit={handleSubmit}>
        {/* SECTION 1: Personal Details */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-2">
            <div className="flex items-start sm:items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">
                  Personal Details
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Basic identification and primary contact details for the patient
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase self-start sm:self-auto tracking-wider">
              Section 1 of 3
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg pt-2">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep flex items-center justify-between"
                htmlFor="fullName"
              >
                <span>
                  Full Name <span className="text-error font-bold">*</span>
                </span>
                <span className="font-body-sm text-body-sm text-outline font-normal">
                  Official documentation name
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  person
                </span>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g., Priyantha Dharmasena"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                />
              </div>
              <span className="font-body-sm text-body-sm text-outline">
                As stated on National Identity Card (NIC) or Sri Lankan Passport
              </span>
            </div>

            {/* NIC Number */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-lg text-label-lg text-brand-navy-deep"
                  htmlFor="nicNumber"
                >
                  National Identity Card (NIC) <span className="text-error font-bold">*</span>
                </label>
                <span className="font-label-sm text-[10px] bg-surface-container text-primary font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  SL Standard
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  badge
                </span>
                <input
                  id="nicNumber"
                  name="nicNumber"
                  type="text"
                  required
                  placeholder="198734201844 or 873421844V"
                  value={nicNumber}
                  onChange={(e) => setNicNumber(e.target.value.toUpperCase())}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-10 font-mono-data text-mono-data text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all uppercase tracking-wider"
                />
                {isValidNic && (
                  <span
                    className="material-symbols-outlined absolute right-3 text-status-completed-text text-[20px]"
                    title="Valid NIC format"
                  >
                    check_circle
                  </span>
                )}
              </div>
              {isValidNic ? (
                <span className="font-body-sm text-body-sm text-status-completed-text flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified</span> Valid 12-digit computerized NIC verified
                </span>
              ) : (
                <span className="font-body-sm text-body-sm text-outline">
                  12 digits or 9 digits followed by V/X
                </span>
              )}
            </div>

            {/* Date of Birth */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-lg text-label-lg text-brand-navy-deep"
                  htmlFor="dateOfBirth"
                >
                  Date of Birth <span className="text-error font-bold">*</span>
                </label>
                <span
                  id="calculatedAgeBadge"
                  className="font-label-sm text-[10px] bg-surface-container text-primary font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
                >
                  {age !== null ? `${age} yrs` : 'Age'}
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  calendar_today
                </span>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                />
              </div>
              <span className="font-body-sm text-body-sm text-outline">Format: MM / DD / YYYY</span>
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">
                Gender <span className="text-error font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 h-[42px] p-1 bg-surface-subtle rounded-lg">
                {(['Male', 'Female'] as Gender[]).map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center justify-center gap-1.5 rounded-md cursor-pointer text-center font-label-md text-label-md transition-all select-none ${
                      gender === opt
                        ? 'bg-surface-card text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={opt}
                      checked={gender === opt}
                      onChange={() => setGender(opt)}
                      className="sr-only"
                    />
                    <span className="material-symbols-outlined text-[16px]">
                      {opt === 'Male' ? 'male' : 'female'}
                    </span>
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <span className="font-body-sm text-body-sm text-outline">
                Used for demographic health reporting
              </span>
            </div>

            {/* Blood Group */}
            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep"
                htmlFor="bloodGroup"
              >
                Blood Group{' '}
                <span className="text-outline text-body-sm font-normal">(If known)</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-status-cancelled-text text-[20px] pointer-events-none">
                  water_drop
                </span>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-8 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select blood type</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 text-outline text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-outline">
                Useful for outpatient emergency intake
              </span>
            </div>

            {/* Known Allergies Multi-select */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-label-lg text-label-lg text-brand-navy-deep flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-status-cancelled-text text-[18px]">warning</span>
                  Known Allergies & Clinical Alerts
                </span>
                <span className="text-outline text-body-sm font-normal">Click chips to toggle</span>
              </label>
              <div className="p-3 bg-surface-subtle rounded-lg flex flex-wrap gap-2 min-h-[46px] items-center border border-border-subtle/60">
                {masterAllergies.length > 0 ? (
                  masterAllergies.map((alg) => {
                    const isSelected = selectedAllergies.includes(alg.allergy_id);
                    return (
                      <button
                        key={alg.allergy_id}
                        type="button"
                        onClick={() =>
                          setSelectedAllergies((prev) =>
                            prev.includes(alg.allergy_id)
                              ? prev.filter((id) => id !== alg.allergy_id)
                              : [...prev, alg.allergy_id]
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-status-cancelled-bg text-status-cancelled-text border border-status-cancelled-border shadow-xs'
                            : 'bg-surface-card text-on-surface-variant hover:bg-surface-subtle border border-border-subtle'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isSelected ? 'check_circle' : 'add_circle'}
                        </span>
                        <span>{alg.name}</span>
                        <span className="opacity-60 text-[10px]">({alg.allergy_code})</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-outline italic">Loading master allergies catalogue...</span>
                )}
              </div>
              <span className="font-body-sm text-body-sm text-outline">
                Selected allergies display as high-priority alert badges on doctor consultation and treatment screens.
              </span>
            </div>
          </div>

          {/* Patient Mobile Numbers Container */}
          <div className="p-space-md sm:p-space-lg rounded-xl bg-surface-container-low space-y-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">contact_phone</span>
                <div>
                  <span className="font-label-lg text-label-lg text-brand-navy-deep">
                    Patient Mobile Numbers
                  </span>
                  <span className="text-error font-bold">*</span>
                </div>
              </div>
              <button
                type="button"
                onClick={addSecondaryPhone}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-subtle text-primary font-label-md text-label-md transition-all shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_call</span>
                <span>Add Another Number</span>
              </button>
            </div>

            <div className="space-y-3" id="phoneNumbersContainer">
              {/* Primary Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-surface-card p-3 rounded-lg shadow-sm">
                <div className="sm:col-span-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-status-scheduled-bg text-status-scheduled-text font-label-sm text-label-sm uppercase font-bold tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">star</span> Primary
                  </span>
                  <span className="font-label-md text-label-md text-brand-navy-deep">
                    Primary Mobile <span className="text-error font-bold">*</span>
                  </span>
                </div>
                <div className="sm:col-span-4 relative flex items-center">
                  <span className="absolute left-3 font-mono-data text-mono-data font-semibold text-outline select-none">
                    +94
                  </span>
                  <input
                    name="primaryPhone"
                    type="tel"
                    required
                    placeholder="07X XXX XXXX"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full h-[40px] bg-surface-subtle focus:bg-surface-card rounded-md pl-12 pr-3 font-mono-data text-mono-data text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    name="primaryPhoneType"
                    value={primaryPhoneType}
                    onChange={(e) => setPrimaryPhoneType(e.target.value)}
                    className="w-full h-[40px] bg-surface-subtle focus:bg-surface-card rounded-md px-3 font-body-sm text-body-sm text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus cursor-pointer"
                  >
                    <option value="mobile">Personal Mobile</option>
                    <option value="whatsapp">WhatsApp Enabled</option>
                    <option value="work">Work Phone</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-center justify-end pr-1">
                  <span className="font-body-sm text-body-sm text-status-completed-text flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">notifications_active</span> Alerts Active
                  </span>
                </div>
              </div>

              {/* Secondary Phones */}
              {secondaryPhones.map((phone, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-surface-card p-3 rounded-lg shadow-sm"
                >
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-subtle text-on-surface-variant font-label-sm text-label-sm uppercase font-semibold">
                      Secondary
                    </span>
                    <span className="font-label-md text-label-md text-on-surface-variant">
                      Alternate Line
                    </span>
                  </div>
                  <div className="sm:col-span-4 relative flex items-center">
                    <span className="absolute left-3 font-mono-data text-mono-data font-semibold text-outline select-none">
                      +94
                    </span>
                    <input
                      type="tel"
                      placeholder="07X XXX XXXX"
                      value={phone.number}
                      onChange={(e) => updateSecondaryPhone(idx, 'number', e.target.value)}
                      className="w-full h-[40px] bg-surface-subtle focus:bg-surface-card rounded-md pl-12 pr-3 font-mono-data text-mono-data text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      value={phone.type}
                      onChange={(e) => updateSecondaryPhone(idx, 'type', e.target.value)}
                      className="w-full h-[40px] bg-surface-subtle focus:bg-surface-card rounded-md px-3 font-body-sm text-body-sm text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus cursor-pointer"
                    >
                      <option value="alternate">Alternate Mobile</option>
                      <option value="whatsapp">WhatsApp Enabled</option>
                      <option value="home">Home / Landline</option>
                      <option value="work">Office Phone</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => removeSecondaryPhone(idx)}
                      className="h-9 px-2.5 rounded-md text-status-cancelled-text hover:bg-status-cancelled-bg flex items-center gap-1 font-label-sm text-label-sm transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 pt-1">
              <span className="material-symbols-outlined text-outline text-[16px]">info</span>
              <span>Enter 10-digit mobile number(s).</span>
            </p>
          </div>

          {/* Email, Address, City */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep flex items-center justify-between"
                htmlFor="emailAddress"
              >
                <span>
                  Email Address <span className="text-error font-bold">*</span>
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  mail
                </span>
                <input
                  id="emailAddress"
                  name="emailAddress"
                  type="email"
                  required
                  placeholder="priyantha.d@gmail.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep"
                htmlFor="streetAddress"
              >
                Residential Address <span className="text-error font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  home_pin
                </span>
                <input
                  id="streetAddress"
                  name="streetAddress"
                  type="text"
                  required
                  placeholder="Street address line e.g., No. 42/B, Flower Road"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                />
              </div>
              <span className="font-body-sm text-body-sm text-outline">
                Permanent or primary current residential location
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep"
                htmlFor="cityDistrict"
              >
                City / District
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  location_city
                </span>
                <input
                  id="cityDistrict"
                  name="cityDistrict"
                  type="text"
                  placeholder="e.g., Colombo 07"
                  value={cityDistrict}
                  onChange={(e) => setCityDistrict(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Emergency Contact */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-2">
            <div className="flex items-start sm:items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">
                  Emergency Contact
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Primary person to reach in case of medical urgency, procedures, or surrogate consent
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase self-start sm:self-auto tracking-wider">
              Section 2 of 3
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pt-2">
            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep"
                htmlFor="emergencyName"
              >
                Contact Full Name <span className="text-error font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  support_agent
                </span>
                <input
                  id="emergencyName"
                  name="emergencyName"
                  type="text"
                  required
                  placeholder="e.g., Anoma Dharmasena"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                />
              </div>
              <span className="font-body-sm text-body-sm text-outline">Primary point of legal contact</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep"
                htmlFor="emergencyRelation"
              >
                Relationship <span className="text-error font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                  diversity_1
                </span>
                <select
                  id="emergencyRelation"
                  name="emergencyRelation"
                  required
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-8 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select relationship</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Parent">Parent / Mother / Father</option>
                  <option value="Child">Son / Daughter</option>
                  <option value="Sibling">Brother / Sister</option>
                  <option value="Guardian">Legal Guardian</option>
                  <option value="Friend">Relative / Friend</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 text-outline text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-outline">Kinship status with patient</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-lg text-label-lg text-brand-navy-deep"
                htmlFor="emergencyPhone"
              >
                Emergency Phone Number <span className="text-error font-bold">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-mono-data text-mono-data font-semibold text-outline select-none">
                  +94
                </span>
                <input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  type="tel"
                  required
                  placeholder="07X XXX XXXX"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-12 pr-4 font-mono-data text-mono-data text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                />
              </div>
              <span className="font-body-sm text-body-sm text-outline">Direct 24/7 reachable contact</span>
            </div>
          </div>

          <div className="pt-2" id="alternateContactSection">
            {!showAlternateContact ? (
              <div
                className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle"
                id="altContactCollapsed"
              >
                <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px]">person_add_alt</span>
                  <span>Need to record a secondary or workplace contact?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlternateContact(true)}
                  className="text-primary hover:text-primary-container font-label-md text-label-md flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Alternate Emergency Contact</span>
                </button>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-space-lg p-space-md rounded-xl bg-surface-container-low mt-3"
                id="altContactFields"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-lg text-label-lg text-brand-navy-deep">
                    Alternate Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bandula Dharmasena"
                    value={altContactName}
                    onChange={(e) => setAltContactName(e.target.value)}
                    className="w-full h-[42px] bg-surface-card rounded-lg px-3 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-lg text-label-lg text-brand-navy-deep">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Brother / Colleague"
                    value={altRelation}
                    onChange={(e) => setAltRelation(e.target.value)}
                    className="w-full h-[42px] bg-surface-card rounded-lg px-3 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-label-lg text-label-lg text-brand-navy-deep">Contact Number</label>
                    <button
                      type="button"
                      onClick={() => setShowAlternateContact(false)}
                      className="text-error font-label-sm text-label-sm hover:underline cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-mono-data text-mono-data text-outline font-semibold select-none">
                      +94
                    </span>
                    <input
                      type="tel"
                      placeholder="07X XXX XXXX"
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      className="w-full h-[42px] bg-surface-card rounded-lg pl-12 pr-3 font-mono-data text-mono-data text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Health Insurance */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-3">
            <div className="flex items-start sm:items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">
                    Health Insurance
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-highest text-on-secondary-container font-label-sm text-label-sm font-semibold">
                    Optional
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Corporate or private medical insurance policy for direct OPD / admission billing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-surface-subtle px-3.5 py-2 rounded-xl self-start sm:self-auto">
              <span className="font-label-md text-label-md text-brand-navy-deep">
                Add insurance details now
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="insuranceToggle"
                  type="checkbox"
                  checked={insuranceEnabled}
                  onChange={(e) => setInsuranceEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-border-focus"></div>
              </label>
            </div>
          </div>

          {insuranceEnabled && (
            <div className="space-y-space-lg" id="insuranceFieldsContainer">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg pt-2">
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label
                    className="font-label-lg text-label-lg text-brand-navy-deep"
                    htmlFor="insuranceProvider"
                  >
                    Insurance Provider <span className="text-error font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      qr_code_2
                    </span>
                    <select
                      id="insuranceProvider"
                      name="insuranceProvider"
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                      className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-8 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Insurer</option>
                      <option value="SLIC">Sri Lanka Insurance Corporation (SLIC)</option>
                      <option value="Ceylinco">Ceylinco Life General Insurance</option>
                      <option value="AIA">AIA Insurance Sri Lanka</option>
                      <option value="Union">Union Assurance PLC</option>
                      <option value="Softlogic">Softlogic Life Healthcare</option>
                      <option value="Allianz">Allianz Insurance Lanka</option>
                      <option value="Janashakthi">Janashakthi Insurance</option>
                      <option value="Amana">Amana Takaful</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 text-outline text-[18px] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-outline">
                    Partnered directly with CATMS cashless gateway
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label
                    className="font-label-lg text-label-lg text-brand-navy-deep"
                    htmlFor="policyNumber"
                  >
                    Policy / Member Number <span className="text-error font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      policy
                    </span>
                    <input
                      id="policyNumber"
                      name="policyNumber"
                      type="text"
                      placeholder="e.g., POL-SLIC-992014"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                      className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-mono-data text-mono-data text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all tracking-wider"
                    />
                  </div>
                  <span className="font-body-sm text-body-sm text-outline">
                    Refer to patient's corporate or individual card
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-lg text-label-lg text-brand-navy-deep"
                    htmlFor="policyStartDate"
                  >
                    Policy Effective Date
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      calendar_month
                    </span>
                    <input
                      id="policyStartDate"
                      name="policyStartDate"
                      type="date"
                      value={policyStartDate}
                      onChange={(e) => setPolicyStartDate(e.target.value)}
                      className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-lg text-label-lg text-brand-navy-deep"
                    htmlFor="policyEndDate"
                  >
                    Policy Expiration Date
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      event_busy
                    </span>
                    <input
                      id="policyEndDate"
                      name="policyEndDate"
                      type="date"
                      value={policyEndDate}
                      onChange={(e) => setPolicyEndDate(e.target.value)}
                      className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label
                    className="font-label-lg text-label-lg text-brand-navy-deep"
                    htmlFor="corporateAffiliation"
                  >
                    Corporate Employer / Scheme (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      apartment
                    </span>
                    <input
                      id="corporateAffiliation"
                      name="corporateAffiliation"
                      type="text"
                      placeholder="e.g. John Keells Holdings / Dialog Axiata"
                      value={corporateAffiliation}
                      onChange={(e) => setCorporateAffiliation(e.target.value)}
                      className="w-full h-[42px] bg-surface-subtle focus:bg-surface-card rounded-lg pl-11 pr-4 font-body-md text-body-md text-brand-navy-deep focus:outline-none focus:ring-2 focus:ring-border-focus transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-space-md rounded-xl bg-status-scheduled-bg text-status-scheduled-text">
                <span className="material-symbols-outlined text-[24px] text-primary shrink-0 mt-0.5">
                  verified_user
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-primary font-bold">
                    Instant e-Portal Verification Enabled
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Direct insurance claim verification is accessible right at the OPD reception billing counter. Once registered, patient eligibility and co-pay caps will synchronize automatically across all Sri Lankan partner branches.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-outline text-[18px]">info</span>
            <span>
              <strong className="text-error">*</strong> All fields marked with an asterisk are required for national healthcare file generation.
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-[42px] px-5 rounded-lg border border-outline-variant bg-transparent hover:bg-surface-subtle text-brand-navy-deep font-label-lg text-label-lg transition-all cursor-pointer flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-[42px] px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">
                {isEditMode ? 'save' : 'person_add'}
              </span>
              <span>
                {submitting
                  ? isEditMode
                    ? 'Updating Profile...'
                    : 'Registering...'
                  : isEditMode
                  ? 'Update Patient Record'
                  : 'Register Patient'}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* Success Confirmation Modal */}
      {success && (
        <div
          id="successModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy-deep/40 backdrop-blur-sm p-4"
        >
          <div className="bg-surface-card rounded-xl shadow-xl max-w-md w-full p-space-xl space-y-space-lg text-center">
            <div className="w-16 h-16 rounded-full bg-status-completed-bg text-status-completed-text flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[36px]">check</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-headline-md text-headline-md text-brand-navy-deep">
                {isEditMode ? 'Patient Profile Updated!' : 'Patient Registered Successfully!'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isEditMode
                  ? 'Medical record updated and changes synced across MedSync clinical nodes.'
                  : 'Medical record file generated and synced across MedSync clinical nodes.'}
              </p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-xl text-left space-y-2 font-body-sm text-body-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                <span className="text-outline">Assigned Patient ID:</span>
                <span className="font-mono-data text-mono-data font-bold text-primary">
                  {success.id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-outline">Patient:</span>
                <span className="font-label-md text-label-md text-brand-navy-deep" id="modalPatientName">
                  {success.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-outline">NIC:</span>
                <span className="font-mono-data text-mono-data text-brand-navy-deep">
                  {success.nic}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-outline">Branch Origin:</span>
                <span className="text-brand-navy-deep font-medium">Colombo Central (Desk 01)</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/receptionist/patients')}
                className="flex-1 h-[42px] rounded-lg border border-outline-variant bg-transparent hover:bg-surface-subtle text-brand-navy-deep font-label-md text-label-md transition-colors cursor-pointer"
              >
                Patient Directory
              </button>
              <button
                type="button"
                onClick={() => navigate('/receptionist/book-appointment')}
                className="flex-1 h-[42px] rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPatient;
