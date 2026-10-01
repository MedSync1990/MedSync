import { get, post, put } from './api';
import type {
  AppointmentResponse,
  AppointmentListResponse,
  DoctorSlotResponse,
  AppointmentBookRequest,
  WalkInAppointmentRequest,
  AppointmentRescheduleRequest,
} from '../types';

export const appointmentService = {
  getAvailability: (doctorId: number, date: string, includeBooked?: boolean) =>
    get<DoctorSlotResponse[]>(`/doctors/${doctorId}/availability`, { date, include_booked: includeBooked }),
  list: (params?: { branch?: number; date?: string; status?: string; doctor?: number; page?: number; limit?: number }) =>
    get<AppointmentListResponse>('/appointments', params),
  getById: (id: number) => get<AppointmentResponse>(`/appointments/${id}`),
  book: (data: AppointmentBookRequest) => post<AppointmentResponse>('/appointments', data),
  createWalkIn: (data: WalkInAppointmentRequest) =>
    post<AppointmentResponse>('/appointments/walk-in', data),
  reschedule: (id: number, data: AppointmentRescheduleRequest) =>
    put<AppointmentResponse>(`/appointments/${id}/reschedule`, data),
  cancel: (id: number) => put<AppointmentResponse>(`/appointments/${id}/cancel`),
};
