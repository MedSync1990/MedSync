import { get, put } from './api';

export const consultationService = {
  getConsultation: (appointmentId: number) =>
    get<any>(`/appointments/${appointmentId}/consultation`),
  completeAppointment: (appointmentId: number, data: any) =>
    put<any>(`/appointments/${appointmentId}/complete`, data),
};
