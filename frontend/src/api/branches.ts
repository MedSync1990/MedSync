import { get, post, put } from './client';
import type { BranchResponse } from './types';

export interface BranchCreatePayload {
  name: string;
  address: string;
  phone_number: string;
  branch_manager_id?: number | null;
}

export interface BranchUpdatePayload {
  name?: string;
  address?: string;
  phone_number?: string;
  branch_manager_id?: number | null;
}

export function listBranches(): Promise<BranchResponse[]> {
  return get<BranchResponse[]>('/branches');
}

export function getBranch(branchId: number): Promise<BranchResponse> {
  return get<BranchResponse>(`/branches/${branchId}`);
}

export function createBranch(payload: BranchCreatePayload): Promise<BranchResponse> {
  return post<BranchResponse>('/branches', payload);
}

export function updateBranch(branchId: number, payload: BranchUpdatePayload): Promise<BranchResponse> {
  return put<BranchResponse>(`/branches/${branchId}`, payload);
}

export function deactivateBranch(branchId: number): Promise<BranchResponse> {
  return put<BranchResponse>(`/branches/${branchId}/deactivate`);
}

export function reactivateBranch(branchId: number): Promise<BranchResponse> {
  return put<BranchResponse>(`/branches/${branchId}/reactivate`);
}

