# MedSync — Clinic Appointment and Treatment Management System (CATMS)

A centralized, multi-branch clinic management system for MedSync (Colombo, Kandy, Galle) that
digitizes patient registration, appointment booking, consultation & treatment recording,
billing/payments, and insurance claims — replacing paper records and spreadsheets with a single
ACID-compliant database and a role-based web app.

**Stack:** MySQL 8.x (InnoDB) · FastAPI · React + TypeScript

> Group 4 — Jayarathne D.G.S.A · Jayawardena W.K.I · Garusinghe E.H.C.I ·
> Thilakarathna D.D.D · Silva W.A.A.T

---

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

### Option A — Docker (recommended, keeps everyone on the same MySQL version)

> **Current phase:** only the database (+ phpMyAdmin) is dockerized. Backend and frontend run
> natively (see Option B) until the final phase, when they get Dockerfiles and the whole stack
> comes up with one `docker compose up -d --build`. See
> [`docs/workload-division.md`](./docs/workload-division.md) for when that lands.

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
cp .env.example .env        # then edit values if you want, defaults work out of the box
docker compose up -d        # starts MySQL 8 + phpMyAdmin
```

- MySQL is now reachable at `localhost:3306` (user/pass from `.env`, defaults:
  `medsync_app` / `medsync_pass`).
- `db/schema.sql` and `db/seed/seed_data.sql` run automatically the **first** time the
  `db` container starts (via `docker-entrypoint-initdb.d`). If you change either file later,
  you must reset the volume to re-apply them:
  ```bash
  docker compose down -v      # wipes the db volume, next `up` re-runs schema+seed
  docker compose up -d
  ```
- phpMyAdmin (a browser GUI for the database) is at http://localhost:8081 — log in with
  `root` / the `DB_ROOT_PASSWORD` from `.env`.
- Useful commands:
  ```bash
  docker compose logs -f db     # watch DB logs
  docker compose down           # stop containers, keep data
  docker compose exec db mysql -u root -p   # open a mysql shell inside the container
  ```
- The `backend` and `frontend` services in `docker-compose.yml` are commented out for now —
  they get `Dockerfile`s and get uncommented in the **final phase** (see
  `docs/workload-division.md`), once the app is feature-complete and we're preparing the
  presentation build. Until then, run them natively per Option B below.

### Option B — Running everything natively (no Docker)

```bash
# backend
cd backend && cp ../.env.example .env && pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend
cd frontend && npm install && npm run dev

# database (requires a local MySQL 8 install)
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed/seed_data.sql
```

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
   inside their owned module (see [`docs/workload-division.md`](./docs/workload-division.md)),
   and opens a PR back into the phase branch — not into `main`.
4. At least one other team member reviews a PR before it merges into the phase branch.
5. When every member branch for a phase is merged and the phase branch is stable, open a single
   PR from the phase branch into `main` and tag a release (e.g. `v0.1-phase1`).
6. Naming: branches lowercase, hyphenated — `phase-1-silva`, `phase-1-silva-reports-fix` for a
   follow-up fix, `phase-2-jayarathne`, etc.

```bash
# example: starting work on phase 1 as a member
git checkout phase-1
git pull
git checkout -b phase-1-garusinghe
# ...work, commit...
git push -u origin phase-1-garusinghe
# open PR: phase-1-garusinghe -> phase-1
```

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
