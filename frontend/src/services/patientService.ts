import { get, post, put } from './api';
import type { PatientResponse, PaginatedResponse } from '../types';

export const patientService = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    get<PaginatedResponse<PatientResponse>>('/patients', params),
  getById: (id: number) => get<PatientResponse>(`/patients/${id}`),
  create: (data: any) => post<PatientResponse>('/patients', data),
  update: (id: number, data: any) => put<PatientResponse>(`/patients/${id}`, data),
};
