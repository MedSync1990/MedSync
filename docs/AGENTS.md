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

Stack (fixed by the SRS and course requirements, do not substitute):
- **DB**: PostgreSQL 16 (ACID-compliant by default via its WAL — no storage-engine choice needed,
  unlike MySQL)
- **Backend**: FastAPI + `asyncpg`, JWT auth. **No ORM** (SQLAlchemy or any other table-mapping
  library) — this is a database course project, and query/schema logic is meant to be visible,
  not generated. Every route calls parameterized raw SQL or a `PL/pgSQL` function from
  `database.md` §7 directly through an `asyncpg` connection pool. Pydantic models are fine and
  expected for request/response validation — that's shape-checking, not persistence, and isn't
  what "no ORM" restricts.
- **Frontend**: React + TypeScript

## 2. Non-negotiable rules

- **Every appointment write** (create/reschedule) must go through the overlap-check logic —
  never insert directly without it. **Decision: enforced at the DB level** via the `EXCLUDE`
  constraint on `doctor_availability_slots` plus `fn_book_appointment()` /
  `fn_reschedule_appointment()` (`database.md` §2.2/§7.1/§7.3) — routes call these functions,
  they don't reimplement the overlap check in Python.
- **Treatments/consultations can only be attached to a `Completed` appointment.** **Decision:
  enforced via a DB trigger** (`fn_guard_consultation`/`fn_guard_consultation_treatments`,
  `database.md` §7.6), not a service-layer check — don't add a redundant Python-side check for
  the same rule. The one call site that satisfies this correctly is
  `fn_complete_appointment()` (§7.5), which flips the appointment to `Completed` *before*
  inserting the consultation/treatment rows in the same transaction.
- **No hard deletes** on `PATIENT`, `DOCTOR`, `BRANCH`, `TREATMENT_CATALOGUE` — use an
  `is_active`/`status` flag, enforced by both a missing `DELETE` grant and a `BEFORE DELETE`
  trigger (`fn_block_hard_delete()`, `database.md` §7.10) on all four tables. Branches cannot be
  deactivated while staff/doctors reference them (`fn_deactivate_branch()`, §7.9).
- **Money math (invoice totals, insurance coverage, payments) lives in the database** — one DB
  function per operation (`fn_calculate_invoice_total`, `fn_calculate_insurance_coverage`,
  `fn_record_payment`, `database.md` §7.7/§7.8). Never recompute or duplicate this logic in the
  backend or frontend; both only display what the function returns.
- **Payments never exceed the outstanding balance** — validated inside `fn_record_payment()`
  itself, not in the route handler, so it can't be bypassed by any caller of that function.
- Every table gets `created_at`/`created_date` timestamps where `database.md` §2 shows them;
  don't drop audit columns to save time. Security-sensitive tables (`staff`, `branch`,
  `treatment_catalogue`, `invoices`, `payments`, `appointments`) are additionally covered by the
  `audit_log` trigger (`database.md` §6) — don't bypass it by writing to those tables through
  any path other than the app's own `catms_app`/`catms_admin` connection.

## 3. Coding conventions

- Comment *why*, not *what*, for anything implementing a business rule from the SRS — cite the
  FR number, e.g. `# FR-AM-03: prevent overlapping doctor appointments`.
- SQL: snake_case identifiers, singular-vs-plural matches the existing ERD naming exactly
  (don't rename `appointments` to `appointment`, etc. — see `database.md` §0 for the one
  deliberate renaming exception, `USER` → `app_user`, and why).
- **Every SQL query and function call uses parameter binding (`$1`, `$2`, ...)** — never build a
  query by concatenating request input into a string, in any router, for any reason. See
  `database.md` §8 for the parameterized-query examples every route follows.
- Python: type-hint all FastAPI route signatures and Pydantic schemas.
- React: functional components + hooks only, TypeScript strict mode, no `any`.
- Before adding a new table/column/endpoint, check whether it already exists in
  `docs/database.md` / `docs/api-routes.md` — extend those docs in the same PR if you add one.

