// src/pages/Dashboard.tsx
import React from 'react';
import { useAuth, UserRole } from '../auth/AuthContext';
import { DoctorDashboard } from './doctor/DoctorDashboard';

/**
 * Test Dashboard Wrapper:
 * Anyone on the team can switch the test role right here or view their component!
 */
export const Dashboard: React.FC = () => {
  const { user, setUser } = useAuth();

  const handleRoleSwitch = (newRole: UserRole) => {
    if (!user) return;
    setUser({
      ...user,
      role: newRole,
      roleTitle: `${newRole} Portal`,
    });
  };

  return (
    <div className="flex flex-col gap-space-lg pb-space-2xl">
      {/* Dev Role Switcher Toolbar (Allows any team member to test role permissions on the fly) */}
      <div className="bg-surface-card p-space-md rounded-xl border border-border-subtle shadow-xs flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">science</span>
          <span className="font-label-md text-label-md text-secondary">
            Testing As: <strong className="text-brand-navy-deep">{user?.role}</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-label-sm text-label-sm text-secondary mr-1">Switch Role:</span>
          {(['Doctor', 'Receptionist', 'Administrator', 'Branch Manager', 'Cashier'] as UserRole[]).map(
            (role) => (
              <button
                key={role}
                onClick={() => handleRoleSwitch(role)}
                className={`px-2.5 py-1 rounded-lg font-label-sm text-label-sm font-semibold transition-all ${
                  user?.role === role
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-subtle text-secondary hover:text-brand-navy-deep hover:bg-surface-variant'
                }`}
                type="button"
              >
                {role}
              </button>
            )
          )}
        </div>
      </div>

      {/* Render role-specific dashboard */}
      {user?.role === 'Doctor' ? (
        <DoctorDashboard />
      ) : (
        <div className="bg-surface-card p-space-3xl rounded-xl border border-border-subtle shadow-xs text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-subtle flex items-center justify-center text-secondary mx-auto mb-space-md">
            <span className="material-symbols-outlined text-[32px]">dashboard_customize</span>
          </div>
          <h2 className="font-headline-md text-headline-md font-bold text-brand-navy-deep mb-2">{user?.role} Dashboard</h2>
          <p className="font-body-md text-body-md text-secondary max-w-md mx-auto">
            This screen is assigned to its respective owner in workload-division.md. The sidebar has dynamically updated with {user?.role} navigation permissions!
          </p>
        </div>
      )}
    </div>
  );
};
