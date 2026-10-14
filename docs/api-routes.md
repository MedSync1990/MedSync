# MedSync CATMS — API Routes

> Updated 2026-10-14 against repository source. This describes declared routes and current handler behavior, not the live Azure deployment or deployed database grants/policies. Request schemas and SQL modules supply detailed validation and database rules.

## 0. Conventions

Inventory paths include the `/api/v1` prefix; workflow examples omit it for readability. A = Administrator, BM = Branch Manager, D = Doctor, R = Receptionist. “Authenticated” means the current-user dependency without a narrower role allowlist. “No auth dependency” means no authentication dependency is declared by the handler/router; it does not certify public database access.

Browser requests send `credentials: 'include'` and an HttpOnly `access_token` cookie. Protected routes also accept bearer JWTs. Login/logout require a trusted Origin. Cookie-authenticated mutations through `get_current_user` require an exact Origin in `CORS_ALLOWED_ORIGINS`; bearer-only requests use a separate path. GET downloads do not require an Origin.

Role columns describe dependencies, not complete ownership or branch enforcement. BM filters are overridden in handlers that use the branch helpers; some target-record handlers reject another branch instead. Do not assume all routes enforce identical scoping. Database RLS behavior needs separate verification.

Lists may be arrays, paginated objects, or report-specific objects. There is no universal response envelope. Application errors use `message` or `errors`; HTTPException and FastAPI validation use `detail`. Authentication commonly returns 401, role/Origin rejection 403, missing resources 404, conflicts 409, and schema validation 422. Individual handlers also use 400, 423, and 503. The generic error handler may expose exception text.

Numeric identifiers are internal keys. Patient, appointment, and invoice display codes are generated server-side. Validation varies by schema/handler: there is no universal NIC/phone/email validator or uniform currency serialization. Use the schemas rather than UI labels as request field names.

## 1. Route inventory

The following tables are extracted from `main.py` router registration, router decorators, dependency declarations, and handler signatures. Path parameter names match the source. Query columns list declared non-dependency inputs other than body/path parameters; consult OpenAPI for types and defaults. Response columns name declared response models; “Handler-defined” includes confirmation JSON and file responses.

### Auth

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | No auth dependency | LoginRequest | — | `LoginResponse` |
| POST | `/api/v1/auth/logout` | No auth dependency | — | — | `Handler-defined` |
| GET | `/api/v1/auth/me` | Authenticated | — | — | `MeResponse` |
| GET | `/api/v1/auth/admin-only-dashboard` | A, BM | — | — | `Handler-defined` |
| GET | `/api/v1/auth/roles` | No auth dependency | — | — | `Handler-defined` |

### Branches

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/branches` | A, BM, R | — | is_active | `List[BranchResponse]` |
| GET | `/api/v1/branches/` | A, BM, R | — | is_active | `List[BranchResponse]` |
| GET | `/api/v1/branches/{branch_id}` | A, BM | — | — | `BranchResponse` |
| POST | `/api/v1/branches` | A | BranchCreate | — | `BranchResponse` |
| POST | `/api/v1/branches/` | A | BranchCreate | — | `BranchResponse` |
| PUT | `/api/v1/branches/{branch_id}` | A | BranchUpdate | — | `BranchResponse` |
| PUT | `/api/v1/branches/{branch_id}/deactivate` | A | — | — | `BranchResponse` |
| PUT | `/api/v1/branches/{branch_id}/reactivate` | A | — | — | `BranchResponse` |

### Staff

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/staff/` | A, BM | — | branch_id, role_id, is_active | `Dict[str, Any]` |
| POST | `/api/v1/staff/` | A, BM | StaffCreate | — | `Dict[str, Any]` |
| PUT | `/api/v1/staff/{id}/deactivate` | A, BM | — | — | `Handler-defined` |
| PUT | `/api/v1/staff/{id}/activate` | A, BM | — | — | `Handler-defined` |
| PUT | `/api/v1/staff/{id}/unlock` | A, BM | — | — | `Handler-defined` |
| PUT | `/api/v1/staff/{id}/reset-password` | A, BM | StaffResetPassword | — | `Handler-defined` |
| PUT | `/api/v1/staff/{id}` | A, BM | StaffUpdate | — | `Handler-defined` |

