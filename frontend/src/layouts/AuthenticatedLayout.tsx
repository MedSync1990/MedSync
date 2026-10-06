import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';

const AuthenticatedLayoutContent: React.FC = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="bg-canvas-bg font-body-md text-on-surface antialiased min-h-screen">
      <Sidebar />
      <div className={`transition-all duration-300 ${isCollapsed ? 'pl-sidebar-collapsed-width' : 'pl-sidebar-width'}`}>
        <TopBar />
        <main className="relative pt-topbar-height w-full px-gutter-desktop min-h-screen bg-canvas-bg shadow-[inset_1px_0_0_rgba(15,23,42,0.06)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const AuthenticatedLayout: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <AuthenticatedLayoutContent />
    </SidebarProvider>
  );
};
