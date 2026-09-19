import React from 'react';
import { useAuth } from '../auth/AuthContext';

interface TopBarProps {
  onThemeToggle?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onThemeToggle }) => {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const userName = user ? `Dr. ${user.lastName}` : 'Guest';
  const roleSubtitle = user?.roleTitle || user?.role || 'Staff';
  const branchName = user?.branchName || 'Colombo Central Branch';
  const avatarUrl =
    user?.avatarUrl ||
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80';

  return (
    <header
      className={`fixed top-0 left-sidebar-width right-0 h-topbar-height bg-surface-card/95 backdrop-blur-md z-40 px-space-lg flex items-center justify-between border-b border-border-subtle transition-shadow duration-200 ${
        isScrolled
          ? 'shadow-[0_4px_12px_rgba(15,23,42,0.08)]'
          : 'shadow-[0_1px_4px_rgba(15,23,42,0.04)]'
      }`}
    >
      {/* Greeting & Role Info */}
      <div className="flex items-center gap-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-brand-navy-deep">
              Good morning, {userName}
            </span>
            <span className="material-symbols-outlined text-brand-teal-light text-[20px]">verified</span>
          </div>
          <span className="font-body-sm text-body-sm text-secondary">
            {branchName} · {roleSubtitle}
          </span>
        </div>
      </div>

      {/* Controls & Profile */}
      <div className="flex items-center gap-space-md">
        <div className="hidden md:flex items-center gap-space-xs px-space-sm py-1.5 rounded-full bg-surface-subtle text-secondary font-label-md text-label-md">
          <span className="material-symbols-outlined text-[16px] text-status-completed-text">domain</span>
          <span>{branchName}</span>
        </div>

        <button
          onClick={onThemeToggle}
          aria-label="Theme Toggle"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">dark_mode</span>
        </button>

        <button
          aria-label="Notifications"
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-surface-card"></span>
        </button>

        <div className="h-7 w-[1px] bg-border-subtle"></div>

        <div className="flex items-center gap-space-sm pl-space-xs">
          <div className="text-right hidden sm:block">
            <div className="font-label-lg text-label-lg text-brand-navy-deep leading-tight">{userName}</div>
            <div className="font-body-sm text-body-sm text-secondary truncate max-w-[140px]">{user?.role}</div>
          </div>
          <img
            alt={userName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
            src={avatarUrl}
          />
        </div>
      </div>
    </header>
  );
};
