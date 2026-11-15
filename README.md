# Tour Portal

Local Docker Compose baseline for the Tour Portal MVP: React (Vite) SPA, Django + DRF API, PostgreSQL, and Nginx same-origin reverse proxy.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Git

## Bring-up

From the repository root:

```bash
# 1. Create local env from the committed template (placeholders only)
# macOS / Linux / Git Bash:
cp .env.example .env
# Windows PowerShell:
#   Copy-Item .env.example .env

# 2. Edit .env and replace placeholder secrets (DJANGO_SECRET_KEY, POSTGRES_PASSWORD).
#    Set ADMIN_EMAIL / ADMIN_PASSWORD for the seeded Admin (Story 1.3); leave blank to skip.
#    Default app URL uses HOST_PORT=8080 → http://localhost:8080
#    Keep CSRF_TRUSTED_ORIGINS aligned with that URL if you change HOST_PORT.

# 3. Build and start the stack
docker compose -f deploy/docker-compose.yml --env-file .env up --build -d
```

On backend start, Compose runs `migrate`, then (when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set) `python manage.py seed_admin` — idempotent upsert by email with `role=ADMIN` and `is_staff=True`. To seed later without rebuild:

```bash
docker compose -f deploy/docker-compose.yml --env-file .env exec backend python manage.py seed_admin
```

## Verify

- App shell: open [http://localhost:8080](http://localhost:8080) (or `http://localhost:$HOST_PORT`)
- Backend health via Nginx: [http://localhost:8080/api/health/](http://localhost:8080/api/health/) → JSON `{"status":"ok"}` (not the SPA HTML)
- Compose health:

```bash
docker compose -f deploy/docker-compose.yml --env-file .env ps
```

Postgres and backend should report healthy. `BUSINESS_TIMEZONE` defaults to `Asia/Dhaka` via `.env.example`.

The `frontend` Compose service is a one-shot publisher: it builds the Vite SPA, copies static assets into the shared volume for Nginx, then exits successfully. An exited `frontend` container in `docker compose ps` is expected, not a stack failure.

Automated matrix smoke (stack must already be up):

```bash
# Windows PowerShell
powershell -NoProfile -File deploy/smoke-check.ps1

# macOS/Linux (Git Bash / WSL with bash)
HOST_PORT=8080 sh deploy/smoke-check.sh
```

Configuration validation (Django env fail-closed checks):

```bash
# Windows PowerShell
powershell -NoProfile -File deploy/config-validate.ps1

# macOS/Linux
sh deploy/config-validate.sh
```

## Stop

```bash
docker compose -f deploy/docker-compose.yml --env-file .env down
```

## Layout

```text
frontend/          Vite + React SPA (built static assets served by Nginx)
backend/           Django + DRF API skeleton
deploy/
  docker-compose.yml
  nginx/default.conf
  smoke-check.ps1      Windows smoke matrix (stack must be up)
  smoke-check.sh       Unix smoke matrix (stack must be up)
  config-validate.ps1  Windows Django env contract checks
  config-validate.sh   Unix Django env contract checks
backend/scripts/env_contract.py
.env.example       Required env keys (no real secrets)
```


## Notes

- Secrets stay in `.env` (gitignored). Only `.env.example` is committed.
- Nginx routes `/` to the SPA, `/api/*` and `/django-admin/*` to Django, and `/media/*` to the media volume — reserved prefixes never fall back to `index.html`.
- Story 1.3 switches `AUTH_USER_MODEL` to `accounts.User`. If you already ran Story 1.1 against a local Postgres volume, recreate it once before bring-up (example: `docker compose -f deploy/docker-compose.yml --env-file .env down` then remove the `*_postgres_data` volume, then `up --build -d`). Fresh checkouts need no extra step.
- Backend unit tests (SQLite): `docker compose -f deploy/docker-compose.yml --env-file .env run --rm --no-deps -e DJANGO_USE_SQLITE=1 -e DJANGO_SQLITE_NAME=:memory: -e DJANGO_SECRET_KEY=test-secret --entrypoint python backend manage.py test accounts common notifications audit`
