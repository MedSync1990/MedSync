# MedSync CATMS — Workload Division & Tracking

Team (Group 4): **Shavinda · kalana · Chenith ·
Dilantha · Ashen**

Work is split by module so each person owns their DB tables, API router, and frontend pages
end-to-end. Below, that ownership is broken into **5 phases**, and inside each phase every
member has their own task list with a full description and a checkbox to mark done. Tick a box
by changing `[ ]` to `[x]` when the task is finished and merged.

## Module ownership (quick reference)

| Member | Module |
|---|---|
| Shavinda | Auth & Branch/Staff Management |
| kalana | Doctor/Specialty & Appointment Management |
| Chenith | Patient Management & Consultation/Treatment |
| Dilantha | Billing & Insurance |
| Ashen | Reporting, DB Integrity & Infra |

---

## Phase 1 — Database Schema & Seed Skeleton

Goal: every table exists, keyed correctly, with enough seed data for the other phases to build
against. **Garusinghe's and Jayawardena's tables should land first** — patients, doctors, and
appointments are the FK targets everyone else depends on.

**Shavinda**
- [ ] Write DDL for `ROLE`, `USER`, `STAFF`, `BRANCH` — correct PK/FK chain (`USER.role_id →
      ROLE`, `STAFF.user_id → USER`), matching column types from the ERD.
- [ ] Add the `BEFORE DELETE` trigger on `BRANCH` that blocks deletion while staff are assigned
      (FR-DMI-08).
- [ ] Add CHECK constraints for NIC format and phone number format on `USER`/`CONTACT`
      (FR-DMI-10, FR-DMI-11).
- [ ] Seed 3 branches (Colombo, Kandy, Galle), all roles, and one admin + one branch manager
      per branch.

**kalana**
- [ ] Write DDL for `DOCTOR`, `SPECIALTY`, `DOCTOR_SPECIALTY`, `DOCTOR_AVAILABILITY_SLOTS`,
      `APPOINTMENTS`.
- [ ] Write `sp_book_appointment` stored procedure — checks doctor availability and rejects
      overlapping time ranges inside the same transaction as the insert (FR-AM-03).
- [ ] Seed 8–10 specialties and 6–10 doctors (1–2 specialties each) spread across branches, plus
      a week of availability slots per doctor.

**Chenith**
- [ ] Write DDL for `PATIENT`, `ALLERGY`, `PATIENT_ALLERGY`, `ADMISSION`, `CONSULTATIONS`,
      `CONSULTATION_TREATMENTS`, `TREATMENT_CATALOGUE`.
- [ ] Add `UNIQUE` constraint on `CONSULTATIONS.appointment_id` (one consultation per
      appointment) and the trigger blocking consultation/treatment inserts unless the parent
      appointment's status is `Completed` (FR-CTM-06).
- [ ] Seed 30–50 patients (mixed insurance/allergy status) and 15–20 treatments in the catalogue
      with assumed prices and insurance-eligibility flags — document the assumed price list.

**Dilantha**
- [ ] Write DDL for `INVOICES`, `PAYMENTS`, `PATIENT_INSURANCE`, `INSURANCE_POLICY_DETAILS`,
      `POLICY_TREATMENT_COVERAGE`.
- [ ] Write `sp_record_payment` — rejects amount greater than outstanding balance, flips
      invoice status to `Paid` when balance hits zero (FR-BPM-06, FR-BPM-07).
- [ ] Seed 2–3 insurance providers with policies and per-treatment coverage percentages —
      document the assumed coverage rules.

**Ashen**
- [ ] Merge everyone's DDL into one `db/schema.sql`, applied in FK-safe order; resolve any
      naming/type conflicts against the ERD.
- [ ] Apply the indexing plan from `docs/database.md` §5 across all tables.
- [ ] Review every trigger/procedure written above for consistency (naming, error format).
- [ ] Set up `docker-compose.yml`'s `db` service so `schema.sql` + everyone's seed files run
      automatically on first container start.
- [ ] Combine individual seed files into `db/seed/seed_data.sql`, run it end-to-end once, and
      confirm no FK errors.

---

## Phase 2 — Backend (FastAPI)

Goal: every route in `docs/api-routes.md` exists, calls the Phase 1 procedures/tables, and
returns the documented shape.

**Shavinda**
- [ ] `POST /auth/login`, `/auth/logout`, `GET /auth/me` — JWT issue/validate, failed-login
      tracking + temporary lockout (FR-UAC-06).
- [ ] RBAC dependency/middleware used by every other router to restrict endpoints by role.
- [ ] `/branches` CRUD, `/staff` CRUD (register, update, deactivate).

**kalana**
- [ ] `/doctors`, `/specialties` CRUD + specialty assignment endpoint.
- [ ] `GET /doctors/{id}/availability` — reads open slots.
- [ ] `POST /appointments`, `/appointments/walk-in`, `PUT /appointments/{id}/reschedule`,
      `PUT /appointments/{id}/cancel` — all call `sp_book_appointment` / re-validate slots.

**Chenith**
- [ ] `/patients` CRUD + `GET /patients?search=` (NIC/name/contact).
- [ ] `PUT /appointments/{id}/complete`, `POST /appointments/{id}/consultation`,
      `POST /appointments/{id}/treatments`.
