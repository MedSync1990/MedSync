# MedSync CATMS — API Routes

Base path: `/api/v1`. All routes except `/auth/login` require `Authorization: Bearer <JWT>`.

**Role column** — A = Admin, BM = Branch Manager, D = Doctor, R = Receptionist.

> **Resolved discrepancy (see `architecture.md` §13):** `page-content.md` explicitly states there
> is **no Patient role, no patient login, and no patient-facing portal** (§5 of that doc) — patients
> never authenticate. This version removes the `P (self)` role and any `/patients/{id}/...` "self"
> semantics from the previous draft. Everywhere a patient needs to see something (balance, invoice,
> appointment), a staff member (R, or BM/A for oversight) looks it up on their behalf and relays it
> in person, by phone, or via print/email. If a self-service portal is added later it is a separate,
> explicitly-scoped feature (own auth, own role, own routes) — not assumed here.

---

## 0. Conventions

### 0.1 Response envelope
- List endpoints: `{ "data": [...], "total": <int>, "page": <int>, "limit": <int> }`, support
  `?page=&limit=` (default `page=1&limit=25`, max `limit=100`).
- Single-resource GET/POST/PUT: return the resource itself, not a wrapper — and every mutating
  endpoint returns the created/updated resource, never a bare status code.
- Soft-delete/deactivate endpoints return the resource with its updated `status`/`is_active` field.

### 0.2 Error format
- `400` — malformed request (bad JSON, wrong type).
- `401` — missing/invalid/expired JWT.
- `403` — valid JWT, role not permitted for this route (FR-UAC-05) → body:
  `{"message": "You don't have permission to view this page."}` (matches `page-content.md` §0
  global microcopy).
- `404` — resource not found or not visible to caller's branch scope.
- `409` — state conflict (double-booked slot, service code already exists, payment exceeds
  balance, branch/treatment deactivation blocked by linked records).
- `422` — field-level validation failure: `{"errors": [{"field": "...", "message": "..."}]}`
  (SRS §3.1, matches `api-routes.md` original convention — every message here must be the
  human-readable copy from `page-content.md` where one is defined, e.g. NIC/phone formats).
- `500` — unhandled server error; body never exposes stack traces or SQL (SRS 5.2.6).

### 0.3 ID formats (page-content.md §6)
- Patient: `PT-xxxxxx`, Invoice: `INV-xxxxxx`, Appointment: `APT-xxxxxx` — zero-padded 6-digit,
  generated server-side (DB sequence or `nextval` wrapped in the insert transaction), never
  client-supplied.
- Internal numeric surrogate PKs (per `architecture.md` ER diagram) back every public ID; the
  public ID is a formatted display column, not the PK, so it's cheap to keep stable if a record
  is ever renumbered.

### 0.4 Global validation rules (FR-DMI-10, FR-DMI-11, FR-PM-07)
Applied to every route that accepts these fields, not just Patients:
- **NIC**: `^\d{9}[VvXx]$` or `^\d{12}$` → error copy *"Enter a valid NIC (9 digits + letter, or
  12 digits)."*
- **Phone**: exactly 10 digits, numeric only → error copy *"Enter a 10-digit phone number."*
- **Email** (only when provided): standard email format → *"Enter a valid email address."*
- Any required field left blank → *"This field is required."*
- Currency fields: `decimal(10,2)`, formatted in responses as `LKR {amount}` with thousands
  separators on the frontend (backend returns the raw decimal).

### 0.5 Authorization enforcement
Every route below is guarded server-side by role (FastAPI dependency, not just UI hiding) per
FR-UAC-04/05 — the Role column is the enforced allow-list, not a suggestion. Branch-scoped roles
(BM) are additionally filtered by their own `branch_id` from the JWT claim, not a query param the
client controls — a BM passing `?branch=<other>` gets that param ignored/overridden server-side,
not a 403, so the UI doesn't need special-case error handling for it.

---

