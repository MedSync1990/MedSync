import { Link, useLocation } from 'react-router-dom';
import medsyncLogo from '../../../assets/medsync.jpg';

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-brand-navy-deep z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.15)]">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="h-[68px] px-space-lg flex items-center gap-space-sm border-b border-white/10">
          <img src={medsyncLogo} className="w-9 h-9 rounded-xl object-cover bg-white/10" alt="MedSync Logo" />
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-white leading-none">MedSync</span>
            <span className="font-label-sm text-[10px] text-white/50 tracking-wider uppercase mt-1">Healthcare System</span>
          </div>
        </div>
        
        <div className="p-space-md flex-1">
          <div className="mb-space-lg">
            <nav className="space-y-1">
              <Link to="/receptionist/dashboard" className={`flex items-center gap-space-sm px-space-md h-10 rounded-lg transition-all group font-label-lg text-label-lg ${currentPath === '/receptionist/dashboard' ? 'bg-white/10 text-white before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand-teal-light before:rounded-r-full relative' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span className={`material-symbols-outlined text-[20px] ${currentPath === '/receptionist/dashboard' ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>dashboard</span>
                <span>Dashboard</span>
              </Link>
            </nav>
          </div>
          
          <div className="mb-space-lg">
            <div className="px-space-md mb-space-xs font-label-sm text-label-sm text-white/40 uppercase tracking-wider">Patients</div>
            <nav className="space-y-1">
              <Link to="/receptionist/register-patient" className={`flex items-center gap-space-sm px-space-md h-10 rounded-lg transition-all group font-label-lg text-label-lg ${currentPath === '/receptionist/register-patient' ? 'bg-white/10 text-white before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand-teal-light before:rounded-r-full relative' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span className={`material-symbols-outlined text-[20px] ${currentPath === '/receptionist/register-patient' ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>person_add</span>
                <span>Register Patient</span>
              </Link>
              <Link to="/receptionist/patient-directory" className={`flex items-center gap-space-sm px-space-md h-10 rounded-lg transition-all group font-label-lg text-label-lg ${currentPath === '/receptionist/patient-directory' ? 'bg-white/10 text-white before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand-teal-light before:rounded-r-full relative' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span className={`material-symbols-outlined text-[20px] ${currentPath === '/receptionist/patient-directory' ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>contact_page</span>
                <span>Patient Directory</span>
              </Link>
            </nav>
          </div>
          
          <div className="mb-space-lg">
            <div className="px-space-md mb-space-xs font-label-sm text-label-sm text-white/40 uppercase tracking-wider">Appointments</div>
            <nav className="space-y-1">
              <Link to="/receptionist/book-appointment" className={`flex items-center gap-space-sm px-space-md h-10 rounded-lg transition-all group font-label-lg text-label-lg ${currentPath === '/receptionist/book-appointment' ? 'bg-white/10 text-white before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand-teal-light before:rounded-r-full relative' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span className={`material-symbols-outlined text-[20px] ${currentPath === '/receptionist/book-appointment' ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>event_available</span>
                <span>Book Appointment</span>
              </Link>
              <Link to="/receptionist/manage-appointments" className={`flex items-center gap-space-sm px-space-md h-10 rounded-lg transition-all group font-label-lg text-label-lg ${currentPath === '/receptionist/manage-appointments' ? 'bg-white/10 text-white before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand-teal-light before:rounded-r-full relative' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span className={`material-symbols-outlined text-[20px] ${currentPath === '/receptionist/manage-appointments' ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>calendar_month</span>
                <span>Manage Appointments</span>
              </Link>
            </nav>
          </div>
          
          <div className="mb-space-lg">
            <div className="px-space-md mb-space-xs font-label-sm text-label-sm text-white/40 uppercase tracking-wider">Billing &amp; Payments</div>
            <nav className="space-y-1">
              <Link to="/receptionist/invoice" className={`flex items-center gap-space-sm px-space-md h-10 rounded-lg transition-all group font-label-lg text-label-lg ${currentPath.startsWith('/receptionist/invoice') ? 'bg-white/10 text-white before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand-teal-light before:rounded-r-full relative' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span className={`material-symbols-outlined text-[20px] ${currentPath.startsWith('/receptionist/invoice') ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>receipt_long</span>
                <span>Invoices</span>
              </Link>
              <Link to="/receptionist/collect-payment" className={`flex items-center gap-space-sm px-space-md h-10 rounded-lg transition-all group font-label-lg text-label-lg ${currentPath.startsWith('/receptionist/collect-payment') ? 'bg-white/10 text-white before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-brand-teal-light before:rounded-r-full relative' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span className={`material-symbols-outlined text-[20px] ${currentPath.startsWith('/receptionist/collect-payment') ? 'text-brand-teal-light' : 'text-white/50 group-hover:text-white'}`}>payments</span>
                <span>Collect Payment</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
      
      <div className="p-space-md border-t border-white/10 bg-brand-navy-deep">
        <nav className="space-y-1">
          <Link to="/receptionist/settings" className="flex items-center gap-space-sm px-space-md h-9 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all group font-body-md text-body-md">
            <span className="material-symbols-outlined text-[18px] text-white/50 group-hover:text-white">settings</span>
            <span>Settings</span>
          </Link>
          <Link to="/receptionist/help-center" className="flex items-center gap-space-sm px-space-md h-9 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all group font-body-md text-body-md">
            <span className="material-symbols-outlined text-[18px] text-white/50 group-hover:text-white">help</span>
            <span>Help Center</span>
          </Link>
          <Link to="/" className="flex items-center gap-space-sm px-space-md h-9 rounded-lg text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-all group font-body-md text-body-md">
            <span className="material-symbols-outlined text-[18px] text-rose-300 group-hover:text-rose-200">logout</span>
            <span>Logout</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}
