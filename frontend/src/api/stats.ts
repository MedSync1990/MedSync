/**
 * MedSync — Stats / Dashboard API endpoints
 *
 * Powers the Dashboard widgets for Admin, Branch Manager, and Receptionist.
 * Owner: Ashen
 */

import { get } from './client';
import type { StatsOverview, ActivityItem } from './types';

/** System-wide (or branch-scoped) overview stats for the dashboard */
export function getStatsOverview(params?: {
  branch?: number;
}): Promise<StatsOverview> {
  return get<StatsOverview>('/stats/overview', params);
}

/** Recent activity feed (from audit_log) for the receptionist dashboard */
export function getRecentActivity(params?: {
  limit?: number;
  branch?: number;
}): Promise<ActivityItem[]> {
  return get<ActivityItem[]>('/stats/activity', params);
}
