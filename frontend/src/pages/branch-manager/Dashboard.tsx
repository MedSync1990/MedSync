import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.firstName || 'manager1';

  return (
    <div className="w-full max-w-7xl mx-auto py-8 flex flex-col gap-6">
      
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-50 to-white p-6 rounded-2xl border border-sky-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {userName}</h1>
          <p className="text-slate-500 mt-1">Here's what's happening at your branch today.</p>
        </div>
        <div className="flex items-center gap-2 text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="material-symbols-outlined text-slate-400">calendar_today</span>
          <span className="font-medium text-sm">Wednesday, October 7, 2026</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "TOTAL PATIENTS", val: "14", pct: "+ 27%", color: "text-blue-600", bg: "bg-blue-100", icon: "group" },
          { title: "TOTAL DOCTORS", val: "2", pct: "0%", color: "text-emerald-600", bg: "bg-emerald-100", icon: "medication" },
          { title: "TOTAL STAFF", val: "7", pct: "+ 17%", color: "text-purple-600", bg: "bg-purple-100", icon: "badge" },
          { title: "ACTIVE BRANCHES", val: "3", pct: "0%", color: "text-amber-600", bg: "bg-amber-100", icon: "domain" }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
              <span className="material-symbols-outlined text-[24px]">{kpi.icon}</span>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1">{kpi.val}</span>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-semibold ${kpi.pct.includes('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {kpi.pct.includes('+') ? '↑' : '→'} {kpi.pct} <span className="text-slate-400 font-normal">vs. last 7 days</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Section: Chart & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">monitoring</span>
              <h2 className="text-lg font-bold text-slate-900">Appointments Overview</h2>
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-sm">
              <button className="px-3 py-1 bg-primary text-white rounded-md shadow-sm font-medium">7 Days</button>
              <button className="px-3 py-1 text-slate-500 hover:text-slate-900 font-medium">30 Days</button>
              <button className="px-3 py-1 text-slate-500 hover:text-slate-900 font-medium">Custom</button>
            </div>
          </div>
          <div className="flex flex-1 gap-6">
            <div className="flex-1 border-r border-slate-100 pr-6 relative min-h-[200px]">
              {/* Dummy SVG Chart */}
              <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                <path d="M0,100 C50,60 100,50 150,80 C200,100 250,60 300,40 C350,50 400,20 450,40 C500,20 500,20 500,20" fill="none" stroke="#0ea5e9" strokeWidth="3" />
                <path d="M0,100 C50,60 100,50 150,80 C200,100 250,60 300,40 C350,50 400,20 450,40 C500,20 500,20 500,20 L500,150 L0,150 Z" fill="url(#grad)" opacity="0.2" />
                <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9"/><stop offset="100%" stopColor="white"/></linearGradient></defs>
              </svg>
              <div className="absolute bottom-0 left-0 right-6 flex justify-between text-xs text-slate-400">
                <span>Oct 1</span><span>Oct 2</span><span>Oct 3</span><span>Oct 4</span><span>Oct 5</span><span>Oct 6</span><span>Oct 7</span>
              </div>
            </div>
            <div className="w-40 flex flex-col justify-center gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                  <span className="text-xs font-semibold uppercase">Total Appts</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">73</div>
                <div className="text-xs text-emerald-500 font-medium">↑ 32% <span className="text-slate-400">vs last 7 days</span></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span><span className="text-sm font-medium text-slate-700">Completed</span></div>
                <span className="font-bold text-slate-900">61</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-rose-500 text-sm">cancel</span><span className="text-sm font-medium text-slate-700">Cancelled</span></div>
                <span className="font-bold text-slate-900">12</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">View All →</button>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { icon: 'event', color: 'text-emerald-600 bg-emerald-100', title: 'New appointment booked', desc: 'Patient: Nimal Perera · 09:30 AM', time: '12m ago' },
              { icon: 'description', color: 'text-sky-600 bg-sky-100', title: 'Treatment record updated', desc: 'Patient: Sanduni Fernando · Dr. Perera', time: '45m ago' },
              { icon: 'person_add', color: 'text-purple-600 bg-purple-100', title: 'New patient registered', desc: 'Patient: Lakshan Silva', time: '1h ago' },
              { icon: 'payments', color: 'text-emerald-600 bg-emerald-100', title: 'Payment received', desc: 'Patient: Kasun Wijesinghe · Rs. 5,000', time: '2h ago' },
              { icon: 'calendar_clock', color: 'text-sky-600 bg-sky-100', title: 'Staff schedule updated', desc: 'Dr. Nadeera Perera', time: '3h ago' },
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

      {/* Bottom Section: Appointments Table & Branch Perf */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Appointments */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              <h2 className="text-lg font-bold text-slate-900">Today's Appointments</h2>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">View All →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Doctor</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {[
                  { time: '09:30 AM', pat: 'Nimal Perera', doc: 'Dr. Sandun Perera', type: 'Consultation', stat: 'Scheduled' },
                  { time: '10:15 AM', pat: 'Shashika Silva', doc: 'Dr. Nadeera Perera', type: 'Follow Up', stat: 'Scheduled' },
                  { time: '11:00 AM', pat: 'Dilhani Wickramasinghe', doc: 'Dr. Sandun Perera', type: 'Consultation', stat: 'Scheduled' },
                  { time: '02:30 PM', pat: 'Amal Rathnayake', doc: 'Dr. Nadeera Perera', type: 'Treatment', stat: 'Scheduled' },
                  { time: '04:00 PM', pat: 'Pavithra Jayasinghe', doc: 'Dr. Sandun Perera', type: 'Consultation', stat: 'Scheduled' }
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{row.time}</td>
                    <td className="px-6 py-4">{row.pat}</td>
                    <td className="px-6 py-4">{row.doc}</td>
                    <td className="px-6 py-4">{row.type}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2.5 py-1 bg-sky-50 text-sky-600 rounded-md text-xs font-bold">{row.stat}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Branch Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              <h2 className="text-lg font-bold text-slate-900">Branch Performance</h2>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">This Week →</button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-medium">Revenue</p>
              <p className="text-lg font-extrabold text-slate-900">Rs. 486,000</p>
              <p className="text-xs text-emerald-500 font-bold mt-1">↑ 18%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Operations</p>
              <p className="text-lg font-extrabold text-slate-900">42</p>
              <p className="text-xs text-emerald-500 font-bold mt-1">↑ 24%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Patients</p>
              <p className="text-lg font-extrabold text-slate-900">14</p>
              <p className="text-xs text-emerald-500 font-bold mt-1">↑ 27%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Ins. vs Cash</p>
              <p className="text-lg font-extrabold text-slate-900">68% / 32%</p>
              <p className="text-xs text-emerald-500 font-bold mt-1">↑ 6%</p>
            </div>
          </div>

          <div className="mt-auto rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 p-4 text-white relative overflow-hidden flex flex-col justify-end min-h-[120px] shadow-inner cursor-pointer hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 opacity-10">
              <span className="material-symbols-outlined text-[100px] -mt-4 -mr-4">location_city</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <span className="material-symbols-outlined text-sm">location_on</span> Colombo Branch
              </div>
              <p className="text-xs text-white/80 mb-3">123 Galle Road, Colombo 3</p>
              <button className="text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-md backdrop-blur-sm w-fit">
                View Branch Details →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;