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
      case 'Administrator': return { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
      case 'Branch Manager': return { label: 'Dashboard', path: '/branch-manager/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
      case 'Doctor': return { label: 'Dashboard', path: '/doctor/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
      default: return { label: 'Dashboard', path: '/receptionist/dashboard', icon: 'dashboard', dataPath: 'dashboard' };
    }
  })();

  const navSections: NavSection[] = (() => {
    const systemSection: NavSection = {
      header: 'SYSTEM',
      items: [
        { label: 'Profile', path: '/profile', icon: 'account_circle', dataPath: 'profile' },
        { label: 'Help Center', path: '/help-center', icon: 'help', dataPath: 'help-center' },
      ],
    };

    const reports: NavSection = {
      header: 'REPORTS',
      items: [
        { label: 'Branch Appointments', path: '/reports/appointments-summary', icon: 'event_note', dataPath: 'report-branch-appointments' },
        { label: 'Doctor Revenue', path: '/reports/doctor-revenue', icon: 'monitoring', dataPath: 'report-doctor-revenue' },
        { label: 'Outstanding Balances', path: '/reports/outstanding-balances', icon: 'account_balance_wallet', dataPath: 'report-outstanding-balances' },
        { label: 'Treatment Breakdown', path: '/reports/treatment-categories', icon: 'pie_chart', dataPath: 'report-treatment-breakdown' },
        { label: 'Insurance vs. Cash', path: '/reports/insurance-vs-out-of-pocket', icon: 'health_and_safety', dataPath: 'report-insurance-vs-cash' },
      ],
    };
    switch (userRole) {
      case 'Administrator':
        return [reports, { header: 'MANAGEMENT', items: [
          { label: 'Manage Branches', path: '/admin/branches', icon: 'domain', dataPath: 'manage-branches' },
          { label: 'Manage Staff & Users', path: '/admin/staff', icon: 'badge', dataPath: 'manage-staff' },
          { label: 'Doctors & Specialties', path: '/admin/doctors', icon: 'stethoscope', dataPath: 'doctors-specialties' },
          { label: 'Patients', path: '/receptionist/patients', icon: 'contact_page', dataPath: 'patients' },
          { label: 'Treatment Catalogue', path: '/admin/treatment-catalogue', icon: 'medical_services', dataPath: 'treatment-catalogue' },
          { label: 'Doctor Payments', path: '/admin/doctor-payments', icon: 'payments', dataPath: 'doctor-payments' },
        ] }, systemSection];
      case 'Branch Manager':
        return [reports, { header: 'MANAGEMENT', items: [
          { label: 'Branch Details', path: '/branch-manager/branch-details', icon: 'domain', dataPath: 'branch-details' },
          { label: 'Manage Staff', path: '/admin/staff', icon: 'badge', dataPath: 'manage-staff' },
          { label: 'Doctors & Specialties', path: '/branch-manager/doctors', icon: 'stethoscope', dataPath: 'doctors-specialties' },
          { label: 'Patients', path: '/receptionist/patients', icon: 'contact_page', dataPath: 'patients' },
          { label: 'Treatment Catalogue', path: '/branch-manager/treatment-catalogue', icon: 'medical_services', dataPath: 'treatment-catalogue' },
        ] }, systemSection];
      case 'Receptionist':
        return [{ header: 'PATIENTS', items: [
          { label: 'Register Patient', path: '/receptionist/register-patient', icon: 'person_add', dataPath: 'register-patient' },
          { label: 'Patient Directory', path: '/receptionist/patients', icon: 'contact_page', dataPath: 'patients' },
        ] }, { header: 'APPOINTMENTS', items: [
          { label: 'Book Appointment', path: '/receptionist/book-appointment', icon: 'calendar_add_on', dataPath: 'book-appointment' },
          { label: 'Manage Appointments', path: '/receptionist/appointments', icon: 'event_note', dataPath: 'appointments' },
        ] }, { header: 'BILLING & PAYMENTS', items: [
          { label: 'Invoices', path: '/receptionist/invoices', icon: 'receipt_long', dataPath: 'invoices' },
          { label: 'Collect Payment', path: '/receptionist/collect-payment', icon: 'payments', dataPath: 'collect-payment' },
          { label: 'Treatment Catalogue', path: '/receptionist/treatment-catalogue', icon: 'medical_services', dataPath: 'treatment-catalogue' },
        ] }, systemSection];
      case 'Doctor':
        return [{ header: 'CLINICAL', items: [
          { label: 'My Schedule', path: '/doctor/schedule', icon: 'calendar_month', dataPath: 'my-schedule' },
          { label: 'Consultation', path: '/doctor/consultation', icon: 'clinical_notes', dataPath: 'consultation' },
          { label: 'Treatment Catalogue', path: '/doctor/treatment-catalogue', icon: 'medical_services', dataPath: 'treatment-catalogue' },
        ] }, { header: 'EARNINGS', items: [
          { label: 'My Earnings', path: '/doctor/earnings', icon: 'account_balance_wallet', dataPath: 'my-earnings' },
        ] }, systemSection];
      default:
        return [systemSection];
    }
  })();

  const isItemActive = (itemPath: string) => {
    if (location.pathname === itemPath) return true;
    if (itemPath === '/dashboard' && location.pathname.includes('/dashboard')) return true;
    return false;
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      className={`fixed left-0 top-0 h-screen transition-all duration-300 bg-[#0F172A] text-white z-50 overflow-hidden flex flex-col justify-between shadow-[0_1px_8px_rgba(15,23,42,0.15)] ${
        isCollapsed ? 'w-sidebar-collapsed-width' : 'w-sidebar-width'
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className={`h-topbar-height shrink-0 flex items-center border-b border-white/10 ${isCollapsed ? 'justify-center px-0' : 'px-space-lg gap-space-sm'}`}>
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm shrink-0 p-0.5">
            <img src="/logo.jpg" alt="MedSync Logo" className="w-full h-full object-contain" />
          </div>
          <div className={`${isCollapsed ? 'hidden' : 'flex'} flex-col min-w-0`}>
            <span className="font-headline-sm text-headline-sm text-white leading-tight truncate">
              MedSync
            </span>
            <span className="font-label-sm text-[10px] text-white/50 tracking-wider uppercase truncate">
              {userRole ? `${userRole.toUpperCase()} PORTAL` : 'MEDSYNC PORTAL'}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-space-xs space-y-space-md custom-scrollbar ${isCollapsed ? 'px-2' : 'px-space-md'}`}>
          {/* Standalone Dashboard Item */}
          <div className="space-y-1">
            <NavLink
              to={standaloneItem.path}
              data-path={standaloneItem.dataPath}
              title={isCollapsed ? standaloneItem.label : undefined}
              aria-label={standaloneItem.label}
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
                    <span className={`material-symbols-outlined shrink-0 text-[20px] transition-colors ${active ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>
                      {standaloneItem.icon}
                    </span>
                    {!isCollapsed && <span className="font-label-md text-label-md truncate">{standaloneItem.label}</span>}
                  </>
                );
              }}
            </NavLink>
          </div>

          {/* Grouped Sections */}
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className={`${isCollapsed ? 'hidden' : ''} px-space-sm pb-space-2xs font-label-sm text-[11px] text-white/40 uppercase tracking-widest font-semibold`}>
                {section.header}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-path={item.dataPath}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={item.label}
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
                        <span className={`material-symbols-outlined shrink-0 text-[20px] transition-colors ${active ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>
                          {item.icon}
                        </span>
                        {!isCollapsed && <span className="font-label-md text-label-md truncate">{item.label}</span>}
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
      <div className={`${isCollapsed ? 'p-2' : 'p-space-md'} shrink-0 border-t border-white/10 bg-white/5`}>
        <NavLink to="/logout" aria-label="Logout" title={isCollapsed ? 'Logout' : undefined} className={`group flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-space-sm px-space-sm'} h-10 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all text-left`}>
          <span className="material-symbols-outlined text-[20px] text-rose-400">logout</span>
          {!isCollapsed && <span className="font-label-md text-label-md font-semibold">Logout</span>}
        </NavLink>
      </div>
    </aside>
  );
};
