import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useEffect } from 'react';

export default function DashboardLayout() {
  // Top bar shadow strengthens on scroll (from invoice.html script)
  useEffect(() => {
    const applyShadow = () => {
      const topbar = document.getElementById('app-topbar');
      const mainEl = document.querySelector('main');
      if (!topbar) return;
      const scrolled = (mainEl ? mainEl.scrollTop : window.scrollY) > 4;
      topbar.style.boxShadow = scrolled
        ? '0 4px 12px rgba(15,23,42,0.08)'
        : '0 1px 4px rgba(15,23,42,0.04)';
    };

    applyShadow();
    window.addEventListener('scroll', applyShadow, { passive: true });
    
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', applyShadow, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', applyShadow);
      if (mainEl) {
        mainEl.removeEventListener('scroll', applyShadow);
      }
    };
  }, []);

  return (
    <>
      <Sidebar />
      <div className="pl-[260px]">
        <Topbar />
        <main className="relative pt-[68px] min-h-screen bg-canvas-bg w-full shadow-[inset_1px_0_0_rgba(15,23,42,0.06)]">
          <Outlet />
        </main>
      </div>
    </>
  );
}
