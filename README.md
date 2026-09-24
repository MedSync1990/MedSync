# MedSync — Clinic Appointment and Treatment Management System (CATMS)

A centralized, multi-branch clinic management system for MedSync (Colombo, Kandy, Galle) that
digitizes patient registration, appointment booking, consultation & treatment recording,
billing/payments, and insurance claims — replacing paper records and spreadsheets with a single
ACID-compliant database and a role-based web app.

**Stack:** PostgreSQL 16 (hosted on Neon) · FastAPI (no ORM — raw `asyncpg`) · React + TypeScript

## Contents

```
/db          schema migrations, stored procedures/triggers, seed data
/backend     FastAPI application
/frontend    React + TypeScript application
/docs        architecture, database, API, UI, content, and workload docs
AGENTS.md    read this before contributing code
```

Start with [`AGENTS.md`](./AGENTS.md), then [`docs/architecture.md`](./docs/architecture.md).

## Getting started

The project runs against **one shared PostgreSQL database hosted on Neon** — not a local or
Dockerized database per person. Table foreign keys span every module, so everyone builds against
the same live instance rather than five separate copies. See
[`AGENTS.md` §5](./AGENTS.md#5-database-setup--one-shared-instance-not-a-local-db-per-person)
for the full rationale.

### 1. Get the shared connection string

Ask whoever set up the Neon project (currently Shavinda) for the connection string — sent
privately, never posted in a public channel or committed to the repo. It looks like:
```
postgresql://<role>:<password>@<project>.neon.tech/<dbname>?sslmode=require
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env — paste the shared connection string as DATABASE_URL
# (DATABASE_ADMIN_URL can be left equal to DATABASE_URL until the catms_admin role exists,
#  see database.md §3.1 — config.py already falls back to this)

uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Database — applying schema/seed changes

Nobody runs `db/schema.sql` on their own machine's Postgres — it's run once, in order, against
the shared Neon instance, by whoever's turn it is in the Phase 1 build sequence
(`docs/workload-division.md`):

```bash
psql "$DATABASE_URL" -f db/modules/01_auth_branch_staff.sql   # Dilantha, first
psql "$DATABASE_URL" -f db/modules/02_doctor_appointment.sql  # Kalana + Chenith, in parallel
psql "$DATABASE_URL" -f db/modules/chenith/03_patient_consultation.sql
psql "$DATABASE_URL" -f db/modules/04_billing_insurance.sql   # Shavinda
psql "$DATABASE_URL" -f db/modules/05_reporting_infra.sql     # Ashen — merge, roles, RLS
psql "$DATABASE_URL" -f db/seed/seed_data.sql
```

**Post in the team channel before running anything against the shared instance** — two people
applying schema changes or re-running seed data at the same time will step on each other's data.

Don't have `psql` installed? Neon's own web console has a SQL Editor tab that runs queries
directly in the browser — fine for a quick check, but for running a whole `.sql` file, installing
`psql` (`brew install postgresql` / `apt install postgresql-client`) is easier than pasting a
long file into a browser text box.
ritative source for module ownership.



## Documentation

| Doc | Purpose |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | system shape, module boundaries |
| [`docs/database.md`](./docs/database.md) | schema, keys, procedures/triggers, indexing |
| [`docs/api-routes.md`](./docs/api-routes.md) | REST API contract |
| [`docs/ui-guidelines.md`](./docs/ui-guidelines.md) | UI/interaction rules |
| [`docs/page-content.md`](./docs/page-content.md) | copy/labels per screen |
| [`docs/workload-division.md`](./docs/workload-division.md) | module ownership + progress tracker |

## License

Academic project — Group 4, 2026.