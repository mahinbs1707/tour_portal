---
title: '1.1 Local Compose Runtime Baseline'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'NO_VCS'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tour Portal has no runnable local stack. Without Compose services, env-based secrets, and same-origin Nginx routing, later Epic 1 stories cannot develop against a shared baseline.

**Approach:** Greenfield `frontend/`, `backend/`, and `deploy/` with Docker Compose (Postgres, backend, frontend build, Nginx), Django + Vite skeletons, healthchecks, `BUSINESS_TIMEZONE=Asia/Dhaka`, and `.env.example` plus README bring-up steps—no domain features yet.

## Boundaries & Constraints

**Always:**
- Layout: `frontend/`, `backend/`, `deploy/docker-compose.yml`, `deploy/nginx/default.conf`, root `README.md`, root `.env.example`.
- Services: frontend (Vite React shell), backend (Django+DRF skeleton), PostgreSQL (persistent volume), Nginx (same-origin reverse proxy).
- Nginx routes `/` → SPA; `/api/*` → backend; `/media/*` → media volume; `/django-admin/*` → backend. Never SPA-fallback `/api/*`, `/media/*`, or `/django-admin/*`.
- Postgres and backend healthchecks required; DB readiness before backend init/migrate.
- Media volume mounted for `/media/`. Secrets only via env (commit `.env.example` only). `BUSINESS_TIMEZONE=Asia/Dhaka`.
- Stack pins: Python ≥3.12, Django 6.1.3, DRF 3.18.3, Postgres 18.x (prefer 18.7), Node ≥20.19 or ≥22.12, React 19.3.1, Vite 8.3.8, Nginx stable pin.
- Preserve all approved planning artifacts and existing `_bmad-output/`, `docs/`, AI-DLC trees unchanged.
- **Decision (HOST_PORT):** Default host publish port is `8080` → container `80`. Local app URL is `http://localhost:8080`. Port remains overridable via `HOST_PORT` in env / `.env.example`. Align `CSRF_TRUSTED_ORIGINS` with that URL.

**Never:**
- Seat inventory, traveler maximums, Stripe/real payments, JWT, quotations, email/SMS, object storage, microservices.
- Auth/RBAC/user model/Admin seed (Stories 1.3–1.6), design tokens/layouts (1.2), domain apps beyond Django project skeleton.
- Commit `.env`, real secrets, or lock cloud provider / TLS production choices.
- Delete, overwrite, or discard existing approved planning artifacts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy bring-up | Docker available; `.env` from `.env.example`; documented Compose up | frontend, backend, Postgres, Nginx running on `http://localhost:${HOST_PORT:-8080}`; Postgres + backend healthchecks pass | Fail closed with Compose logs if a service unhealthy |
| API not SPA-fallback | `GET /api/` (or health) via Nginx | Proxied to Django; not `index.html` | Misconfig → HTML SPA response (fail AC) |
| Media path reserved | Request under `/media/` | Served from media volume (empty OK) | Must not hit SPA fallback |
| Secrets hygiene | Repo search for committed secrets | Only `.env.example` placeholders; `.gitignore` keeps `.env` out | Reject any real secret in VCS |

</frozen-after-approval>

## Code Map

- `_bmad-output/planning-artifacts/epics.md` (Story 1.1) -- AC, scope, AD-1/AD-5/AD-15 + NFR-06 + §9 pins
- `_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` -- AD-1, AD-5 namespaces, AD-15 Compose rules + suggested tree, §9 stack
- `_bmad-output/implementation-artifacts/epic-1-context.md` -- epic constraints; later-story stubs not in 1.1
- `.gitignore` -- already ignores `.env` / keeps `!.env.example`; reuse, do not weaken
- `docs/tour-portal/PRD.md`, `BRD.md` -- approved MVP exclusions; do not edit
- Missing today (create): `frontend/`, `backend/`, `deploy/`, `.env.example`, `README.md` -- no existing Docker/Django/Vite app code to reuse

**Do not change:** approved planning under `_bmad-output/planning-artifacts/`, `docs/tour-portal/*`, AI-DLC/`aidlc` method trees unless a later story requires it.

**Agent decisions (user-invisible):** Django project package `config` under `backend/`; Compose file only under `deploy/` (no duplicate root compose); SPA delivered as built static assets via Nginx (Vite scaffold for later HMR/dev tooling); Postgres image `18.7`; Nginx official stable pin; minimal Django `GET /api/health/` for backend healthcheck; include non-secret env keys from AD-15 (`DJANGO_SECRET_KEY`, DB vars, `BUSINESS_TIMEZONE`, `CSRF_TRUSTED_ORIGINS`, `MEDIA_ROOT`, `HOST_PORT`, optional `AI_PROVIDER=mock`).

## Tasks & Acceptance

