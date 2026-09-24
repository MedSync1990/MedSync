/**
 * MedSync — Billing & Payment API endpoints
 *
 * Covers: invoice lookup, payment recording, patient balance
 * Owner: Shavinda (stub — fill in detail when building billing pages)
 */

import { get, post } from './client';
import type {
  InvoiceDetailResponse,
  PatientInvoicesResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
  PatientBalanceResponse,
} from './types';

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
