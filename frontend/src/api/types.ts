/**
 * MedSync — Shared TypeScript types
 *
 * These interfaces mirror the Pydantic models in backend/app/schemas/*.py
 * so the frontend has type-safe access to every API response shape.
 */

// ─── Common / Envelope ──────────────────────────────────────────────────────

/** Standard paginated list response (api-routes.md §0.1) */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Standard error body returned by the backend on 4xx / 5xx */
export interface ErrorResponse {
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

// ─── Auth (schemas/auth.py) ─────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
}

export interface MeResponse {
  user_id: number;
  username: string;
  role: string;
  branch_id: number | null;
}

// ─── Roles (auth/AuthContext.tsx) ───────────────────────────────────────────

export type UserRole =
  | 'Administrator'
  | 'Branch Manager'
  | 'Doctor'
  | 'Receptionist'
  | 'Cashier'
  | 'Patient';

// ─── Reports (schemas/reports.py) ───────────────────────────────────────────

export interface AppointmentSummaryItem {
  status: string;
  appointment_type: string;
  count: number;
}

export interface AppointmentsSummaryResponse {
  data: AppointmentSummaryItem[];
  total: number;
}

export interface DoctorRevenueItem {
  doctor_id: number;
  doctor_name: string;
  branch_name: string;
  total_appointments: number;
  total_revenue: number;
}

export interface DoctorRevenueResponse {
  data: DoctorRevenueItem[];
  total: number;
}

export interface ItemizedPaymentItem {
  payment_date: string; // ISO date string
  patient_name: string;
  invoice_id: number;
  amount: number;
  payment_type: string;
  running_total: number;
}

export interface ItemizedPaymentResponse {
  data: ItemizedPaymentItem[];
  total: number;
}

export interface OutstandingBalanceItem {
  patient_id: number;
  patient_name: string;
  contact_number: string;
  outstanding_balance: number;
}

export interface OutstandingBalancesResponse {
  data: OutstandingBalanceItem[];
  total: number;
}

export interface TreatmentCategoryItem {
  category: string;
  usage_count: number;
  total_revenue: number;
}

export interface TreatmentCategoriesResponse {
  data: TreatmentCategoryItem[];
  total: number;
}

export interface InsuranceVsOutOfPocketItem {
  branch_name: string;
  total_insurance_covered: number;
  total_out_of_pocket: number;
  total_revenue: number;
}

export interface InsuranceVsOutOfPocketResponse {
  data: InsuranceVsOutOfPocketItem[];
  total: number;
}

// ─── Appointments (schemas/appointments.py) ─────────────────────────────────

export type AppointmentType = 'Scheduled Visit' | 'Walk-in' | 'Follow-up';
export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';
export type SlotStatus = 'Open' | 'Booked' | 'Blocked';

export interface DoctorSlotResponse {
  slot_id: number;
  doctor_id: number;
  date: string; // ISO date
  start_time: string;
  end_time: string;
  status: SlotStatus;
}

export interface AppointmentBookRequest {
  patient_id: number;
  doctor_id: number;
  slot_id: number;
  appointment_type?: AppointmentType;
}

export interface WalkInAppointmentRequest {
  patient_id: number;
  doctor_id: number;
  date: string; // ISO date
  start_time: string;
  end_time: string;
}

export interface AppointmentRescheduleRequest {
  new_slot_id: number;
}

export interface AppointmentResponse {
  appointment_id: number;
  appointment_code: string;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  branch_id: number;
  branch_name?: string;
  slot_id: number;
  appointment_date: string; // ISO date
  start_time: string;
  end_time: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  created_at: string; // ISO datetime
}

export type AppointmentListResponse = PaginatedResponse<AppointmentResponse>;

// ─── Invoices / Billing (schemas/invoices.py) ───────────────────────────────

export interface InvoiceLineItem {
  treatment_name: string;
  service_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InvoicePayment {
  payment_date: string; // ISO datetime
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
  insurance_policy_number?: string;
  status: string;
  created_at: string; // ISO datetime
  outstanding_balance: number;
  items: InvoiceLineItem[];
  payments: InvoicePayment[];
}

export interface PatientInvoiceItem {
  invoice_code: string;
  created_at: string; // ISO datetime
  total_amount: number;
  insurance_amount: number;
  outstanding_balance: number;
  status: string;
}

export interface PatientInvoicesResponse {
  data: PatientInvoiceItem[];
}

export interface RecordPaymentRequest {
  amount: number;
  payment_type: string;
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

// ─── Doctors (schemas/doctors.py) ───────────────────────────────────────────

export interface DoctorResponse {
  doctor_id: number;
  full_name: string;
  id_number: string;
  phone_numbers: string[];
  email?: string;
  branch_id: number;
  branch_name?: string;
  license_number: string;
  is_active: boolean;
  specialties: string[];
}

export interface DoctorCreateResponse extends DoctorResponse {
  temp_password: string;
}

export interface DoctorSpecialtiesUpdate {
  add: number[];
  remove: number[];
}

// ─── Specialties (schemas/specialties.py) ───────────────────────────────────

export interface SpecialtyCreate {
  name: string;
  description?: string;
}

export interface SpecialtyResponse {
  specialty_id: number;
  name: string;
  description?: string;
  doctor_count: number;
}

// ─── Patients (stub — Chenith fills in detail) ─────────────────────────────

export interface AllergyItem {
  allergy_id: number;
  allergy_code: string;
  name: string;
}

export interface PatientResponse {
  patient_id: number;
  patient_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  id_number: string;
  phone_number: string;
  email?: string;
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
  total_doctors: number;
  total_staff: number;
  total_branches: number;
  today_appointments: {
    scheduled: number;
    completed: number;
    cancelled: number;
  };
}

export interface ActivityItem {
  id: number;
  action_type: string;
  entity_type: string;
  entity_id?: number;
  description: string;
  performed_by: string;
  created_at: string; // ISO datetime
}

// ─── Treatments & Consultations ──────────────────────────────────────────

export interface TreatmentItem {
  treatment_code: number;
  treatment_name: string;
  category: string;
  price: number;
  is_eligible_for_insurance: boolean;
  is_active: boolean;
}

export interface ConsultationTreatmentInput {
  treatment_code: number;
  quantity: number;
}

export interface AppointmentCompleteRequest {
  diagnosis?: string;
  consultation_notes: string;
  treatments?: ConsultationTreatmentInput[];
}

export interface AppointmentCompleteResponse {
  appointment_id: number;
  invoice_id: number;
  status: string;
  message: string;
}

export interface AppointmentItem {
  appointment_id: number;
  appointment_code: string;
  patient_id: number;
  patient_name: string;
  patient_code: string;
  patient_id_number: string;
  doctor_id?: number;
  doctor_name?: string;
  slot_date?: string;
  start_time?: string;
  end_time?: string;
  room_number?: string;
  appointment_type: string;
  status: string;
  created_at: string;
}
