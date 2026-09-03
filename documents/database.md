# MedSync CATMS — Database Design

Reference: `MedSync ER Diagram` (group ERD). This doc turns the ERD into an implementation
checklist — table-by-table notes, keys, procedures/triggers, and indexing plan. Treat the ERD
image as authoritative for column lists; this doc adds the *why* and the *enforcement*.

## 1. Table groups

**Identity / people**
`ROLE`, `USER`, `STAFF`, `BRANCH`, `DOCTOR`, `DOCTOR_SPECIALTY`, `SPECIALTY`, `CONTACT`

**Patient clinical**
`PATIENT`, `ALLERGY`, `PATIENT_ALLERGY`, `ADMISSION`

**Scheduling**
`DOCTOR_AVAILABILITY_SLOTS`, `APPOINTMENTS`

**Clinical record**
`CONSULTATIONS`, `TREATMENT_CATALOGUE`, `CONSULTATION_TREATMENTS`

**Billing**
`INVOICES`, `PAYMENTS`

**Insurance**
`PATIENT_INSURANCE`, `INSURANCE_POLICY_DETAILS`, `POLICY_TREATMENT_COVERAGE`

## 2. Key relationships to enforce with FKs (not just app logic)

- `USER.role_id → ROLE.role_id`; `STAFF.user_id → USER.user_id`; `DOCTOR.user_id → STAFF.user_id`
  (a doctor is a staff member is a user — enforce the chain, don't let a `DOCTOR` row exist
  without a `STAFF`/`USER` row).
- `DOCTOR_SPECIALTY` is the many-to-many bridge for "a doctor may serve in more than one
  specialty" — composite PK `(user_id, speciality_id)`.
- `APPOINTMENTS.slot_id → DOCTOR_AVAILABILITY_SLOTS.slot_id`, `APPOINTMENTS.doctor_id →
  DOCTOR.user_id`, `APPOINTMENTS.patient_id → PATIENT.user_id`.
- `CONSULTATIONS.appointment_id → APPOINTMENTS.appointment_id` (one consultation per completed
  appointment — enforce with a `UNIQUE` constraint on `appointment_id` in `CONSULTATIONS`).
- `CONSULTATION_TREATMENTS` is the bridge for "one or more treatments per consultation" —
  composite PK `(consultation_id, treatment_code)`, plus `quantity`.
- `INVOICES` links to both `consultation_id` and `appointment_id` — keep both FKs since an
  invoice is generated from a completed appointment's consultation+treatments.
- `PATIENT_INSURANCE.policy_id → INSURANCE_POLICY_DETAILS.policy_id`;
  `POLICY_TREATMENT_COVERAGE` maps which treatment codes a policy covers and at what
  `coverage_percentage` — this is what the insurance calculation in billing reads.

## 3. Constraints beyond FK/PK

| Rule | Where |
|---|---|
| No two overlapping appointments for the same doctor | Trigger (`BEFORE INSERT/UPDATE` on `APPOINTMENTS`) checking existing rows for the same `doctor_id` where time ranges intersect, **or** a stored procedure `sp_book_appointment` that does the check inside the same transaction as the insert. Pick the procedure approach — it's easier to return a clean error to the API than trapping a trigger `SIGNAL`. |
| Treatments/consultation notes only on `Completed` appointments | Trigger on `CONSULTATIONS`/`CONSULTATION_TREATMENTS` insert that checks `APPOINTMENTS.status = 'Completed'`, else `SIGNAL SQLSTATE '45000'`. |
| Payment amount ≤ outstanding balance | Trigger `BEFORE INSERT` on `PAYMENTS`, or enforced in `sp_record_payment` — same pattern as booking, prefer the procedure. |
| Invoice status auto-flips to `Paid` when balance hits 0 | `AFTER INSERT` trigger on `PAYMENTS` that recalculates `INVOICES.status`, or do it at the end of `sp_record_payment`. |
| NIC format (9 digits+letter or 12 digits) | CHECK constraint or validated in `sp_register_patient` / backend — MySQL 8 supports CHECK constraints, use one on `USER.id_number`. |
| Phone number exactly 10 digits | CHECK constraint on `CONTACT.phone_number` / `PATIENT.emergency_contact`. |
| Unique treatment service code | `UNIQUE` on `TREATMENT_CATALOGUE.treatment_code`. |
| No hard delete of branches with staff assigned | Trigger `BEFORE DELETE` on `BRANCH` that raises if `STAFF` rows reference it — or simply don't expose a DELETE, only `is_active`. |

## 4. Suggested stored procedures / functions

- `sp_book_appointment(patient_id, doctor_id, slot_id, type)` — validates availability + no
  overlap, inserts `APPOINTMENTS` row, marks the slot booked. Single transaction.
- `sp_complete_appointment(appointment_id, notes, diagnosis, treatment_list)` — updates status,
  inserts `CONSULTATIONS`, inserts `CONSULTATION_TREATMENTS` rows, calls invoice generation.
  Single transaction; rolls back entirely on any failure (FR-DMI-06).
- `fn_calculate_invoice_total(consultation_id)` — sums treatment prices, returns total (used by
  invoice generation).
- `fn_calculate_insurance_coverage(patient_id, treatment_code, amount)` — checks active policy +
  `POLICY_TREATMENT_COVERAGE`, returns covered amount vs. patient payable amount.
- `sp_record_payment(invoice_id, amount, payment_type)` — validates amount ≤ outstanding,
  inserts `PAYMENTS`, updates `INVOICES.status`. Single transaction (FR-BPM-08).

## 5. Indexing plan

Index every column that's a join target, a search field, or a report filter:

- `APPOINTMENTS(doctor_id, status)`, `APPOINTMENTS(patient_id)` — daily schedules, patient
  history lookups.
- `DOCTOR_AVAILABILITY_SLOTS(doctor_id, date, status)` — availability queries for booking.
- `PATIENT(user_id)` already PK; add index on `USER(id_number)` and a full-text or prefix index
  on name fields for the NIC/name search (FR-PM-04).
- `INVOICES(status)`, `INVOICES(patient_id via consultation/appointment join)` — outstanding
  balance report.
- `CONSULTATION_TREATMENTS(treatment_code)` — treatment-category report.
- `PAYMENTS(payment_date)`, `INVOICES(consultation_id)` — revenue/period reports.
- Composite index `APPOINTMENTS(branch_via_doctor, date, status)` if branch-wise daily summary
  queries are slow — consider denormalizing `branch_id` onto `APPOINTMENTS` if joins through
  `DOCTOR → STAFF → BRANCH` prove too expensive at report time; document the tradeoff if you do.

## 6. Seed / dummy data checklist (FR requires SQL-script seeding, not custom UI)

- 3 branches (Colombo, Kandy, Galle), a branch manager each.
- ~8–10 specialties, 6–10 doctors with 1–2 specialties each, spread across branches.
- 15–20 treatments in `TREATMENT_CATALOGUE` with assumed prices and `is_eligible_for_insurance`
  flags — document your assumed price list in `/db/seed/README.md`.
- 2–3 insurance providers with policies and per-treatment coverage percentages (assumption —
  document it).
- 30–50 patients, a mix with and without insurance, some with allergies.
- Appointments spanning Scheduled/Completed/Cancelled across multiple days and branches so every
  report has real data to show.
