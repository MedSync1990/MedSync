# MedSync — Clinic Appointment and Treatment Management System

MedSync is a database-focused academic project for a multi-branch clinic operating in Colombo, Kandy, and Galle. It brings patient registration, doctor schedules, appointments, consultations, treatment recording, invoicing, payments, insurance coverage, and reporting into one web application.

**Group 4 · 2026**

**Stack:** PostgreSQL on Neon · FastAPI with asyncpg · React and TypeScript · Docker · Microsoft Azure

## Features

- Role-based workflows for Administrators, Branch Managers, Doctors, and Receptionists.
- Patient registration, searchable records, emergency contacts, and allergy management.
- Doctor and specialty management, weekly rosters, and availability-slot generation.
- Scheduled appointments, rescheduling, cancellation, and emergency walk-ins with quick patient registration.
- Consultation notes and treatment selection submitted with appointment completion and invoice generation.
- Itemized invoices, partial/full payments, outstanding balances, and insurance coverage.
- Doctor earnings, payout requests, and administrator approval workflows.
- Management reports with charts, CSV exports, and backend-generated PDF downloads.

## Demo Login Accounts

The following accounts are provided for the MedSync demonstration using fictional data.
Default password is medsync
This will be after the demo
| Role | Username | Password |
|---|---|---|
| Administrator | `admin1` | `medsync1` |
| Branch Manager | `manager1` | `medsync1` |
| Doctor | `doctor1` | `medsync1` |
| Receptionist | `receptionist1` | `medsync1` |

## Team Contributions

The contributions below cover database, application, and integration work. Shared modules were developed and improved collaboratively; a contribution listed here does not imply exclusive authorship of every file in that area.

### Jayarathne D.G.S.A -  Billing, Insurance, Project Setup, and Deployment

**Database work**

- Insurance policy details, patient-policy links, and policy-to-treatment coverage structures.
- Invoice and payment tables and billing-module integration.
- Payment-recording logic, including outstanding-balance checks and invoice status updates.
- Sample insurance policies and treatment-coverage data.

**Application and integration work**

- Initialized the repository and organized the frontend, backend, database, and configuration structure.
- Implemented invoice retrieval, patient invoice history, itemized charges, insurance breakdowns, payment collection, and patient balances.
- Built billing and insurance interfaces and contributed to patient-profile insurance flows.
- Worked on My Earnings, payout/approval requests, and the administrator earnings-approval workflow.
- Checked partial/full payments, invoice status changes, and insurance calculations; resolved billing integration issues and prepared the billing demonstration.

**Deployment and CI/CD Integration**

- Dockerized the frontend and backend for consistent builds and deployment.
- Deployed the application to Microsoft Azure Web Apps and connected it to the Neon PostgreSQL database.
- Integrated GitHub Actions with Azure authentication and Azure Container Registry.
- Configured the pipeline to build and push frontend/backend images and restart the Azure applications after changes are pushed to `main`.
- Integrated production API configuration with the frontend build and deployment workflow.

**Main areas:** `db/modules/shavinda/`, billing/insurance/payment routers, invoice and payment screens, earnings/payout flows, Docker and Azure configuration.

### Kalana Jayawardena — Doctors, Specialties, Appointments, and Scheduling

**Database work**

- Doctor, specialty, doctor-specialty association, availability-slot, doctor-weekly-schedule and appointment tables.
- Doctor/specialty seed data and initial availability records.
- Overlap-prevention design using PostgreSQL range/exclusion constraints, and slot-booking consistency.
- Booking, walk-in, rescheduling, cancellation, create-default-doctor-schedule and generate-slots-from-roster functions
- doctor-record protection, default-doctor-schedule triggers.

**Application and integration work**

- Built doctor/specialty and appointment APIs, booking validation, and availability queries.
- Implemented the Book Appointment wizard, Manage Appointments page, doctor/specialty management, and roster modal.
- Added recurring weekly schedules, default-roster provisioning, rolling slot generation, targeted generation after roster changes, and the midnight background worker.
- Implemented quick patient registration for walk-ins and temporary-patient completion flows.
- Contributed to branch management, branch details, user profile management, treatment catalogue presentation, and shared UI components.
- Improved collapsible navigation, role-based routing, page titles, favicons, breadcrumbs, and time-based greetings.
- Optimized queries and batch operations across doctor, staff, branch, payment, and statistics modules; contributed to integration and merge resolution.

