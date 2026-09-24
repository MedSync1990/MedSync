import { get, post } from './api';
import type {
  InvoiceDetailResponse,
  PatientInvoicesResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
  PatientBalanceResponse,
} from '../types';

export const invoiceService = {
  getById: (id: string | number) => get<InvoiceDetailResponse>(`/invoices/${id}`),
  getByPatient: (patientId: number) =>
    get<PatientInvoicesResponse>(`/patients/${patientId}/invoices`),
  getPatientBalance: (patientId: number) =>
    get<PatientBalanceResponse>(`/patients/${patientId}/balance`),
  recordPayment: (invoiceId: string | number, data: RecordPaymentRequest) =>
    post<RecordPaymentResponse>(`/invoices/${invoiceId}/payments`, data),
};
