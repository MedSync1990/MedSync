import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createStaff, updateStaff } from '../../api';
import { get } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/Modal';

export const AddStaff: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);

  // Data options
  const [roles, setRoles] = useState<{role_id: number, role_name: string}[]>([]);
  const [specialties, setSpecialties] = useState<{specialty_id: number, name: string}[]>([]);

  // Form State
  const [fFirst, setFFirst] = useState('');
  const [fMid, setFMid] = useState('');
  const [fLast, setFLast] = useState('');
  const [fNic, setFNic] = useState('');
  const [fDob, setFDob] = useState('');
  const [fGender, setFGender] = useState('');
  const [fAddr, setFAddr] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fRole, setFRole] = useState('');
  const [fPhones, setFPhones] = useState<string[]>(['']);
  
  // Doctor specific fields
  const [fLicense, setFLicense] = useState('');
  const [fSpecialty, setFSpecialty] = useState('');

  // Bank Account fields
  const [fBankAccounts, setFBankAccounts] = useState([{ bank_name: '', account_number: '', bank_branch: '' }]);

  const [saving, setSaving] = useState(false);
  const [credsModal, setCredsModal] = useState<{username: string, tempPw: string, name: string} | null>(null);

  useEffect(() => {
    get<{role_id: number, role_name: string}[]>('/auth/roles').then(setRoles).catch(() => {});
    get<{specialty_id: number, name: string}[]>('/specialties').then(setSpecialties).catch(() => {});
  }, []);

  const handleAddPhone = () => {
    if (fPhones.length < 3) setFPhones([...fPhones, '']);
    else showToast('Up to 3 phone numbers per person', 'info');
  };
  const handleRemovePhone = (idx: number) => setFPhones(fPhones.filter((_, i) => i !== idx));

  const handleAddBankAccount = () => {
    setFBankAccounts([...fBankAccounts, { bank_name: '', account_number: '', bank_branch: '' }]);
  };
  const handleRemoveBankAccount = (idx: number) => setFBankAccounts(fBankAccounts.filter((_, i) => i !== idx));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ph = fPhones.map(p => p.trim()).filter(Boolean);
    if (!ph.length) { showToast('At least one phone number is required.', 'error'); return; }
    
    const selectedRole = roles.find(r => r.role_id === Number(fRole));
    if (!selectedRole && !isEditMode) { showToast('Please select a valid role.', 'error'); return; }

    if (!isEditMode && selectedRole?.role_name === 'Doctor' && (!fLicense.trim() || !fSpecialty)) {
      showToast('Doctors must have a specialty and a medical license number.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && editId) {
        await updateStaff(Number(editId), {
          first_name: fFirst.trim(),
          last_name: fLast.trim(),
          address: fAddr.trim(),
          email: fEmail.trim() || undefined,
          phone_number: ph[0]
        });
        showToast('Staff details updated successfully', 'success');
      } else {
        const validBankAccounts = fBankAccounts.filter(acc => acc.bank_name.trim() && acc.account_number.trim()).map(acc => ({
          bank_name: acc.bank_name.trim(),
          account_number: acc.account_number.trim(),
          bank_branch: acc.bank_branch.trim(),
        }));

        const payload = {
          role_id: Number(fRole),
          branch_id: user?.branchId || 1,
          first_name: fFirst.trim(),
          middle_name: fMid.trim() || undefined,
          last_name: fLast.trim(),
          id_number: fNic.trim(),
          address: fAddr.trim(),
          birthdate: fDob,
          gender: fGender,
          email: fEmail.trim() || undefined,
          phone_number: ph[0],
          specialty: selectedRole?.role_name === 'Doctor' ? fSpecialty : undefined,
          license_number: selectedRole?.role_name === 'Doctor' ? fLicense.trim() : undefined,
          bank_accounts: validBankAccounts.length > 0 ? validBankAccounts : undefined,
        };
        const res = await createStaff(payload);
        setCredsModal({ username: res.username, tempPw: res.temporary_password, name: `${fFirst} ${fLast}` });
        resetForm();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create staff account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFFirst(''); setFMid(''); setFLast(''); setFNic(''); setFDob('');
    setFGender(''); setFAddr(''); setFEmail(''); setFRole('');
    setFPhones(['']); setFLicense(''); setFSpecialty('');
    setFBankAccounts([{ bank_name: '', account_number: '', bank_branch: '' }]);
  };

  const copyPw = () => {
    if (credsModal && navigator.clipboard) {
      navigator.clipboard.writeText(credsModal.tempPw).then(() => showToast('Password copied!', 'success'));
    }
  };

  return (
    <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">
            <Link to="/admin/staff" className="inline-flex items-center gap-1 text-primary hover:underline font-bold">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Manage Staff
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight font-bold">
              {isEditMode ? 'Update Staff Member' : 'Add Staff Member'}
            </h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {isEditMode
              ? 'Update personal and contact information for this staff member.'
              : 'Add a new staff account and generate login credentials.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-space-xl">
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-2 border-b border-surface-subtle">
            <div className="flex items-start sm:items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">1</div>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Personal Details</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Basic identification details</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">First Name <span className="text-error font-bold">*</span></label>
              <input required value={fFirst} onChange={e=>setFFirst(e.target.value)} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" placeholder="e.g., John" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">Middle Name</label>
              <input value={fMid} onChange={e=>setFMid(e.target.value)} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">Last Name <span className="text-error font-bold">*</span></label>
              <input required value={fLast} onChange={e=>setFLast(e.target.value)} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" placeholder="e.g., Doe" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">NIC {!isEditMode && <span className="text-error font-bold">*</span>}</label>
              <input required={!isEditMode} value={fNic} onChange={e=>setFNic(e.target.value.toUpperCase())} placeholder="199071400234 or 925430188V" className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">Date of Birth <span className="text-error font-bold">*</span></label>
              <input type="date" required disabled={isEditMode} value={fDob} onChange={e=>setFDob(e.target.value)} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">Gender <span className="text-error font-bold">*</span></label>
              <select required disabled={isEditMode} value={fGender} onChange={e=>setFGender(e.target.value)} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-2 border-b border-surface-subtle">
            <div className="flex items-start sm:items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">2</div>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Contact Information</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Address and communication details</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg pt-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">Address <span className="text-error font-bold">*</span></label>
              <textarea required value={fAddr} onChange={e=>setFAddr(e.target.value)} rows={2} className="w-full p-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus resize-none" placeholder="Street, city" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-lg text-label-lg text-brand-navy-deep">Phone Numbers <span className="text-error font-bold">*</span></label>
                <button type="button" onClick={handleAddPhone} className="text-label-md text-primary flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-[16px]">add</span>Add number
                </button>
              </div>
              <div className="space-y-2">
                {fPhones.map((p, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input required value={p} onChange={e=>{const t=[...fPhones];t[idx]=e.target.value.replace(/\D/g,'');setFPhones(t)}} maxLength={10} placeholder="0771234567" className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono" />
                    {fPhones.length > 1 && <button type="button" onClick={()=>handleRemovePhone(idx)} className="w-[42px] h-[42px] rounded-lg bg-surface-subtle hover:bg-error-container text-error flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[18px]">close</span></button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">Email Address</label>
              <input type="email" value={fEmail} onChange={e=>setFEmail(e.target.value)} placeholder="name@medsync.lk" className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" />
            </div>
          </div>
        </div>

        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-2 border-b border-surface-subtle">
            <div className="flex items-start sm:items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">3</div>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Account Setup</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">System access and clinical details</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-lg text-label-lg text-brand-navy-deep">Role <span className="text-error font-bold">*</span></label>
              <select required disabled={isEditMode} value={fRole} onChange={e=>setFRole(e.target.value)} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus">
                <option value="">Select a role</option>
                {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant p-3 bg-surface-subtle rounded-lg border border-border-subtle md:col-span-1 h-[42px] mt-[28px]">
              <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
              <span>Branch: <strong>{user?.branchName || 'Assigned Branch'}</strong></span>
            </div>
            {roles.find(r => r.role_id === Number(fRole))?.role_name === 'Doctor' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-lg text-label-lg text-brand-navy-deep">Medical License Number <span className="text-error font-bold">*</span></label>
                  <input required disabled={isEditMode} value={fLicense} onChange={e=>setFLicense(e.target.value)} placeholder="e.g. SLMC-12345" className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-lg text-label-lg text-brand-navy-deep">Primary Specialty <span className="text-error font-bold">*</span></label>
                  <select required disabled={isEditMode} value={fSpecialty} onChange={e=>setFSpecialty(e.target.value)} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus">
                    <option value="">Select a specialty</option>
                    {specialties.map(s => <option key={s.specialty_id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bank Account Details */}
        <div className="bg-surface-card rounded-xl shadow-sm p-space-lg sm:p-space-xl space-y-space-lg relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-2 border-b border-surface-subtle">
            <div className="flex items-start sm:items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shrink-0">4</div>
              <div>
                <h2 className="font-headline-md text-headline-md text-brand-navy-deep leading-tight">Bank Account Details <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-secondary-container font-label-sm text-label-sm font-semibold">Optional</span></h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Used for direct payroll and doctor payments</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddBankAccount}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-subtle text-primary font-label-md text-label-md transition-all shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_card</span>
              <span>Add Another Account</span>
            </button>
          </div>
          <div className="space-y-4 pt-2">
            {fBankAccounts.map((acc, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-space-lg items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-lg text-label-lg text-brand-navy-deep">Bank Name</label>
                  <input value={acc.bank_name} onChange={e=>{const t=[...fBankAccounts];t[idx].bank_name=e.target.value;setFBankAccounts(t)}} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" placeholder="e.g., Commercial Bank" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-lg text-label-lg text-brand-navy-deep">Account Number</label>
                  <input value={acc.account_number} onChange={e=>{const t=[...fBankAccounts];t[idx].account_number=e.target.value;setFBankAccounts(t)}} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono" placeholder="e.g., 812345678" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-lg text-label-lg text-brand-navy-deep">Bank Branch</label>
                  <input value={acc.bank_branch} onChange={e=>{const t=[...fBankAccounts];t[idx].bank_branch=e.target.value;setFBankAccounts(t)}} className="w-full h-[42px] px-3.5 rounded-lg bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus" placeholder="e.g., Colombo 03" />
                </div>
                {fBankAccounts.length > 1 && (
                  <button type="button" onClick={()=>handleRemoveBankAccount(idx)} className="h-[42px] px-3 rounded-lg bg-surface-subtle hover:bg-error-container text-error flex items-center justify-center shrink-0 mb-[2px]">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-card rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-outline text-[18px]">info</span>
            <span><strong className="text-error">*</strong> Required fields for creating a staff account.</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button type="button" onClick={() => navigate('/admin/staff')} className="h-[42px] px-5 rounded-lg border border-outline-variant bg-transparent hover:bg-surface-subtle text-brand-navy-deep font-label-lg text-label-lg transition-all cursor-pointer flex items-center justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="h-[42px] px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-60">
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">
                {isEditMode ? 'save' : 'person_add'}
              </span>
              <span>
                {saving
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                  ? 'Update Account'
                  : 'Create Account'}
              </span>
            </button>
          </div>
        </div>
      </form>

      <Modal isOpen={!!credsModal} onClose={() => setCredsModal(null)} title="Account Created Successfully" footer={
        <>
          <button onClick={copyPw} className="h-10 px-space-md rounded-xl text-label-md bg-surface-subtle hover:bg-surface-container text-brand-navy-deep font-bold flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">content_copy</span>Copy Details
          </button>
          <button onClick={() => setCredsModal(null)} className="h-10 px-space-md rounded-xl text-label-md bg-primary hover:bg-brand-navy-deep text-on-primary shadow-sm font-bold transition-colors">
            Done
          </button>
        </>
      }>
        <div className="space-y-space-md">
          <p className="text-body-md text-on-surface-variant">The staff account for <strong>{credsModal?.name}</strong> has been created. Please share these credentials securely.</p>
          <div className="p-space-md bg-surface-subtle rounded-xl space-y-3 font-mono text-body-md border border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-sans">Username:</span>
              <span className="font-bold">{credsModal?.username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-sans">Temporary Password:</span>
              <span className="font-bold">{credsModal?.tempPw}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-status-pending-bg text-status-pending-text rounded-xl text-body-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
            <p>The user will be required to change this password upon their first sign-in.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AddStaff;
