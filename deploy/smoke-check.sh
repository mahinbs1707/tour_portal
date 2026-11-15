#!/usr/bin/env sh
# Story 1.1 matrix smoke checks against a running Compose stack.
# Usage (from repo root, stack already up):
#   HOST_PORT=8080 sh deploy/smoke-check.sh
set -eu

HOST_PORT="${HOST_PORT:-8080}"
BASE="http://127.0.0.1:${HOST_PORT}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

echo "Smoke: base URL ${BASE}"

# Happy bring-up — SPA serves Tour Portal shell
spa_headers="$(curl -sS -D - -o /tmp/tour-spa.html "${BASE}/" | tr -d '\r')"
echo "$spa_headers" | grep -qi '^HTTP/.* 200' || fail "SPA did not return HTTP 200"
echo "$spa_headers" | grep -qi 'content-type: text/html' || fail "SPA content-type is not text/html"
grep -qi 'Tour Portal' /tmp/tour-spa.html || fail "SPA body missing Tour Portal title"

# API not SPA-fallback — health JSON via Nginx
api_headers="$(curl -sS -D - -o /tmp/tour-health.json "${BASE}/api/health/" | tr -d '\r')"
echo "$api_headers" | grep -qi '^HTTP/.* 200' || fail "/api/health/ did not return HTTP 200"
echo "$api_headers" | grep -qi 'content-type: application/json' || fail "/api/health/ is not application/json"
grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' /tmp/tour-health.json || fail '/api/health/ body missing "status":"ok"'
grep -qi 'Tour Portal\|<!doctype html' /tmp/tour-health.json && fail "/api/health/ returned SPA HTML"

# Media path reserved — never SPA-fallback
media_headers="$(curl -sS -D - -o /tmp/tour-media.html "${BASE}/media/missing-smoke.jpg" | tr -d '\r')"
echo "$media_headers" | grep -qi '^HTTP/.* 404' || fail "/media/* missing file should be 404"
grep -qi '<title>Tour Portal</title>' /tmp/tour-media.html && fail "/media/* fell back to SPA"

# Django-admin proxied (not SPA)
admin_headers="$(curl -sS -D - -o /tmp/tour-admin.html "${BASE}/django-admin/" | tr -d '\r')"
echo "$admin_headers" | grep -Eiq '^HTTP/.* (302|301|200)' || fail "/django-admin/ unexpected status"
grep -qi '<title>Tour Portal</title>' /tmp/tour-admin.html && fail "/django-admin/ fell back to SPA"

# Secrets hygiene — committed template is placeholders only; .env is gitignored
test -f .env.example || fail ".env.example missing"
grep -q 'HOST_PORT=8080' .env.example || fail ".env.example missing HOST_PORT=8080"
grep -q 'BUSINESS_TIMEZONE=Asia/Dhaka' .env.example || fail ".env.example missing BUSINESS_TIMEZONE"
grep -Eq 'change-me|placeholder|generate-a-local' .env.example || fail ".env.example lacks placeholder markers"
grep -Eq '^(sk_live_|AKIA)' .env.example && fail ".env.example looks like real secrets"
grep -Eq '^\.env$' .gitignore || fail ".gitignore does not ignore .env"
grep -Eq '^!\.env\.example$' .gitignore || fail ".gitignore does not keep .env.example"

# Compose health — postgres and backend must each be healthy
health_lines="$(docker compose -f deploy/docker-compose.yml --env-file .env ps --format '{{.Service}}={{.Health}}' 2>/tmp/tour-compose-ps.err)" \
  || fail "docker compose ps failed: $(cat /tmp/tour-compose-ps.err)"
echo "$health_lines" | grep -qx 'postgres=healthy' || fail "postgres is not healthy (got: $(echo "$health_lines" | grep '^postgres=' || echo missing))"
echo "$health_lines" | grep -qx 'backend=healthy' || fail "backend is not healthy (got: $(echo "$health_lines" | grep '^backend=' || echo missing))"

# Migrate-on-start — no unapplied migrations
mig_plan="$(docker compose -f deploy/docker-compose.yml --env-file .env exec -T backend python manage.py showmigrations --plan)" \
  || fail "showmigrations --plan failed"
echo "$mig_plan" | grep -q '\[ \]' && fail "unapplied migrations remain ([ ] in showmigrations --plan)"

btz="$(docker compose -f deploy/docker-compose.yml --env-file .env exec -T backend python -c "import os; print(os.environ.get('BUSINESS_TIMEZONE',''))")"
test "$btz" = "Asia/Dhaka" || fail "BUSINESS_TIMEZONE is '$btz', expected Asia/Dhaka"

echo "PASS: Story 1.1 smoke matrix checks"
