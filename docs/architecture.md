# MedSync CATMS — Current Architecture

> Updated 2026-10-13 from repository source. This describes code and configuration, not a certification of the live Azure deployment, database state, security, or performance. SQL modules are the database implementation reference; deployed objects require a separate database check.

## 1. System overview

MedSync manages branch/staff/doctor records, patients, appointments, consultations, treatments, invoices, payments, insurance links, and management reports through a shared PostgreSQL database.

The application has staff screens for Administrator, Branch Manager, Doctor, and Receptionist. Patient identity records exist in the data model, but there is no implemented patient login or self-service portal. `Cashier` and `Patient` appear in some frontend types; that does not establish dedicated working role workflows.

## 2. Architecture and principles

```text
Browser: React + TypeScript
          | HTTP JSON / PDF, authentication cookies
          v
API: FastAPI routers + Pydantic schemas + authorization dependencies
          | asyncpg pools, parameterized SQL / PostgreSQL functions
          v
Database: shared PostgreSQL
```

There is no SQLAlchemy ORM or general services layer. Routers call parameterized SQL and stored functions directly. Important transaction rules are implemented in PostgreSQL functions/constraints/triggers, with some explicit route transactions. Frontend role guards improve navigation; backend authorization must enforce access independently.

## 3. Technology stack

| Layer | Repository implementation |
|---|---|
| Frontend | React, TypeScript, React Router, Tailwind CSS; Vite build |
| Backend | FastAPI, Pydantic, asyncpg; Uvicorn server |
| Database | PostgreSQL; project SQL targets PostgreSQL 16 |
| Authentication | PyJWT HS256 tokens; bcrypt password hashing |
| PDFs | Backend WeasyPrint rendering; browser downloads the returned PDF |
| Tests | pytest/HTTP fixtures and report-design tests under `backend/tests` |
| Deployment | Docker images, Azure Container Registry and Azure Web Apps via GitHub Actions |

Exact dependency versions are in `frontend/package.json` and `backend/requirements.txt`.

## 4. Backend structure and startup

`backend/app/main.py` registers module routers and exception handlers. `schemas/` defines request/response validation; `dependencies.py` contains current-user and role checks; `security.py` handles JWTs, bcrypt, and Origin validation; `db.py` supplies database connections. Report templates and `report_design.py` support printable outputs.

Startup creates application/admin asyncpg pools, each currently configured with minimum 1 and maximum 5 connections. It also attempts to add `must_change_password` to staff and generate 14 days of roster slots. Consequently startup performs limited database initialization; it is not entirely read-only. Full SQL setup remains a separate operation.

`DATABASE_ADMIN_URL` can fall back to `DATABASE_URL`. Separate pools therefore do not by themselves prove separate least-privilege database roles. The deployed credentials and grants must be checked separately.

## 5. Frontend structure

`frontend/src/pages` contains role and report pages; `components` contains the shared shell/forms/tables; `api` contains fetch wrappers; `context/AuthContext.tsx` restores user details through `/auth/me`; `app/routes.tsx` and `RoleGuard.tsx` control navigation.

The browser sends cookies using `credentials: 'include'`. The access JWT is stored in an HttpOnly cookie, rather than decoded by frontend route guards. User profile details are also cached in localStorage; the backend remains the authority for authentication and permissions.

The current top bar has a sidebar toggle, time-based greeting, branch indicator for non-Administrators, and a profile link with role information. It has no notification bell or theme toggle. `/settings` redirects to `/profile`.

## 6. Database model and source of truth

The identity chain uses `app_user` (not a table named `USER`), with staff and patient extensions. Doctors extend staff; specialties and doctor availability slots support booking. Patient allergies, insurance links, consultations, treatment lines, invoices, and payments form the clinical/billing model.

Use `db/modules/**/*.sql` for current table/function/trigger definitions. `docs/database.md` preserves detailed design SQL and reasoning, but must be compared with the modules before asserting exact deployed columns, grants, or policies. SQL definitions show intended database enforcement; they do not prove the cloud database has been migrated or its roles configured correctly.

## 7. Business workflows and transaction boundaries

