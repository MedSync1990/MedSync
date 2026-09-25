import { get, put } from './api';
import type {
  AppointmentCompleteRequest,
  AppointmentCompleteResponse,
  AppointmentItem,
} from '../types';

export const consultationService = {
  getConsultation: (appointmentId: number) =>
    get<any>(`/appointments/${appointmentId}/consultation`),
  completeAppointment: (appointmentId: number, data: AppointmentCompleteRequest) =>
    put<AppointmentCompleteResponse>(`/appointments/${appointmentId}/complete`, data),
  listAppointments: (params?: { status?: string; patient_id?: number; doctor_id?: number }) =>
    get<AppointmentItem[]>('/appointments', params),
  getAppointment: (appointmentId: number) =>
    get<AppointmentItem>(`/appointments/${appointmentId}`),
};