**Main areas:** `db/modules/kalana/`, doctor/specialty/appointment routers, appointment pages, Manage Doctors, roster UI, branch/profile pages, and scheduling lifecycle code.

### Chenith Garusinghe — Patients, Consultations, Treatments, and Seed Data

**Database work**

- Patient, allergy, patient-allergy, admission, consultation, consultation-treatment, and treatment-catalogue tables.
- Patient display identifiers, treatment price snapshots, and consultation/treatment guard logic.
- Patient, allergy, and treatment seed data, including later seed-pipeline consolidation and integration.

**Application and integration work**

- Built patient registration, directory/search, profile updates, allergy management, and related schemas/API bindings.
- Implemented Register Patient, Patient Directory, and Patient Profile screens with validation and responsive layouts.
- Developed doctor consultation and schedule interfaces, patient history/allergy views, treatment selection, and appointment-completion integration.
- Built treatment-catalogue APIs and administration/read-only catalogue interfaces.
- Contributed to appointment and invoice fixes, authentication-state handling, staff activation/deactivation, and top-bar improvements.
- Integrated and expanded seed data, improved migration handling, and contributed workflow integration tests and configuration fixes.

**Main areas:** `db/modules/chenith/`, patient/allergy/treatment and consultation-related code, patient pages, doctor consultation/schedule pages, treatment administration, and seed scripts.

### Dilantha Thilakarathna — Authentication, Staff Administration, and Reporting

**Database work**

- Role, branch, application-user, contact, and staff foundation schemas.
- Identity/contact constraints, branch and staff protection functions, and login-attempt tracking routines.
- PostgreSQL role setup and initial branch/staff seed data.
- Coordinated overlap-prevention design with Kalana and database integration with Ashen.

**Application and integration work**

- Contributed FastAPI scaffolding, environment configuration, connection handling, exception responses, and database migration/verification tooling.
- Implemented password hashing/verification, authentication flows, role dependencies, and branch scoping.
- Built staff administration, profile inspection/editing, password resets, unlocking/reactivation, and the first-login password-change gate.
- Developed reporting/statistics queries, dashboard metrics, frontend reporting pages, charts, filters, and API integration.
- Implemented Treatment Category Breakdown PDF generation and report-download integration.
- Contributed the shared fetch-based API client, typed API modules/interfaces, insurance/profile integration, and UI improvements.
- Resolved database connectivity and report/authentication issues, and coordinated branch/PR integration and release fixes.

**Main areas:** `db/modules/dilantha/`, authentication/dependency/configuration code, staff administration, report/statistics APIs, frontend API types, and reporting screens.

### Ashen Silva — Database Integration, Reporting, Authentication, and Shared UI

**Database work**

- Integrated module schemas and resolved naming/type conflicts in dependency order.
- Implemented database indexing and reviewed trigger/function consistency across modules.
- Implemented the audit-log table and reusable audit trigger, and attached audit triggers across project tables.
- Implemented Row-Level Security policies and coordinated their integration with application context.
- Integrated and expanded seed data and verified report totals.

**Application and integration work**

- Contributed login, logout, and current-user endpoints; password hashing/verification; JWT/cookie handling; and failed-login/account-lockout integration.
- Implemented/improved authentication route guards, Role-Based Access Control, server-side branch scoping, and Administrator database-pool selection.
- Built/improved the Login page, password show/hide controls, login-to-dashboard integration, role-specific sidebar navigation, and top bar.
- Modified Administrator, Branch Manager, Receptionist, and Doctor dashboards; prioritized the Emergency Walk-in quick action.
- Implemented Branch Appointments reporting, contributed staff/branch management APIs and the Manage Staff page, and worked on itemized doctor payment reporting.
- Connected backend PDF exports for Branch Appointments, Doctor Revenue, Outstanding Balances, and Insurance vs. Out-of-Pocket.
- Created shared management PDF templates, branding, and report layouts; added report-design tests and preview generation.
- Added branch-scope and database-pool selection tests.
- Implemented Help Center and improved responsive layouts, loading/empty/error states, shared styling, and dark-mode removal.
- Fixed authentication/report behavior, resolved merge conflicts, and integrated branches.

**Main areas:** `db/modules/ashen/`, integrated schema/index/audit/RLS work, shared authentication/UI code, dashboards, Branch Appointments and management PDF reports, Help Center, and focused tests.

## Database Design and Academic Scope

The project follows the [assignment requirements](docs/requirements.txt), with database correctness as its main focus:

