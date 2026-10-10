import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getMyProfile, updateMyProfile, changePassword } from '../api/profile';
import type { UserProfileData, ProfileUpdatePayload, Gender } from '../api/types';

export const Profile: React.FC = () => {
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [changingPw, setChangingPw] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit form state
  const [formData, setFormData] = useState<ProfileUpdatePayload>({});

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyProfile();
      setProfile(data);
      populateFormData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const populateFormData = (data: UserProfileData) => {
    setFormData({
      first_name: data.first_name || '',
      middle_name: data.middle_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      phone_number: data.phone_number || '',
      birthdate: data.birthdate || '',
      gender: (data.gender as Gender) || undefined,
      marital_status: data.marital_status || '',
      address: data.address || '',
    });
  };

  const handleStartEdit = () => {
    if (profile) populateFormData(profile);
    setIsEditing(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    if (profile) populateFormData(profile);
    setIsEditing(false);
    setError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side phone number validation (database requires 10 digits)
    if (formData.phone_number && formData.phone_number.trim().length > 0) {
      const cleanedPhone = formData.phone_number.trim();
      if (!/^[0-9]{10}$/.test(cleanedPhone)) {
        setError('Phone number must contain exactly 10 digits (e.g. 0771234567).');
        return;
      }
    }

    // Client-side email validation
    if (formData.email && formData.email.trim().length > 0) {
      const cleanedEmail = formData.email.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanedEmail)) {
        setError('Please enter a valid email address (e.g. user@example.com).');
        return;
      }
    }

    setSaving(true);

    try {
      const updated = await updateMyProfile(formData);
      setProfile(updated);
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');

      // Sync top bar greeting name
      if (user) {
        setUser({
          ...user,
          firstName: updated.first_name || '',
          lastName: updated.last_name || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('New password and confirm password do not match.');
      return;
    }

    setChangingPw(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="p-space-lg max-w-content-max-width mx-auto w-full text-center py-16">
        <span className="material-symbols-outlined text-[40px] text-primary animate-spin">progress_activity</span>
        <p className="font-body-md text-secondary mt-3">Loading profile details...</p>
      </div>
    );
  }

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username;

  const dashboardPath = user?.role === 'Administrator'
    ? '/admin/dashboard'
    : user?.role === 'Branch Manager'
      ? '/branch-manager/dashboard'
      : user?.role === 'Doctor'
        ? '/doctor/dashboard'
        : '/receptionist/dashboard';

  const breadcrumbs = [
    { label: 'Home', to: dashboardPath },
    { label: 'System' },
    { label: 'Profile' },
  ];

  return (
    <div className="p-space-lg md:p-space-xl max-w-content-max-width mx-auto w-full space-y-space-lg">
      {/* Breadcrumbs */}
      <div>
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Header Banner */}
      <div className="bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display-lg text-display-lg font-bold text-brand-navy-deep">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 font-body-sm text-secondary">
              <span className="inline-flex items-center gap-1 bg-surface-subtle border border-border-subtle px-2.5 py-0.5 rounded-full text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-[14px]">badge</span>
                {profile?.role}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
                {profile?.role === 'Administrator' ? 'All Branches Scope' : profile?.branch_name || 'Assigned Branch'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 bg-surface-subtle p-1.5 rounded-xl border border-border-subtle w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-label-md font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-white text-primary shadow-xs' : 'text-secondary hover:text-slate-900'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            Profile Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-label-md font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'security' ? 'bg-white text-primary shadow-xs' : 'text-secondary hover:text-slate-900'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            Security & Password
          </button>
        </div>
      </div>

      {/* Global Toast / Alerts */}
      {successMsg && (
        <div role="status" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="font-body-md font-medium">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">error</span>
            <span className="font-body-md font-medium">{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* TAB 1: PROFILE DETAILS */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div>
                <h2 className="font-headline-md text-headline-md text-slate-900 font-bold">Personal & Contact Information</h2>
                <p className="text-body-sm text-secondary">Manage your personal identification, communication, and demographics.</p>
              </div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-xl text-label-md font-semibold flex items-center gap-2 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="px-4 py-2 border border-border-subtle bg-white text-secondary hover:bg-surface-subtle rounded-xl text-label-md font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-xl text-label-md font-semibold flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Read-Only Identity Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-subtle border border-border-subtle">
              <div>
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Username</span>
                <span className="font-headline-sm text-headline-sm text-slate-900 font-bold mt-1 block">{profile?.username}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">System Role</span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold mt-1 block">{profile?.role}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">NIC / Identity No.</span>
                <span className="font-headline-sm text-headline-sm text-slate-900 font-bold mt-1 block">{profile?.id_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Assigned Branch</span>
                <span className="font-headline-sm text-headline-sm text-slate-900 font-bold mt-1 block">{profile?.branch_name || 'All Branches'}</span>
              </div>
            </div>

            {/* Editable Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">First Name *</label>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.first_name || '—'}</p>
                )}
              </div>

              {/* Middle Name */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Middle Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.middle_name || ''}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.middle_name || '—'}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Last Name *</label>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.last_name || '—'}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.email || '—'}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    placeholder="0771234567"
                    value={formData.phone_number || ''}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.phone_number || '—'}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.birthdate || ''}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.birthdate || '—'}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Gender</label>
                {isEditing ? (
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: (e.target.value as Gender) || undefined })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.gender || '—'}</p>
                )}
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Marital Status</label>
                {isEditing ? (
                  <select
                    value={formData.marital_status || ''}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.marital_status || '—'}</p>
                )}
              </div>

              {/* Address */}
              <div className="md:col-span-3">
                <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Residential Address</label>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                ) : (
                  <p className="p-3 bg-surface-subtle/50 rounded-xl text-slate-900 font-medium border border-border-subtle/60">{profile?.address || '—'}</p>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl">
          <form onSubmit={handleChangePassword} className="bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-border-subtle pb-4">
              <h2 className="font-headline-md text-headline-md text-slate-900 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">security</span>
                Change Password
              </h2>
              <p className="text-body-sm text-secondary mt-1">Ensure your account is using a strong password to protect system access.</p>
            </div>

            {pwSuccess && (
              <div role="status" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                  <span className="font-body-md font-medium">{pwSuccess}</span>
                </div>
              </div>
            )}

            {pwError && (
              <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600">error</span>
                  <span className="font-body-md font-medium">{pwError}</span>
                </div>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-3 text-secondary hover:text-slate-900"
                >
                  <span className="material-symbols-outlined text-[20px]">{showCurrentPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-label-md font-semibold text-slate-800 mb-1.5">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-3 text-secondary hover:text-slate-900"
                >
                  <span className="material-symbols-outlined text-[20px]">{showNewPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-label-md font-semibold text-slate-800 mb-1.5">Confirm New Password *</label>
              <input
                type={showNewPw ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPw}
                className="w-full py-3 bg-primary text-white hover:bg-primary-dark rounded-xl text-label-md font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50"
              >
                {changingPw ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
