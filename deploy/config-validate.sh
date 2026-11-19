#!/usr/bin/env sh
# Django env configuration validation (Story 1.1 patches 4/8/9).
set -eu

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

echo "Config validate: Django settings env rules"

out="$(docker compose -f deploy/docker-compose.yml --env-file .env run --rm --no-deps \
  --entrypoint python backend scripts/env_contract.py 2>&1)" || {
  echo "$out" >&2
  fail "env_contract.py failed"
}
echo "$out"
echo "$out" | grep -q 'PASS: Story 1.1 configuration validation' \
  || fail "missing PASS marker from env_contract.py"
echo "PASS: Story 1.1 configuration validation (wrapper)"
