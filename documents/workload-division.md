# MedSync CATMS — Workload Division & Tracking

Team (Group 4): **Shavinda · Kalana Jayawardena (W.K.I.) · Chenith Garusinghe · Dilantha
Thilakarathna (D.D.D.) · Ashen Silva (W.A.A.T.)**


Work is split by module so each person owns their DB tables, API routes, and frontend pages
end-to-end. Tasks below are synced against the **current** `docs/api-routes.md` and
`docs/database.md`; anything that changed shape since the last version of this doc is tagged
**(new)** or **(updated)** inline.

## Structural change from the last version: backend + frontend now run together

The old Phase 2/Phase 3 split (build every API route across the whole team, *then* build every
page across the whole team) meant nobody could see a working feature end-to-end until both
phases finished. **Phase 2 below now pairs each person's backend route(s) with the frontend
page(s) that call them**, so a person builds one feature — route, then the page that hits it,
then the next route, then its page — and has something clickable and demoable well before the
whole module is done. Same five people, same module ownership, same total task list — just
reordered and grouped by feature instead of by layer.

Two tasks are genuine team-wide blockers and are worth landing on day one of this phase even
though they're listed under their owner below: **Ashen's FastAPI scaffolding + typed API client
wrapper**, and **Dilantha's auth + RBAC middleware**. Nobody else's paired backend/frontend work
can really start until a request can be authenticated and a page can call an endpoint at all —
say so in standup and prioritize those two ahead of the rest of Phase 2, even within this
reordered structure.

## Module ownership (quick reference)

| Member | Module |
|---|---|
| Shavinda | Billing & Insurance |
| Kalana Jayawardena | Doctor/Specialty & Appointment Management |
| Chenith Garusinghe | Patient Management & Consultation/Treatment |
| Dilantha Thilakarathna | Auth & Branch/Staff Management |
| Ashen Silva | Reporting, DB Integrity & Infra |

---

## Phase 1 — Database Schema & Seed Skeleton

Goal: every table exists, keyed correctly, with enough seed data for the other phases to build
against. **This entire phase must be finished before anyone starts Phase 2** — every backend
route in Phase 2 calls a function or table that has to already exist.

### Build order (follow this, don't parallelize by person alone)

Each person's task list below is still organized by who owns what, but the *order* they land in
matters because of FK dependencies — jumping straight to your own section and starting will hit
missing-table errors. Work through these five steps in sequence:

1. **Dilantha's tables first** — `role`, `app_user`, `branch`, `staff`. Nothing else can be
   written until these exist: `patient` and `doctor` both extend `app_user`, and `staff` is what
   `doctor` extends from.
2. **Chenith's and Kalana's tables next, in parallel** — `patient`/`allergy`/
   `treatment_catalogue` and `doctor`/`specialty`/`doctor_availability_slots`/`appointments`
   don't depend on each other, so these two can genuinely happen at the same time once step 1 is
   merged. Everything downstream (consultations, invoices, payments) depends on **both** landing.
