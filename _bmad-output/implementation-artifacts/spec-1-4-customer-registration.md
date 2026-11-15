---
title: '1.4 Customer Registration'
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

**Problem:** Guests cannot create a Customer account. Without `POST /api/auth/register/` and a Sign up UI that establishes a Customer session, Epic 1 auth flows and later gated booking cannot start.

**Approach:** Add Customer-only registration (API + Sign up page) with validation, force `role=CUSTOMER`, log the user in on success, and redirect to Landing; leave shared Sign in/out/`me`/full apiClient surface for Story 1.5 and role-aware nav for 1.6.

## Boundaries & Constraints

**Always:**
- `POST /api/auth/register/` accepts full name, email, password, confirm password; creates `CUSTOMER` only (`is_staff=False`); ignores/rejects any client-supplied Admin role.
- Validation: email format; unique email; password ≥8 with ≥1 letter and ≥1 number (FR-AUTH-15); confirm must match; field-level errors; passwords never logged plaintext.
- Successful Sign up establishes an authenticated Django session (HttpOnly cookie) and redirects to Landing (EXPERIENCE Flow A).
- Failures create no account/session; stay on Sign up; clear password fields; keep email/name when safe.
- Same-origin CSRF on unsafe methods; credentials included on register requests.
- Preserve MVP exclusions: seats, Stripe/real payments, JWT, quotations, email/SMS verification, object storage, microservices, password reset.
- Do not implement Sign in/out UI, `/api/auth/login|logout|me/`, or role-aware nav/guards (Stories 1.5–1.6). Do not edit planning artifacts or redesign Story 1.2 shell tokens/layouts beyond wiring the Sign up route and auth strings.

**Never:**
- Allow self-serve Admin registration or trusting a client `role` of `ADMIN`.
- Store auth tokens in localStorage.
- Ship a second HTTP client alongside the shared `apiClient` path (AD-21).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Valid unique name/email/password/confirm | User `role=CUSTOMER`, session cookie set, redirect `/` | N/A |
| Duplicate email | Existing email | No new user/session; stay on Sign up | Field/status error; passwords cleared |
| Weak password | Fails ≥8 / letter / number | No user/session | Password-format message; passwords cleared |
| Confirm mismatch | password ≠ confirm | No user/session | Distinct mismatch message; passwords cleared |
| Role injection | Body includes `role=ADMIN` (or similar) | Still creates `CUSTOMER` only (or rejects role field) | Never elevate to Admin |

</frozen-after-approval>

## Code Map

- `backend/accounts/` -- reuse `User` / `UserManager.create_user` (email, `full_name`, role matrix); add register serializer + view
- `backend/config/urls.py` -- mount `/api/auth/register/` and minimal `/api/auth/csrf/`
- `backend/config/settings.py` -- enable DRF `SessionAuthentication` (and CSRF cookie settings as needed for SPA)
- `frontend/src/App.jsx` -- replace Sign up placeholder with real page under PublicLayout (`/sign-up`)
- `frontend/src/features/auth/` -- Sign up form (aria-invalid / described-by; DESIGN input/button tokens)
- `frontend/src/services/apiClient.js` -- start shared client with `credentials: 'include'`, CSRF attach, register POST only (1.5 extends)
- `frontend/src/i18n/messages.js` -- Sign up labels/errors (English MVP)
- Continuity: Story 1.3 User/seed/RBAC; Story 1.2 PublicLayout + tokens; Guest nav until Story 1.6

**Do not change:** Admin seed/entrypoint; planning docs; Customer/Admin layout chrome beyond necessary; full login/logout/me/401 modal (1.5).

**Agent decisions:** Include minimal `GET /api/auth/csrf/` in this story so browser register can succeed (1.5 keeps/expands it). On success call Django `login()` in the register view. Ignore unknown/extra `role` and always set `CUSTOMER`. Start `apiClient` here rather than a one-off fetch helper. Leave TopNav Guest until Story 1.6 even though the session cookie exists. Prefer DRF APITestCase + Vitest/RTL for form validation messages.

## Tasks & Acceptance

