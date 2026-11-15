---
title: '1.5 Sign In, Sign Out, Session Bootstrap, and Shared apiClient'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd671e402070ca49208cefef2418ccc4512d6874c'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Customers and Admins cannot Sign in/out, restore session on refresh, or share one CSRF-aware HTTP client with session-expiry UX—blocking every later gated feature.

**Approach:** Complete AD-2 session endpoints (`login`/`logout`/`me`, keep `csrf`), extend the Story 1.4 `apiClient` (401 session-ended modal + optional single CSRF refresh on 403), add shared Sign in UI and Sign out that clears the session and returns Guest chrome, with app-init bootstrap via CSRF + `/me/`.

## Boundaries & Constraints

**Always:**
- Endpoints: `POST /api/auth/login/`, `POST /api/auth/logout/`, `GET /api/auth/me/`; keep `GET /api/auth/csrf/` and register from 1.4.
- Shared Sign in (Customer + Admin): email + password; success → Landing; invalid → no session, stay on Sign in, generic “Invalid email or password”, clear password (email may stay).
- Sign out invalidates session; public (Guest) nav is shown.
- `/me/` returns at least `role`, `is_staff`, `is_superuser`; FE auth UX keys on `role` only (full route guards = Story 1.6).
- Exactly one `apiClient`: credentials include, CSRF attach, DRF error normalization, 401 → session-ended modal + Sign in; bootstrap CSRF once at init; optional one CSRF refresh on CSRF 403 then fail closed.
- Session cookie HttpOnly + SameSite=Lax + Secure when not DEBUG; CSRF cookie JS-readable; no tokens/JWT in localStorage.
- Passwords never logged plaintext. MVP exclusions preserved (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices, password reset).
- Do not implement full Admin/Customer route-guard matrices (Story 1.6). Do not edit planning artifacts.

**Deferred (tracked, not weakened):** Login rate-limit/lockout against repeated failures remains required by AD-2 / Epic 1 — out of this story’s delivery; follow-up backlog `1-5a-login-rate-limit-and-lockout` (see `deferred-work.md`).

**Never:**
- Store session secrets or JWTs in localStorage.
- Treat `is_staff` alone as application Admin for FE decisions.
- Add a second HTTP client beside `apiClient`.
- Silently omit or weaken the deferred login rate-limit/lockout requirement.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sign in OK | Valid Customer or Admin credentials | Session set; `/me/` has role/staff/superuser; redirect `/` | N/A |
| Sign in bad | Unknown email or wrong password | No session; stay on Sign in | Generic invalid-credentials; password cleared |
| Sign out | Authenticated session | Session invalidated; Guest nav | N/A |
| Bootstrap | Refresh with valid session cookie | `/me/` restores user; CSRF bootstrapped | Unauthenticated → Guest |
| Session expired | 401 on protected mutation via apiClient | Session-ended modal; can Sign in again | Hook-ready for non-sensitive draft restore later |
| CSRF 403 | First CSRF failure on unsafe call | One CSRF refresh + one retry; then fail closed | Surface error; no infinite retry |

</frozen-after-approval>

## Code Map

- `backend/accounts/views.py` + `serializers.py` + `urls.py` -- Login/Logout/Me; reuse CsrfView + RegisterView; CsrfSessionAuthentication
- `backend/config/settings.py` -- confirm session/CSRF cookie flags (no rate-limit config in this story)
- `frontend/src/services/apiClient.js` -- extend: login/logout/me; 401 handler; single CSRF-403 refresh
- `frontend/src/features/auth/` -- SignInPage; SessionExpiredModal; AuthProvider/bootstrap; Sign out action/route
- `frontend/src/App.jsx` + `PublicLayout`/`TopNav` -- wire Sign in; session-aware Guest chrome for Sign-out AC; AuthProvider at root
- `frontend/src/i18n/messages.js` -- Sign in/out + session-ended strings
- Continuity: 1.4 register/csrf/apiClient seed; 1.3 User roles; 1.2 shells

**Do not change:** planning docs; Admin seed; full route-guard matrix (1.6); DESIGN tokens redesign.