3. **Chenith's `consultations`/`consultation_treatments`** — needs `appointments` (step 2, from
   Kalana) and `treatment_catalogue` (step 2, from Chenith's own earlier tables) to already exist.
4. **Shavinda's `invoices`/`payments`/insurance tables** — needs `consultations` and
   `appointments` (step 3) to already exist.
5. **Ashen merges everyone's DDL into one `db/schema.sql`** in this exact order, applies the
   indexing plan, and wires up the roles/RLS/audit trigger — Phase 1 isn't done until this merge
   is green, not when each person's individual tables are written.

### File layout convention

Each person owns one `db/modules/0N_<module-name>.sql` file, numbered to match the build order
above (`01` = Dilantha, `02` = Kalana, `03` = Chenith, `04` = Shavinda, `05` = Ashen's
roles/RLS/audit setup) — that's what Ashen actually concatenates into `db/schema.sql`.

Within your own module file, splitting further into **one file per table** is fine and
encouraged once you've got more than two or three objects — Shavinda's module does this:
`db/modules/shavinda/01_insurance_policy_details.sql` through `06_fn_record_payment.sql`, with
`db/modules/04_billing_insurance.sql` reduced to a thin entry point that just `\i`'s them in FK
order. This is invisible to Ashen's merge either way — they still only ever touch the top-level
`0N_<module-name>.sql` file per person. Use it if it helps you navigate/review your own tables;
skip it if your module is small enough that one file is already easy to work in.

**Shavinda**
- [ ] **(updated — file layout)** Write DDL as **one file per table** under
      `db/modules/shavinda/`, numbered in FK order, plus a thin entry-point file that just
      `\i`'s them in sequence — this is what Ashen's merge step actually concatenates, so the
      per-table split underneath it is invisible to everyone else:
      - `db/modules/shavinda/01_insurance_policy_details.sql`
      - `db/modules/shavinda/02_patient_insurance.sql`
      - `db/modules/shavinda/03_policy_treatment_coverage.sql`
      - `db/modules/shavinda/04_invoices.sql`
      - `db/modules/shavinda/05_payments.sql`
      - `db/modules/shavinda/06_fn_record_payment.sql`
      - `db/modules/04_billing_insurance.sql` — entry point, six `\i` lines in the order above.
      DDL content for each comes from `database.md` §2.4/§2.6. **(updated)** `invoices` and
      `patient` also carry a `GENERATED ALWAYS AS` display-ID column (`invoice_code` = `INV-` +
      zero-padded `invoice_id`) — don't hand-roll ID generation in app code.
- [ ] **(updated)** `insurance_policy_details.provider_id` from the original ERD is a dangling
      `int` with no `PROVIDER` table anywhere in the diagram — build it as `provider_name
      VARCHAR(100)` instead (free-text, matches the "Provider*" field on the insurance form in
      `page-content.md`), not an unfounded FK.
- [ ] Write `fn_record_payment()` (in `06_fn_record_payment.sql` above) — rejects amount greater
      than outstanding balance, flips invoice status to `Paid` when balance hits zero (FR-BPM-06,
      FR-BPM-07). Exact signature and logic are in `database.md` §7.8 — implement from that, not
      from scratch.
- [ ] Seed 2–3 insurance providers with policies and per-treatment coverage percentages —
      document the assumed coverage rules in `db/seed/README.md`.

**Kalana Jayawardena**
- [ ] Write DDL for `doctor`, `specialty`, `doctor_speciality`, `doctor_availability_slots`,
      `appointments` (`database.md` §2.1/§2.2/§2.6). **(updated)** `appointments` has **no**
      `doctor_id` column — the doctor is reached via `appointments.slot_id →
      doctor_availability_slots.doctor_id`. Don't add a redundant direct FK; if a report query
      turns out to need it denormalized later, that's a documented tradeoff in `database.md` §10,
      not a default.
- [ ] Seed 8–10 specialties and 6–10 doctors (1–2 specialties each) spread across branches, plus
      a week of availability slots per doctor.
- [ ] **[Joint w/ Dilantha] Overlap-prevention — build exactly what's in `database.md` §2.2:**
  - [ ] **(updated)** The `tsrange`-generated column and `EXCLUDE USING gist` constraint go on
        **`doctor_availability_slots`** (`slot_range`, excluding on `(doctor_id WITH =, slot_range
        WITH &&)`), **not** on `appointments` — a slot can't overlap another slot for the same
        doctor, and `appointments.slot_id` is `UNIQUE`, so no appointment can ever reference an
        overlapping or double-booked slot.
  - [ ] `docs/database.md` §2.2 already documents the constraint and reasoning — just confirm the
        implementation matches it.

**Chenith Garusinghe**
- [ ] Write DDL for `patient`, `allergy`, `patient_allergy`, `admission`, `consultations`,
      `consultation_treatments`, `treatment_catalogue` (`database.md` §2.3/§2.5/§2.6).
- [ ] **(updated)** `patient.patient_code` is a `GENERATED ALWAYS AS` column (`PT-` + zero-padded
      `user_id`) — same pattern as Shavinda's `invoice_code`, don't generate it in app code.
- [ ] **(updated)** `consultation_treatments` needs a `unit_price DECIMAL(10,2)` column that
      isn't in the bare ERD — a **price snapshot at the moment a treatment is prescribed**
      (`database.md` §2.6 comment), so a later catalogue price change never rewrites a historical
      invoice. `fn_complete_appointment()` (built in Phase 2, see below) populates it from
      `treatment_catalogue.price` at insert time.
- [ ] Add `UNIQUE` on `consultations.appointment_id` (one consultation per appointment) and the
      `BEFORE INSERT` triggers (`fn_guard_consultation`, `fn_guard_consultation_treatments` —
      `database.md` §7.6) blocking consultation/treatment inserts unless the parent appointment's
      status is `Completed` (FR-CTM-06).
- [ ] Seed 30–50 patients (mixed insurance/allergy status) and 15–20 treatments in the catalogue
      with assumed prices and insurance-eligibility flags — document the assumed price list.

**Dilantha Thilakarathna**
- [ ] Write DDL for `role`, `app_user`, `staff`, `branch` — correct PK/FK chain (`app_user.role_id
      → role`, `staff.user_id → app_user`), matching `database.md` §2.1. **(updated)** the ERD's
      `USER` entity is implemented as **`app_user`**, not `USER` — `USER` is a reserved word in
      PostgreSQL. Don't create a table literally named `USER`.
- [ ] **(updated)** Branch deletion protection is two layers, not one bespoke trigger:
      `fn_deactivate_branch()` (`database.md` §7.9) checks for active staff and raises if any
      exist before setting `is_active = false`; separately, `fn_block_hard_delete()` (§7.10) is a
      generic `BEFORE DELETE` trigger on `branch` (and `staff`/`patient`/`treatment_catalogue`)
      that unconditionally refuses any hard `DELETE`. Build both.
- [ ] Add `CHECK` constraints for NIC format and phone number format on `app_user`/`contact`
      (FR-DMI-10, FR-DMI-11) — exact regexes are in `database.md` §2.1.
- [ ] **(new)** Seed the `role` table with all five rows including `'Patient'`
      (`database.md` §2.8) — a patient's `app_user` row needs a satisfiable `role_id` even though
      patients never get a `staff` row/login (no patient portal, per the resolved discrepancy in
      `api-routes.md`'s header note).
- [ ] Seed 3 branches (Colombo, Kandy, Galle), all roles, and one admin + one branch manager
      per branch.
- [ ] **[Joint w/ Kalana]** Pair on the `EXCLUDE` constraint design above.
- [ ] **(new)** Create the least-privilege Postgres roles from `database.md` §3/§3.1:
      `catms_owner`, `catms_app`, `catms_readonly`, and `catms_admin` (full-privilege,
      Administrator-only connections). Coordinate with Ashen (who applies grants/RLS broadly) so
      the two of you aren't duplicating `GRANT` statements.

**Ashen Silva**
- [ ] Merge everyone's DDL into one `db/schema.sql`, applied in FK-safe order; resolve any
      naming/type conflicts against `database.md` §2.
- [ ] Apply the indexing plan from `database.md` §10 across all tables.
- [ ] Review every trigger/function against `database.md` §6/§7 for consistency (naming, error
      format, `SET search_path` on every `SECURITY DEFINER`/trigger function — a real security
      requirement, see `database.md` §12 item 10).
- [ ] **(new)** Set up the `audit_log` table and `fn_audit_trigger()` (`database.md` §2.7/§6),
      attached to `staff`, `branch`, `treatment_catalogue`, `invoices`, `payments`,
      `appointments`.
- [ ] **(new)** Apply the RLS policies from `database.md` §5 (doctor-owns-their-clinical-writes;
      branch-scoped reads for Branch Manager). Confirm the session-context convention
      (`database.md` §4) is actually being set by the backend before relying on any policy.
- [ ] Set up `docker-compose.yml`'s `db` service so `schema.sql` + everyone's seed files run
      automatically on first container start.
- [ ] Combine individual seed files into `db/seed/seed_data.sql`, run it end-to-end once, confirm
      no FK errors.

---

## Phase 2 — Feature Build (Backend + Frontend together)

Goal: every route in `docs/api-routes.md` and every page in `docs/page-content.md` exists,
following `docs/ui-guidelines.md` — built feature-by-feature, not layer-by-layer, so each item
below is a route immediately followed by the page(s) that call it.

**Ashen Silva — land these first, they unblock everyone else**
- [ ] FastAPI project scaffolding — app structure, DB session/connection handling, global error
      handler returning the `{field, message}` validation shape (`api-routes.md` §0.2).
- [ ] Typed API client wrapper (`/frontend/src/api`) — every other person's frontend tasks below
      depend on this existing first; build it against the route *shapes* in `api-routes.md` even
      before every route is implemented, so people aren't blocked waiting on each other.
- [ ] `requirements.txt`, `.env` wiring for `DATABASE_URL` and `DATABASE_ADMIN_URL` (the
      `catms_admin` connection, see Dilantha below), and a smoke-test script that hits every
      router once.

**Dilantha Thilakarathna — land these first too, alongside Ashen's**
- [ ] `POST /auth/login`, `/auth/logout`, `GET /auth/me` → **Login page + JWT storage/route
      guards.** **(updated)** failed-login tracking + lockout calls `fn_register_login_attempt()`
      (`database.md` §7.11) after the app verifies the bcrypt/Argon2 hash — the DB never sees a
      plaintext password. Lockout threshold/duration are placeholders (5 attempts / 15 min);
      confirm real values before shipping.
- [ ] RBAC dependency/middleware → **Sidebar + top bar shell, filtered by role** (reused by every
      other page, so this pairing has to land before anyone else's pages can be wired into the
      shell). **(updated)** the middleware now needs **branch-scoping, not just role-checking** —
      a Branch Manager's requests to `/staff`, `/doctors`, and every `/reports/*` route must have
      `branch` forced to the caller's own `branch_id` server-side (`api-routes.md` §0.5). Build it
      once as a reusable dependency — Kalana and Ashen's routes need it too.
- [ ] **(new)** Wire connection selection so an Administrator-authenticated request uses
      `catms_admin` instead of `catms_app` (`database.md` §3.1), still setting
      `app.current_role = 'Administrator'` for RLS.

**Kalana Jayawardena**
- [ ] `/doctors`, `/specialties` CRUD + specialty-assignment endpoint → **Manage Doctors &
      Specialties admin page.** **(updated)** `/doctors` CRUD is no longer Admin-only —
      `api-routes.md` §3 grants Branch Manager the same create/update, scoped to their own branch;
      the page needs to render for BM too (role-filtered actions, no cross-branch view, no
      specialty-catalogue edits for BM). `/specialties` itself stays Admin-only.
- [ ] `GET /doctors/{id}/availability`, `POST /appointments` → `fn_book_appointment()`,
      `POST /appointments/walk-in` → `fn_create_walk_in()` (`database.md` §7.1/§7.2) →
      **Book Appointment page** (multi-step: Find Patient → Category → Specialty → Doctor/Slot →
      Confirm, matching the reference screenshot). **[Joint w/ Dilantha on the booking routes]**
      catch the function's `RAISE EXCEPTION`/`exclusion_violation` and translate it into a clean
      `409` — copy is in `api-routes.md` §5.1.
- [ ] `PUT /appointments/{id}/reschedule` → `fn_reschedule_appointment()`, `PUT
      /appointments/{id}/cancel` → `fn_cancel_appointment()` (`database.md` §7.3/§7.4) →
      **Manage Appointments page** (filters, reschedule, cancel, create walk-in).

**Chenith Garusinghe**
- [ ] `/patients` CRUD + `GET /patients?search=` (NIC/name/contact) → **Register Patient, Patient
      Directory pages.**
- [ ] **(new)** `GET/PUT /patients/{id}/allergies`, `GET/POST /allergies` (`api-routes.md` §4) →
      **allergy selector** folded into the registration/profile-edit form — `page-content.md`
      doesn't spec a dedicated screen for this, so it lives alongside emergency contact/insurance
      on the existing profile-edit surface.
- [ ] **(changed — read this one carefully)** `POST /appointments/{id}/consultation` and `POST
      /appointments/{id}/treatments` **as separate pre-completion writes are gone.** The DB layer
      (`database.md` §0/§7.6) enforces that consultation/treatment rows can only exist against a
      `Completed` appointment. Build **one** route — `PUT /appointments/{id}/complete`, body
      `{diagnosis, consultation_notes, treatments: [...]}`, calling `fn_complete_appointment()`
      (`database.md` §7.5) — paired with **Doctor's Consultation page** (notes/diagnosis form +
      treatment picker). Since there's one backend call, the page holds all three (notes,
      diagnosis, treatment selections) in local component state and submits together on
      "Complete Appointment" — no per-field autosave to build. Button stays disabled until notes
      are filled in (FR-CTM-07). If product wants the old incremental-save behavior back, that's
      the open question flagged in `database.md` §0 — don't silently build both.
