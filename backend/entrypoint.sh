#!/bin/sh
set -eu

echo "Waiting for database readiness is handled by Compose healthchecks."
python manage.py migrate --noinput
exec "$@"
