/**
 * MedSync — API barrel export
 *
 * Usage from any component:
 *
 *   import { login, getMe } from '../api';
 *   import { getAppointmentsSummary } from '../api';
 *   import { bookAppointment } from '../api';
 *   import type { AppointmentResponse } from '../api';
 *
 * Every module re-exports its functions AND its param types so
 * consuming pages have a single import path for everything.
 */

// Core client utilities (ApiError for catch blocks)
export { ApiError } from './client';
export type { ApiErrorBody } from './client';

// All shared TypeScript interfaces
export * from './types';

// Auth endpoints
export { login, logout, getMe } from './auth';

// Report endpoints
export {
  getAppointmentsSummary,
  getDoctorRevenue,
  getDoctorItemizedPayments,
  getOutstandingBalances,
  getTreatmentCategories,
  getInsuranceVsOutOfPocket,
} from './reports';
export type {
  AppointmentsSummaryParams,
  DoctorRevenueParams,
  ItemizedPaymentParams,
  OutstandingBalancesParams,
  TreatmentCategoriesParams,
  InsuranceVsOutOfPocketParams,
} from './reports';

// Appointment endpoints
export {
  listAppointments,
  getAppointment,
  bookAppointment,
  bookWalkIn,
  rescheduleAppointment,
  cancelAppointment,
  getDoctorSlots,
} from './appointments';

// Patient endpoints
export {
  listPatients,
  getPatient,
  searchByNic,
  createPatient,
  updatePatient,
  deactivatePatient,
} from './patients';

// Billing / Payment endpoints
export {
  getInvoice,
  getPatientInvoices,
  recordPayment,
  getPatientBalance,
} from './billing';

// Stats / Dashboard endpoints
export {
  getStatsOverview,
  getRecentActivity,
} from './stats';
