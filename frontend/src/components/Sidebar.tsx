import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  const userRole = user?.role;
  const branchName = user?.branchName || 'Colombo';

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
        { label: 'Settings', path: '/settings', icon: 'settings', dataPath: 'settings' },
        { label: 'Help Center', path: '/help-center', icon: 'help', dataPath: 'help-center' },
      ],
    };

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
  })();

  const isItemActive = (itemPath: string) => {
    if (location.pathname === itemPath) return true;
    if (itemPath === '/dashboard' && location.pathname.includes('/dashboard')) return true;
    return false;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar-width bg-white text-slate-700 z-50 flex flex-col justify-between border-r border-slate-200 shadow-sm">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-topbar-height px-space-lg flex items-center gap-space-sm border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary flex items-center justify-center shadow-sm shrink-0 p-0.5">
            <img src="/logo.jpg" alt="MedSync Logo" className="w-full h-full object-contain mix-blend-screen" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-headline-sm text-slate-900 leading-tight truncate">
              MedSync
            </span>
            <span className="font-label-sm text-[10px] text-slate-500 tracking-wider uppercase truncate">
              BRANCH MANAGER PORTAL
            </span>
          </div>
        </div>

        {/* Branch Location Indicator */}
        <div className="px-space-md py-space-sm">
          <div className="flex items-center justify-between px-space-sm py-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
              <span className="font-label-md text-label-md text-slate-700 truncate">{branchName}</span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className="flex-1 overflow-y-auto px-space-md py-space-xs space-y-space-md custom-scrollbar">
          {/* Standalone Dashboard Item */}
          <div className="space-y-1">
            <NavLink
              to={standaloneItem.path}
              data-path={standaloneItem.dataPath}
              className={({ isActive }) =>
                `group flex items-center gap-space-sm px-space-sm h-10 rounded-lg transition-all relative ${
                  isActive || isItemActive(standaloneItem.path)
                    ? "bg-sky-50 text-primary font-semibold before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-primary before:rounded-r"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => {
                const active = isActive || isItemActive(standaloneItem.path);
                return (
                  <>
                    <span className={`material-symbols-outlined text-[20px] transition-colors ${active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      {standaloneItem.icon}
                    </span>
                    <span className="font-label-md text-label-md">{standaloneItem.label}</span>
                  </>
                );
              }}
            </NavLink>
          </div>

          {/* Grouped Sections */}
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-space-sm pb-space-2xs font-label-sm text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
                {section.header}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-path={item.dataPath}
                  className={({ isActive }) =>
                    `group flex items-center gap-space-sm px-space-sm h-10 rounded-lg transition-all relative ${
                      isActive || isItemActive(item.path)
                        ? "bg-sky-50 text-primary font-semibold before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-primary before:rounded-r"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => {
                    const active = isActive || isItemActive(item.path);
                    return (
                      <>
                        <span className={`material-symbols-outlined text-[20px] transition-colors ${active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}>
                          {item.icon}
                        </span>
                        <span className="font-label-md text-label-md">{item.label}</span>
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
      <div className="p-space-md border-t border-slate-100 bg-slate-50/50">
        <NavLink to="/logout" className="group flex items-center gap-space-sm px-space-sm h-10 rounded-lg text-rose-500 hover:bg-rose-50 transition-all text-left">
          <span className="material-symbols-outlined text-[20px] text-rose-400 group-hover:text-rose-600">logout</span>
          <span className="font-label-md text-label-md font-semibold">Logout</span>
        </NavLink>
      </div>
    </aside>
  );
};