/**
 * MedSync — Patient API endpoints
 *
 * Covers: patient CRUD, search, allergy management
 * Owner: Chenith (stub — fill in detail when building patient pages)
 */

import { get, post, put } from './client';
import type { PaginatedResponse, PatientResponse } from './types';

/** List / search patients (paginated) */
export function listPatients(params?: {
  page?: number;
  limit?: number;
  search?: string;
  branch?: number;
}): Promise<PaginatedResponse<PatientResponse>> {
  return get<PaginatedResponse<PatientResponse>>('/patients', params);
}

/** Get a single patient by ID */
export function getPatient(patientId: number): Promise<PatientResponse> {
  return get<PatientResponse>(`/patients/${patientId}`);
}

/** Search patients by NIC */
export function searchByNic(nic: string): Promise<PatientResponse[]> {
  return get<PatientResponse[]>('/patients/search', { nic });
}

/** Register a new patient */
export function createPatient(data: {
  first_name: string;
  last_name: string;
  id_number: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  phone_number: string;
  email?: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
}): Promise<PatientResponse> {
  return post<PatientResponse>('/patients', data);
}

/** Update a patient record */
export function updatePatient(
  patientId: number,
  data: Partial<Parameters<typeof createPatient>[0]>,
): Promise<PatientResponse> {
  return put<PatientResponse>(`/patients/${patientId}`, data);
}

/** Deactivate (soft-delete) a patient */
export function deactivatePatient(patientId: number): Promise<PatientResponse> {
  return put<PatientResponse>(`/patients/${patientId}/deactivate`);
}
