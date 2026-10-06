import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';

const LayoutContent: React.FC = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="bg-canvas-bg font-body-md text-on-surface antialiased min-h-screen">
      {/* Reusable Pinned Sidebar */}
      <Sidebar />

      {/* Main Viewport with Guideline-mandated Left Inset Shadow & Canvas Chrome */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'pl-sidebar-collapsed-width' : 'pl-sidebar-width'}`}>
        <TopBar />
        <main className="relative pt-topbar-height w-full px-gutter-desktop min-h-screen bg-canvas-bg shadow-[inset_1px_0_0_rgba(15,23,42,0.06)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const Layout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};
