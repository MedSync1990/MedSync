import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getStatsOverview, getRecentActivity } from '../api';
import type { StatsOverview, ActivityItem } from '../api';
import { DoctorDashboard } from './doctor/DoctorDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const statsData = await getStatsOverview();
        setStats(statsData);

        // Only Receptionists see the activity feed in this spec (or Admin if we wanted)
        if (user?.role === 'Receptionist') {
          const activityData = await getRecentActivity({ limit: 10 });
          setActivity(activityData);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.role]);

  // If doctor, they shouldn't be here (they go to my-schedule or my-earnings)
  if (user?.role === 'Doctor') {
    return <DoctorDashboard />;
  }

  return (
    <div className="flex flex-col w-full px-space-md md:px-space-xl py-space-lg max-w-content-max-width mx-auto space-y-space-lg">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-display-lg text-display-lg text-brand-navy-deep tracking-tight">
            Welcome back, {user?.username}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {user?.role === 'Administrator' ? 'Administrator · All Branches' : `${user?.branchName || 'Branch'} · ${user?.role}`}
          </p>
        </div>
        <div className="self-start sm:self-auto text-sm text-secondary font-medium">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-body-lg text-brand-navy-deep">Loading dashboard...</p>
        </div>
      ) : error ? (
        <div className="bg-error-container/50 border border-error/20 text-error rounded-xl p-6 text-center shadow-sm">
          <p className="font-body-md">{error}</p>
        </div>
      ) : (
        <>
          {/* Quick Stats Row (Admin / BM see 4 tiles, Receptionist sees 3 for appointments) */}
          {user?.role === 'Receptionist' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <StatCard title="Scheduled Today" value={stats?.today_appointments.scheduled || 0} icon="schedule" colorClass="text-brand-navy-deep" />
              <StatCard title="Completed Today" value={stats?.today_appointments.completed || 0} icon="check_circle" colorClass="text-status-completed-text" />
              <StatCard title="Cancelled Today" value={stats?.today_appointments.cancelled || 0} icon="cancel" colorClass="text-status-cancelled-text" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              <StatCard title="Total Patients" value={stats?.total_patients || 0} icon="personal_injury" />
              <StatCard title="Total Doctors" value={stats?.total_doctors || 0} icon="medical_services" />
              <StatCard title="Total Staff" value={stats?.total_staff || 0} icon="badge" />
              <StatCard title="Active Branches" value={stats?.total_branches || 0} icon="domain" />
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
            
            {/* Left Column (Wider) */}
            <div className="lg:col-span-2 space-y-space-lg">
              
              {/* Quick Actions */}
              <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs">
                <h3 className="font-headline-sm text-brand-navy-deep mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {user?.role === 'Receptionist' ? (
                    <>
                      <QuickActionCard title="Register Patient" icon="person_add" to="/receptionist/register-patient" />
                      <QuickActionCard title="Book Appt" icon="calendar_today" to="/receptionist/book-appointment" />
                      <QuickActionCard title="Invoices" icon="receipt_long" to="/receptionist/invoices" />
                    </>
                  ) : (
                    <>
                      <QuickActionCard title="Manage Staff" icon="badge" to="/admin/staff" />
                      <QuickActionCard title="Reports" icon="monitoring" to="/reports" />
                      {user?.role === 'Administrator' && <QuickActionCard title="Manage Branches" icon="domain" to="/admin/branches" />}
                    </>
                  )}
                </div>
              </div>

              {/* Today's Appointments overview (For Admin/BM) */}
              {user?.role !== 'Receptionist' && (
                <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-headline-sm text-brand-navy-deep">Today's Appointments</h3>
                    <Link to="/appointments" className="text-primary hover:underline text-sm font-medium">View All</Link>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-status-scheduled-bg/50 border border-status-scheduled-bg rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-brand-navy-deep font-mono-data">{stats?.today_appointments.scheduled || 0}</div>
                      <div className="text-xs text-secondary uppercase tracking-wider font-semibold mt-1">Scheduled</div>
                    </div>
                    <div className="flex-1 bg-status-completed-bg/30 border border-status-completed-text/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-status-completed-text font-mono-data">{stats?.today_appointments.completed || 0}</div>
                      <div className="text-xs text-secondary uppercase tracking-wider font-semibold mt-1">Completed</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column (Sidebar) */}
            <div className="space-y-space-lg">
              
              {/* Recent Activity (Mainly for Receptionist, but nice to have) */}
              {(user?.role === 'Receptionist' || true) && (
                <div className="bg-surface-card rounded-xl border border-border-subtle shadow-xs overflow-hidden flex flex-col h-full max-h-[400px]">
                  <div className="p-space-md border-b border-border-subtle bg-surface-subtle/30">
                    <h3 className="font-headline-sm text-brand-navy-deep">Recent Activity</h3>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-4">
                    {activity.length === 0 ? (
                      <p className="text-sm text-secondary text-center py-4">No recent activity found.</p>
                    ) : (
                      activity.map(item => (
                        <div key={item.id} className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center shrink-0 mt-0.5 text-secondary">
                            <span className="material-symbols-outlined text-[16px]">
                              {item.action_type === 'INSERT' ? 'add_circle' : item.action_type === 'UPDATE' ? 'edit' : 'delete'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-brand-navy-deep">{item.description}</p>
                            <p className="text-xs text-secondary mt-0.5">
                              {new Date(item.created_at).toLocaleString()} · {item.performed_by}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>
        </>
      )}
    </div>
  );
};

// -- Helpers --

function StatCard({ title, value, icon, colorClass = 'text-primary' }: { title: string; value: string | number; icon: string; colorClass?: string }) {
  return (
    <div className="bg-surface-card rounded-xl border border-border-subtle p-space-md shadow-xs flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-surface-subtle flex items-center justify-center ${colorClass}`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div>
        <p className="font-label-sm text-secondary tracking-wider uppercase mb-1">{title}</p>
        <p className="font-display-lg text-brand-navy-deep font-mono-data tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function QuickActionCard({ title, icon, to }: { title: string; icon: string; to: string }) {
  return (
    <Link to={to} className="group bg-surface-subtle hover:bg-primary hover:text-white rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors border border-border-subtle hover:border-primary">
      <span className="material-symbols-outlined text-[28px] text-primary group-hover:text-white mb-2 transition-colors">{icon}</span>
      <span className="font-label-sm font-medium text-brand-navy-deep group-hover:text-white transition-colors">{title}</span>
    </Link>
  );
}
