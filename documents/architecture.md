# MedSync CATMS — Architecture

## 1. High-level shape

```
┌─────────────┐      HTTPS/JSON       ┌──────────────┐      SQL       ┌───────────────┐
│  React + TS │  ───────────────────▶ │   FastAPI    │ ─────────────▶ │  MySQL 8.x    │
│  (frontend) │ ◀─────────────────── │   backend     │ ◀───────────── │  InnoDB       │
└─────────────┘     REST + JWT        └──────────────┘   SQLAlchemy   └───────────────┘
```

- Client-server, stateless REST API, JWT bearer auth on every request after login.
- Single centralized DB shared across all three branches (Colombo, Kandy, Galle) — branch is a
  data attribute (`STAFF.branch_id`, `DOCTOR` via `STAFF`), not a separate deployment.
- InnoDB is mandatory — it's the only engine that gives row-level locking + FK enforcement +
  transactions, which the ACID requirement in the SRS (2.4.3, 5.4.1) depends on.

## 2. Backend module boundaries

One FastAPI router per module, each owning its own request/response schemas and service
functions. Keep business logic in a `services/` layer, not in the route handlers, so it's
testable and reusable by report generation.

| Router | Owns |
|---|---|
| `auth` | login, JWT issue/refresh, session/lockout tracking |
| `branches` | branch CRUD |
| `staff` | staff CRUD, role assignment |
| `doctors` | doctor profile + specialty assignment |
| `patients` | patient CRUD, search, insurance sub-records |
| `appointments` | booking, reschedule, cancel, walk-in, availability lookup |
| `consultations` | consultation notes + treatment allocation on completed appointments |
| `treatments` | treatment catalogue CRUD |
| `billing` | invoice generation, payments |
| `insurance` | policy registration, coverage calculation |
| `reports` | the five management reports |

## 3. Transaction boundaries (map directly to DB procedures/triggers — see database.md)

- **Book/reschedule appointment**: check-then-insert must be one transaction (`SELECT ... FOR
  UPDATE` or a stored procedure) to avoid a race between two receptionists booking the same slot.
- **Complete appointment → generate invoice**: appointment status update, consultation record,
  treatment lines, and invoice row are one transaction. If any step fails, all roll back
  (FR-DMI-05, FR-DMI-06).
- **Record payment**: payment insert + invoice outstanding-balance recalculation + status flip
  to `Paid` is one transaction (FR-BPM-08).

## 4. Frontend structure

```
/frontend/src
  /pages          one folder per sidebar module (see page-content.md)
  /components     shared UI (tables, forms, modals, sidebar, topbar)
  /api            typed fetch wrappers per backend router
  /auth           JWT storage, route guards, role-based nav filtering
```

Role-based rendering: the sidebar and route guards read the JWT-decoded role and hide/disable
modules the current role can't use (Section 2.3 / 3.1 of the SRS — Admin, Branch Manager,
Doctor, Receptionist, Patient each see a different subset).

## 5. Environments

- Dev: local MySQL 8 via Docker (see `docker-compose.yml` / README), one shared cloud MySQL
  instance for integration testing once phase branches merge, `.env` per developer, seed
  scripts in `/db/seed`.
- The FastAPI app and MySQL must run independently restartable (SRS 2.4.3 "coexist... without
  interrupting active clinic operations") — don't couple backend startup to DB migration runs;
  migrations are a separate explicit step.

**Dockerization is phased, not all-at-once:**

| Phase | What's dockerized |
|---|---|
| 1–4 (dev) | Only `db` (+ `phpmyadmin`) — MySQL 8/InnoDB, identical across every dev's machine. Backend runs via `uvicorn --reload`, frontend via `npm run dev`, both pointed at the containerized DB. |
| 5 (final/presentation) | `backend` and `frontend` each get a `Dockerfile`; the commented-out blocks in `docker-compose.yml` are enabled so `docker compose up -d --build` brings up the entire stack (DB + API + UI) on any machine with one command — this is what should run for the demo. |

Reasoning: dockerizing the DB early kills the "works on my machine" schema-drift problem
immediately, which is the highest-value, lowest-effort win. Dockerizing backend/frontend early
adds friction (slower reload loops, rebuild-on-every-change) for no benefit until the app is
stable enough that "run the whole thing in one command" actually matters — i.e. presentation
day and any final grading/demo handoff.

## 6. Non-functional targets to design against (from SRS §5.1)

- Login ≤ 2s, record retrieval ≤ 3s (95th percentile), reports ≤ 10s, transactional writes ≤ 5s.
- 100 concurrent users minimum — means connection pooling on the SQLAlchemy engine, and indexes
  on every column used in a WHERE/JOIN for search or reporting (see database.md §Indexing).
