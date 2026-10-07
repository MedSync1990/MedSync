import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';


export interface NavItem {
  label: string;
  path: string;
  icon: string;
  dataPath: string;
}

export interface NavSection {
  header: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { isCollapsed } = useSidebar();
  const userRole = user?.role;

  const standaloneItem: NavItem = (() => {
    switch (userRole) {
      case 'Administrator':
        return { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
      case 'Branch Manager':
        return { label: 'Dashboard', path: '/branch-manager/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
      case 'Doctor':
        return { label: 'Dashboard', path: '/doctor/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
      case 'Receptionist':
      default:
        return { label: 'Dashboard', path: '/receptionist/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
    }
  })();

  const navSections: NavSection[] = (() => {
    const systemSection: NavSection = {
      header: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/settings', icon: 'settings', dataPath: 'settings' },
        { label: 'Help Center', path: '/help-center', icon: 'help', dataPath: 'help-center' },
      ],
    };

    switch (userRole) {
      case 'Administrator':
        return [
          {
            header: 'REPORTS',
            items: [
              { label: 'Branch Appointments', path: '/reports/appointments-summary', icon: 'event_note', dataPath: 'report-branch-appointments' },
              { label: 'Doctor Revenue', path: '/reports/doctor-revenue', icon: 'monitoring', dataPath: 'report-doctor-revenue' },
              { label: 'Outstanding Balances', path: '/reports/outstanding-balances', icon: 'account_balance_wallet', dataPath: 'report-outstanding-balances' },
              { label: 'Treatment Breakdown', path: '/reports/treatment-categories', icon: 'pie_chart', dataPath: 'report-treatment-breakdown' },
              { label: 'Insurance vs. Cash', path: '/reports/insurance-vs-out-of-pocket', icon: 'health_and_safety', dataPath: 'report-insurance-vs-cash' },
            ],
          },
          {
            header: 'MANAGEMENT',
            items: [
              { label: 'Branch Management', path: '/admin/branches', icon: 'apartment', dataPath: 'branch-management' },
              { label: 'Manage Staff', path: '/admin/staff', icon: 'badge', dataPath: 'manage-staff' },
              { label: 'Doctors & Specialties', path: '/admin/doctors', icon: 'stethoscope', dataPath: 'doctors-specialties' },
              { label: 'Patients', path: '/receptionist/patients', icon: 'contact_page', dataPath: 'patients' },
              { label: 'Treatment Catalogue', path: '/admin/treatment-catalogue', icon: 'medical_services', dataPath: 'treatment-catalogue' },
              { label: 'Doctor Payments', path: '/admin/doctor-payments', icon: 'request_quote', dataPath: 'doctor-payments' },
            ],
          },
          systemSection,
        ];

      case 'Branch Manager':
        return [
          {
            header: 'REPORTS',
            items: [
              { label: 'Branch Appointments', path: '/reports/appointments-summary', icon: 'event_note', dataPath: 'report-branch-appointments' },
              { label: 'Doctor Revenue', path: '/reports/doctor-revenue', icon: 'monitoring', dataPath: 'report-doctor-revenue' },
              { label: 'Outstanding Balances', path: '/reports/outstanding-balances', icon: 'account_balance_wallet', dataPath: 'report-outstanding-balances' },
              { label: 'Treatment Breakdown', path: '/reports/treatment-categories', icon: 'pie_chart', dataPath: 'report-treatment-breakdown' },
              { label: 'Insurance vs. Cash', path: '/reports/insurance-vs-out-of-pocket', icon: 'health_and_safety', dataPath: 'report-insurance-vs-cash' },
            ],
          },
          {
            header: 'MANAGEMENT',
            items: [
              { label: 'Manage Staff', path: '/admin/staff', icon: 'badge', dataPath: 'manage-staff' },
              { label: 'Doctors & Specialties', path: '/branch-manager/doctors', icon: 'stethoscope', dataPath: 'doctors-specialties' },
              { label: 'Patients', path: '/receptionist/patients', icon: 'contact_page', dataPath: 'patients' },
              { label: 'Treatment Catalogue', path: '/branch-manager/treatment-catalogue', icon: 'medical_services', dataPath: 'treatment-catalogue' },
            ],
          },
          systemSection,
        ];

      case 'Doctor':
        return [
          {
            header: 'MY WORK',
            items: [
              { label: 'My Schedule', path: '/doctor/schedule', icon: 'calendar_month', dataPath: 'my-schedule' },
              { label: 'Consultation', path: '/doctor/consultation', icon: 'stethoscope', dataPath: 'consultation' },
            ],
          },
          {
            header: 'EARNINGS',
            items: [
              { label: 'My Earnings', path: '/doctor/earnings', icon: 'account_balance_wallet', dataPath: 'my-earnings' },
            ],
          },
          {
            header: 'REFERENCE',
            items: [
              { label: 'Treatment Catalogue', path: '/doctor/treatment-catalogue', icon: 'medical_services', dataPath: 'treatment-catalogue' },
            ],
          },
          systemSection,
        ];

      case 'Receptionist':
      default:
        return [
          {
            header: 'PATIENTS',
            items: [
              { label: 'Register Patient', path: '/receptionist/register-patient', icon: 'person_add', dataPath: 'register-patient' },
              { label: 'Patient Directory', path: '/receptionist/patients', icon: 'contact_page', dataPath: 'patients' },
            ],
          },
          {
            header: 'APPOINTMENTS',
            items: [
              { label: 'Book Appointment', path: '/receptionist/book-appointment', icon: 'calendar_today', dataPath: 'book-appointment' },
              { label: 'Manage Appointments', path: '/receptionist/appointments', icon: 'event_note', dataPath: 'manage-appointments' },
            ],
          },
          {
            header: 'BILLING & PAYMENTS',
            items: [
              { label: 'Invoices', path: '/receptionist/invoices', icon: 'receipt_long', dataPath: 'invoices' },
              { label: 'Collect Payment', path: '/receptionist/collect-payment', icon: 'payments', dataPath: 'collect-payment' },
            ],
          },
          systemSection,
        ];
    }
  })();

  const isItemActive = (itemPath: string) => {
    if (location.pathname === itemPath) return true;
    if (itemPath === '/dashboard' && (
      location.pathname === '/admin/dashboard' ||
      location.pathname === '/branch-manager/dashboard' ||
      location.pathname === '/doctor/dashboard' ||
      location.pathname === '/receptionist/dashboard'
    )) {
      return true;
    }
    return false;
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen transition-all duration-300 bg-[#0F172A] text-white z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(15,23,42,0.15)] ${
        isCollapsed ? 'w-sidebar-collapsed-width' : 'w-sidebar-width'
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className={`h-topbar-height border-b border-white/10 flex items-center px-space-md shrink-0 ${
          isCollapsed ? 'justify-center' : 'justify-start'
        }`}>
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm shrink-0 p-0.5">
              <img src="/logo.jpg" alt="MedSync Logo" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-headline-sm text-headline-sm text-white leading-tight truncate">
                  MedSync
                </span>
                <span className="font-label-sm text-label-sm text-white/50 tracking-wider uppercase truncate">
                  {userRole ? `${userRole} Portal` : 'Healthcare System'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className={`flex-1 overflow-y-auto py-space-xs ${isCollapsed ? 'px-2 space-y-4' : 'px-space-md space-y-space-md'}`}>
          {/* Standalone Dashboard Item */}
          <div className="space-y-1">
            <NavLink
              to={standaloneItem.path}
              data-path={standaloneItem.dataPath}
              title={isCollapsed ? standaloneItem.label : undefined}
              className={({ isActive }) =>
                `group flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-space-sm px-space-sm'} h-10 rounded-lg transition-all relative ${
                  isActive || isItemActive(standaloneItem.path)
                    ? "bg-white/10 text-white font-semibold before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-brand-teal-light before:rounded-r"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => {
                const active = isActive || isItemActive(standaloneItem.path);
                return (
                  <>
                    <span
                      className={`material-symbols-outlined text-[20px] transition-colors ${
                        active ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'
                      }`}
                    >
                      {standaloneItem.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="font-label-lg text-label-lg truncate">{standaloneItem.label}</span>
                    )}
                  </>
                );
              }}
            </NavLink>
          </div>

          {/* Grouped Sections */}
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {isCollapsed ? (
                <div className="my-2 border-t border-white/10" title={section.header} />
              ) : (
                <div className="px-space-sm pb-space-2xs font-label-sm text-label-sm text-white/40 uppercase tracking-widest truncate">
                  {section.header}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-path={item.dataPath}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-space-sm px-space-sm'} h-10 rounded-lg transition-all relative ${
                      isActive || isItemActive(item.path)
                        ? "bg-white/10 text-white font-semibold before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-brand-teal-light before:rounded-r"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => {
                    const active = isActive || isItemActive(item.path);
                    return (
                      <>
                        <span
                          className={`material-symbols-outlined text-[20px] transition-colors ${
                            active ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'
                          }`}
                        >
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="font-label-lg text-label-lg truncate">{item.label}</span>
                        )}
                      </>
                    );
                  }}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Pinned Bottom Logout Action */}
      <div className={`border-t border-white/10 flex flex-col ${isCollapsed ? 'p-2 items-center' : 'p-space-md'}`}>
        <NavLink
          to="/logout"
          data-path="logout"
          title={isCollapsed ? 'Logout' : undefined}
          className={`group flex items-center ${isCollapsed ? 'justify-center w-full px-0' : 'gap-space-sm px-space-sm'} h-10 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all text-left`}
        >
          <span className="material-symbols-outlined text-[20px] text-rose-400">logout</span>
          {!isCollapsed && <span className="font-label-lg text-label-lg font-semibold">Logout</span>}
        </NavLink>
      </div>
    </aside>
  );
};