### Doctors

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/doctors` | A, BM, D, R | — | specialty_id, branch_id, is_active | `List[DoctorResponse]` |
| GET | `/api/v1/doctors/{id}` | A, BM, D, R | — | — | `DoctorResponse` |
| GET | `/api/v1/doctors/{id}/availability` | A, BM, D, R | — | date, include_booked | `List[DoctorSlotResponse]` |
| PUT | `/api/v1/doctors/{id}` | A, BM | DoctorUpdate | — | `DoctorResponse` |
| PUT | `/api/v1/doctors/{id}/specialties` | A, BM | DoctorSpecialtiesUpdate | — | `DoctorResponse` |
| GET | `/api/v1/doctors/{id}/schedule` | A, BM, D, R | — | — | `List[DoctorScheduleItem]` |
| PUT | `/api/v1/doctors/{id}/schedule` | A, BM, D | DoctorScheduleUpdate | — | `List[DoctorScheduleItem]` |

### Specialties

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/specialties` | A, BM, D, R | — | — | `List[SpecialtyResponse]` |
| POST | `/api/v1/specialties` | A | SpecialtyCreate | — | `SpecialtyResponse` |
| PUT | `/api/v1/specialties/{specialty_id}` | A | SpecialtyUpdate | — | `SpecialtyResponse` |
| DELETE | `/api/v1/specialties/{specialty_id}` | A | — | — | `Handler-defined` |

### Appointments

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/appointments/{id}/consultation` | D, R, A, BM | — | — | `ConsultationResponse` |
| GET | `/api/v1/appointments/doctors/{id}/availability` | A, BM, D, R | — | date, include_booked | `List[DoctorSlotResponse]` |
| GET | `/api/v1/appointments` | A, BM, R, D | — | branch, date, status, doctor, patient_id, search, page, limit | `AppointmentListResponse` |
| GET | `/api/v1/appointments/{id}` | A, BM, R, D | — | — | `AppointmentResponse` |
| POST | `/api/v1/appointments` | R | AppointmentBookRequest | — | `AppointmentResponse` |
| POST | `/api/v1/appointments/walk-in` | R | WalkInAppointmentRequest | — | `AppointmentResponse` |
| PUT | `/api/v1/appointments/{id}/reschedule` | R | AppointmentRescheduleRequest | — | `AppointmentResponse` |
| PUT | `/api/v1/appointments/{id}/cancel` | R | — | — | `AppointmentResponse` |
| PUT | `/api/v1/appointments/{id}/complete` | D | AppointmentCompleteRequest | — | `AppointmentCompleteResponse` |

### Patients

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| POST | `/api/v1/patients` | R, A | PatientCreateRequest | — | `PatientResponse` |
| POST | `/api/v1/patients/quick` | R, A | QuickPatientCreateRequest | — | `PatientResponse` |
| GET | `/api/v1/patients` | A, BM, R, D | — | search, branch, insurance, page, limit | `PatientListResponse` |
| GET | `/api/v1/patients/{identifier}` | A, BM, R, D | — | — | `PatientResponse` |
| PUT | `/api/v1/patients/{identifier}` | R, A, BM | PatientUpdateRequest | — | `PatientResponse` |
| GET | `/api/v1/patients/{identifier}/allergies` | A, BM, R, D | — | — | `List[PatientAllergyItem]` |
| PUT | `/api/v1/patients/{identifier}/allergies` | R, A, BM, D | PatientAllergiesUpdateRequest | — | `List[PatientAllergyItem]` |

### Allergies

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/allergies` | No auth dependency | — | — | `List[AllergyResponse]` |
| POST | `/api/v1/allergies` | A | AllergyCreateRequest | — | `AllergyResponse` |

### Treatments

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/treatments` | A, BM, D, R | — | include_inactive | `List[TreatmentResponse]` |
| GET | `/api/v1/treatments/{code}` | A, BM, D, R | — | — | `TreatmentResponse` |
| POST | `/api/v1/treatments` | A, BM | TreatmentCreateRequest | — | `TreatmentResponse` |
| PUT | `/api/v1/treatments/{code}` | A, BM | TreatmentUpdateRequest | — | `TreatmentResponse` |
| PUT | `/api/v1/treatments/{code}/deactivate` | A, BM | — | — | `Handler-defined` |

### Consultations

Router registered with no endpoints. Consultation reads are under appointments.

### Invoices

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/invoices/recent` | A, BM, R | — | status, limit | `RecentInvoicesResponse` |
| GET | `/api/v1/invoices/{identifier}` | A, BM, R | — | type | `InvoiceDetailResponse` |
| GET | `/api/v1/invoices/patient/{patient_id}` | A, BM, R | — | — | `PatientInvoicesResponse` |
| GET | `/api/v1/invoices/patient/{patient_id}/balance` | A, BM, R | — | — | `PatientBalanceResponse` |
| GET | `/api/v1/invoices/{invoice_code}/pdf` | No auth dependency | — | — | `Handler-defined` |