- Relational entities connected through primary and foreign keys.
- Constraints for valid data and doctor-slot overlap prevention.
- PostgreSQL functions, triggers, and transactions for appointment, consultation, invoice, and payment operations.
- Treatment price snapshots to preserve historical billing values.
- Indexes to support searches, joins, and reports.
- Audit records, database roles, and Row-Level Security policy definitions.
- Interconnected dummy data for demonstration and report checks.

The backend uses parameterized raw SQL through asyncpg, rather than an ORM, so database queries and business rules remain visible for the database-course demonstration.

### Required Management Reports

| Report | Purpose |
|---|---|
| Branch Appointments | Daily scheduled, completed, and cancelled appointment counts |
| Doctor Revenue | Revenue associated with doctors and their appointments |
| Outstanding Balances | Invoices and patients with unpaid balances |
| Treatment Category Breakdown | Treatment usage and revenue grouped for reporting |
| Insurance vs. Out-of-Pocket | Insurance-covered amounts compared with patient payments |

## Architecture, Synchronization, and Hosting

```text
React + TypeScript browser client
             |
             | JSON API / CSV and PDF downloads
             v
FastAPI + asyncpg backend
             |
             | Parameterized SQL and PostgreSQL functions
             v
Shared Neon PostgreSQL database
```

Some views use **lazy synchronization**: data is fetched when a page opens or a relevant action occurs, rather than continuously streaming updates. Selected dashboards also refresh on browser focus and at timed intervals. Availability-slot maintenance is separate: the backend generates slots at startup, at midnight, and when a doctor's roster changes; database logic also provisions default schedules for new doctors.

The frontend and backend are deployed to **Azure Web Apps** as Docker containers. The [GitHub Actions workflow](.github/workflows/deploy.yml) builds their images, pushes them to Azure Container Registry, and restarts the applications after pushes to `main`. The database is hosted separately on Neon.

## Repository Structure

```text
db/
  modules/        Member-owned SQL tables, functions, triggers, and policies
  schema.sql      Integrated schema entry point
  new_seed.sql    Consolidated demonstration data
  migrate.py      Schema/seed runner
backend/
  app/            FastAPI routers, schemas, database access, and PDF templates
  tests/          Focused workflow, scope, pool, and report-design checks
frontend/
  src/            React pages, components, API modules, and contexts
  public/         Branding and browser icons
docs/
  requirements.txt Assignment requirements
.github/workflows/ Azure deployment workflow
```

## Running Locally

Use Python 3.12, a Node.js version compatible with the frontend dependencies, and access to the configured PostgreSQL database. Local Docker Compose runs the frontend/backend; it does not provision the database.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
```

Configure `DATABASE_URL`, optionally `DATABASE_ADMIN_URL`, `JWT_SECRET`, and the appropriate cookie/origin settings in `backend/.env`. Obtain the shared database connection details privately from the team. Native PDF rendering also needs WeasyPrint's system libraries; the backend Dockerfiles include these dependencies.

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

For consistent local API routing, create `frontend/.env.local` with `VITE_API_BASE_URL=/api/v1` to use the configured Vite proxy. The shared API client otherwise defaults to `http://localhost:8000/api/v1`. For a separate API host, set `VITE_API_BASE_URL` to its base ending in `/api/v1`. Use an actual URL rather than the placeholder in `.env.example`.

### Docker Development

From the repository root, after configuring `backend/.env`:

```bash
docker compose up --build
```

### Database Setup

The integrated schema is `db/schema.sql`, and demonstration data is in `db/new_seed.sql`. Coordinate shared-database changes with the team. For a designated setup database, the migration runner loads both:

```bash
python db/migrate.py
```

Run it from the repository root with the backend Python environment activated. Schema/seed setup is separate from launching the UI and API; it is not required every time the app starts.

## Build and Checks

```bash
cd frontend
npm run build
```

From `backend` with its environment activated:

```bash
python -m pytest tests
```

Tests cover selected workflows and helper behavior. For the demonstration, also check login/role navigation, registration, booking/rescheduling, consultation completion and invoice creation, partial/full payments, report filters, and PDF/CSV downloads against the demonstration dataset.

## Documentation

The `docs/` directory contains the [assignment requirements](docs/requirements.txt).
Database definitions are in `db/modules/`, with `db/schema.sql` as the integrated entry point.
The backend's interactive API reference is available at `/docs` while the API is running
(locally, `http://localhost:8000/docs`); its OpenAPI schema is available at `/openapi.json`.

---

Academic project — Group 4, 2026.