## 1. Auth

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/auth/login` | any | body `{username, password}`. See 1.1. |
| POST | `/auth/logout` | all | invalidates the current token/session. |
| GET | `/auth/me` | all | returns `{user_id, role, branch_id, first_name, last_name}` for top-bar greeting + role/branch subtitle (`page-content.md` §0). |

### 1.1 Login business logic (FR-UAC-01/02/03/06, §4.1.2)
1. Validate credentials against `USER`/`STAFF` (password hashed+salted at rest, SRS 5.3.1).
2. On success: issue JWT (claims: `user_id`, `role_id`, `branch_id`), record login timestamp
   for audit (FR-UAC-06), reset the failed-attempt counter, return `200`.
3. On failure: increment a per-account failed-attempt counter; on invalid credentials return
   `401` with *"invalid username or password"* copy — never reveal which field was wrong.
4. **Lockout**: once the failed-attempt counter reaches the configured threshold (value not
   determined from the source documents — SRS Appendix C), lock the account and return `423`
   (or `401` with a distinguishing `locked: true` flag) with copy indicating the account is
   temporarily locked; further attempts while locked are rejected without re-checking the
   password (avoids leaking whether a guess would've been correct).
5. Session timeout: JWT expiry not determined from source docs; on expiry any authenticated
   route returns `401` and the frontend shows *"Your session has expired. Please log in again."*
   (`page-content.md` §0) — SRS 5.2.8 also requires idle-timeout server-side, not just token TTL.

---

## 2. Branches

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/branches` | A, BM | A sees all; BM sees only their own (single-row list). |
| GET | `/branches/{id}` | A, BM(own) | includes staff count, branch manager, status. |
| POST | `/branches` | A | create. Body: `name*`, `address*`, `phone_number*`, `branch_manager_id` (optional, dropdown of eligible staff per `page-content.md` §3.3). |
| PUT | `/branches/{id}` | A | update any field above. |
| PUT | `/branches/{id}/deactivate` | A | soft-deactivate — see 2.1. Replaces the old `DELETE` verb: branches are never hard-deleted (FR-DMI-09 extends to branches by the same "preserve history" principle applied everywhere else in the SRS). |

### 2.1 Deactivation business logic (FR-DMI-08, FR-BSM-01)
- Server checks for any `STAFF` row with `branch_id = {id}` and `is_active = true`.
- If any exist → `409` with copy *"This branch has staff assigned and can't be deactivated.
  Reassign staff first."* (`page-content.md` §3.3).