- [ ] `/treatments` CRUD (catalogue), soft-delete when linked to existing records
      (FR-TCM-05).

**Dilantha**
- [ ] `GET /invoices/{id}`, `GET /patients/{id}/invoices`.
- [ ] `POST /invoices/{id}/payments` — server-side amount ≤ outstanding check, independent of
      any client-side check.
- [ ] `GET /patients/{id}/balance`, `/patients/{id}/insurance`, `POST /insurance/verify`.

**Ashen**
- [ ] FastAPI project scaffolding — app structure, DB session/connection handling, global error
      handler returning the `{field, message}` validation shape.
- [ ] `/reports/*` — all 5 report endpoints.
- [ ] `requirements.txt`, `.env` wiring for `DATABASE_URL`, and a smoke-test script that hits
      every router once.

---

## Phase 3 — Frontend (React + TypeScript)

Goal: every page in `docs/page-content.md` exists, follows `docs/ui-guidelines.md`, and talks to
the Phase 2 API.

**Shavinda**
- [ ] Login page + JWT storage/route guards.
- [ ] Sidebar + top bar shell, filtered by role (reused by every other page).
- [ ] Manage Branches, Manage Staff & Users admin pages.

**kalana**
- [ ] Manage Doctors & Specialties admin page.
- [ ] Book Appointment page — multi-step flow (Find Patient → Category → Specialty → Doctor/Slot
      → Confirm), matching the reference screenshot.
- [ ] Manage Appointments page (filters, reschedule, cancel, create walk-in).

**Chenith**
- [ ] Register Patient, Patient Directory pages.
- [ ] Doctor's Consultation page — notes/diagnosis form + treatment picker, "Complete
      Appointment" gated on saved notes (FR-CTM-07).
- [ ] Treatment Catalogue admin page.

**Dilantha**
- [ ] Invoices list + detail view (itemised lines, insurance breakdown).
- [ ] Collect Payment page.
- [ ] Insurance registration section on the patient profile.

**Ashen**
- [ ] Dashboard page (today's summary widgets, quick actions).
- [ ] All 5 report pages (filters + table/chart + empty state per FR-RA-06).
- [ ] Typed API client wrapper (`/frontend/src/api`) used by all pages above.
- [ ] Pass over responsive layout + empty/loading/error states across all pages.

---

## Phase 4 — Integration, Reports & Bug Fixing

Goal: everything merged into `phase-1` works together against the full seed dataset, not just
each person's own module in isolation.

**Shavinda**
- [ ] End-to-end test: login as each role, confirm RBAC hides/shows the correct sidebar items
      and blocks disallowed API calls.
- [ ] Fix bugs found in Branch/Staff module during integration.

**kalana**
- [ ] End-to-end test: book, reschedule, cancel, and walk-in an appointment; confirm the
      overlap-prevention rejects a genuinely conflicting booking.
- [ ] Fix bugs found in Doctor/Appointment module during integration.

**Chenith**
- [ ] End-to-end test: register a patient, complete an appointment, attach treatments, confirm
      an invoice is generated correctly from it.
- [ ] Fix bugs found in Patient/Consultation module during integration.

**Dilantha**
- [ ] End-to-end test: partial payment, full payment, invoice status flip, insurance coverage
      split on an eligible treatment.
- [ ] Fix bugs found in Billing/Insurance module during integration.

**Ashen**
- [ ] Expand seed data volume (more patients, appointments across several days/branches) so all
      5 reports return meaningful, non-trivial results.
- [ ] Run all 5 reports against the expanded dataset and confirm numbers are correct by hand for
      at least one report.
- [ ] Coordinate the `phase-1` → `main` merge once every module branch above is green.

---

## Phase 5 — Presentation Prep

Goal: a reliable one-command demo and a clean walkthrough for the presentation.

**Shavinda**
- [ ] Prepare a demo login credentials sheet — one user per role, with password.
- [ ] Polish copy/microcopy on auth + branch/staff pages against `docs/page-content.md`.

**kalana**
- [ ] Prepare the "book an appointment" demo path (patient + doctor chosen ahead of time so it
      runs smoothly live).
- [ ] Polish copy on appointment pages against `docs/page-content.md`.

**Chenith**
- [ ] Prepare the "complete an appointment → generate invoice" demo path.
- [ ] Polish copy on patient/consultation pages against `docs/page-content.md`.

**Dilantha**
- [ ] Prepare the "collect payment + insurance coverage" demo path.
- [ ] Polish copy on billing/insurance pages against `docs/page-content.md`.

**Ashen**
- [ ] Write `backend/Dockerfile` and `frontend/Dockerfile` per `docs/docker.md`, uncomment the
      corresponding blocks in `docker-compose.yml`.
- [ ] Confirm `docker compose up -d --build` brings up the full stack (DB + API + UI) from a
      clean checkout on a different machine than the one it was built on.
- [ ] Prepare the reports demo path and a backup screen-recording in case of live-demo issues.
- [ ] Final full run-through of all five module demo paths back-to-back, timing it.

---

## Status legend

Use `[ ]` → `[x]` on each task above as it's completed and merged. For a quick glance at what's
outstanding, search the file for `[ ]`.