### Payments

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| POST | `/api/v1/payments/{invoice_code}` | R | RecordPaymentRequest | — | `RecordPaymentResponse` |

### Insurance

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/insurance/policies` | A, BM, R, D | — | — | `InsurancePolicyListResponse` |
| GET | `/api/v1/insurance/patient/{patient_id}` | A, BM, R, D | — | — | `PatientInsuranceResponse` |
| POST | `/api/v1/insurance/verify` | A, BM, R | VerifyInsuranceRequest | — | `VerifyInsuranceResponse` |

### Reports

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/reports/appointments-summary` | A, BM | — | start_date, end_date, branch_id, appointment_type | `AppointmentsSummaryResponse` |
| GET | `/api/v1/reports/doctor-revenue` | A, BM, D | — | start_date, end_date, branch_id, doctor_id | `DoctorRevenueResponse` |
| GET | `/api/v1/reports/doctor-revenue/{target_doctor_id}/payments` | A, BM, D | — | start_date, end_date | `ItemizedPaymentResponse` |
| GET | `/api/v1/reports/outstanding-balances` | A, BM | — | branch_id | `OutstandingBalancesResponse` |
| GET | `/api/v1/reports/treatment-categories` | A, BM | — | start_date, end_date, branch_id | `TreatmentCategoriesResponse` |
| GET | `/api/v1/reports/treatment-categories/pdf` | A, BM | — | start_date, end_date, branch_id | `Handler-defined` |
| GET | `/api/v1/reports/insurance-vs-out-of-pocket` | A, BM | — | start_date, end_date, branch_id | `InsuranceVsOutOfPocketResponse` |
| GET | `/api/v1/reports/doctor-earnings/{target_doctor_id}` | A, BM, D | — | — | `DoctorEarningsOverviewResponse` |
| GET | `/api/v1/reports/doctor-earnings/{target_doctor_id}/bank-accounts` | A, BM, D | — | — | `BankAccountsResponse` |
| GET | `/api/v1/reports/doctor-earnings/{target_doctor_id}/payout-requests` | A, BM, D | — | — | `PayoutRequestsResponse` |
| GET | `/api/v1/reports/doctor-earnings/{target_doctor_id}/payouts` | A, BM, D | — | — | `PayoutHistoryResponse` |
| GET | `/api/v1/reports/doctor-earnings/{target_doctor_id}/payouts/{payout_id}/pdf` | A, BM, D | — | — | `Handler-defined` |
| GET | `/api/v1/reports/doctor-payouts/{payout_id}/pdf` | A, BM, D | — | target_doctor_id | `Handler-defined` |
| POST | `/api/v1/reports/doctor-earnings/{target_doctor_id}/payout-requests` | A, BM, D | PayoutRequestCreate | — | `Handler-defined` |
| GET | `/api/v1/reports/doctor-payments` | A, BM | — | branch_id, status | `AdminPayoutRequestsResponse` |
| PATCH | `/api/v1/reports/doctor-payments/{request_id}/pay` | A, BM | PayoutDecisionRequest | — | `Handler-defined` |
| PATCH | `/api/v1/reports/doctor-payments/{request_id}/reject` | A, BM | PayoutDecisionRequest | — | `Handler-defined` |
| GET | `/api/v1/reports/appointments-summary/pdf` | A, BM | — | start_date, end_date, branch_id, appointment_type | `Handler-defined` |
| GET | `/api/v1/reports/doctor-revenue/pdf` | A, BM, D | — | start_date, end_date, branch_id, doctor_id, specialty, search | `Handler-defined` |
| GET | `/api/v1/reports/outstanding-balances/pdf` | A, BM | — | branch_id, search, aging | `Handler-defined` |
| GET | `/api/v1/reports/insurance-vs-out-of-pocket/pdf` | A, BM | — | start_date, end_date, branch_id, provider, search | `Handler-defined` |