**Agent decisions:** Extend existing `apiClient` (do not replace). AuthProvider: CSRF + `me` once at init. Sign out clears auth state and forces Guest TopNav. After Sign in → Landing; expose `role` for later guards; minimal Sign in/Sign up ↔ Sign out chrome swap (Customer nav extras can wait for 1.6). Session-ended copy: “Your session ended.” Draft restore: hook/stub only. Prefer APITestCase + Vitest/RTL. Rate-limit/lockout not implemented here — tracked as `1-5a-login-rate-limit-and-lockout`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/accounts` -- login/logout/me views+serializers; generic invalid credentials -- AD-2
- [x] `frontend/src/services/apiClient.js` -- login/logout/me; 401 session-expired; one CSRF refresh on 403 -- AD-21
- [x] `frontend/src/features/auth` -- AuthProvider bootstrap; SignInPage; Sign out; SessionExpiredModal + draft-restore hook stub -- Flow A / UX-DR11
- [x] `frontend` shell wiring -- App/PublicLayout/TopNav + messages for Guest chrome after logout -- Sign out AC
- [x] Tests -- API login/logout/me; invalid credentials; FE Sign in/out + 401 modal -- Story 1.5 AC

**Acceptance Criteria:**
- Given a valid Customer or Admin account, when I Sign in with correct credentials, then I am redirected to landing and `/api/auth/me/` returns `role`, `is_staff`, `is_superuser` (FE decisions key on `role` only)
- Given I am signed in, when I Sign out, then the session is invalidated and public nav is shown
- Given my session has expired mid-use, when I attempt a protected mutation via apiClient, then I see the session-ended modal and can Sign in again, and a hook is ready for later non-sensitive draft restore

## Implementation Notes

- Backend: `LoginView` / `LogoutView` / `MeView` + `LoginSerializer` / `MeSerializer`; generic “Invalid email or password.”; CSRF kept on unsafe auth posts via `CsrfSessionAuthentication`.
- Frontend: single `apiClient` extended with `login`/`logout`/`me`, 401 session-ended on unsafe methods only, one CSRF refresh+retry on CSRF 403 then fail closed.
- Auth: `AuthProvider` bootstraps CSRF + `/me/`; `SignInPage` / `SignOutPage` / `SessionExpiredModal`; `useDraftRestore` stub; PublicLayout swaps Sign in/up ↔ Sign out.
- Deferred unchanged: `1-5a-login-rate-limit-and-lockout` (see `deferred-work.md`).

## Spec Change Log

## Review Triage Log

- medium → patch — Blind/Edge: Guest nav flash while bootstrapping — neutral Explore/AI-only nav until bootstrap finishes.
- medium → patch — Edge: late bootstrap `/me/` clears post-sign-in user — ignore late failure after signIn/signUp.
- medium → patch — Blind/Edge: register ok + `me()` fail leaves Guest error — setUser from register payload.
- medium → patch — Blind: `clearCsrfCookie` missing Secure/SameSite — include Lax + Secure on HTTPS.
- low → patch — Blind: invalid-credentials period mismatch — align i18n with backend.
- low (rejected) — Blind: clear password on empty email client validation — keep simple fail-closed UX.
- medium → patch — Blind/VG: Sign-out TopNav chrome untested — assert Sign out ↔ Guest links via AppRoutes/PublicLayout.
- medium → patch — VG: session-ended latch not re-armed after login — assert `login()` resets notification.
- medium → patch — Blind: GET 401 must not open modal — assert safe-method negative.
- medium → patch — VG: `/sign-out` App route untested — App.shell wiring case.
- medium → patch — Blind: logout CSRF / inactive login untested — add backend cases.
- medium → patch — Blind/VG: `useDraftRestore` untested on session-ended — minimal assert.
- low → patch — Blind: SessionExpiredModal missing `aria-describedby` — wire body copy.
- defer — Blind: Escape/focus-trap for SessionExpiredModal — deepen with dialog kit later.
- medium → patch — Edge: logout API failure vs local Guest — clear local first, best-effort logout (server cookie may linger; noted).
- false — Blind: empty Spec Change Log / AD-21 label — process docs; triage fills log; AD-21 is correct for apiClient.

## Verification

**Commands:**
- `docker compose … backend python manage.py test accounts` -- **26/26 OK**
- `npm test` (frontend) -- **25/25 PASS**
