import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../auth/AuthContext';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: UserRole[];
}

export interface NavSection {
  header?: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const userRole = user?.role;
  const branchName = user?.branchName || 'Central Branch';

  const navSections: NavSection[] = [
    {
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: 'grid_view' },
      ],
    },
    {
      header: 'MY WORK',
      items: [
        { label: 'My Schedule', path: '/my-schedule', icon: 'calendar_month', roles: ['Doctor'] },
        { label: 'Consultation', path: '/consultation', icon: 'stethoscope', roles: ['Doctor'] },
      ],
    },
    {
      header: 'PATIENTS & VISITS',
      items: [
        { label: 'Register Patient', path: '/patients/register', icon: 'person_add', roles: ['Receptionist', 'Administrator'] },
        { label: 'Patient Directory', path: '/patients', icon: 'folder_shared', roles: ['Receptionist', 'Administrator'] },
        { label: 'Book Appointment', path: '/appointments/book', icon: 'calendar_today', roles: ['Receptionist', 'Patient', 'Administrator'] },
        { label: 'Manage Appointments', path: '/appointments', icon: 'event_note', roles: ['Receptionist', 'Administrator', 'Branch Manager'] },
      ],
    },
    {
      header: 'BILLING & PAYMENTS',
      items: [
        { label: 'Invoices', path: '/receptionist/invoices', icon: 'receipt_long', roles: ['Receptionist', 'Administrator', 'Branch Manager'] },
        { label: 'Collect Payment', path: '/receptionist/collect-payment', icon: 'payments', roles: ['Receptionist', 'Administrator', 'Branch Manager'] },
      ],
    },
    {
      header: 'EARNINGS & REPORTS',
      items: [
        { label: 'My Earnings', path: '/my-earnings', icon: 'account_balance_wallet', roles: ['Doctor'] },
        { label: 'Reports', path: '/reports', icon: 'monitoring', roles: ['Administrator', 'Branch Manager'] },
      ],
    },
    {
      header: 'REFERENCE',
      items: [
        { label: 'Treatment Catalogue', path: '/treatment-catalogue', icon: 'menu_book' },
        { label: 'Manage Branches', path: '/admin/branches', icon: 'domain', roles: ['Administrator'] },
        { label: 'Manage Staff', path: '/admin/staff', icon: 'badge', roles: ['Administrator', 'Branch Manager'] },
        { label: 'Manage Doctors', path: '/admin/doctors', icon: 'medical_services', roles: ['Administrator'] },
      ],
    },
  ];

  const isVisible = (item: NavItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-brand-navy-deep text-white z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(15,23,42,0.15)]">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-topbar-height px-space-lg flex items-center gap-space-sm border-b border-white/10">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm shrink-0 p-0.5">
            <img src="/logo.jpg" alt="MedSync Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-headline-sm text-white leading-tight truncate">
              MedSync
            </span>
            <span className="font-label-sm text-label-sm text-white/50 tracking-wider uppercase truncate">
              {userRole ? `${userRole} Portal` : 'Healthcare System'}
            </span>
          </div>
        </div>

        {/* Branch Location Indicator */}
        <div className="px-space-md py-space-sm">
          <div className="flex items-center gap-space-2xs px-space-sm py-1.5 rounded-lg bg-white/5 border border-white/5">
            <span className="material-symbols-outlined text-[16px] text-brand-teal-light">location_on</span>
            <span className="font-label-md text-label-md text-white/70 truncate">{branchName}</span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className="flex-1 overflow-y-auto px-space-md py-space-xs space-y-space-md">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter(isVisible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {section.header && (
                  <div className="px-space-sm pb-space-2xs font-label-sm text-label-sm text-white/40 uppercase tracking-widest">
                    {section.header}
                  </div>
                )}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `group flex items-center gap-space-sm px-space-sm h-10 rounded-lg transition-all relative ${isActive
                        ? "bg-white/10 text-white font-semibold before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-brand-teal-light before:rounded-r"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'
                            }`}
                        >
                          {item.icon}
                        </span>
                        <span className="font-label-lg text-label-lg">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Pinned Bottom Actions */}
      <div className="p-space-md border-t border-white/10">
        <div className="space-y-1">
          <NavLink
            to="/settings"
            className="group flex items-center gap-space-sm px-space-sm h-9 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-white/50 group-hover:text-white transition-colors">
              settings
            </span>
            <span className="font-label-md text-label-md">Settings</span>
          </NavLink>
          <NavLink
            to="/help-center"
            className="group flex items-center gap-space-sm px-space-sm h-9 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-white/50 group-hover:text-white transition-colors">
              help
            </span>
            <span className="font-label-md text-label-md">Help Center</span>
          </NavLink>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="w-full group flex items-center gap-space-sm px-space-sm h-9 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all text-left"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-rose-400">logout</span>
            <span className="font-label-md text-label-md font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