- [ ] `/treatments` CRUD → `fn_deactivate_treatment()` for soft-delete (FR-TCM-05) →
      **Treatment Catalogue admin page.**

**Shavinda**
- [ ] `GET /invoices/{id}`, `GET /patients/{id}/invoices` → **Invoices list + detail view**
      (itemised lines, insurance breakdown).
- [ ] `POST /invoices/{id}/payments` → `fn_record_payment()` (server-side amount ≤ outstanding
      check happens **inside that function**, `database.md` §7.8 — this route is a thin wrapper)
      → **Collect Payment page.**
- [ ] `GET /patients/{id}/balance`, `/patients/{id}/insurance`, `POST /insurance/verify` →
      **Insurance registration section** on the patient profile.

**Ashen Silva — remaining routes/pages, after the two blockers above land**
- [ ] `/reports/*` — all 5 report endpoints, plus the **(new)** itemized doctor payment report
      (`GET /reports/doctor-revenue/{doctor_id}/payments`, `api-routes.md` §10 — Doctor may only
      request their own `doctor_id`, BM locked to own branch, Admin unrestricted) → **all 5 report
      pages** (filters + table/chart + empty state per FR-RA-06; BM's pages locked to their own
      branch, no selector shown) **plus a second tab on Doctor's "My Earnings" page** for the
      itemized payment report alongside the existing aggregate revenue view.