**Execution:**
- [x] `backend/accounts` -- register serializer + view: validate, create CUSTOMER, session login, reject duplicate/weak/mismatch -- AD-2 / FR-AUTH
- [x] `backend/config` -- URL routes for register + csrf; SessionAuthentication settings -- SPA session
- [x] `frontend/src/services/apiClient.js` -- credentials + CSRF + register POST -- AD-21 seed
- [x] `frontend/src/features/auth` + `App.jsx` + `messages.js` -- Sign up page, errors, redirect Landing -- Flow A
- [x] Tests -- API matrix (happy, duplicate, weak, mismatch, role not Admin); FE validation messages -- Story 1.4 AC

**Acceptance Criteria:**
- Given I am on Sign up with valid unique data, when I submit, then a Customer account is created, I receive an authenticated Customer session, I am redirected to the landing page, and I could not set role to ADMIN
- Given I attempt Sign up with a duplicate email or invalid password (or confirm mismatch), when I submit, then no account/session is created, I remain on Sign up with a clear error, and password fields are cleared

## Implementation Notes

- `RegisterSerializer` + `RegisterView`: validate full_name/email/password/confirm; FR-AUTH-15 policy; always `role=CUSTOMER` / `is_staff=False`; ignore client `role`; `login()` on success → 201.
- `GET /api/auth/csrf/` sets readable `csrftoken`; `CsrfSessionAuthentication` enforces CSRF on anonymous unsafe methods.
- Settings: SessionAuthentication default, session HttpOnly + SameSite=Lax, CSRF cookie JS-readable.
- `apiClient` seeds credentials + CSRF + `register()` only (1.5 extends login/logout/me/401).
- Sign up page under PublicLayout `/sign-up`; field errors + aria-invalid/describedby; failure clears passwords; success navigates `/`. TopNav remains Guest (1.6).

## Spec Change Log

## Review Triage Log

- false — Blind: post-signup Guest chrome / no customer home — intentional until Stories 1.5–1.6 (session cookie + Landing redirect is 1.4 AC).
- defer — Blind: “Already have an account?” → `/sign-in` PlaceholderPage — Sign in is Story 1.5.
- medium → patch — Blind/Edge/VG: `ensureCsrf` ignores non-OK / missing cookie — fail closed; require token before unsafe POST.
- medium → patch — VG: CSRF cold-start untested — add apiClient cold-start test.
- low (rejected) — Blind: clearing passwords on name/email-only client errors — PRD clears passwords on failed Sign up attempts; keep simple.
- low → patch — Blind: weak+mismatch test title vs asserts — assert both messages when both fail.
- medium → patch — Blind/VG: success path never asserts navigate `/` — assert `replace: true`.
- medium → patch — Blind/VG: numbers-only password letter rule untested — add BE+FE cases.
- medium → patch — Blind/Edge: duplicate-email race → 500 — catch IntegrityError → email ValidationError.
- low (rejected) — Blind: is_superuser client injection test — role already forced CUSTOMER; matrix covered.
- low (rejected) — Blind: server validation strings not in i18n — English MVP; DRF messages fine for now.
- low → patch — Blind: submit lacks aria-busy / inputs editable — aria-busy + disable inputs while submitting.
- false — Blind: global `CsrfSessionAuthentication` is a defect — intentional SPA CSRF default for AD-2; views can opt out.
- false — Blind: sprint 1.3 still `review` blocks 1.4 — process/tracking; not a code defect.
- medium → patch — Edge: empty ApiError shows no message — fall back to generic copy.
- medium → patch — Edge: double-submit before re-render — submit ref lock.
- low (rejected) — Edge: fetch timeout — adds AbortSignal surface beyond trivial patch; defer if hangs appear.
- medium → patch — VG: `/sign-up` not covered via AppRoutes — shell test asserts Sign up form.
- medium → patch — VG: normalizeDrfError untested — drive failing register JSON through real client.
- medium → patch — VG: `CSRF_COOKIE_HTTPONLY=False` unpinned — assert in register tests.

## Verification

**Commands:**
- `docker compose -f deploy/docker-compose.yml --env-file .env exec -T -e DJANGO_USE_SQLITE=1 backend python manage.py test accounts.tests.test_register` -- register matrix + CSRF_HTTPONLY + numbers-only
- `npm test` (frontend) -- **10/10 PASS** after review patches (shell `/sign-up`, SignUpPage, apiClient cold-start/normalize)
- Compose backend image rebuild required (no source bind-mount)
