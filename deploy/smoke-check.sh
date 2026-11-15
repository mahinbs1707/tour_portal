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

# Bare reserved prefixes — 301 with published host:port (do not follow redirects)
for path in /api /media /django-admin; do
  redir_headers="$(curl -sS -D - -o /tmp/tour-redir.body "${BASE}${path}" | tr -d '\r')"
  echo "$redir_headers" | grep -qi '^HTTP/.* 301' || fail "${path} did not return HTTP 301"
  echo "$redir_headers" | grep -Eiq "^Location:[[:space:]]*http://127\\.0\\.0\\.1:${HOST_PORT}${path}/" \
    || fail "${path} Location must preserve :${HOST_PORT}"
  grep -qi '<title>Tour Portal</title>' /tmp/tour-redir.body 2>/dev/null \
    && fail "${path} redirect body fell back to SPA"
done

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

# No hardcoded SECRET_KEY fallback in settings source
grep -Eq 'SECRET_KEY[[:space:]]*=[[:space:]]*["'\''][^"'\'']+["'\'']' backend/config/settings.py \
  && fail "backend/config/settings.py appears to hardcode SECRET_KEY"
grep -q 'DJANGO_SECRET_KEY must be set' backend/config/settings.py \
  || fail "backend/config/settings.py missing fail-closed DJANGO_SECRET_KEY message"

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

# When local .env has Admin seed credentials, assert the seeded Admin matrix.
admin_email="$(grep -E '^ADMIN_EMAIL=' .env 2>/dev/null | head -n1 | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
admin_password="$(grep -E '^ADMIN_PASSWORD=' .env 2>/dev/null | head -n1 | cut -d= -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
if [ -n "$admin_email" ] && [ -n "$admin_password" ]; then
  admin_check="$(docker compose -f deploy/docker-compose.yml --env-file .env exec -T backend python manage.py shell -c "import os; from accounts.models import User, Role; e=os.environ.get('ADMIN_EMAIL','').strip().lower(); u=User.objects.filter(email=e).first(); print('ok' if u and u.role==Role.ADMIN and u.is_staff else 'missing')")" \
    || fail "Admin seed smoke check failed to exec"
  test "$admin_check" = "ok" || fail "seeded Admin missing or invalid for ADMIN_EMAIL (got '$admin_check')"
fi

echo "PASS: Story 1.1 smoke matrix checks"
