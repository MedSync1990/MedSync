import { get, post, put } from './client';

export interface TreatmentApiItem {
  treatment_code: number;
  treatment_name: string;
  category: string;
  price: string | number;
  is_eligible_for_insurance: boolean;
  is_active: boolean;
}

export interface TreatmentWriteRequest {
  treatment_name: string;
  category: string;
  price: number;
  is_eligible_for_insurance: boolean;
}

export function listTreatments(includeInactive = true): Promise<TreatmentApiItem[]> {
  return get<TreatmentApiItem[]>('/treatments', { include_inactive: includeInactive });
}

export function createTreatment(data: TreatmentWriteRequest): Promise<TreatmentApiItem> {
  return post<TreatmentApiItem>('/treatments', data);
}

export function updateTreatment(code: number, data: TreatmentWriteRequest): Promise<TreatmentApiItem> {
  return put<TreatmentApiItem>(`/treatments/${code}`, data);
}

export function deactivateTreatment(code: number): Promise<{ message: string; treatment_code: number }> {
  return put<{ message: string; treatment_code: number }>(`/treatments/${code}/deactivate`);
}