**Execution:**
- [x] `.env.example` -- document required keys with placeholders only, including `HOST_PORT=8080` -- env-based secrets + port baseline
- [x] `backend/` -- Django 6.1.3 + DRF skeleton, Postgres settings from env, `BUSINESS_TIMEZONE`, migrate-on-start pattern, `/api/health/` -- runnable API service
- [x] `backend/Dockerfile` (+ requirements) -- Python ≥3.12 image build -- Compose backend service
- [x] `frontend/` -- Vite 8.3.8 + React 19.3.1 minimal shell + Dockerfile build to static -- Compose frontend artifact for Nginx
- [x] `deploy/nginx/default.conf` -- same-origin routes for `/`, `/api/*`, `/media/*`, `/django-admin/*` without SPA-fallback on reserved prefixes -- AD-5/AD-15
- [x] `deploy/docker-compose.yml` -- postgres (+volume), backend, frontend build, nginx (`${HOST_PORT:-8080}:80`), media volume, healthchecks, depends_on readiness -- local runtime
- [x] `README.md` -- clone → copy env → Compose up → verify `http://localhost:8080` and health -- documented bring-up
- [x] Verify matrix scenarios (Compose healthy; `/api` not SPA; secrets hygiene) -- Story 1.1 AC

**Acceptance Criteria:**
- Given Docker and a checkout, when following README Compose bring-up, then frontend, backend, Postgres, and Nginx start successfully at `http://localhost:8080` (or `HOST_PORT` override)
- Given the stack is up, when healthchecks run, then Postgres and backend healthchecks pass
- Given the running stack, when inspecting backend/Compose env, then `BUSINESS_TIMEZONE` is `Asia/Dhaka`
- Given the repository, when reviewing committed files, then secrets are only via environment / `.env.example` placeholders—not committed secret values
- Given Nginx is up, when requesting `/api/*` (and `/media/*`, `/django-admin/*`), then those paths are not SPA-fallback to the React `index.html`

### Review Findings

- [x] [Review][Patch] Anchor PowerShell media 404 to HTTP status line [`deploy/smoke-check.ps1`] — fixed: `(?m)^HTTP/\S+\s+404\b`
- [x] [Review][Patch] Smoke-test bare `/api|/media|/django-admin` redirects keep `:$HOST_PORT` [`deploy/smoke-check.ps1`, `deploy/smoke-check.sh`] — fixed
- [x] [Review][Patch] Proxy `Host` should use `$http_host` (preserve published port) [`deploy/nginx/default.conf`] — fixed
- [x] [Review][Patch] Assert fail-closed `DJANGO_SECRET_KEY` (no hardcoded fallback) — fixed via smoke source checks + `backend/scripts/env_contract.py` / `deploy/config-validate.*`
- [x] [Review][Patch] PowerShell smoke assert SPA `Content-Type: text/html` [`deploy/smoke-check.ps1`] — fixed
- [x] [Review][Patch] Add `.gitattributes` `eol=lf` for shell entrypoints [`.gitattributes`] — fixed
- [x] [Review][Patch] README note that `frontend` is a one-shot publisher that exits [`README.md`] — fixed
- [x] [Review][Patch] Reject whitespace-only `DJANGO_SECRET_KEY` [`backend/config/settings.py`] — fixed via `.strip()`
- [x] [Review][Patch] Validate ALLOWED_HOSTS/CSRF carefully [`backend/config/settings.py`] — fixed: reject empty explicit ALLOWED_HOSTS; empty CSRF allowed; scheme check for CSRF entries
- [x] [Review][Defer] Assert Django `settings.TIME_ZONE` in smoke — deferred: Story 1.1 AC is env-facing; settle on first timezone-sensitive story
- [x] [Review][Defer] `sprint-status.yaml` absolute `story_location` path — deferred: BMAD tracking convention; convert to portable path in tooling cleanup
- [x] [Review][Defer] Backend `/api/health/` does not ping Postgres — deferred: Compose already healthchecks Postgres separately; deepen when readiness SLOs land

**Rejected**
- false — Acceptance: `alias`+`try_files` cannot serve media — live `GET /media/smoke-existing.txt` returned `200` with body `ok-media`
- false — Blind: spec `done` vs sprint `review` — intentional BMAD handoff until code-review completes
- false — Blind: open `psycopg[binary]>=3.1.12` pin — matches Architecture §9 baseline
- false — Blind: empty Spec Change Log — finding asks to edit the spec under review
- low (rejected) — Blind: django-admin CSS/`collectstatic` — AC is routing-only; static pipeline is non-trivial
- low (rejected) — Blind: `.gitignore` missing trailing newline — cosmetic
- low (rejected) — Edge: `DJANGO_DEBUG=true/yes` not treated truthy — `.env.example` uses `1`
- low (rejected) — Edge: case-sensitive reserved paths — uncommon; folding adds complexity
- low (rejected) — Edge: parallel smoke temp-file races — everyday single-run verify does not hit this

## Implementation Notes

