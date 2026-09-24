import { get } from './api';
import type {
  AppointmentsSummaryResponse,
  DoctorRevenueResponse,
  ItemizedPaymentResponse,
  OutstandingBalancesResponse,
  TreatmentCategoriesResponse,
  InsuranceVsOutOfPocketResponse,
} from '../types';

export const reportService = {
  getAppointmentsSummary: (params?: { start_date?: string; end_date?: string; branch_id?: number }) =>
    get<AppointmentsSummaryResponse>('/reports/appointments-summary', params),
  getDoctorRevenue: (params?: { start_date?: string; end_date?: string; branch_id?: number }) =>
    get<DoctorRevenueResponse>('/reports/doctor-revenue', params),
  getItemizedPayments: (doctorId: number, params?: { start_date?: string; end_date?: string; page?: number; limit?: number }) =>
    get<ItemizedPaymentResponse>(`/reports/doctor-revenue/${doctorId}/payments`, params),
  getOutstandingBalances: (params?: { min_balance?: number; branch_id?: number; page?: number; limit?: number }) =>
    get<OutstandingBalancesResponse>('/reports/outstanding-balances', params),
  getTreatmentCategories: (params?: { start_date?: string; end_date?: string }) =>
    get<TreatmentCategoriesResponse>('/reports/treatment-categories', params),
  getInsuranceVsOutOfPocket: (params?: { start_date?: string; end_date?: string }) =>
    get<InsuranceVsOutOfPocketResponse>('/reports/insurance-vs-out-of-pocket', params),
};
