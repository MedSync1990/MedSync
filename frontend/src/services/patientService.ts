import { get, post, put } from './api';
import type { PatientResponse, PatientListItem, PaginatedResponse, AllergyItem } from '../types';

export const patientService = {
  list: (params?: {
    search?: string;
    branch?: string;
    insurance?: string;
    page?: number;
    limit?: number;
  }) => get<PaginatedResponse<PatientListItem>>('/patients', params),
  getById: (id: string | number) => get<PatientResponse>(`/patients/${id}`),
  create: (data: any) => post<PatientResponse>('/patients', data),
  update: (id: string | number, data: any) => put<PatientResponse>(`/patients/${id}`, data),
  getAllergies: () => get<AllergyItem[]>('/allergies'),
  getPatientAllergies: (id: string | number) => get<AllergyItem[]>(`/patients/${id}/allergies`),
  updatePatientAllergies: (id: string | number, allergy_ids: number[]) =>
    put<AllergyItem[]>(`/patients/${id}/allergies`, { allergy_ids }),
};