- Booking, walk-in creation, rescheduling, and cancellation have route implementations calling database functions.
- The doctor holds diagnosis, consultation notes, and selected treatments in the UI, then submits one `PUT /appointments/{id}/complete` request. The route calls `fn_complete_appointment` to perform completion and invoice generation. There are no separate pre-completion consultation/treatment POST routes.
- Treatment prices are snapshotted for historical billing in the SQL design/modules.
- The payment route is `POST /payments/{invoice_code}`. It locks the invoice in an explicit transaction, validates input, calls `fn_record_payment`, and returns updated payment/balance details.
- Management report routes and CSV/PDF download functions exist. Actual totals and database rules still require end-to-end validation with the deployed dataset.

## 8. Authentication and authorization

Login checks staff credentials with bcrypt, issues an HS256 JWT containing `user_id`, `role`, `branch_id`, and `username`, and sets access/CSRF cookies. JWT lifetime defaults to 60 minutes and is configurable. The SQL login-attempt function records successful login time and failed attempts. The current application threshold is 5; the SQL duration is 15 minutes. These are implementation values, not proof that all lockout edge cases work correctly.

Logout clears cookies. It does not revoke an issued JWT before expiry. There is no refresh-token endpoint or separate idle-session timeout implementation.

`get_current_user` prefers the access cookie and otherwise accepts bearer credentials. It checks account activity; `require_roles` restricts selected endpoints. Branch scoping and application/admin pool selection exist in code. Verify individual route dependencies and deployed RLS before claiming complete isolation across every endpoint.

## 9. Security behavior and limitations

Cookie-authenticated POST/PUT/PATCH/DELETE requests passing through `get_current_user` require an exact Origin in `CORS_ALLOWED_ORIGINS`. Login and logout also use this check. Missing/null/untrusted Origins are rejected; Referer paths such as `/docs` cannot bypass it. Bearer-only protected API requests use a separate path without requiring a browser Origin. GET downloads are unchanged.

Cookie `Secure` is configurable. Secure cookies currently use `SameSite=None`; local non-secure cookies use `Lax`. CORS allows configured origins and credentials. Neither CORS nor the presence of an Origin helper proves every route is protected.

Database SQL includes audit triggers and RLS policies. Runtime grant/policy/context behavior requires independent verification. The security cleanup review records remaining concerns; do not claim the application is fully security-audited.

## 10. Features not implemented

- Patient self-service portal, automated SMS/email delivery, notification feed, and theme switching.
- JWT refresh and server-side token revocation.
- General request-rate limiting and an audit-log viewing endpoint.
- Live integration with an insurer or payment gateway. Card/QR labels are recorded payment types, not proof of an online gateway integration.

The appointment page currently contains an SMS-dispatched toast without a corresponding backend delivery implementation. This is a UI wording discrepancy, not an implemented SMS capability.

## 11. Performance targets and verification

The SRS targets login within 2 seconds, retrieval within 3 seconds at the 95th percentile, reports within 10 seconds, writes within 5 seconds, and at least 100 concurrent users. These are targets, not measured results. Pools and indexes exist, but load testing is needed before asserting those targets have been achieved.

Automated tests exist for selected account checks, branch/pool selection, workflows, Origin policy, and report design. Some test files are empty. There is no basis to claim complete test coverage or that every test currently passes merely because these files exist.

## 12. Deployment configuration

The GitHub workflow `.github/workflows/deploy.yml` builds backend and frontend Docker images from their respective directories, pushes to Azure Container Registry, and restarts Azure Web Apps. The frontend is served by Nginx; the backend runs Uvicorn.

Local `docker-compose.yml` runs backend and frontend development containers and loads the configured backend environment. It does not provision a PostgreSQL or pgAdmin service. Database connectivity must be supplied separately through `DATABASE_URL`.

Hosting configuration exists in the repository. This documentation update did not inspect Azure health, environment variables, running image versions, backups, or deployed database objects.

## 13. Patient scope

Patients interact through staff: staff book appointments, retrieve invoices/balances, and record payments on their behalf. A patient role/identity in the schema does not imply patient authentication or a portal.

## 14. Viva verification checklist

Demonstrate actual login/role access, patient registration, booking/rescheduling, appointment completion with invoice generation, payment recording, and CSV/PDF exports. Describe SQL constraints/functions from the current modules. Label unmeasured performance targets and unverified cloud/database enforcement explicitly. Do not claim SMS, notification/theme controls, ORM usage, JWT refresh, or patient self-service.
