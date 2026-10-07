import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.firstName || 'manager1';

  return (
    <div className="w-full max-w-7xl mx-auto py-8 flex flex-col gap-6">
      
      {/* Welcome Header */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-50 to-sky-100 p-6 rounded-2xl border border-sky-200">
        
        {/* Background Building Image with Fade Mask */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-2/3 md:w-1/2 pointer-events-none mix-blend-multiply opacity-50"
          style={{ 
            maskImage: 'linear-gradient(to right, transparent, black 60%)', 
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)' 
          }}
        >
          <img 
            src="/i1.png" 
            alt="MedSync Facility" 
            className="w-full h-full object-cover object-center" 
          />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {userName}</h1>
          <p className="text-slate-600 mt-1">Here is your branch overview for today.</p>
        </div>
        
        <div className="relative z-10 flex items-center gap-2 text-slate-700 bg-white/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/50 shadow-sm">
          <span className="material-symbols-outlined text-primary">calendar_today</span>
          <span className="font-medium text-sm">Oct 7, 2026</span>
        </div>
      </div>

      {/* KPI Cards (Simplified) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "TOTAL PATIENTS", val: "14", color: "text-blue-600", bg: "bg-blue-100", icon: "group" },
          { title: "TOTAL DOCTORS", val: "2", color: "text-emerald-600", bg: "bg-emerald-100", icon: "medication" },
          { title: "TOTAL STAFF", val: "7", color: "text-purple-600", bg: "bg-purple-100", icon: "badge" },
          { title: "ACTIVE BRANCHES", val: "3", color: "text-amber-600", bg: "bg-amber-100", icon: "domain" }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
              <span className="material-symbols-outlined text-[24px]">{kpi.icon}</span>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{kpi.val}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Section: Appointments Table & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Appointments (Takes 2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              <h2 className="text-lg font-bold text-slate-900">Today's Appointments</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Doctor</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {[
                  { time: '09:30 AM', pat: 'Nimal Perera', doc: 'Dr. Sandun Perera', stat: 'Scheduled' },
                  { time: '10:15 AM', pat: 'Shashika Silva', doc: 'Dr. Nadeera Perera', stat: 'Scheduled' },
                  { time: '11:00 AM', pat: 'Dilhani Wickramasinghe', doc: 'Dr. Sandun Perera', stat: 'Scheduled' }
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.time}</td>
                    <td className="px-6 py-4">{row.pat}</td>
                    <td className="px-6 py-4">{row.doc}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2.5 py-1 bg-sky-50 text-sky-600 rounded-md text-xs font-bold">{row.stat}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity (Takes 1/3 width) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
            </div>
          </div>
          <div className="flex flex-col gap-5 flex-1">
            {[
              { icon: 'event', color: 'text-emerald-600 bg-emerald-100', title: 'New appointment booked', desc: 'Nimal Perera · 09:30 AM', time: '12m ago' },
              { icon: 'payments', color: 'text-sky-600 bg-sky-100', title: 'Payment received', desc: 'Kasun Wijesinghe · Rs. 5,000', time: '2h ago' },
              { icon: 'person_add', color: 'text-purple-600 bg-purple-100', title: 'New patient registered', desc: 'Lakshan Silva', time: '3h ago' },
            ].map((act, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.color}`}>
                  <span className="material-symbols-outlined text-[16px]">{act.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{act.title}</p>
                  <p className="text-xs text-slate-500 truncate">{act.desc}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;