import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

export const TopBar: React.FC = () => {
  const { user } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const userName = fullName || user?.username || 'User';
  const greetingName = user?.firstName?.trim() || user?.lastName?.trim() || user?.username || 'User';
  const roleSubtitle = user?.role || 'Receptionist';
  const branchName = user?.branchName || 'Unknown Branch';
  const isAdmin = user?.role === 'Administrator';

  const getGreetingConfig = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'Good morning', icon: 'light_mode', color: 'text-amber-400' };
    }
    if (hour >= 12 && hour < 17) {
      return { text: 'Good afternoon', icon: 'wb_sunny', color: 'text-amber-500' };
    }
    if (hour >= 17 && hour < 21) {
      return { text: 'Good evening', icon: 'wb_twilight', color: 'text-orange-400' };
    }
    return { text: 'Good evening', icon: 'dark_mode', color: 'text-indigo-400' };
  };

  const { text: greetingText, icon: greetingIcon, color: greetingColor } = getGreetingConfig();

  const getRoleAvatarConfig = (role?: string) => {
    switch (role) {
      case 'Administrator':
        return { bg: 'bg-indigo-100 text-indigo-700 ring-indigo-200/80', icon: 'admin_panel_settings' };
      case 'Branch Manager':
        return { bg: 'bg-purple-100 text-purple-700 ring-purple-200/80', icon: 'manage_accounts' };
      case 'Doctor':
        return { bg: 'bg-teal-100 text-teal-700 ring-teal-200/80', icon: 'stethoscope' };
      case 'Receptionist':
        return { bg: 'bg-sky-100 text-sky-700 ring-sky-200/80', icon: 'badge' };
      case 'Cashier':
        return { bg: 'bg-amber-100 text-amber-700 ring-amber-200/80', icon: 'payments' };
      default:
        return { bg: 'bg-slate-100 text-slate-700 ring-slate-200/80', icon: 'person' };
    }
  };

  const roleAvatar = getRoleAvatarConfig(user?.role);

  return (
    <header className={`fixed top-0 ${isCollapsed ? 'left-sidebar-collapsed-width' : 'left-sidebar-width'} right-0 h-topbar-height bg-white/95 backdrop-blur-md z-40 px-space-lg flex items-center justify-between border-b border-slate-200 transition-[left,box-shadow] duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
      {/* Greeting & Role Info */}
      <div className="flex items-center gap-space-md">
        <button
          onClick={toggleSidebar}
          aria-controls="app-sidebar"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 shadow-xs active:scale-95"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isCollapsed ? 'side_navigation' : 'menu_open'}
          </span>
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-slate-900 font-bold">
              {greetingText}, {greetingName}
            </span>
            <span className={`material-symbols-outlined ${greetingColor} text-[20px]`}>{greetingIcon}</span>
          </div>
        </div>
      </div>

      {/* Controls & Profile */}
      <div className="flex items-center gap-space-md">
        {!isAdmin && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
            <span className="font-label-md text-label-md text-slate-700 font-medium">{branchName}</span>
          </div>
        )}

        <div className="flex items-center gap-space-sm pl-space-xs cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <div className="font-label-md text-label-md text-slate-900 font-bold">{userName}</div>
            <div className="font-body-sm text-[12px] text-slate-500">{roleSubtitle}</div>
          </div>
          <div className={`w-9 h-9 rounded-full ${roleAvatar.bg} flex items-center justify-center ring-2 shadow-xs transition-transform transform hover:scale-105`}>
            <span className="material-symbols-outlined text-[19px]">{roleAvatar.icon}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
