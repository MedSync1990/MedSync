/**
 * MedSync — Billing, Payment & Insurance API endpoints
 *
 * Covers: invoice lookup, payment recording, patient balance, insurance
 * Owner: Shavinda
 */

import { get, post } from './client';
import type {
  InvoiceDetailResponse,
  PatientInvoicesResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
  PatientBalanceResponse,
  PatientInsuranceResponse,
  VerifyInsuranceRequest,
  VerifyInsuranceResponse,
} from './types.ts';

/** Get a single invoice by code or patient NIC */
export function getInvoice(
  identifier: string,
  type: 'invoice' | 'nic' = 'invoice',
): Promise<InvoiceDetailResponse> {
  return get<InvoiceDetailResponse>(`/invoices/${encodeURIComponent(identifier)}`, { type });
}

/** List invoices for a specific patient */
export function getPatientInvoices(patientId: number): Promise<PatientInvoicesResponse> {
  return get<PatientInvoicesResponse>(`/patients/${patientId}/invoices`);
}

/** Record a payment against an invoice */
export function recordPayment(
  invoiceIdentifier: string,
  data: RecordPaymentRequest,
): Promise<RecordPaymentResponse> {
  return post<RecordPaymentResponse>(
    `/invoices/${encodeURIComponent(invoiceIdentifier)}/payments`,
    data,
  );
}

/** Get a patient's total outstanding balance */
export function getPatientBalance(patientId: number): Promise<PatientBalanceResponse> {
  return get<PatientBalanceResponse>(`/patients/${patientId}/balance`);
}

/** Get a patient's insurance policy details (api-routes.md §9) */
export function getPatientInsurance(patientId: number): Promise<PatientInsuranceResponse> {
  return get<PatientInsuranceResponse>(`/insurance/patient/${patientId}`);
}

/** Verify and link an insurance policy to a patient (api-routes.md §9) */
export function verifyInsurance(data: VerifyInsuranceRequest): Promise<VerifyInsuranceResponse> {
  return post<VerifyInsuranceResponse>('/insurance/verify', data);
}
