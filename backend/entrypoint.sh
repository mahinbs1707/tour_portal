#!/bin/sh
set -eu

echo "Waiting for database readiness is handled by Compose healthchecks."
python manage.py migrate --noinput

# Optional Admin seed when both credentials are present (fail-closed if seed_admin
# is invoked without them). Whitespace-only counts as unset. Passwords are never echoed.
_admin_email_present=$(printf '%s' "${ADMIN_EMAIL:-}" | tr -d '[:space:]')
_admin_password_present=$(printf '%s' "${ADMIN_PASSWORD:-}" | tr -d '[:space:]')
if [ -n "$_admin_email_present" ] && [ -n "$_admin_password_present" ]; then
  python manage.py seed_admin
fi

exec "$@"
