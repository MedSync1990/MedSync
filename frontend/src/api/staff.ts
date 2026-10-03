import { get, post, put } from './client';
import type { StaffListResponse, StaffCreatePayload } from './types';

export function getStaffList(branchId?: number): Promise<StaffListResponse> {
  const query = branchId ? { branch_id: branchId } : undefined;
  return get<StaffListResponse>('/staff', query);
}

export function createStaff(payload: StaffCreatePayload): Promise<{ message: string; user_id: number; username: string; temporary_password: string }> {
  return post('/staff', payload);
}

export function deactivateStaff(userId: number): Promise<{ message: string; user_id: number }> {
  return put(`/staff/${userId}/deactivate`);
}