- If none → set `status = Inactive`; branch and its historical appointments/invoices remain
  queryable (reports must still be able to reference a deactivated branch's past data).

---

## 3. Staff & Doctors

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/staff` | A, BM | filter `?branch=&role=&status=`. **BM is branch-locked per 0.5** — the `branch` filter is forced to their own branch server-side, same pattern as Reports; A can see/filter any branch. |
| GET | `/staff/{id}` | A, BM(own branch) | full profile. BM gets `404` (not `403`) for a staff member outside their branch, per 0.5 — doesn't reveal the record exists elsewhere. |
| POST | `/staff` | A, BM(own branch) | register — see 3.1. **BM may only register Doctor/Receptionist staff, and only into their own branch** — `branch` is forced server-side to the caller's branch for a BM, and `role = Administrator` or `role = Branch Manager` is rejected (`403`) when the caller is a BM. Creating another Branch Manager or an Admin account stays Admin-only, as a governance boundary (assumption — not stated in the source documents, flagged here since it wasn't explicit either way). |
| PUT | `/staff/{id}` | A, BM(own branch) | update name/contact/branch/role — same BM restrictions as POST (own branch only, can't touch Admin/BM-role accounts or reassign a staff member to a different branch than their own). |
| PUT | `/staff/{id}/deactivate` | A, BM(own branch) | soft-deactivate (FR-BSM-06, FR-DMI-09) — never hard-deleted; historical appointment/audit records referencing this staff member are preserved. |
| GET | `/doctors` | A, BM, R, D | filter `?specialty=&branch=`; used by Book Appointment step 4. |
| GET | `/doctors/{id}` | A, BM, R, D | profile + specialties + branch. |
| POST | `/doctors` | A, BM(own branch) | register doctor — body includes `license_number*` in addition to staff fields; creates `USER`→`STAFF`→`DOCTOR` rows in one transaction. Same branch-lock as `POST /staff`. |
| PUT | `/doctors/{id}` | A, BM(own branch) | update doctor-only fields (license number). |
| PUT | `/doctors/{id}/specialties` | A, BM(own branch) | body `{add: [speciality_id...], remove: [speciality_id...]}` — upserts/deletes `DOCTOR_SPECIALITY` rows; a doctor must retain at least one specialty (reject a remove that would leave zero). |
| GET | `/specialties` | all | list, includes doctor count per specialty (`page-content.md` §3.5). |
| POST | `/specialties` | A | body `{name*}`; unique constraint on name — kept Admin-only since a specialty is a clinic-wide reference value, not branch-specific. |

### 3.0 Branch Manager staff-management scope (new)
A Branch Manager gets the same staff/doctor CRUD Admin has, narrowed to their own branch:
- Every route above that lists `BM(own branch)` is enforced the same way branch-scoped reports
  already work (§10) — the server ignores/overrides any `branch` the client supplies and uses the
  BM's own `branch_id` from the JWT claim.
- A BM cannot create or edit an `Administrator` or `Branch Manager` account, anywhere — that
  privilege stays Admin-only regardless of branch, so a Branch Manager can't grant themselves or
  a colleague elevated access.
- A BM cannot move a staff member to a different branch than the BM's own (no cross-branch
  reassignment from this role) — Admin remains the only role that can transfer staff between
  branches.
- Deactivating a Doctor still respects `DOCTOR_SPECIALITY`'s existing constraints (§3.1) and
  `fn_deactivate_staff()` (`database.md` §7.9) — no special-casing needed for who called it.

### 3.1 Staff registration business logic (FR-BSM-02/03/04/05)
1. Validate NIC (0.4), phone (0.4), email (0.4), required `name*`, `role*`
   (Admin/Branch Manager/Doctor/Receptionist), `branch*`.
2. `role = Doctor` → `specialty` field becomes required (at least one) and the route also creates
   the `DOCTOR` extension row.
3. Reject if NIC already exists for any user (FR-BSM-05 uniqueness) → `409`.
4. Generate a temporary password server-side (shown once in the response, per
   `page-content.md` §3.4 — never emailed in plaintext, never retrievable again after this call).
5. Create `USER` → `STAFF` (→ `DOCTOR` if applicable) as one transaction; on any failure, roll
   back the whole chain (no orphaned `USER` row without a `STAFF` row).

---

## 4. Patients

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/patients?search=` | A, BM, R, D | search by NIC, name, or phone (FR-PM-04); returns matches regardless of registering branch (FR-PM-06). |
| POST | `/patients` | R | register — see 4.1. |
| GET | `/patients/{id}` | A, BM, R, D | full profile incl. appointment/treatment/insurance history (FR-PM-05 preserves history across edits). |
| PUT | `/patients/{id}` | R | update personal/emergency-contact details; never overwrites historical appointment/treatment/billing rows tied to the old values. |
| POST | `/patients/{id}/insurance` | R | register a policy — see §10. |
| GET | `/patients/{id}/balance` | R, BM | outstanding total across all active invoices (§9). |
| GET | `/patients/{id}/invoices` | R | invoice history for that patient (§9). |
| GET | `/patients/{id}/allergies` | A, BM, R, D | returns `[{allergy_id, allergy_code, name}]` — backs the red "Allergy: {name}" pills on the Doctor's Consultation screen (`page-content.md` §2.3) and the `PATIENT_ALLERGY` join table (`architecture.md` ER diagram). |
| PUT | `/patients/{id}/allergies` | R | body `{allergy_ids: [int...]}` — replaces the patient's allergy set (add/remove in one call); editable from Register Patient and from the patient's profile (`page-content.md` §1.2/§1.3 don't show a dedicated field for this, so treat it as part of the same profile-edit surface as emergency contact/insurance until a dedicated form is specified). |
| GET | `/allergies` | all | reference list of known allergies (`allergy_code`, `name`) for the picker used by the route above — same pattern as `GET /specialties`. |
| POST | `/allergies` | A | add a new allergy to the reference list; body `{allergy_code*, name*}`, unique on `allergy_code`. Not explicitly assigned to a role in the source documents — grouped with other reference-data management (treatments, specialties), which are all Admin-only. |

### 4.1 Registration business logic (FR-PM-01/02/03/07, `page-content.md` §1.2)
1. Section 1 — Personal: `full_name*`, `dob*`, `gender*` (Male/Female/Other), `address*`,
   `phone*`, `email` (optional), `nic*`.
2. Section 2 — Emergency contact: `contact_name*`, `relationship*`, `phone*`.
3. Section 3 — Insurance (optional at registration time, toggle-gated): if the "Add insurance
   details now" toggle is on, `provider*`, `policy_number*`, `start_date*`, `end_date*` become
   required; if off, none of these fields are sent and insurance can be added later via
   `POST /patients/{id}/insurance`.
4. Server validates NIC/phone/email formats (0.4); reject duplicates on NIC → `422` with
   *"A patient with this NIC already exists."*
5. On success: generate `PT-xxxxxx`, set `registered_date = now()`, `registered_branch = <caller's branch>`
   (but the record itself carries no branch-restriction on later access — FR-PM-06).

---

## 5. Appointments

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/doctors/{id}/availability?date=` | R, D | returns open slots for that doctor/date (FR-AM-04) — drives Book Appointment step 4's time chips. |
| POST | `/appointments` | R | book — see 5.1. |
| POST | `/appointments/walk-in` | R | emergency walk-in — see 5.2. |
| PUT | `/appointments/{id}/reschedule` | R | body `{new_slot_id}` — see 5.3. |
| PUT | `/appointments/{id}/cancel` | R | sets status `Cancelled`; requires the client to have shown a confirmation dialog first (`ui-guidelines.md` §2), server does not re-prompt but does log the cancellation (FR-AM-08). |
| GET | `/appointments?branch=&date=&status=&doctor=` | A, BM, R | powers Manage Appointments table + the daily-summary widgets; BM is branch-locked per 0.5. |
| GET | `/appointments/{id}` | A, BM, R, D | full detail (patient, doctor, slot, status, linked consultation/invoice if any). |

### 5.1 Booking business logic (FR-AM-01/02/03/09, FR-DMI-04)
1. Body: `{patient_id, doctor_id, slot_id, appointment_type}` (`appointment_type` ∈
   Doctor Consultation / Walk-in / Follow-up per `page-content.md` §1.4 step 2).
2. **Overlap check, inside a single transaction**: `SELECT ... FOR UPDATE` the target
   `DOCTOR_AVAILABILITY_SLOTS` row (or call a stored procedure that does the same) to lock it,
   confirm it's still `status = Open`, then insert the `APPOINTMENTS` row with `status =
   Scheduled` and flip the slot to `Booked` — all-or-nothing (`architecture.md` §7).
3. If the slot was taken between the availability fetch and this call → `409` with copy
   *"This doctor is no longer available at the selected time. Please choose another slot."*
   (`page-content.md` §1.4) — this is the concrete manifestation of the non-overlap constraint
   (FR-AM-03/FR-DMI-04); it must be enforced by the DB layer (unique constraint on
   `(doctor_id, slot_id)` plus the row lock), not application logic alone, since two
   receptionists can submit concurrently from different branches.
4. On success: generate `APT-xxxxxx`, return the created appointment.

### 5.2 Walk-in business logic (FR-AM-07)
- Same validation and transaction as 5.1, minus a pre-existing `slot_id` — instead the server
  creates an ad-hoc slot for "now" (or the given time) against the chosen doctor, subject to the
  same overlap check, then books it in the same transaction. `appointment_type = Walk-in` is
  set automatically.

### 5.3 Reschedule business logic (FR-AM-05)
1. Re-run the availability/overlap check (5.1 step 2) against `new_slot_id`.
2. On success, within one transaction: free the old slot (`status = Open`), book the new slot,
   update the `APPOINTMENTS` row's `slot_id` — status remains `Scheduled` throughout
   (`architecture.md` §8 "Reschedule" flow); nothing is deleted, so the audit trail of the old
   slot's booking history stays intact (FR-AM-08).
3. Reject reschedule of an appointment that is `Completed` or `Cancelled` → `409`.

---

## 6. Consultations & Treatments

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/appointments/{id}/consultation` | D | body `{diagnosis, consultation_notes}` — creates/updates the `CONSULTATIONS` row for that appointment (FR-CTM-01/02). |
| POST | `/appointments/{id}/treatments` | D | body `{treatments: [{treatment_code, quantity}]}` — see 6.1. |
| PUT | `/appointments/{id}/complete` | D | see 6.2. |
| GET | `/appointments/{id}/consultation` | A, BM, R, D | read-back (consultation + attached treatments) for the invoice detail view and patient history. |
| GET | `/treatments` | all | catalogue (also used read-only by Doctor's "Treatment Catalogue" page). |
| POST | `/treatments` | A | add — see §7. |
| PUT | `/treatments/{code}` | A | update. |
| PUT | `/treatments/{code}/deactivate` | A | soft-deactivate — see §7. |

### 6.1 Attaching treatments (FR-CTM-03/04/05/09)
`page-content.md` §2.3 renders Consultation as a single screen — notes/diagnosis, then a
treatment picker, then one **"Complete Appointment"** button that's disabled until notes are
saved — so treatments are chosen *while the appointment is still `Scheduled`*, and only the
final button click transitions it to `Completed` and generates the invoice (§6.2). This
supersedes a literal reading of FR-CTM-06 ("treatments restricted to Completed records"): that
requirement is satisfied at the point of *billing* (an invoice can only ever be built from a
`Completed` appointment, §6.2), not at the point of *picking* treatments on the consultation
screen. Accordingly the guard on this route is:
- Reject (`409`) if the appointment's status is `Cancelled`.
- Reject (`409`) if the appointment is already `Completed` **and** an invoice has been
  generated for it — treatment lines are immutable once billing has run (a correction flow is
  not determined from the current documents, see §11.3).
- Otherwise (status `Scheduled`, not yet invoiced) — allow, which is the normal case this route
  is called in.
- Each treatment line: validate `treatment_code` exists and is active in the catalogue, `quantity
  >= 1`; persist service code, name, and **the price at the time of prescribing** (snapshot, not
  a live join to `TREATMENT_CATALOGUE`, so a later price change never rewrites a historical bill).
- Multiple treatments per appointment supported (one-to-many `CONSULTATION_TREATMENTS`).

### 6.2 Completing an appointment → invoice generation (FR-CTM-06/07/08, FR-BPM-01/02, FR-DMI-05/06)
1. Precondition: a `CONSULTATIONS` row with non-empty `consultation_notes` must already exist for
   this appointment. If not → `422`, copy *"Add consultation notes before completing this
   appointment."* (`page-content.md` §2.3, FR-CTM-07).
2. Single transaction:
   a. Update `APPOINTMENTS.status = Completed`.
   b. Read all `CONSULTATION_TREATMENTS` for this appointment and their snapshotted prices.
   c. If the patient has an active insurance policy (`PATIENT_INSURANCE.is_active = true` and
      today between `start_date`/`end_date`), look up `POLICY_TREATMENT_COVERAGE` for each
      insurance-eligible treatment and compute `insurance_amount` (see §10.1); otherwise
      `insurance_amount = 0`.
   d. Insert `INVOICES` row: `total_amount = Σ(price × quantity)`, `insurance_amount` as
      computed, `status = Unpaid` (or `Partially Paid`/`Paid` only ever reached later, via §9).
3. If any step fails, the whole transaction rolls back — the appointment is **not** left
   `Completed` with no invoice, and no invoice is left referencing treatments that didn't
   actually get persisted (FR-DMI-05/06).
4. Success toast copy: *"Appointment completed. Invoice generated."* (`page-content.md` §2.3).
5. Once `Completed` and invoiced, `POST /appointments/{id}/treatments` is rejected (`409`) —
   treatment lines are immutable after billing; corrections require an authorized adjustment
   flow that is **not determined from the current documents**.

---

## 7. Treatment Catalogue

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/treatments` | all | table: Code, Name, Category, Price, Insurance-Eligible, Status. |
| GET | `/treatments/{code}` | all | single entry. |
| POST | `/treatments` | A | body `{service_code*, name*, category*, price*, is_insurance_eligible}` (FR-TCM-01/06). |
| PUT | `/treatments/{code}` | A | update name/category/price/eligibility (FR-TCM-03). |
| PUT | `/treatments/{code}/deactivate` | A | soft-deactivate — see 7.1. |

### 7.1 Business logic (FR-TCM-02/05/07/08)
- `service_code` unique — duplicate on create/update → `409`, copy referencing an existing code
  in use (`page-content.md` §3.6 / FR-TCM-07).
- Required fields enforced before save (FR-TCM-06); `price` must be `> 0`.
- Deactivate: check for any `CONSULTATION_TREATMENTS` row referencing this `treatment_code`. If
  none exist, it *may* be hard-deleted; if any exist, it is **always** soft-deactivated instead
  (`status = Inactive`) so historical invoices still resolve the treatment's name/category
  (FR-TCM-05). Deactivated treatments are excluded from the picker in `POST
  /appointments/{id}/treatments` (6.1) but remain visible (with an Inactive pill) in `GET
  /treatments` for reporting/history.
- Success toast: confirmation message on create/update/deactivate (FR-TCM-08).

---

## 8. Billing & Payments

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/invoices/{id}` | A, BM, R | totals, itemised treatment lines, insurance split, payment history, status. |
| GET | `/patients/{id}/invoices` | R | patient's invoice history (FR-BPM-05). |
| POST | `/invoices/{id}/payments` | R | record a payment — see 8.1. |
| GET | `/patients/{id}/balance` | R, BM | outstanding total, derived (not stored) — see 8.2. |

### 8.1 Recording a payment (FR-BPM-03/04/06/07/08, `page-content.md` §1.7)
1. Body: `{amount*, payment_type*}` (`payment_type` ∈ Cash / Card / Insurance Settlement).
2. Server recomputes current outstanding balance from source rows (8.2) — **never** trusts a
   client-supplied "balance" value.
3. Validate `amount > 0` and `amount <= outstanding_balance`; if it exceeds → `409`/`422` with
   copy *"Amount cannot exceed the outstanding balance of {amount}."* (FR-BPM-06).
4. Single transaction: insert `PAYMENTS` row, recompute outstanding balance, and set
   `INVOICES.status`:
   - `outstanding == 0` → `Paid` (FR-BPM-07), toast *"Invoice fully paid."*
   - `0 < outstanding < total` → `Partially Paid`, toast *"Payment recorded. Remaining balance:
     {amount}."*
   - No partial write is left if the transaction fails partway (FR-BPM-08/FR-DMI-06).
5. Client is expected to show a confirmation dialog before calling this route
   (`ui-guidelines.md` §2) — the route itself doesn't require a second "confirm" call, but does
   not skip validation just because the UI already confirmed.

### 8.2 Balance calculation (derived, not stored)
```
outstanding = invoice.total_amount - invoice.insurance_amount - SUM(payments.amount_paid)
```
Computed at read time (or refreshed transactionally on every payment/invoice-generation event,
per implementation choice) — `GET /patients/{id}/balance` sums this across all of a patient's
non-Paid invoices.

---

## 9. Insurance

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/patients/{id}/insurance` | A, BM, R, D | policy details, `is_active`, coverage terms. |
| POST | `/patients/{id}/insurance` | R | register a policy — see 9.1. |
| POST | `/insurance/verify` | R | body `{patient_id}` — checks policy active before a claim is attempted (FR-IM-02). |

### 9.1 Business logic (FR-IM-01–06)
1. Register: `provider*`, `policy_number*`, `start_date*`, `end_date*`; validated and stored
   against `PATIENT_INSURANCE` → `INSURANCE_POLICY_DETAILS` (`page-content.md` §1.2 §3, or added
   later from the patient profile).
2. `is_active` is derived at read/use time from `today ∈ [start_date, end_date]`, not a
   manually-toggled flag the user can get out of sync — an expired policy is never treated as
   active regardless of a stale stored value.
3. Coverage lookup during invoice generation (§6.2 step 2c): for each treatment on the
   consultation where `treatment.is_insurance_eligible = true`, look up
   `POLICY_TREATMENT_COVERAGE(policy_id, treatment_code).coverage_percentage`; if no row exists
   for that treatment, coverage for that line is `0` (not an error — not every treatment is
   covered by every policy).
4. `POST /insurance/verify` on an expired/invalid/missing policy → `409`/`422`, copy along the
   lines of *"This patient's insurance policy is expired or invalid."* (FR-IM-06); billing still
   proceeds, just with `insurance_amount = 0` for that invoice.

---

## 10. Reports

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/reports/appointments-summary?branch=&date=` | A, BM | FR-RA-01. BM: `branch` is forced to their own branch server-side, no selector shown (`page-content.md` §4). |
| GET | `/reports/doctor-revenue?from=&to=&branch=&doctor=` | A, BM, D | FR-RA-02. **Doctor** role: `doctor` is forced to `current_user_id` regardless of query param — this is the same endpoint that powers the Doctor's "My Earnings" page (`page-content.md` §2.5, "no separate calculation, just a filtered view"). Returns aggregate totals (revenue by period/category). |
| GET | `/reports/doctor-revenue/{doctor_id}/payments?from=&to=` | A, BM(own branch), D(self) | **New — itemized payment report.** Line-by-line list of `PAYMENTS` rows tied to this doctor's completed, invoiced appointments in the date range: date, patient, invoice code, amount, payment type, running total. Complements the aggregate `doctor-revenue` report above with the underlying detail a doctor would want to generate/export/print as their own payment report. `D` may only request `doctor_id = current_user_id` (`403` otherwise, same self-scoping pattern as `doctor-revenue`); `BM` is branch-locked to doctors at their own branch; `A` unrestricted. |
| GET | `/reports/outstanding-balances?branch=` | A, BM | FR-RA-03. |
| GET | `/reports/treatment-categories?from=&to=&branch=` | A, BM | FR-RA-04. |
| GET | `/reports/insurance-vs-out-of-pocket?from=&to=&branch=` | A, BM | FR-RA-05. |

### 10.1 Shared report behavior (FR-RA-06)
- Every report route returns `{data: [], total: 0, ...}` (empty, not an error) when nothing
  matches the given criteria — the frontend renders *"No data available for the selected
  criteria."*, never a blank table (`page-content.md` §3.2).
- All five are read-only, computed from the same underlying tables the operational routes write
  to — no separate denormalized reporting store described in the source documents, so figures
  are always current as of the query.
- Backed by indexes on the join/filter columns actually used here — `appointments(branch_id,
  slot_id→date)`, `invoices(status)`, `consultation_treatments(treatment_code)`,
  `payments(invoice_id)` at minimum (SRS 5.1.5 / `architecture.md` §11 indexing directive).

---

## 11. Cross-cutting rules

### 11.1 Transaction boundaries (must be atomic — FR-DMI-05/06, `architecture.md` §7)
| Operation | Scope |
|---|---|
| Book / reschedule appointment | Row-lock the slot, check-then-insert/update, all in one transaction (5.1, 5.3). |
| Complete appointment → generate invoice | Status update + treatment read + insurance calc + invoice insert, all-or-nothing (6.2). |
| Record payment | Payment insert + balance recalculation + status flip, one transaction (8.1). |
| Staff/doctor registration | `USER` + `STAFF` (+ `DOCTOR`) insert chain, one transaction (3.1). |

### 11.2 Soft-delete-only entities (FR-DMI-09 and its extensions above)
Branches, staff (incl. doctors), patients, and treatments are **never** hard-deleted once they
have any historical reference (appointments, treatments, invoices). Every "remove" action in
this API is a `PUT .../deactivate` route, not `DELETE`, and every deactivation confirmation
dialog names the specific record (`page-content.md` §6) — the client is expected to have already
shown *"This action can't be undone. Are you sure?"* or the record-specific variant before
calling these routes.

### 11.3 Not determined from the current documents
Carried over from `architecture.md` §9/§14, still open at the API-design level:
- Exact login-lockout threshold and JWT expiry/refresh mechanics.
- Whether hard-delete is ever permitted for a record with zero historical references (vs.
  always soft-deleting for consistency) — not specified either way.
- Treatment-line correction/adjustment flow for an invoice that's already been generated.
- Audit-log read endpoints (FR-AM-08/FR-UAC-06/5.2.5 require logging, but no `GET /audit-log`
  route is described anywhere in the source documents).