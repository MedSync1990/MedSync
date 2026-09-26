/**
 * MedSync — Report API endpoints
 *
 * Covers all 6 report routes from api-routes.md §10.
 * Owner: Ashen (these power Ashen's own report pages)
 */

import { get } from './client';
import type {
  AppointmentsSummaryResponse,
  DoctorRevenueResponse,
  ItemizedPaymentResponse,
  OutstandingBalancesResponse,
  TreatmentCategoriesResponse,
  InsuranceVsOutOfPocketResponse,
} from './types';

// ─── Query-param types ──────────────────────────────────────────────────────

export interface AppointmentsSummaryParams {
  branch?: number;
  date?: string;   // ISO date (YYYY-MM-DD)
}

export interface DoctorRevenueParams {
  from?: string;    // ISO date
  to?: string;      // ISO date
  branch?: number;
  doctor?: number;
}

export interface ItemizedPaymentParams {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface OutstandingBalancesParams {
  branch?: number;
}

export interface TreatmentCategoriesParams {
  from?: string;
  to?: string;
  branch?: number;
}

export interface InsuranceVsOutOfPocketParams {
  from?: string;
  to?: string;
  branch?: number;
}

// ─── Endpoint functions ─────────────────────────────────────────────────────

/** Branch Appointment Summary report (A, BM) */
export function getAppointmentsSummary(
  params?: AppointmentsSummaryParams,
): Promise<AppointmentsSummaryResponse> {
  const query = params ? {
    branch_id: params.branch,
    start_date: params.date, // frontend passes single 'date' string
    end_date: params.date,
  } : undefined;
  return get<AppointmentsSummaryResponse>('/reports/appointments-summary', query);
}

/** Doctor Revenue aggregate report (A, BM, D) */
export function getDoctorRevenue(
  params?: DoctorRevenueParams,
): Promise<DoctorRevenueResponse> {
  const query = params ? {
    branch_id: params.branch,
    doctor_id: params.doctor,
    start_date: params.from,
    end_date: params.to,
  } : undefined;
  return get<DoctorRevenueResponse>('/reports/doctor-revenue', query);
}

/** Doctor Itemized Payments — line-by-line payment detail (A, BM own branch, D self) */
export function getDoctorItemizedPayments(
  doctorId: number,
  params?: ItemizedPaymentParams,
): Promise<ItemizedPaymentResponse> {
  const query = params ? {
    start_date: params.from,
    end_date: params.to,
    page: params.page,
    limit: params.limit,
  } : undefined;
  return get<ItemizedPaymentResponse>(`/reports/doctor-revenue/${doctorId}/payments`, query);
}

/** Outstanding Balances report (A, BM) */
export function getOutstandingBalances(
  params?: OutstandingBalancesParams,
): Promise<OutstandingBalancesResponse> {
  const query = params ? { branch_id: params.branch } : undefined;
  return get<OutstandingBalancesResponse>('/reports/outstanding-balances', query);
}

/** Treatment Category Breakdown report (A, BM) */
export function getTreatmentCategories(
  params?: TreatmentCategoriesParams,
): Promise<TreatmentCategoriesResponse> {
  const query = params ? {
    branch_id: params.branch,
    start_date: params.from,
    end_date: params.to,
  } : undefined;
  return get<TreatmentCategoriesResponse>('/reports/treatment-categories', query);
}

/** Insurance vs Out-of-Pocket report (A, BM) */
export function getInsuranceVsOutOfPocket(
  params?: InsuranceVsOutOfPocketParams,
): Promise<InsuranceVsOutOfPocketResponse> {
  const query = params ? {
    branch_id: params.branch,
    start_date: params.from,
    end_date: params.to,
  } : undefined;
  return get<InsuranceVsOutOfPocketResponse>('/reports/insurance-vs-out-of-pocket', query);
}
