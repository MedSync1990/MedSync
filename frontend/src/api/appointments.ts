/**
 * MedSync — Appointment API endpoints
 *
 * Covers: GET/POST appointments, walk-in, reschedule, cancel, doctor slots
 * Owner: Kalana (stub — fill in detail when building appointment pages)
 */

import { get, post, put } from './client';
import type {
  PaginatedResponse,
  AppointmentResponse,
  AppointmentBookRequest,
  WalkInAppointmentRequest,
  AppointmentRescheduleRequest,
  DoctorSlotResponse,
} from './types';

/** List appointments with optional filters (paginated) */
export function listAppointments(params?: {
  page?: number;
  limit?: number;
  branch?: number;
  doctor?: number;
  patient?: number;
  status?: string;
  date?: string;
}): Promise<PaginatedResponse<AppointmentResponse>> {
  return get<PaginatedResponse<AppointmentResponse>>('/appointments', params);
}

/** Get a single appointment by ID */
export function getAppointment(id: number): Promise<AppointmentResponse> {
  return get<AppointmentResponse>(`/appointments/${id}`);
}

/** Book a scheduled appointment against an existing open slot */
export function bookAppointment(data: AppointmentBookRequest): Promise<AppointmentResponse> {
  return post<AppointmentResponse>('/appointments', data);
}

/** Book an emergency walk-in appointment (no prior slot needed) */
export function bookWalkIn(data: WalkInAppointmentRequest): Promise<AppointmentResponse> {
  return post<AppointmentResponse>('/appointments/walk-in', data);
}

/** Reschedule an existing appointment to a new slot */
export function rescheduleAppointment(
  appointmentId: number,
  data: AppointmentRescheduleRequest,
): Promise<AppointmentResponse> {
  return put<AppointmentResponse>(`/appointments/${appointmentId}/reschedule`, data);
}

/** Cancel a scheduled appointment */
export function cancelAppointment(appointmentId: number): Promise<AppointmentResponse> {
  return put<AppointmentResponse>(`/appointments/${appointmentId}/cancel`);
}

/** Get a doctor's available time slots for a given date */
export function getDoctorSlots(
  doctorId: number,
  date: string,
  includeBooked?: boolean,
): Promise<DoctorSlotResponse[]> {
  return get<DoctorSlotResponse[]>(`/doctors/${doctorId}/availability`, { date, include_booked: includeBooked });
}
