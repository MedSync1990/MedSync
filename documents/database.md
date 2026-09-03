# MedSync CATMS — Database Design

**Engine: PostgreSQL 16.** Reference: `MedSync ER Diagram` (group ERD). This doc turns the ERD
into an implementation checklist — table-by-table notes, keys, procedures/triggers, and indexing
plan. Treat the ERD image as authoritative for column lists; this doc adds the *why* and the
*enforcement*.

> Syntax note: procedures/triggers below are written as PostgreSQL `PL/pgSQL` functions —
> Postgres doesn't have MySQL-style standalone stored procedures with `SIGNAL SQLSTATE`;
> instead you write a `FUNCTION` and either call it directly (`SELECT fn_name(...)`) or attach
> it to a table via `CREATE TRIGGER ... EXECUTE FUNCTION fn_name()`, and raise errors with
> `RAISE EXCEPTION 'message'`.

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

## 1a. Primary key generation

The ERD's `int` PKs (e.g. `appointment_id`, `invoice_id`) should be declared as
`GENERATED ALWAYS AS IDENTITY` — Postgres's equivalent of MySQL's `AUTO_INCREMENT`:

```sql
appointment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
```

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
| No two overlapping appointments for the same doctor | Best done as a Postgres `EXCLUDE` constraint using the `btree_gist` extension on `APPOINTMENTS(doctor_id, time_range)` with `&&` (overlap) — the database itself refuses the insert, no trigger needed. If you'd rather keep the logic explicit for the report, use a `fn_book_appointment()` function that checks for overlap inside the same transaction as the insert and `RAISE EXCEPTION` on conflict, called via a router/service layer. |
| Treatments/consultation notes only on `Completed` appointments | `BEFORE INSERT` trigger function on `CONSULTATIONS`/`CONSULTATION_TREATMENTS` that checks `APPOINTMENTS.status = 'Completed'`, else `RAISE EXCEPTION 'appointment must be Completed before recording treatments'`. |
| Payment amount ≤ outstanding balance | `BEFORE INSERT` trigger on `PAYMENTS`, or enforced inside `fn_record_payment()` — same pattern as booking, prefer the function so the API gets one clean call. |
| Invoice status auto-flips to `Paid` when balance hits 0 | `AFTER INSERT` trigger on `PAYMENTS` that recalculates `INVOICES.status`, or do it at the end of `fn_record_payment()`. |
| NIC format (9 digits+letter or 12 digits) | `CHECK` constraint using a regex, e.g. `CHECK (id_number ~ '^([0-9]{9}[VvXx]|[0-9]{12})$')` on `USER.id_number` — Postgres `CHECK` supports POSIX regex via `~` natively. |
| Phone number exactly 10 digits | `CHECK (phone_number ~ '^[0-9]{10}$')` on `CONTACT.phone_number` / `PATIENT.emergency_contact`. |
| Unique treatment service code | `UNIQUE` on `TREATMENT_CATALOGUE.treatment_code`. |
| No hard delete of branches with staff assigned | `BEFORE DELETE` trigger function on `BRANCH` that `RAISE EXCEPTION` if `STAFF` rows reference it — or simply don't expose a DELETE endpoint, only `is_active`. |

## 4. Suggested PL/pgSQL functions

Postgres uses `FUNCTION` for both what MySQL would call a "procedure" (write logic) and a
"function" (compute-and-return) — the distinction below is just naming for clarity, all are
`CREATE FUNCTION ... RETURNS ... AS $$ ... $$ LANGUAGE plpgsql;`.

- `fn_book_appointment(patient_id, doctor_id, slot_id, type)` — validates availability + no
  overlap, inserts `APPOINTMENTS` row, marks the slot booked. Runs as one transaction (wrap the
  caller's `INSERT` + `UPDATE` in the function body, or call it inside a backend `BEGIN/COMMIT`).
- `fn_complete_appointment(appointment_id, notes, diagnosis, treatment_list)` — updates status,
  inserts `CONSULTATIONS`, inserts `CONSULTATION_TREATMENTS` rows, calls invoice generation.
  Single transaction; rolls back entirely on any failure (FR-DMI-06) — Postgres does this
  automatically if the whole function body errors, since a function call inside a transaction
  block rolls back with it.
- `fn_calculate_invoice_total(consultation_id)` — sums treatment prices, returns total (used by
  invoice generation).
- `fn_calculate_insurance_coverage(patient_id, treatment_code, amount)` — checks active policy +
  `POLICY_TREATMENT_COVERAGE`, returns covered amount vs. patient payable amount.
- `fn_record_payment(invoice_id, amount, payment_type)` — validates amount ≤ outstanding,
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