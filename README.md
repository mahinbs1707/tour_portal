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
#    Default app URL uses HOST_PORT=8080 → http://localhost:8080
#    Keep CSRF_TRUSTED_ORIGINS aligned with that URL if you change HOST_PORT.

# 3. Build and start the stack
docker compose -f deploy/docker-compose.yml --env-file .env up --build -d
```

## Verify

- App shell: open [http://localhost:8080](http://localhost:8080) (or `http://localhost:$HOST_PORT`)
- Backend health via Nginx: [http://localhost:8080/api/health/](http://localhost:8080/api/health/) → JSON `{"status":"ok"}` (not the SPA HTML)
- Compose health:

```bash
docker compose -f deploy/docker-compose.yml --env-file .env ps
```

Postgres and backend should report healthy. `BUSINESS_TIMEZONE` defaults to `Asia/Dhaka` via `.env.example`.

Automated matrix smoke (stack must already be up):

```bash
# Windows PowerShell
powershell -NoProfile -File deploy/smoke-check.ps1

# macOS/Linux (Git Bash / WSL with bash)
HOST_PORT=8080 sh deploy/smoke-check.sh
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
  smoke-check.ps1  Windows smoke matrix (stack must be up)
  smoke-check.sh   Unix smoke matrix (stack must be up)
.env.example       Required env keys (no real secrets)
```

## Notes

- Secrets stay in `.env` (gitignored). Only `.env.example` is committed.
- Nginx routes `/` to the SPA, `/api/*` and `/django-admin/*` to Django, and `/media/*` to the media volume — reserved prefixes never fall back to `index.html`.