### Stats

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/stats/overview` | Authenticated | — | branch | `StatsOverview` |
| GET | `/api/v1/stats/activity` | Authenticated | — | limit, branch | `List[ActivityItem]` |

### Profile

| Method | Path | Access dependency | Body model | Query inputs | Response model |
|---|---|---|---|---|---|
| GET | `/api/v1/profile/me` | Authenticated | — | — | `ProfileResponse` |
| PUT | `/api/v1/profile/me` | Authenticated | ProfileUpdateRequest | — | `ProfileResponse` |
| POST | `/api/v1/profile/change-password` | Authenticated | ChangePasswordRequest | — | `Handler-defined` |

## 2. Authentication, profile, and staff registration

`POST /auth/login` takes `{username, password}`, looks up username/email, verifies bcrypt, records the login attempt, and sets access/CSRF cookies. JWTs use HS256 and contain user ID, role, branch ID, and username. Lifetime defaults to 60 minutes. Login responses contain `message` and `must_change_password`; `/auth/me` returns identity, role, branch, and password-change information. The application threshold is five failed attempts; SQL defines a 15-minute lock. Lockout edge cases require runtime verification.

Logout clears cookies without revoking an issued JWT. Profile routes are `/profile/me` and `/profile/change-password`. There is no refresh-token endpoint, independent idle timeout, or patient login/self-service portal.

Doctors are registered through `POST /staff/`, not a separate `POST /doctors`. `StaffCreate` uses `role_id`, `first_name`, optional `middle_name`, `last_name`, `id_number`, optional `address`, `birthdate`, `gender`, optional `email`, `phone_number`, and `branch_id`. Doctor registration additionally requires `specialty` and `license_number`; optional `bank_accounts` entries use `bank_name`, `account_number`, and `bank_branch`.

Registration inserts `app_user`, contact, staff, and doctor/specialty records as applicable inside an explicit transaction. The handler currently sets the temporary password to the fixed value `medsync`, hashes it, sets `must_change_password = TRUE`, and returns the username/temporary password. The unused random-password helper does not describe registration behavior. Duplicate NIC registration currently raises HTTP 400.

BM staff registration requires the submitted branch to equal their own and permits only Doctor/Receptionist roles. Other staff mutations have their own record checks; see the handler rather than assuming one global policy. `StaffUpdate` supports personal/contact fields, branch, and active status; it does not expose a role-change field.

## 3. Doctor roster and availability

`PUT /doctors/{id}/schedule` takes `{schedules: [...]}`. Each item has `day_of_week` (0 Sunday through 6 Saturday), `start_time`, `end_time`, `slot_duration` (5–120 minutes, default 30), and `is_active` (default true). Optional IDs are accepted by the schema. Times are parsed as HH:MM or HH:MM:SS; the handler rejects reversed times and overlapping same-day shifts.

Administrators can edit any doctor; BM can edit doctors in their assigned branch; Doctors can edit their own roster. In one transaction the handler replaces weekly templates, deletes future/today Open slots only when no appointment references them, then calls `fn_generate_slots_from_roster(14, doctor_id)`. Existing referenced slots survive even when their appointment is cancelled. Existing appointments are not automatically cancelled or rescheduled when the roster changes.

The generator creates non-overlapping slots from active templates for active staff, skipping existing overlapping slots. Its `generate_series(0, p_days_ahead)` includes today and the final offset day. Startup and a background midnight task also generate rolling slots. The task uses the API host's local clock, not an explicitly configured clinic timezone.

## 4. Patients and allergies

Full registration uses `PatientCreateRequest`: separate name fields, `id_number`, address, birthdate/date-of-birth aliases, phone aliases, and optional emergency, insurance, and allergy fields. NIC validation accepts nine digits plus V/X or twelve digits. Phone resolution normalizes digits and selected Sri Lankan prefixes; the schema does not enforce all UI-required fields. Birthdate falls back to 1990-01-01 when omitted. `POST /patients/quick` uses `QuickPatientCreateRequest`, requires first name, and supports temporary identities/defaults for walk-ins.

Patient edit permissions are A/BM/R; allergy replacement additionally permits D and takes `{allergy_ids: [...]}`. Patient information is available to staff across branches through the patient handlers. Embedded registration insurance uses `provider_name`, `insurance_card_number`, optional dates, and optional `corporate_affiliation`. Later policy linking uses `/insurance/verify`; there is no `POST /patients/{id}/insurance` route.

## 5. Appointments and consultation completion

Booking takes `{patient_id, doctor_id, slot_id, appointment_type}`. The supported type values are `Scheduled Visit`, `Walk-in`, and `Follow-up`, with Scheduled Visit as the default. Status values are `Scheduled`, `Completed`, and `Cancelled`.

Booking, walk-in creation, rescheduling, and cancellation call SQL functions. Walk-in bodies require patient/doctor IDs, `date`, `start_time`, and `end_time`. Rescheduling takes `{new_slot_id}`. SQL functions implement transaction rules and slot locking; exact constraints are in `db/modules/kalana`, including the unique appointment `slot_id` reference and the availability overlap exclusion constraint.

The doctor keeps consultation inputs in frontend state, then submits one completion body with `diagnosis`, `consultation_notes`, and `treatments: [{treatment_id, quantity}]`. The route checks doctor ownership and calls `fn_complete_appointment`, which writes consultation/treatment data and generates the invoice. The response has `appointment_id`, `invoice_id`, and `message`. There are no separate pre-completion consultation or appointment-treatment POST routes. Consultation read-back is `/appointments/{id}/consultation`.

Cancellation reopens the slot while retaining the appointment row and its foreign key. A slot marked Open can therefore still be referenced by appointment history; Open status alone does not establish that it can be deleted or rebooked under the unique constraint.

## 6. Treatment catalogue, billing, and insurance

Treatment creation/update takes `{treatment_name, category, price, is_eligible_for_insurance}`. Name/category must contain text, price must be positive, and insurance eligibility defaults to false. `treatment_code` is the numeric database identifier returned in responses, not a client-supplied `service_code`. A and BM can manage the shared catalogue. Deactivation calls `fn_deactivate_treatment`; historical price snapshots are stored on consultation treatment lines.

Invoice detail accepts a numeric ID or display code through `{identifier}`. Invoice history/balance reads permit A/BM/R. `POST /payments/{invoice_code}` is R-only and takes `{amount, payment_type, reference?}`. Labels are Cash, Card / POS, and LankaPay / QR; both non-cash labels map to database Card. The optional reference is accepted by the request model but is not passed to `fn_record_payment` by the current handler.

The payment handler locks the invoice in an explicit transaction, calculates `max(0, total_amount - insurance_amount - SUM(amount_paid))`, rejects overpayment or an already-paid invoice, calls `fn_record_payment`, and returns updated balance/status. These are internal payment records; no payment gateway is called.

Insurance policy listing and patient links use internal catalogue data. `/insurance/verify` takes `{patient_id, policy_id, insurance_card_number, start_date, end_date}`, checks references/date ordering, and inserts a link. It does not contact an insurer.

## 7. Reports, earnings, and payouts

Management reports use the query names in the inventory, especially `branch_id`, `start_date`, and `end_date`. Responses differ: appointment summary returns `daily_data` and count totals; revenue/balance/category reports use `data` with totals; insurance reporting returns ledger/provider/payment-mode collections. Do not assume all reports return `{data, total}`.

PDF routes exist for all five management reports, including treatment categories. They render backend templates with WeasyPrint. Frontend CSV generation is separate from these API PDF routes. Doctor revenue permits Doctors with self scope; management report handlers apply their branch filters. Itemized doctor payments accept date filters and declare a paginated response model.

Doctor earnings sum snapshotted treatment charges for completed appointments, subtract recorded staff payouts, and return `total_earned`, `paid_by_hospital`, and `outstanding`. This is distinct from money collected from patients. Bank accounts, request history, payout history, and payout PDF slips have dedicated routes.

Payout creation takes `{account_id, request_amount}` and checks positive amount against earnings minus paid payouts and Pending/Approved requests. It inserts a Pending request. The handler does not wrap its balance check/insert in an explicit transaction or explicitly verify the bank account belongs to the target doctor. Doctor-specific earnings/request/history handlers enforce Doctor self scope, but do not all explicitly check BM target branch; database enforcement must be verified separately.

`GET /reports/doctor-payments` applies BM branch scoping. Pay takes `{remarks?}`, requires Pending status, and transactionally marks the request Paid and inserts a Bank Transfer payout with a generated reference. It records a payout; it does not initiate a bank transfer. The pay handler does not explicitly check BM target branch or lock the initial request lookup.

**Current incomplete handler:** `/reports/doctor-payments/{request_id}/reject` checks that remarks are nonblank and that the request exists and is Pending, then ends without an UPDATE or success return. It currently does not persist a rejection. The route declaration is included above to reflect the source, not to claim the workflow works.

## 8. Implementation boundaries

`GET /auth/roles`, `GET /allergies`, and `GET /invoices/{invoice_code}/pdf` have no declared authentication dependency. This is a current source limitation; other protected endpoints do not make these routes authenticated automatically. The stats activity endpoint supplies recent activity, not a general audit-log browsing API.

SMS/email dispatch, patient self-service, JWT refresh/revocation, general rate limiting, insurer verification, and payment/bank gateway integrations are not implemented. SQL audit/RLS declarations and repository tests do not establish deployed enforcement or full passing coverage. Compare the running `/openapi.json` with these declarations when validating a deployment.
