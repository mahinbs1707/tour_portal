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
