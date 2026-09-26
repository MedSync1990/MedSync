# MedSync Project Status

> Current as of 2026-09-26. This document records what is present in the repository, what has been locally verified, and what remains before the system can be called end-to-end complete.

## Executive Summary

MedSync has progressed from design into a substantial full-stack implementation:

- PostgreSQL schema, module SQL files, stored functions, audit/RLS infrastructure, reporting views, and seed/migration support are present.
- The FastAPI backend has application configuration, pooled database access, authentication/security helpers, centralized errors, branch scoping, and 15 registered routers.
- The React/TypeScript frontend has role-aware routing and pages for receptionists, doctors, branch managers, administrators, and reports.
- Focused automated tests exist for invoice behavior, branch scoping, database-pool selection, security configuration, and statistics.

The repository is not yet proven as a complete end-to-end product. The main remaining proof points are database migration against the target PostgreSQL instance, full API/UI wiring verification, cross-module workflow tests, and production hardening.

## Implemented In The Repository

### Database

The database work is represented by `db/schema.sql`, `db/new_seed.sql`, `db/generate_slots.sql`, and modular SQL under `db/modules/`.

Implemented areas include:

- Roles, branches, users, staff, doctors, specialties, and doctor-specialty assignments.
- Doctor availability slots and appointments, including booking, rescheduling, cancellation, and walk-in functions.
- Patients, allergies, patient-allergy links, admissions, treatment catalogue, consultations, and consultation treatments.
- Insurance policies, patient insurance, treatment coverage, invoices, payments, invoice totals, insurance calculations, and payment recording.
- Protection/authentication functions and PostgreSQL application roles.
- Audit log tables/functions/triggers, RLS policies, indexes, and reporting views.
- Completion and deactivation functions, including `fn_complete_appointment()` and treatment deactivation.

The SQL is organized both as top-level module entry points and owner-specific files for Dilantha, Kalana, Chenith, Shavinda, and Ashen.

### Backend

The FastAPI application is wired through `backend/app/main.py` with these router areas:

- Auth
- Branches
- Staff
- Doctors
- Specialties
- Appointments
- Patients
- Allergies
- Treatments
- Consultations
- Invoices
- Payments
- Insurance
- Reports
- Statistics

The backend currently contains 52 route decorators across those routers. Supporting implementation includes:

- Async `asyncpg` connection pools for normal and administrator database access.
- Configuration through environment settings, including database URLs, JWT settings, CORS, and cookie security.
- Bcrypt password hashing and JWT creation/validation.
- Cookie or bearer-token authentication.
- CSRF checks for mutating requests.
- Centralized exception handlers for validation, authorization, conflicts, missing resources, and unexpected errors.
- Role checks and server-side branch scope enforcement, including Branch Manager branch pinning.
- Administrator-specific pool selection and transaction-local RLS session context.
- Pydantic schemas and typed API client support for frontend requests.

### Frontend

The React/TypeScript application has authenticated layouts, login, role guards, navigation, and route definitions for:

- Receptionist dashboards, patient registration/directory/profile, appointment booking/management, invoices, and payment collection.
- Doctor dashboard, schedule, consultation, treatment catalogue, and earnings.
- Branch Manager dashboard, branch details, and doctor management.
- Administrator dashboard, branch management, staff management, doctor management, and treatment catalogue management.
- Appointment summary, doctor revenue, outstanding balances, treatment categories, and insurance/out-of-pocket reports.

The frontend route configuration includes role-based access for Administrator, Branch Manager, Doctor, and Receptionist users, with a role-based dashboard redirect after login.

### Tests And Checks Present

The repository contains focused tests in `backend/tests/` for:

- Branch isolation and effective branch scope.
- Administrator versus application database-pool selection.
- Invoice calculations and payment behavior.
- JWT/security configuration.
- Statistics/reporting behavior.

A standalone invoice test also exists at the repository root. The test suite was not executed during this review because the active environment does not have `pytest` installed.

## Current Gaps And Risks

These items are still required or need explicit verification:

1. Run the complete schema and seed sequence against the intended PostgreSQL environment and confirm all migrations/functions/triggers succeed in dependency order.
2. Execute the automated Python tests in an environment with the backend dependencies and `pytest` installed.
3. Run API-level and browser-level end-to-end tests covering login, patient registration, booking, consultation completion, invoice generation, payment, reports, and branch isolation.
4. Confirm every frontend page is connected to its intended backend route and handles loading, validation, authorization, conflict, and server-error responses consistently.
5. Resolve the consultation workflow contract: the database supports atomic completion with diagnosis, notes, treatments, and invoice generation, while older API documentation still describes separate pre-completion consultation/treatment writes.
6. Finish or verify missing business workflows such as insurance registration from the patient flow, invoice adjustment/correction, and administrator audit-log viewing.
7. Confirm authentication policy decisions for refresh/idle timeout, lockout thresholds, rate limiting, and deployment CSRF/CORS settings.
8. Decide and document the final deployment, CI/CD, health-check, backup, and database-scaling approach.

## Documentation Notes

- `docs/project-status.md` is the canonical current-progress report.
- `docs/workload-division.md` remains the ownership and implementation plan.
- `docs/api-routes.md`, `docs/database.md`, and `docs/architecture.md` remain design/contracts, but should be reconciled where they disagree with the implemented consultation flow.
- `docs/next_steps.md` is stale: it describes the backend as mostly unbuilt even though the current tree contains the routers, schemas, security code, tests, and database modules listed above.
- `docs/remaining_tasks.md` is useful as a risk backlog, but it should not be used as the sole description of completed work.
