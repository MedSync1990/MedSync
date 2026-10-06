/**
 * MedSync — Report API endpoints
 *
 * Covers all 6 report routes from api-routes.md §10.
 * Owner: Ashen (these power Ashen's own report pages)
 */

import { get, post, patch } from './client';
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
  appointment_type?: string;
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
    appointment_type: params.appointment_type,
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
/**
 * Utility function to trigger a CSV file download from an array of objects
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? '' : row[header];
      cell = String(cell).replace(/"/g, '""');
      return `"${cell}"`;
    }).join(',')
  );
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Doctor Earnings & Payouts ──────────────────────────────────────────────

export interface DoctorEarningsOverviewResponse {
  total_earned: number;
  paid_by_hospital: number;
  outstanding: number;
}

export interface BankAccountItem {
  account_id: number;
  bank_name: string;
  account_number: string;
  branch_name: string | null;
  is_default: boolean;
}

export interface PayoutRequestItem {
  request_id: number;
  account_id: number;
  request_amount: number;
  status: string;
  request_date: string;
  processed_date: string | null;
  remarks: string | null;
  bank_name: string;
  account_number: string;
}

export interface PayoutHistoryItem {
  payout_id: number;
  amount_paid: number;
  payment_reference: string;
  payment_method: string;
  payment_date: string;
  bank_name: string;
  account_number: string;
}

/** Get Doctor Earnings Overview (Total, Paid, Outstanding) */
export function getDoctorEarningsOverview(doctorId: number): Promise<DoctorEarningsOverviewResponse> {
  return get<DoctorEarningsOverviewResponse>(`/reports/doctor-earnings/${doctorId}`);
}

/** Get Doctor Bank Accounts */
export function getDoctorBankAccounts(doctorId: number): Promise<{ data: BankAccountItem[] }> {
  return get<{ data: BankAccountItem[] }>(`/reports/doctor-earnings/${doctorId}/bank-accounts`);
}

/** Get Doctor Payout Requests */
export function getDoctorPayoutRequests(doctorId: number): Promise<{ data: PayoutRequestItem[] }> {
  return get<{ data: PayoutRequestItem[] }>(`/reports/doctor-earnings/${doctorId}/payout-requests`);
}

/** Get Doctor Payout History (Actual payments made) */
export function getDoctorPayouts(doctorId: number): Promise<{ data: PayoutHistoryItem[] }> {
  return get<{ data: PayoutHistoryItem[] }>(`/reports/doctor-earnings/${doctorId}/payouts`);
}

/** Create a new Payout Request */
export function createDoctorPayoutRequest(
  doctorId: number,
  payload: { account_id: number; request_amount: number }
): Promise<{ message: string; request_id: number }> {
  // Assuming you have a 'post' function exported from './client'
  return post(`/reports/doctor-earnings/${doctorId}/payout-requests`, payload);
}

// ─── Admin Doctor Payment Approval ──────────────────────────────────────────

export interface AdminPayoutRequestItem {
  request_id: number;
  user_id: number;
  doctor_name: string;
  specialty: string;
  branch_name: string;
  account_id: number;
  bank_name: string;
  account_number: string;
  request_amount: number;
  status: string;
  request_date: string;
  processed_date: string | null;
  remarks: string | null;
}

export interface AdminPayoutRequestsResponse {
  data: AdminPayoutRequestItem[];
  total: number;
}

/** Get all doctor payout requests (Admin/Branch Manager view) */
export function getAllPayoutRequests(params?: {
  branch?: number;
  status?: string;
}): Promise<AdminPayoutRequestsResponse> {
  return get<AdminPayoutRequestsResponse>('/reports/doctor-payments', {
    branch_id: params?.branch,
    status: params?.status,
  });
}

/** Pay a payout request */
export function payPayoutRequest(
  requestId: number,
  remarks?: string
): Promise<{ message: string; request_id: number }> {
  return patch(`/reports/doctor-payments/${requestId}/pay`, { remarks });
}

/** Reject a payout request */
export function rejectPayoutRequest(
  requestId: number,
  remarks: string
): Promise<{ message: string; request_id: number }> {
  return patch(`/reports/doctor-payments/${requestId}/reject`, { remarks });
}