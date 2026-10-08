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

  const userName = user?.firstName || 'manager1';
  const roleSubtitle = user?.role || 'Branch Manager';
  const branchName = user?.branchName || 'Colombo';

  return (
    <header className={`fixed top-0 left-sidebar-width right-0 h-topbar-height bg-white/95 backdrop-blur-md z-40 px-space-lg flex items-center justify-between border-b border-slate-200 transition-shadow duration-200 ${isScrolled ? 'shadow-sm' : ''}`}>
      {/* Greeting & Role Info */}
      <div className="flex items-center gap-space-md">
        <button
          onClick={toggleSidebar}
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
              Good morning, {userName}
            </span>
            <span className="material-symbols-outlined text-amber-400 text-[20px]">light_mode</span>
          </div>
          <span className="font-body-sm text-body-sm text-slate-500">
            {branchName} · {roleSubtitle} Portal
          </span>
        </div>
      </div>

      {/* Controls & Profile */}
      <div className="flex items-center gap-space-md">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
          <span className="font-label-md text-label-md text-slate-700 font-medium">{branchName}</span>
          <span className="material-symbols-outlined text-[18px] text-slate-400">expand_more</span>
        </div>

        <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

        <div className="flex items-center gap-space-sm pl-space-xs cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <div className="font-label-md text-label-md text-slate-900 font-bold">{userName}</div>
            <div className="font-body-sm text-[12px] text-slate-500">{roleSubtitle}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-primary ring-2 ring-slate-100">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};
