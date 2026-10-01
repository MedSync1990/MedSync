import { get, post, put } from './api';
import type { TreatmentItem } from '../types';

export const treatmentService = {
  list: (params?: { category?: string; search?: string; active_only?: boolean }) =>
    get<TreatmentItem[]>('/treatments', params),
  getCategories: () => get<string[]>('/treatments/categories'),
  get: (code: number) => get<TreatmentItem>(`/treatments/${code}`),
  create: (data: {
    treatment_name: string;
    category: string;
    price: number;
    is_eligible_for_insurance?: boolean;
  }) => post<TreatmentItem>('/treatments', data),
  update: (code: number, data: Partial<TreatmentItem>) =>
    put<TreatmentItem>(`/treatments/${code}`, data),
  deactivate: (code: number) =>
    put<TreatmentItem>(`/treatments/${code}/deactivate`),
};
