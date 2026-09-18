.PHONY: up down build logs restart shell-backend shell-frontend

# Bring up the Docker containers (in detached mode)
up:
	docker compose up -d

# Stop and remove the containers
down:
	docker compose down

# Build or rebuild the containers
build:
	docker compose up -d --build

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
