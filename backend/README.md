# MedSync CATMS — Backend

FastAPI application. See [`../docs/architecture.md`](../docs/architecture.md) §2 for module
boundaries and [`../docs/api-routes.md`](../docs/api-routes.md) for the full route contract this
app must implement. **No ORM** — see [`../AGENTS.md`](../AGENTS.md) §1: every route calls
parameterized raw SQL or a `database.md` §7 function through `asyncpg` directly.

## Expected structure (fill in as modules are built)

```
backend/
├── requirements.txt          # asyncpg, fastapi, uvicorn, pydantic(-settings), pyjwt, bcrypt —
│                              # no sqlalchemy or any other ORM package
├── .env.example               # backend-specific env vars, mirrors root .env.example
└── app/
    ├── main.py                  # FastAPI app instance, lifespan (asyncpg pool setup), router registration
    ├── config.py                 # reads DATABASE_URL / DATABASE_ADMIN_URL / JWT secret from .env
    ├── db.py                      # get_conn dependency — pulls a connection from the asyncpg pool
    ├── dependencies.py             # RBAC + branch-scoping dependency, used by every router
    ├── security.py                  # bcrypt hashing, JWT encode/decode
    ├── errors.py                     # global exception handler → {field, message} shape
    ├── routers/
    │   ├── auth.py                    # owner: Thilakarathna
    │   ├── branches.py                # owner: Thilakarathna
    │   ├── staff.py                   # owner: Thilakarathna
    │   ├── doctors.py                 # owner: Jayawardena
    │   ├── specialties.py             # owner: Jayawardena
    │   ├── appointments.py            # owner: Jayawardena
    │   ├── patients.py                # owner: Garusinghe
    │   ├── allergies.py               # owner: Garusinghe
    │   ├── treatments.py              # owner: Garusinghe
    │   ├── consultations.py           # owner: Garusinghe — the collapsed PUT .../complete route
    │   ├── invoices.py                # owner: Shavinda
    │   ├── payments.py                # owner: Shavinda
    │   ├── insurance.py               # owner: Shavinda
    │   └── reports.py                 # owner: Silva
    └── schemas/                   # Pydantic request/response models — one file per router above,
                                    # same names. Validation/shape only, not persistence.
```

No `core/`, `deps/`, `services/`, or `models/` subfolders — kept flat to match
[`../AGENTS.md`](../AGENTS.md) §4 exactly, and there's no ORM `models/` layer to mirror
`db/schema.sql` in the first place. Business logic that would normally live in a `services/`
layer mostly lives in the database instead, per `AGENTS.md` §2 ("money math... lives in the
database... never duplicated") — a router calls a `database.md` §7 function and shapes the
result, it doesn't reimplement logic in a service module.

Router ownership matches [`../docs/workload-division.md`](../docs/workload-division.md) —
each router file should be created and worked on inside its owner's `phase-*-<lastname>` branch
(see [`../README.md`](../README.md) for the corrected branch names — `phase-1-thilakarathna` for
Auth & Branch/Staff, `phase-1-shavinda` for Billing & Insurance, not the reverse).

## Setup (once `requirements.txt` exists)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env — paste the shared Neon connection string as DATABASE_URL (see ../AGENTS.md §5)

uvicorn app.main:app --reload
```

Runs against the **shared Neon-hosted PostgreSQL instance** — not a local or Dockerized
database. There's nothing to start locally for the database itself; see
[`../README.md`](../README.md) and [`../AGENTS.md`](../AGENTS.md) §5 for how the shared instance
is set up and shared across the team, and the Phase 1 build order for which module's `.sql` file
needs to exist on it before your router will work end-to-end.