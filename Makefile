.PHONY: up down build build-frontend build-backend logs restart shell-backend shell-frontend migrate fresh

# Bring up the Docker containers (in detached mode)
up:
	docker compose up -d

# Stop and remove the containers
down:
	docker compose down

# Build or rebuild all containers
build:
	docker compose up -d --build

# Rebuild only the frontend container
build-frontend:
	docker compose up --build -d frontend

# Rebuild only the backend container
build-backend:
	docker compose up --build -d backend

# View logs for all services
logs:
	docker compose logs -f

# Restart all services
restart:
	docker compose restart

# Open a shell in the backend container
shell-backend:
	docker compose exec backend /bin/bash

# Open a shell in the frontend container
shell-frontend:
	docker compose exec frontend /bin/sh

# Run database migrations against the local postgres container
migrate:
	docker compose exec backend python migrate.py

# Destroy the local DB volume and rebuild everything from scratch (fresh start)
fresh:
	docker compose down -v
	docker compose up -d --build