## 4. Where things go

```
/db
  schema.sql              merged output of everyone's module file, in FK-safe order — don't
                           hand-edit this directly, edit your module file and re-merge
  /modules
    01_auth_branch_staff.sql        Dilantha
    02_doctor_appointment.sql       Kalana
    03_patient_consultation.sql     Chenith
    04_billing_insurance.sql        Shavinda — thin entry point, \i's the files below
      /shavinda/01_insurance_policy_details.sql ... 06_fn_record_payment.sql
    05_reporting_infra.sql          Ashen — roles, RLS, audit_log, indexing
  /seed                   seed_data.sql + numbered per-module seed files + README.md
                           (assumptions documented there — prices, coverage %, placeholder
                           password hashes)

/backend
  /app
    main.py                FastAPI() + lifespan (asyncpg pool setup), router registration
    config.py               reads DATABASE_URL / DATABASE_ADMIN_URL / JWT secret from .env
    db.py                    get_conn dependency, pulls a connection from the pool
    dependencies.py          RBAC + branch-scoping dependency — Dilantha owns this, everyone uses it
    security.py               bcrypt hashing, JWT encode/decode — Dilantha
    errors.py                  global exception handler → {field, message} shape
    /routers                    one file per api-routes.md section, matches module ownership
    /schemas                     Pydantic request/response models, mirrors /routers
  /tests                          one file per module + test_concurrent_booking.py (joint)
  requirements.txt                asyncpg, fastapi, uvicorn, pydantic(-settings), pyjwt, bcrypt —
                                   no sqlalchemy or any other ORM package
  .env.example                    placeholder values only, real .env is gitignored per-person

/frontend     React app (pages per sidebar module, matching page-content.md)
/docs         this documentation set
docker-compose.yml   dockerizes PostgreSQL (+ pgAdmin) now; backend/frontend get
                      Dockerfiles and get uncommented in the final phase — see
                      docs/architecture.md §5 and docs/workload-division.md
```

## 5. Database setup — one shared instance, not a local DB per person

The project uses a single shared cloud PostgreSQL instance (currently a Neon project set up by
Shavinda), not five separate local databases — table FKs between modules require everyone to be
building against the same actual tables.

- Each person clones the repo and creates their **own local `.env`** (gitignored, never
  committed) containing the **same** `DATABASE_URL` value, shared privately (not in a public
  channel or committed to the repo):
  ```env
  DATABASE_URL=postgresql://<role>:<password>@<project>.neon.tech/<dbname>?sslmode=require
  DATABASE_ADMIN_URL=postgresql://<role>:<password>@<project>.neon.tech/<dbname>?sslmode=require
  ```
  `DATABASE_ADMIN_URL` points at the `catms_admin` role once it exists (`database.md` §3.1); until
  Dilantha/Ashen's roles-and-RLS setup lands, it's fine to fall back to the same value as
  `DATABASE_URL` — `config.py` should default it that way rather than requiring both to be set.
- Run each module's `.sql` file against the shared instance **in the Phase 1 build order** from
  `docs/workload-division.md` — Dilantha first, then Kalana/Chenith in parallel, then Chenith's
  consultations, then Shavinda, then Ashen's merge/roles/RLS pass.
- **Coordinate before running anything against the shared instance** — post in the team channel
  before applying schema changes or re-running seed data, since two people running conflicting
  SQL against the same live database at the same time will step on each other.

## 6. Before opening a PR

- [ ] Ran/updated seed data if schema changed
- [ ] Updated the relevant `docs/*.md` if behavior changed
- [ ] Checked `docs/workload-division.md` — you're not editing another member's owned module
      without a heads-up
- [ ] No ORM model classes, no `db.query(...)`-style calls — raw parameterized `asyncpg` calls
      or a `database.md` §7 function only
- [ ] No hardcoded secrets — `.env` values only, `.env.example` updated if a new variable was added