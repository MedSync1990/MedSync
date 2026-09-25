/**
 * MedSync — Shared API TypeScript interfaces
 *
 * Every type used across the API client modules lives here so there's
 * one source of truth and a single import path.
 */

// ─── Common / Pagination ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: MeResponse;
}

export interface MeResponse {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id: number | null;
  branch_name: string | null;
}

// ─── Appointments ───────────────────────────────────────────────────────────

export interface AppointmentResponse {
  appointment_id: number;
  appointment_code: string;
  patient_id: number;
  patient_name: string;
  slot_id: number;
  doctor_name: string;
  specialty: string;
  branch_name: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  status: string;
  created_at: string;
}

export interface AppointmentBookRequest {
  patient_id: number;
  slot_id: number;
  doctor_id?: number;
  appointment_type?: string;
}

export interface WalkInAppointmentRequest {
  patient_id: number;
  doctor_id: number;
  appointment_type?: string;
}

export interface AppointmentRescheduleRequest {
  new_slot_id: number;
}

export interface DoctorSlotResponse {
  slot_id: number;
  doctor_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface DoctorResponse {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialty?: string;
  specialties?: string[];
  is_active?: boolean;
  phone?: string;
  email?: string;
}

export interface AppointmentListResponse {
  data: AppointmentResponse[];
  total: number;
}

// ─── Billing / Invoices ─────────────────────────────────────────────────────

export interface InvoiceLineItem {
  treatment_name: string;
  service_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InvoicePayment {
  payment_date: string;
  amount: number;
  payment_type: string;
}

export interface InvoiceDetailResponse {
  invoice_code: string;
  patient_name: string;
  patient_nic: string;
  patient_id: string;
  doctor_name: string;
  unit_name: string;
  total_amount: number;
  insurance_amount: number;
  insurance_percentage: number;
  insurance_policy_number: string | null;
  status: string;
  created_at: string;
  outstanding_balance: number;
  items: InvoiceLineItem[];
  payments: InvoicePayment[];
}

export interface PatientInvoicesResponse {
  data: Array<{
    invoice_code: string;
    created_at: string;
    total_amount: number;
    insurance_amount: number;
    outstanding_balance: number;
    status: string;
  }>;
}

export interface RecordPaymentRequest {
  amount: number;
  payment_type: string;
  reference?: string;
}

export interface RecordPaymentResponse {
  message: string;
  invoice_code: string;
  amount_paid: number;
  outstanding_balance: number;
  status: string;
}

export interface PatientBalanceResponse {
  patient_id: number;
  outstanding_balance: number;
}

// ─── Insurance ──────────────────────────────────────────────────────────────

export interface PatientInsuranceItem {
  insurance_id: number;
  policy_id: number;
  provider_name: string;
  policy_name: string;
  insurance_card_number: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface PatientInsuranceResponse {
  data: PatientInsuranceItem[];
}

export interface VerifyInsuranceRequest {
  patient_id: number;
  policy_id: number;
  insurance_card_number: string;
  start_date: string;
  end_date: string;
}

export interface VerifyInsuranceResponse {
  message: string;
  insurance_id: number;
  patient_id: number;
  policy_id: number;
  insurance_card_number: string;
  start_date: string;
  end_date: string;
}

// ─── Reports ────────────────────────────────────────────────────────────────

export interface AppointmentsSummaryResponse {
  data: Array<Record<string, any>>;
  total: number;
}

export interface DoctorRevenueResponse {
  data: Array<Record<string, any>>;
  total: number;
}

export interface ItemizedPaymentResponse {
  data: Array<Record<string, any>>;
  total: number;
  page: number;
  limit: number;
}

export interface OutstandingBalancesResponse {
  data: Array<Record<string, any>>;
  total: number;
}

export interface TreatmentCategoriesResponse {
  data: Array<Record<string, any>>;
  total: number;
}

export interface InsuranceVsOutOfPocketResponse {
  data: Array<Record<string, any>>;
  total: number;
}

// ─── Patients ───────────────────────────────────────────────────────────────

export interface AllergyItem {
  allergy_id: number;
  allergy_code: string;
  name: string;
}

export interface PatientResponse {
  user_id: number;
  patient_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  id_number: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  address?: string;
  blood_group?: string;
  emergency_contact?: string;
  contact_name?: string;
  registered_branch?: number;
  branch_name?: string;
  has_insurance?: boolean;
  registered_date?: string;
  is_active: boolean;
  allergies?: AllergyItem[];
}

export interface PatientListItem {
  patient_id: number;
  patient_code: string;
  first_name: string;
  last_name: string;
  id_number: string;
  phone_number: string;
  gender: string;
  date_of_birth: string;
  registered_branch?: number;
  branch_name?: string;
  has_insurance?: boolean;
  is_active: boolean;
}

// ─── Branches (stub — admin pages fill in detail) ──────────────────────────

export interface BranchResponse {
  branch_id: number;
  name: string;
  address: string;
  phone_number?: string;
  branch_manager_name?: string;
  staff_count: number;
  is_active: boolean;
}

// ─── Stats / Dashboard ─────────────────────────────────────────────────────

export interface StatsOverview {
  total_patients: number;
  total_appointments_today: number;
  today_appointments: {
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  total_revenue: number;
  pending_invoices: number;
  total_doctors: number;
  total_staff: number;
  total_branches: number;
}

export interface ActivityItem {
  id: number;
  type?: string;
  action_type: string;
  description: string;
  timestamp?: string;
  created_at: string;
  performed_by: string;
}

export interface BranchResponse {
  branch_id: number;
  branch_name: string;
  name?: string;
  address?: string;
  phone?: string;
}
