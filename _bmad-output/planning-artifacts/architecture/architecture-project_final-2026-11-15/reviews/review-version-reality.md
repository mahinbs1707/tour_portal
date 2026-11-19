---
review: version-reality
lens: Verify committed stack/version decisions were web-researched or reality-checked
target: ARCHITECTURE-SPINE.md
reviewed: 2026-11-15
verdict: pass-with-advisories
---

# Version / Reality Check — Tour Portal Architecture Spine

## Verdict

**PASS WITH ADVISORIES.** Every version pin in §9 Technology Stack matches current official/latest releases as of 2026-11-15. Named technologies still exist and fit the modular-monolith + same-origin session-auth SPA design. Gaps are omissions (unpinned React Router, missing Node.js and DB-driver baselines), not false or stale pins.

The spine’s claim “web-verified 2026-11-15” for the §9 table is substantiated by this re-check.

## Scope

| In scope | Out of scope |
|---|---|
| §9 Technology Stack pins | Product/state-machine rules (AD-7+) |
| Named stack tech in §§2–8, 15 (existence + fit) | Cloud provider (explicitly deferred) |
| Greenfield starter defaults (create-vite / Django baseline) | Test-framework pins (deferred under AD-14) |
| Session-auth SPA + Nginx same-origin fit | JWT / Stripe (deferred) |

**Source reviewed:** `ARCHITECTURE-SPINE.md` (created/updated 2026-11-15).

## Evidence method

Web search against official docs / registries on **2026-11-15**:

| Technology | Primary sources checked |
|---|---|
| Django | docs.djangoproject.com download + 6.1.3 release notes; PyPI |
| djangorestframework | django-rest-framework.org release notes; PyPI |
| React / React DOM | npm `latest`; GitHub react releases |
| Vite | npm; GitHub vitejs/vite `v8.3.8` |
| `@vitejs/plugin-react` | npm; GitHub vite-plugin-react |
| PostgreSQL | postgresql.org news + versioning policy |
| Nginx | Docker Hub official `nginx` image |
| React Router | npm `react-router-dom` |
| Node (Vite req) | vite.dev getting started + Vite 8 announcement |
| Session auth fit | DRF Authentication + AJAX/CSRF/CORS docs |

---

## §9 pin verification

| Spine pin | Current reality (2026-11-15) | Status |
|---|---|---|
| Python ≥3.12 (Django 6.1 requirement) | Django 6.1 supports Python 3.12–3.15 (3.15 from 6.1.3); PyPI `Requires-Python: >=3.12` | **Confirmed** |
| Django 6.1.3 | Latest official stable; security release 2026-11-03 | **Confirmed** |
| Django REST Framework 3.18.3 | Latest on PyPI; released 2026-10-06; adds Django 6.1 support in 3.18.0 | **Confirmed** |
| PostgreSQL 18.x | Major 18 supported; current minor **18.7** (2026-11-12). Django 6.1 supports PostgreSQL **15+** | **Confirmed** (soft major pin; see advisory) |
| React 19.3.1 | npm `latest`; released 2026-10-14 | **Confirmed** |
| React DOM 19.3.1 | npm `latest`; matches React | **Confirmed** |
| Vite 8.3.8 | npm `latest`; GitHub tag 2026-11-11 | **Confirmed** |
| Vite React plugin 6.3.0 (`@vitejs/plugin-react`) | npm `latest`; peer `vite ^8.0.0`; released 2026-11-09 | **Confirmed** |
| Nginx Stable image | Official Docker Hub `nginx:stable` → **1.30.6**; still valid reverse-proxy image | **Confirmed** (intentionally untagged; see advisory) |

No §9 pin was found to be invented from training data, deprecated, or behind a newer patch that the spine claimed as current.

---

## Named technology existence + fit

