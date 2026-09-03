# AGENTS.md — MedSync CATMS

Read this file completely before writing or editing any code. It tells you what to read next,
how the codebase is organized, and the conventions every contributor (human or agent) follows.

## 0. Read order (do this before touching code)

1. `AGENTS.md` (this file)
2. `docs/architecture.md` — system shape, stack, folder layout
3. `docs/database.md` — schema, keys, procedures/triggers, indexing
4. `docs/api-routes.md` — endpoint contract the frontend depends on
5. `docs/ui-guidelines.md` — component + interaction rules
6. `docs/page-content.md` — copy/labels for each screen (source of truth — don't invent copy)
7. `docs/workload-division.md` — who owns which module, so you don't step on another member's files

If a task touches the database, re-check `docs/database.md` against the actual `.sql` migration
files before assuming the doc is current — the doc is a design reference, the migrations are the
source of truth once they exist.

## 1. Project summary

MedSync CATMS is a multi-branch clinic appointment/treatment/billing system.
Stack (fixed by the SRS, do not substitute):
- DB: PostgreSQL 16 (ACID-compliant by default via its WAL — no storage-engine choice needed,
  unlike MySQL)
- Backend: FastAPI + SQLAlchemy (or `psycopg2`/`asyncpg` directly), JWT auth
- Frontend: React + TypeScript

## 2. Non-negotiable rules

- **Every appointment write** (create/reschedule) must go through the overlap-check logic
  (procedure or backend transaction) — never insert directly without checking
  `DOCTOR_AVAILABILITY_SLOTS` / existing `APPOINTMENTS` for the doctor+time.
- **Treatments/consultations can only be attached to a `Completed` appointment.** Enforce this
  in a trigger or a service-layer check — pick one, document which one in `docs/database.md`,
  and don't implement it redundantly in both places.
- **No hard deletes** on `PATIENT`, `DOCTOR`, `BRANCH`, `TREATMENT_CATALOGUE` — use an
  `is_active` / `status` flag. Branches cannot be deactivated while staff/doctors reference them.
- **Money math (invoice totals, insurance coverage, payments) lives in the database** (stored
  procedure/trigger) or in one single backend service function — never duplicated in the
  frontend and backend both.
- **Payments never exceed the outstanding balance** — validate server-side regardless of what
  the UI already checked.
- Every table gets `created_date`/timestamps where the ERD shows them; don't drop audit columns
  to save time.

## 3. Coding conventions

- Comment *why*, not *what*, for anything implementing a business rule from the SRS — cite the
  FR number, e.g. `# FR-AM-03: prevent overlapping doctor appointments`.
- SQL: snake_case identifiers, singular-vs-plural matches the existing ERD naming exactly
  (don't rename `APPOINTMENTS` to `appointment` etc.).
- Python: type-hint all FastAPI route signatures and Pydantic schemas.
- React: functional components + hooks only, TypeScript strict mode, no `any`.
- Before adding a new table/column/endpoint, check whether it already exists in
  `docs/database.md` / `docs/api-routes.md` — extend those docs in the same PR if you add one.

## 4. Where things go

```
/db          migrations, seed data, procedures/triggers
/backend     FastAPI app (routers per module, matching api-routes.md sections)
/frontend    React app (pages per sidebar module, matching page-content.md)
/docs        this documentation set
docker-compose.yml   dockerizes PostgreSQL (+ pgAdmin) now; backend/frontend get
                      Dockerfiles and get uncommented in the final phase — see
                      docs/architecture.md §5 and docs/workload-division.md
```

## 5. Before opening a PR

- [ ] Ran/updated seed data if schema changed
- [ ] Updated the relevant `docs/*.md` if behavior changed
- [ ] Checked `docs/workload-division.md` — you're not editing another member's owned module
      without a heads-up