- [ ] **Dashboard page** (today's summary widgets, quick actions) — no single dedicated backend
      route; composes data from the reports/appointments endpoints above.
- [ ] Pass over responsive layout + empty/loading/error states across all pages once the rest of
      the team's pages exist.

---

## Phase 3 — Integration, Reports & Bug Fixing

Goal: everything merged into `phase-1` works together against the full seed dataset, not just
each person's own module in isolation.

**Shavinda**
- [ ] End-to-end test: partial payment, full payment, invoice status flip, insurance coverage
      split on an eligible treatment.
- [ ] Fix bugs found in Billing/Insurance module during integration.

**Kalana Jayawardena**
- [ ] End-to-end test: book, reschedule, cancel, and walk-in an appointment; confirm the
      overlap-prevention rejects a genuinely conflicting booking.
- [ ] **(new)** End-to-end test: Branch Manager registers/updates/deactivates a doctor at their
      own branch; confirm the same actions against another branch's staff return `403`/`404` as
      appropriate.
- [ ] Fix bugs found in Doctor/Appointment module during integration.
- [ ] **[Joint w/ Dilantha]** Run the concurrent-booking test script (fires two booking requests
      at the same instant, asserts exactly one `201` and one `409` come back) against the merged
      `phase-1` branch to confirm the overlap-prevention still holds after everyone's code is
      combined.

**Chenith Garusinghe**
- [ ] End-to-end test: register a patient, complete an appointment (single `PUT .../complete`
      call with notes+treatments together), confirm an invoice is generated correctly from it.
- [ ] **(new)** End-to-end test: attempt a direct `consultations`/`consultation_treatments` insert
      against a non-`Completed` appointment and confirm the guard trigger rejects it — the actual
      proof the DB-level enforcement works, not just the happy path through the API.
- [ ] Fix bugs found in Patient/Consultation module during integration.

**Dilantha Thilakarathna**
- [ ] End-to-end test: login as each role, confirm RBAC hides/shows the correct sidebar items and
      blocks disallowed API calls. **(updated)** now includes: Branch Manager can reach
      `/staff`/`/doctors` for their own branch but gets `403`/`404` for another branch or for
      creating an Admin/BM account.
- [ ] Fix bugs found in Branch/Staff module during integration.
- [ ] **[Joint w/ Kalana]** See concurrent-booking test task above.

**Ashen Silva**
- [ ] Expand seed data volume (more patients, appointments across several days/branches) so all
      5 reports — plus the doctor payment report — return meaningful, non-trivial results.
- [ ] Run all 5 reports (and the doctor payment report) against the expanded dataset and confirm
      numbers are correct by hand for at least one of each.
- [ ] Coordinate the `phase-1` → `main` merge once every module branch above is green.

---

## Phase 4 — Presentation Prep

Goal: a reliable one-command demo and a clean walkthrough for the presentation.

**Shavinda**
- [ ] Prepare the "collect payment + insurance coverage" demo path.
- [ ] Polish copy on billing/insurance pages against `docs/page-content.md`.

**Kalana Jayawardena**
- [ ] Prepare the "book an appointment" demo path (patient + doctor chosen ahead of time so it
      runs smoothly live).
- [ ] **(new)** Prepare a short "Branch Manager manages their own branch's doctor roster" demo
      beat, since that's a new, presentation-worthy capability.
- [ ] Polish copy on appointment pages against `docs/page-content.md`.

**Chenith Garusinghe**
- [ ] Prepare the "complete an appointment → generate invoice" demo path (one click, notes +
      treatments + invoice together).
- [ ] Polish copy on patient/consultation pages against `docs/page-content.md`.

**Dilantha Thilakarathna**
- [ ] Prepare a demo login credentials sheet — one user per role, with password, including a
      Branch Manager account that clearly shows branch-scoped staff/reports.
- [ ] Polish copy/microcopy on auth + branch/staff pages against `docs/page-content.md`.

**Ashen Silva**
- [ ] Write `backend/Dockerfile` and `frontend/Dockerfile` per `docs/docker.md`, uncomment the
      corresponding blocks in `docker-compose.yml`.
- [ ] Confirm `docker compose up -d --build` brings up the full stack (DB + API + UI) from a
      clean checkout on a different machine than the one it was built on.
- [ ] Prepare the reports demo path (including the doctor payment report) and a backup
      screen-recording in case of live-demo issues.
- [ ] Final full run-through of all five module demo paths back-to-back, timing it.

---

## Status legend

Use `[ ]` → `[x]` on each task above as it's completed and merged. For a quick glance at what's
outstanding, search the file for `[ ]`.