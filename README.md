# MedSync — Clinic Appointment and Treatment Management System (CATMS)

A centralized, multi-branch clinic management system for MedSync (Colombo, Kandy, Galle) that
digitizes patient registration, appointment booking, consultation & treatment recording,
billing/payments, and insurance claims — replacing paper records and spreadsheets with a single
ACID-compliant database and a role-based web app.

<<<<<<< HEAD
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
=======
**Stack:** PostgreSQL 16 · FastAPI · React + TypeScript
>>>>>>> development

## Getting started

The project runs against **one shared PostgreSQL database hosted on Neon** — not a local or
Dockerized database per person. Table foreign keys span every module, so everyone builds against
the same live instance rather than five separate copies. See
[`AGENTS.md` §5](./AGENTS.md#5-database-setup--one-shared-instance-not-a-local-db-per-person)
for the full rationale.

<<<<<<< HEAD
### 1. Get the shared connection string
=======
> **Current phase:** only the database (+ pgAdmin) is dockerized. Backend and frontend run
> natively (see Option B) until the final phase. Full details, including the exact Dockerfiles
> to add later, are in [`documents/docker.md`](./documents/docker.md).
>>>>>>> development

Ask whoever set up the Neon project (currently Shavinda) for the connection string — sent
privately, never posted in a public channel or committed to the repo. It looks like:
```
postgresql://<role>:<password>@<project>.neon.tech/<dbname>?sslmode=require
```

<<<<<<< HEAD
### 2. Backend
=======
- PostgreSQL is now reachable at `localhost:5432` (user/pass/db from `.env`, defaults:
  `medsync_app` / `medsync_pass` / `medsync`).
- `db/schema.sql` and `db/seed/seed_data.sql` run automatically the **first** time the
  `db` container starts (via `docker-entrypoint-initdb.d`). If you change either file later,
  you must reset the volume to re-apply them:
  ```bash
  docker compose down -v      # wipes the db volume, next `up` re-runs schema+seed
  docker compose up -d
  ```
- pgAdmin (a browser GUI for the database) is at http://localhost:8081 — log in with
  `admin@medsync.local` / the `DB_ROOT_PASSWORD` from `.env`, then add a server pointing at
  host `db`, port `5432`.
- Useful commands:
  ```bash
  docker compose logs -f db     # watch DB logs
  docker compose down           # stop containers, keep data
  docker compose exec db psql -U medsync_app -d medsync   # open a psql shell inside the container
  ```
- The `backend` and `frontend` services in `docker-compose.yml` are commented out for now —
  they get `Dockerfile`s in the **final phase**. The exact Dockerfile contents and enable steps
  are documented in [`documents/docker.md`](./documents/docker.md). Until then, run them natively per
  Option B below.

### Option B — Running everything natively (no Docker)
>>>>>>> development

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

<<<<<<< HEAD
### 3. Frontend
=======
## Branching strategy

We work in a phased structure: one branch per phase, with each team member branching off the
current phase branch for their own module, and merging back into it via PR before the phase
branch merges into `main`.

```
main
 └── phase-1
      ├── phase-1-jayarathne     (Auth & Branch/Staff Management)
      ├── phase-1-jayawardena    (Doctor/Specialty & Appointment Management)
      ├── phase-1-garusinghe     (Patient & Consultation/Treatment Management)
      ├── phase-1-thilakarathna  (Billing & Insurance)
      └── phase-1-silva          (Reporting & DB Integrity/Infra)
```

Rules:

1. `main` only ever receives merges from a completed, reviewed phase branch (e.g. `phase-1`).
   Never commit to `main` directly.
2. Each phase branch (`phase-1`, `phase-2`, ...) is created off `main` at the start of that
   phase, and is the integration point for that phase's member branches.
3. Each member branches off the current phase branch using `phase-<n>-<lastname>`, works only
   inside their owned module (see [`documents/workload-division.md`](./documents/workload-division.md)),
   and opens a PR back into the phase branch — not into `main`.
4. At least one other team member reviews a PR before it merges into the phase branch.
5. When every member branch for a phase is merged and the phase branch is stable, open a single
   PR from the phase branch into `main` and tag a release (e.g. `v0.1-phase1`).
6. Naming: branches lowercase, hyphenated — `phase-1-silva`, `phase-1-silva-reports-fix` for a
   follow-up fix, `phase-2-jayarathne`, etc.
>>>>>>> development

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
psql "$DATABASE_URL" -f db/modules/03_patient_consultation.sql
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
<<<<<<< HEAD
| [`docs/architecture.md`](./docs/architecture.md) | system shape, module boundaries |
| [`docs/database.md`](./docs/database.md) | schema, keys, procedures/triggers, indexing |
| [`docs/api-routes.md`](./docs/api-routes.md) | REST API contract |
| [`docs/ui-guidelines.md`](./docs/ui-guidelines.md) | UI/interaction rules |
| [`docs/page-content.md`](./docs/page-content.md) | copy/labels per screen |
| [`docs/workload-division.md`](./docs/workload-division.md) | module ownership + progress tracker |
=======
| [`documents/architecture.md`](./documents/architecture.md) | system shape, module boundaries |
| [`documents/database.md`](./documents/database.md) | schema, keys, procedures/triggers, indexing |
| [`documents/docker.md`](./documents/docker.md) | Docker/Compose setup, current + final-phase Dockerfiles |
| [`documents/api-routes.md`](./documents/api-routes.md) | REST API contract |
| [`documents/ui-guidelines.md`](./documents/ui-guidelines.md) | UI/interaction rules |
| [`documents/page-content.md`](./documents/page-content.md) | copy/labels per screen |
| [`documents/workload-division.md`](./documents/workload-division.md) | module ownership + progress tracker |
>>>>>>> development

## License

Academic project — Group 4, 2026.
