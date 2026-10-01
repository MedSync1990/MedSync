import re

with open('docs/workload-division.md', 'r') as f:
    content = f.read()

# Define the section to replace
start_str = "**Dilantha Thilakarathna — land these first too, alongside Ashen's**"
end_str = "## Phase 3 — Integration, Reports & Bug Fixing"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find boundaries")
    exit(1)

new_content = """**Dilantha Thilakarathna — land these first too, alongside Ashen's**
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

**Shavinda**
- [ ] `GET /invoices/{id}`, `GET /patients/{id}/invoices` → **Invoices list + detail view**
      (itemised lines, insurance breakdown).
- [ ] `POST /invoices/{id}/payments` → `fn_record_payment()` (server-side amount ≤ outstanding
      check happens **inside that function**, `database.md` §7.8 — this route is a thin wrapper)
      → **Collect Payment page.**
- [ ] `GET /patients/{id}/balance`, `/patients/{id}/insurance`, `POST /insurance/verify` →
      **Insurance registration section** on the patient profile.

**Ashen Silva — remaining routes/pages, after the two blockers above land**
- [ ] `GET /reports/doctor-revenue/{doctor_id}/payments` → **Itemized Payments tab** on Doctor's "My Earnings" page.
- [ ] Pass over responsive layout + empty/loading/error states across all pages once the rest of
      the team's pages exist.

### Branch Manager Pages (Backend & Frontend)
*All backend endpoints and corresponding frontend pages for the Branch Manager dashboard are consolidated here. Each member builds the full stack for their assigned feature.*

**Shavinda**
- [ ] `GET /reports/outstanding-balances` → **Outstanding Balances page** (Filters, tables/charts, empty state FR-RA-06).

**Kalana Jayawardena**
- [ ] `/doctors`, `/specialties` CRUD + specialty-assignment endpoint → **Manage Doctors & Specialties admin page**. **(updated)** `/doctors` CRUD is no longer Admin-only —
      `api-routes.md` §3 grants Branch Manager the same create/update, scoped to their own branch;
      the page needs to render for BM too (role-filtered actions, no cross-branch view, no
      specialty-catalogue edits for BM). `/specialties` itself stays Admin-only.
- [ ] `GET /reports/doctor-revenue` → **Doctor Revenue page** (Filters, tables/charts, empty state FR-RA-06).

**Chenith Garusinghe**
- [ ] `/patients` CRUD + `GET /patients?search=` (NIC/name/contact) → **Register Patient, Patient Directory pages.**
- [ ] `/treatments` CRUD → `fn_deactivate_treatment()` for soft-delete (FR-TCM-05) → **Treatment Catalogue admin page.**
- [ ] `GET /reports/treatment-categories` → **Treatment Breakdown page** (Filters, tables/charts, empty state FR-RA-06).

**Dilantha Thilakarathna**
- [ ] `GET /reports/insurance-vs-out-of-pocket` → **Insurance vs. Cash page** (Filters, tables/charts, empty state FR-RA-06).

**Ashen Silva**
- [ ] **Dashboard page** (today's summary widgets, quick actions) — composes data from the reports/appointments endpoints.
- [ ] `GET /reports/appointments-summary` → **Branch Appointments page** (Filters, tables/charts, empty state FR-RA-06).
- [ ] `/staff`, `/branch` CRUD → **Manage Staff page**.

---

"""

final_content = content[:start_idx] + new_content + content[end_idx:]

with open('docs/workload-division.md', 'w') as f:
    f.write(final_content)

print("File updated successfully.")
