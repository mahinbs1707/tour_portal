- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Widen CSRF_TRUSTED_ORIGINS to include http://127.0.0.1:$HOST_PORT when auth forms land
  evidence: Smoke uses 127.0.0.1 while .env.example defaults to localhost; no CSRF forms in Story 1.1 yet

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Set Django USE_X_FORWARDED_HOST / SECURE_PROXY_SSL_HEADER when TLS terminates at the proxy
  evidence: Local HTTP baseline only; absolute URL and secure-cookie correctness matter at deploy/TLS

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Drop container privileges (non-root USER) for backend/frontend images
  evidence: Local skeleton runs as root; harden before shared/prod runtime

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Document or exercise AI_PROVIDER=mock stub behavior
  evidence: Env key is present but unused until recommendations stories

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Assert Django settings.TIME_ZONE == Asia/Dhaka in smoke (not only BUSINESS_TIMEZONE env)
  evidence: Story 1.1 AC is env-facing; settle on first timezone-sensitive story

## Deferred from: code review of spec-1-1-local-compose-runtime-baseline.md (2026-11-16)

- Assert Django `settings.TIME_ZONE == Asia/Dhaka` in smoke (not only `BUSINESS_TIMEZONE` env) — settle on first timezone-sensitive story
- Make `sprint-status.yaml` `story_location` portable (relative path) — tooling cleanup across clones/OSes
- Deepen `/api/health/` to verify Postgres connectivity — Compose already healthchecks Postgres; revisit with readiness SLOs

## Deferred from: build review of spec-1-2-design-tokens-and-route-group-shells.md (2026-11-16)

- Sheet background `aria-hidden` / inert while open — deepen with fuller dialog kit later

## Deferred from: build review of spec-1-3-user-model-roles-and-admin-seed.md (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-user-model-roles-and-admin-seed.md`
  summary: Supply email-aware Django admin `form` / `add_form` for `accounts.UserAdmin`
  evidence: Fieldsets are email-based but default UserAdmin forms still expect username; seed/RBAC ACs do not require django-admin UX

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-user-model-roles-and-admin-seed.md`
  summary: Harden Nginx Host forwarding when client omits Host (`$http_host` empty)
  evidence: Edge case on pre-existing 1.1 proxy change; uncommon clients; revisit with proxy hardening

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-user-model-roles-and-admin-seed.md`
  summary: Smoke redirect assertions should accept request Host (localhost vs 127.0.0.1), not hard-require 127.0.0.1 Location
  evidence: Pre-existing 1.1 smoke hardening bundled in dirty tree; localhost base can false-fail despite correct port-preserving redirects
