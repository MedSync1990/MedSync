import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { changePassword } from '../api/profile';

export const FirstLoginGateModal: React.FC = () => {
  const { user, setUser, logout } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Please enter your initial temporary password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('Your new password must be different from your temporary password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      showToast('Password updated successfully! Welcome to MedSync.', 'success');
      if (user) {
        setUser({
          ...user,
          mustChangePassword: false,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your temporary password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Non-dismissible frosted backdrop */}
      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-surface-card shadow-2xl border border-border-subtle p-6 sm:p-8 text-on-surface animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Security Badge */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1 shadow-inner">
            <span className="material-symbols-outlined text-[30px]">lock_reset</span>
          </div>
          <span className="text-label-sm font-bold tracking-wider text-primary uppercase">Security Action Required</span>
          <h2 className="text-headline-md font-bold text-brand-navy-deep tracking-tight">Set Your Private Password</h2>
          <p className="text-body-sm text-on-surface-variant max-w-sm leading-relaxed">
            Welcome to MedSync, <strong>{user?.firstName || user?.username}</strong>. Your account was created with a temporary password. For clinical data privacy, please set a private password to continue.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-error-container/70 border border-error/20 text-error flex items-start gap-2.5 text-body-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-label-md font-semibold text-brand-navy-deep">
              Current Temporary Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter the password you just logged in with"
                className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono text-body-md"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep transition-colors p-1"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showCurrent ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-label-md font-semibold text-brand-navy-deep">
              New Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono text-body-md"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep transition-colors p-1"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-label-md font-semibold text-brand-navy-deep">
              Confirm New Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-surface-subtle focus:bg-surface-card shadow-inner focus:outline-none focus:ring-2 focus:ring-border-focus font-mono text-body-md"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-navy-deep transition-colors p-1"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 px-6 rounded-xl bg-primary hover:bg-brand-navy-deep text-on-primary font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>{submitting ? 'Saving Password...' : 'Save Password & Enter Portal'}</span>
            </button>
          </div>
        </form>

        {/* Escape Hatch: Sign Out */}
        <div className="mt-5 text-center border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={logout}
            className="text-body-sm text-outline hover:text-brand-navy-deep transition-colors inline-flex items-center gap-1.5 hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign out instead</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default FirstLoginGateModal;
