# MedSync CATMS — Docker

This is the single reference for everything Docker in this repo: what's containerized today,
what gets added in the final phase, and the actual file contents so nobody has to guess.

## Current phase: database only

`docker-compose.yml` at the repo root runs:
- `db` — PostgreSQL 16, auto-seeded from `db/schema.sql` + `db/seed/seed_data.sql` on first
  start (see [`database.md`](./database.md) §6 for the seed checklist).
- `pgadmin` — browser GUI at `localhost:8081` (log in with `admin@medsync.local` /
  `DB_ROOT_PASSWORD` from `.env`).

Backend and frontend run **natively** for now (`uvicorn --reload`, `npm run dev`) — see the
root [`README.md`](../README.md) "Getting started" section for commands.

## Final phase: full stack

In the final phase (see [`workload-division.md`](./workload-division.md), owned by Silva), the
`backend` and `frontend` blocks in `docker-compose.yml` get uncommented, and each service folder
gets the `Dockerfile` below. After that, `docker compose up -d --build` brings up DB + API + UI
together — this is what should run for the presentation/demo.

### `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# system deps needed by psycopg2 (libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> Note: if you use `psycopg2-binary` in `requirements.txt` instead of plain `psycopg2`, you can
> skip `libpq-dev`/`build-essential` entirely — the binary wheel bundles libpq. Simpler for a
> student project; switch to source `psycopg2` + these system deps only if you hit a platform
> compatibility issue with the binary wheel.

### `frontend/Dockerfile`

```dockerfile
# ---- build stage ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- serve stage ----
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

`frontend/nginx.conf` (needed for React Router client-side routing to work behind Nginx):

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Enabling them

1. Add the three files above to `/backend` and `/frontend`.
2. In `docker-compose.yml`, uncomment the `backend:` and `frontend:` service blocks.
3. Run:
   ```bash
   docker compose up -d --build
   ```
4. Confirm: API at `http://localhost:8000`, frontend at `http://localhost:5173` (dev-server
   port in compose comments) or `:80` if served via the Nginx stage above — adjust the
   `ports:` mapping in `docker-compose.yml` to match whichever you use.

## Notes / gotchas

- The backend's `DATABASE_URL` inside Docker must point at the service name `db`, not
  `localhost` — Docker Compose gives each service a DNS name on the shared network
  (already set correctly in the commented-out block in `docker-compose.yml`).
- Rebuild after dependency changes: `docker compose up -d --build` (a plain `up -d` reuses the
  cached image and won't pick up a new `requirements.txt`/`package.json`).
- To wipe and reseed the database: `docker compose down -v && docker compose up -d`.
- Don't bake secrets (JWT secret, DB password) into the Docker image — they come from `.env` /
  compose `environment:`, per `.env.example` at the repo root.
