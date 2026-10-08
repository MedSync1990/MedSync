import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStatsOverview, getRecentActivity, listAppointments } from '../../api';
import type { StatsOverview, ActivityItem, AppointmentResponse } from '../../api/types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.firstName || 'Manager';
  const branchName = user?.branchName || 'Colombo Branch';

  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format for API
        
        const [statsRes, activityRes, apptRes] = await Promise.all([
          getStatsOverview(),
          getRecentActivity(),
          listAppointments({ date: today, limit: 5 }) // Fetch top 5 for today
        ]);

        setStats(statsRes);
        // Take only the 3 most recent activities for the compact UI
        setActivities((activityRes || []).slice(0, 3));
        setAppointments(apptRes?.data || []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Helpers to format dynamic data
  const fmt = (n: number) => `LKR ${(Number(n) || 0).toLocaleString('en-US')}`;
  
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityStyling = (actionType: string, desc: string) => {
    const str = `${actionType} ${desc}`.toLowerCase();
    if (str.includes('payment') || str.includes('invoice')) return { icon: 'payments', color: 'text-sky-600 bg-sky-100' };
    if (str.includes('patient') || str.includes('register')) return { icon: 'person_add', color: 'text-purple-600 bg-purple-100' };
    if (str.includes('cancel')) return { icon: 'free_cancellation', color: 'text-rose-600 bg-rose-100' };
    return { icon: 'event', color: 'text-emerald-600 bg-emerald-100' };
  };

  // Calculate simple "time ago" string
  const timeAgo = (dateString: string) => {
    if (!dateString) return 'Just now';
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading || !stats) {
    return (
      <div className="w-full max-w-7xl mx-auto py-8 flex flex-col gap-6 items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined text-[32px] text-primary animate-spin">sync</span>
        <p className="text-secondary font-medium mt-2">Loading branch operations...</p>
      </div>
    );
  }

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
          <span className="font-medium text-sm">{todayStr}</span>
        </div>
      </div>

      {/* KPI Cards (Live Data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "TOTAL PATIENTS", val: stats.total_patients.toLocaleString(), color: "text-blue-600", bg: "bg-blue-100", icon: "group" },
          { title: "TOTAL DOCTORS", val: stats.total_doctors.toString(), color: "text-emerald-600", bg: "bg-emerald-100", icon: "medication" },
          { title: "TOTAL STAFF", val: stats.total_staff.toString(), color: "text-purple-600", bg: "bg-purple-100", icon: "badge" },
          { title: "ACTIVE BRANCHES", val: stats.total_branches.toString(), color: "text-amber-600", bg: "bg-amber-100", icon: "domain" }
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
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">
              {stats.total_appointments_today} Total
            </span>
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
                {appointments.length > 0 ? (
                  appointments.map((row, i) => {
                    const isCompleted = row.status === 'Completed';
                    const isCancelled = row.status === 'Cancelled';
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{formatTime(row.start_time)}</td>
                        <td className="px-6 py-4 truncate max-w-[150px]">{row.patient_name}</td>
                        <td className="px-6 py-4 truncate max-w-[150px]">{row.doctor_name}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            isCompleted ? 'bg-emerald-50 text-emerald-600' :
                            isCancelled ? 'bg-rose-50 text-rose-600' :
                            'bg-sky-50 text-sky-600'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">event_busy</span>
                      <p>No appointments scheduled for today yet.</p>
                    </td>
                  </tr>
                )}
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
            {activities.length > 0 ? (
              activities.map((act, i) => {
                const style = getActivityStyling(act.action_type, act.description);
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.color}`}>
                      <span className="material-symbols-outlined text-[16px]">{style.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{act.action_type}</p>
                      <p className="text-xs text-slate-500 truncate" title={act.description}>{act.description}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {timeAgo(act.created_at || act.timestamp || '')}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[150px]">
                <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">history</span>
                <p className="text-sm">No recent activity.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Section: Branch Performance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            <h2 className="text-lg font-bold text-slate-900">Branch Performance (Today)</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Daily Revenue</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{fmt(stats.total_revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Appointments</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.total_appointments_today}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Completed Appts</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">{stats.today_appointments.completed}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Pending Invoices</p>
            <p className="text-xl font-extrabold text-amber-600 mt-1">{stats.pending_invoices}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white relative overflow-hidden flex flex-col justify-end min-h-[120px] shadow-inner">
          <div className="absolute top-0 right-0 opacity-10">
            <span className="material-symbols-outlined text-[100px] -mt-4 -mr-4">location_city</span>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <span className="material-symbols-outlined text-sm text-brand-teal-light">location_on</span> {branchName}
            </div>
            <p className="text-xs text-slate-300">Live MedSync Operational Scope</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;