| Technology | Exists? | Fits modular monolith + session-auth SPA? | Notes |
|---|---|---|---|
| React SPA | Yes | Yes | Single SPA with Public/Customer/Admin route groups matches AD-1 / AD-13 |
| React Router | Yes | Yes | Named in §2; **no version in §9** (advisory) |
| Django + apps | Yes | Yes | Domain apps as modules, not services — correct for modular monolith |
| Django REST Framework | Yes | Yes | `SessionAuthentication` + CSRF for same-origin AJAX is current DRF guidance |
| Django ORM + PostgreSQL | Yes | Yes | UUID PKs + integrity constraints are standard Django/Postgres |
| Nginx same-origin proxy | Yes | Yes | Required for cookie sessions without CORS complexity (AD-2 / AD-5 / AD-15) |
| Docker Compose | Yes | Yes | Appropriate local baseline; cloud unbound (AD-15) |
| Vite | Yes | Yes | Default greenfield React SPA toolchain |

### Session-auth SPA design fit (AD-2)

**Fits.** DRF docs still prescribe `SessionAuthentication` for same-origin AJAX clients, mandatory CSRF on unsafe methods, and cookie sessions. Spine rules (HttpOnly session cookie, Secure in production, CSRF bootstrap endpoint, no tokens in localStorage) align with that model. Nginx same-origin routing is the correct companion so the SPA does not force cross-origin credential complexity.

**Implementation reminder (not a version failure):** CSRF cookie must remain readable by JS (`CSRF_COOKIE_HTTPONLY = False`) while the session cookie stays HttpOnly — spine implies CSRF obtain/submit but does not spell this cookie split; worth capturing at implementation, not a stack pin error.

---

## Greenfield starter defaults

| Starter | Reality vs spine | Assessment |
|---|---|---|
| `npm create vite` → React (JS) template | Defaults to React 19.x + Vite 8.x + `@vitejs/plugin-react` 6.x; spine pins exact currents (19.3.1 / 8.3.8 / 6.3.0) | **Aligned** — pins are stricter than caret ranges; good for a baseline |
| Vite Node requirement | Vite 8 requires **Node.js 20.19+ or 22.12+** | **Gap** — not listed in §9 (advisory) |
| Django project bootstrap | `django-admin startproject` + DRF + PostgreSQL remains the standard greenfield path | **Aligned** |
| Django DB driver | Docs recommend **psycopg 3.1.12+** (psycopg2 still work; likely deprecate later) | **Gap** — driver not named in §9 (advisory) |
| create-vite language | Official templates offer JS and TS; spine shows `.jsx` | **Fine** for MVP; not a reality failure |

---

## Advisories (not version failures)

### A1 — React Router unpinned (medium)

Spine names React Router as the routing layer (§2 table, AD-13 structure) but §9 omits it. Current npm `react-router-dom` **latest** is **7.18.5** (2026-10-27). Package still exists; v7 remains the documented SPA library line for `react-router-dom`.

**Recommendation:** Add `react-router` / `react-router-dom` **7.18.5** (or “latest 7.x at lockfile time”) to §9 before implementation lockfile generation.

### A2 — Node.js runtime missing (medium)

Vite 8 / `@vitejs/plugin-react` 6.x require Node **^20.19.0 || >=22.12.0**. Without this in the stack table, Docker/dev images may default to unsupported Node.

**Recommendation:** Add Node.js baseline to §9 (e.g. `≥20.19 or ≥22.12`).

### A3 — PostgreSQL soft pin `18.x` (low)

Correct major; current minor is **18.7** with a large Nov 2026 security batch. Soft pin is acceptable for architecture; Compose should prefer an explicit image tag (`postgres:18.7` or `postgres:18`) when written.

### A4 — Nginx image tag unbound (low)

Spine explicitly defers exact Nginx tag (§11). `nginx:stable` → 1.30.6 is valid today. Pin a digest/tag at deploy/compose time.

### A5 — PostgreSQL driver omitted (low)