- 2026-11-16: Greenfield Compose baseline landed under `frontend/`, `backend/`, `deploy/`, plus root `.env.example` and `README.md`.
- HOST_PORT default `8080→80`; Nginx `nginx:1.28.0-alpine`; Postgres `18.7` volume at `/var/lib/postgresql`.
- Verified: `docker compose … ps` shows postgres+backend healthy; `deploy/smoke-check.ps1` PASS covering SPA, `/api/health/` JSON (not SPA), `/media/` 404 (not SPA), `/django-admin/` proxied, secrets hygiene, `BUSINESS_TIMEZONE=Asia/Dhaka`.
- Post-review patches: nginx exact-prefix redirects keep `$http_host` port; smoke asserts `"status":"ok"`, per-service health, migrations applied, PS status-line checks; frontend `npm ci` + lockfile + `index.html` guard; `DJANGO_SECRET_KEY` required; blank host/CSRF env uses `or` defaults; README Windows env copy.
- Code-review patches (2026-11-16): PS media 404 anchored; bare-prefix redirect smoke; proxy `Host $http_host`; SPA content-type in PS; `.gitattributes` LF for `*.sh`; README frontend one-shot note; SECRET_KEY `.strip()`; ALLOWED_HOSTS reject empty explicit parse; CSRF empty allowed + scheme validation; `backend/scripts/env_contract.py` + `deploy/config-validate.*`.
- Validation: `deploy/smoke-check.ps1` PASS; `deploy/config-validate.ps1` PASS. Deferred items unchanged in `deferred-work.md`.
- Remaining risks: frontend one-shot static publisher (rebuild to refresh SPA); backend uses `runserver` for local baseline only.
- Code-review outcome: all 9 patches applied; ACs re-validated via smoke + config-validate; sprint `1-1-local-compose-runtime-baseline` → `done`.

## Spec Change Log

## Review Triage Log

- false — Blind: `.gitignore` missing from diff — pre-existing root `.gitignore` already ignores `.env` and keeps `.env.example`; smoke asserts those lines.
- low (rejected) — Blind: django-admin CSS/`collectstatic` missing — real DX wart, but Story 1.1 AC only requires reserved-path routing (not styled Admin); fix needs static pipeline beyond a trivial patch.
- medium → patch — Blind/Other: no frontend lockfile — `npm install` without lock makes SPA builds non-reproducible.
- medium → patch — Blind: README only documents Unix `cp` for `.env` — Windows bring-up is underspecified.
- defer — Blind: CSRF origins omit `http://127.0.0.1:8080` while smoke uses 127.0.0.1 — no CSRF forms in 1.1; settle when auth forms land (or widen origins then).
- false — Blind: `runserver` instead of gunicorn — local Compose baseline intentionally uses Django runserver; not a Story 1.1 defect.
- medium → patch — Blind/Edge/VG: PowerShell smoke weaker than `.sh` (no HTTP 200 / status-line anchoring; admin `200` substring false-pass) — Windows verify path can miss regressions.
- low (rejected) — Blind: mojibake in snapshot diff — source files use normal Markdown; temp snapshot encoding artifact, not runtime defect.
- false — Blind: nginx `alias`+`try_files` media footgun — live stack returns Nginx 404 for missing media, not SPA; claimed mishandle does not occur.
- defer — Blind: no `USE_X_FORWARDED_*` — local HTTP baseline; revisit at TLS/deploy.
- defer — Blind: containers run as root — acceptable for local skeleton; harden at deploy.
- low → patch — Blind: README Layout omits smoke scripts — docs drift from Verify section.
- false — Blind: no unit/API test beyond smoke — matrix covered by `deploy/smoke-check.*` which ran PASS.
- defer — Blind: `AI_PROVIDER` unexplained — optional AD-15 stub key; unused until recommendations story.
- false — Edge: `#root` null guard — shipped `index.html` always includes `#root`; unreachable.
- medium → patch — Edge: `/api|/media|/django-admin` without trailing slash — Nginx 301 `Location` drops host port (`:8080`), breaking follow-redirect clients; reserved prefixes must stay non-SPA.
- medium → patch — Edge/VG: smoke accepts any one healthy service — must require postgres and backend each healthy.
- low → patch — Edge: empty-string `DJANGO_ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` collapse to `[]` — use `or` defaults.
- low (rejected) — Edge: migrate retry loop — Compose `depends_on: service_healthy` already gates start; uncommon with current topology.
- medium → patch — Edge: frontend publish without `index.html` guard — empty volume would break SPA silently.
- medium → patch — Edge claim: hardcoded `SECRET_KEY` fallback — conflicts with env-only secrets baseline; require `DJANGO_SECRET_KEY` from env.
- medium → patch — VG (pre-verified): smoke asserts `"status"` key only, not `"ok"` — degraded health JSON still PASSes.
- medium → patch — VG (pre-verified): migrate-on-start unobserved by smoke — entrypoint migrate can regress while smoke PASSes.
- defer — VG (pre-verified): Django `TIME_ZONE` not asserted (only env) — Story 1.1 AC is env-facing; close on first timezone-sensitive story.
