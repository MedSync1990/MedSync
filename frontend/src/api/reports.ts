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
  return get<AppointmentsSummaryResponse>('/reports/appointments-summary', params);
}

/** Doctor Revenue aggregate report (A, BM, D) */
export function getDoctorRevenue(
  params?: DoctorRevenueParams,
): Promise<DoctorRevenueResponse> {
  return get<DoctorRevenueResponse>('/reports/doctor-revenue', params);
}

/** Doctor Itemized Payments — line-by-line payment detail (A, BM own branch, D self) */
export function getDoctorItemizedPayments(
  doctorId: number,
  params?: ItemizedPaymentParams,
): Promise<ItemizedPaymentResponse> {
  return get<ItemizedPaymentResponse>(`/reports/doctor-revenue/${doctorId}/payments`, params);
}

/** Outstanding Balances report (A, BM) */
export function getOutstandingBalances(
  params?: OutstandingBalancesParams,
): Promise<OutstandingBalancesResponse> {
  return get<OutstandingBalancesResponse>('/reports/outstanding-balances', params);
}

/** Treatment Category Breakdown report (A, BM) */
export function getTreatmentCategories(
  params?: TreatmentCategoriesParams,
): Promise<TreatmentCategoriesResponse> {
  return get<TreatmentCategoriesResponse>('/reports/treatment-categories', params);
}

/** Insurance vs Out-of-Pocket report (A, BM) */
export function getInsuranceVsOutOfPocket(
  params?: InsuranceVsOutOfPocketParams,
): Promise<InsuranceVsOutOfPocketResponse> {
  return get<InsuranceVsOutOfPocketResponse>('/reports/insurance-vs-out-of-pocket', params);
}