Django 6.1 docs: PostgreSQL 15+; recommend **psycopg 3.1.12+**. Name the driver in the stack or implementation checklist so greenfield install is not left to guesswork.

### A6 — Django feature release vs LTS (informational)

Django **6.1.3** is the correct current feature release. **5.2** remains the active LTS (extended support into 2028); next LTS is **6.2** (planned April 2027). Choosing 6.1.3 is valid for “current latest”; teams wanting maximum support horizon may prefer 5.2 LTS until 6.2 — **not** an accuracy defect in the spine.

### A7 — PostgreSQL 19 approaching GA (informational)

PostgreSQL **19 RC 2** is out; GA planned **2026-11-19**. Spine’s 18.x choice is the conservative supported major and remains correct; do not jump to 19 for MVP without a deliberate decision.

---

## Design-fit flags (non-version)

| Item | Fit? | Comment |
|---|---|---|
| One SPA + one API + one DB | Yes | Matches modular monolith |
| Session auth over JWT for MVP | Yes | Matches same-origin Nginx design |
| DRF-standard errors (no custom envelope) | Yes | Matches AD-11 |
| Mock PaymentProvider | N/A (app code) | Not a library version concern |
| Test frameworks deferred | Acceptable | AD-14 correctly defers pins |

No named technology was found that **does not fit** the modular-monolith + session-auth SPA architecture.

---

## What was *not* confirmed (or not claimed)

| Item | Spine treatment | Reviewer note |
|---|---|---|
| Exact Nginx tag | Deferred §11 | OK; confirmed image family exists |
| pytest / Vitest / Playwright | Deferred AD-14 | OK; do not invent pins here |
| Cloud host | Unbound | OK |
| React Router version | Named, unpinned | **Should pin** (A1) |
| Node.js | Unstated | **Should state** (A2) |
| psycopg | Unstated | **Should state** (A5) |

Nothing in §9 appears asserted from stale training data without a matching current release.

---

## Summary table

| Check | Result |
|---|---|
| §9 pins match current latest | Pass |
| Claim “web-verified 2026-11-15” | Pass (re-verified) |
| Technologies still exist | Pass |
| Fit modular monolith + session SPA | Pass |
| Greenfield starter alignment | Pass (with Node/driver advisories) |
| Out-of-date / unconfirmed pins | None found |
| Material omissions | React Router pin; Node baseline; psycopg |

## Recommended follow-ups (optional spine edits)

1. Add to §9: `react-router-dom` **7.18.5** (or equivalent `react-router` 7.x).
2. Add to §9: Node.js **≥20.19 or ≥22.12**.
3. Add to §9 or AD-15: PostgreSQL driver **psycopg ≥3.1.12**.
4. When writing Compose: prefer `postgres:18.7` (or `18`) and `nginx:1.30.6` / `nginx:stable` with a noted verify-at-lock time.

---

## Sources (accessed 2026-11-15)

- https://www.djangoproject.com/download/
- https://docs.djangoproject.com/en/6.1/releases/6.1.3/
- https://docs.djangoproject.com/en/6.1/faq/install/
- https://docs.djangoproject.com/en/6.1/ref/databases/
- https://www.django-rest-framework.org/community/release-notes/
- https://www.django-rest-framework.org/api-guide/authentication/
- https://www.django-rest-framework.org/topics/ajax-csrf-cors/
- https://pypi.org/project/Django/
- https://pypi.org/project/djangorestframework/
- https://www.npmjs.com/package/react
- https://www.npmjs.com/package/react-dom
- https://www.npmjs.com/package/vite
- https://www.npmjs.com/package/@vitejs/plugin-react
- https://www.npmjs.com/package/react-router-dom
- https://vite.dev/guide/
- https://vite.dev/blog/announcing-vite8
- https://www.postgresql.org/support/versioning/
- https://www.postgresql.org/about/news/postgresql-187-1712-1616-1520-1425-and-19-rc-2-released-3442/
- https://hub.docker.com/_/nginx/
