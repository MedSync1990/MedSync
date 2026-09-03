# MedSync CATMS — Backend

FastAPI application. See [`../docs/architecture.md`](../docs/architecture.md) §2 for module
boundaries and [`../docs/api-routes.md`](../docs/api-routes.md) for the full route contract this
app must implement.

## Expected structure (fill in as modules are built)

```
backend/
├── requirements.txt
├── .env.example              # backend-specific env vars, mirrors root .env.example
├── Dockerfile                 # added in Phase 5 — see ../docs/docker.md
└── app/
    ├── main.py                 # FastAPI app instance, router registration, startup/shutdown
    ├── core/
    │   ├── config.py            # env/settings loading
    │   ├── security.py          # JWT issue/verify, password hashing
    │   └── db.py                 # SQLAlchemy engine/session
    ├── deps/
    │   └── auth.py               # RBAC dependency used by every router
    ├── routers/
    │   ├── auth.py                # owner: Jayarathne
    │   ├── branches.py            # owner: Jayarathne
    │   ├── staff.py                # owner: Jayarathne
    │   ├── doctors.py              # owner: Jayawardena
    │   ├── specialties.py          # owner: Jayawardena
    │   ├── appointments.py         # owner: Jayawardena
    │   ├── patients.py             # owner: Garusinghe
    │   ├── consultations.py        # owner: Garusinghe
    │   ├── treatments.py           # owner: Garusinghe
    │   ├── billing.py              # owner: Thilakarathna
    │   ├── insurance.py            # owner: Thilakarathna
    │   └── reports.py              # owner: Silva
    ├── schemas/                  # Pydantic request/response models, one file per router
    ├── services/                  # business logic called by routers, one file per module
    └── models/                    # SQLAlchemy models mirroring db/schema.sql
```

Router ownership matches [`../docs/workload-division.md`](../docs/workload-division.md) —
each router file should be created and worked on inside its owner's `phase-*-<lastname>` branch.

## Setup (once `requirements.txt` exists)

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs against the Dockerized MySQL instance from the repo root
(`docker compose up -d` first) — see [`../README.md`](../README.md).
