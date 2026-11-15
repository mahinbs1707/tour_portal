---
title: '1.3 User Model, Roles, and Admin Seed'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '735f631e6a858559383b64b0f270b75a4e113347'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The API still uses Django’s default User. Without a CUSTOMER|ADMIN role model, Admin seed invariant, and role-based permission helpers, later auth and Admin APIs have no server RBAC foundation.

**Approach:** Add `accounts` User (UUID, unique email, hashed password, role, staff flags), management seed for Admin from env, `common` helpers `IsCustomer`/`IsAdminRole` (role-based, never `is_staff` alone), plus NotificationService/AuditService stubs with no domain events yet.

## Boundaries & Constraints

**Always:**
- `accounts.User`: UUID PK; unique email; password hash only; `role` ∈ {`CUSTOMER`,`ADMIN`}; `is_staff` / `is_superuser` fields; set `AUTH_USER_MODEL`.
- Seed invariant (AD-3/AD-19): seeded Admin has `role=ADMIN` and `is_staff=True`; reject illegal matrices `{ADMIN,is_staff=False}` and `{CUSTOMER,is_staff=True}` at model/seed validation.
- No public Admin signup in this story (or later); Admins only via seed/authorized provisioning.
- Permission classes: `IsAdminRole` requires authenticated `role == ADMIN`; `IsCustomer` requires `role == CUSTOMER`. `is_staff` alone is insufficient for application Admin APIs.
- Stub interfaces for `NotificationService` and `AuditService` (no domain event emission yet).
- Admin credentials via env (`.env.example` placeholders only — never commit real secrets).
- Passwords never logged plaintext.
- Preserve MVP exclusions: seats, Stripe/real payments, JWT, quotations, email/SMS, object storage, microservices.
- Do not implement registration UI/API (1.4), session/apiClient (1.5), or FE route guards (1.6). Do not change Story 1.2 frontend shells except if a harmless shared dep is required (prefer none).
- Do not edit approved planning artifacts.

**Never:**
- Use Django `IsAdminUser` / `is_staff`-only as the application Admin API gate.
- Self-serve Admin registration endpoints.
- Invent traveler maximums, seat inventory, or payment providers.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed Admin | Migrate + seed with valid env Admin email/password | User `role=ADMIN`, `is_staff=True`; password hashed | Reject illegal role/staff matrix; fail closed if seed env missing when seed runs |
| Customer denied | Authenticated Customer vs `IsAdminRole` | Permission denied | 403 (DRF) |
| Staff-only insufficient | Authenticated user with `is_staff=True` but `role!=ADMIN` vs `IsAdminRole` | Denied | 403 |
| Customer allowed | Authenticated Customer vs `IsCustomer` | Allowed | N/A |

</frozen-after-approval>

## Code Map

- `backend/config/settings.py` -- add `accounts`, `common` (and stub app modules as needed); `AUTH_USER_MODEL`
- `backend/` greenfield -- create `accounts/`, `common/` (and thin `notifications`/`audit` stubs or interfaces under `common`/dedicated apps per AD-4)
- `.env.example` -- add Admin seed placeholders (e.g. `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- `_bmad-output/.../ARCHITECTURE-SPINE.md` -- AD-3, AD-4, AD-9, AD-19
- `_bmad-output/implementation-artifacts/epic-1-context.md` -- epic constraints
- Continuity: Story 1.1 Compose migrate-on-start; Story 1.2 FE untouched

**Do not change:** frontend layouts/tokens; planning docs; real notification/audit event writers beyond stubs.

**Agent decisions:** Include `full_name` on User for Story 1.4 readiness; seed command `seed_admin` (idempotent upsert by email); seed sets `is_superuser=False` unless required for django-admin (use `is_staff=True` only); put shared DRF permissions in `common/permissions.py`; NotificationService/AuditService as injectable stub classes with no-op/record-not-yet interfaces in `notifications`/`audit` apps or `common.services` — prefer AD-4 app names `notifications` + `audit` with minimal stub modules; add a tiny Admin-only stub API route solely to exercise `IsAdminRole` in tests (or permission unit tests without HTTP). Prefer pytest/Django TestCase for seed + permission matrix.

## Tasks & Acceptance

**Execution:**
- [x] `backend/accounts` -- User model + migrations + `AUTH_USER_MODEL` + role/staff validation -- AD-9/AD-19
- [x] `backend` seed -- management command + `.env.example` Admin placeholders -- hashed Admin seed
- [x] `backend/common` -- `IsCustomer` / `IsAdminRole` permission classes -- role-based RBAC
- [x] `backend` stubs -- NotificationService + AuditService interfaces (no domain events) -- AD-4/AD-12 readiness
- [x] Tests -- seed Admin matrix; Customer denied on Admin permission; `is_staff` alone insufficient -- Story 1.3 AC
- [x] Compose migrate/seed path documented or wired for local bring-up -- developer can obtain seeded Admin

**Acceptance Criteria:**
- Given the database is migrated and seed is run, when I inspect the seeded Admin, then the user has `role=ADMIN` and `is_staff=True`, and password is stored hashed only
- Given a Customer-authenticated request hits an Admin-only permission class, when authorization is evaluated, then access is denied, and `is_staff` alone without `role=ADMIN` is insufficient for application Admin APIs

## Implementation Notes

- `accounts.User`: UUID PK, unique email (normalized lower), `full_name`, `role` CUSTOMER|ADMIN, `is_staff`/`is_superuser`; `AUTH_USER_MODEL=accounts.User`.
- Role/staff matrix enforced in `validate_role_staff_matrix` + `User.clean`/`save`; seed command `seed_admin` upserts by email (`is_superuser=False`).
- Entrypoint runs `seed_admin` only when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set; passwords never logged.
- DRF helpers in `common.permissions`: `IsCustomer`, `IsAdminRole` (role-only).
- Stub apps `notifications` / `audit` with no-op service interfaces.
- Optional `DJANGO_USE_SQLITE=1` for unit tests without Postgres.
- Review patches: permissions require `is_active`; entrypoint skips whitespace-only ADMIN_*; seed upserts `full_name` + IntegrityError race; DB CheckConstraint; create_superuser enforces `is_superuser=True`; smoke asserts seeded Admin when env set; `.env.example` ADMIN_* blank by default.

## Verification

- Django tests via Compose + `DJANGO_USE_SQLITE=1`: `accounts` + `common` + `notifications` + `audit` → **23/23 OK** (seed fail-closed matrix, role/staff invariants, inactive denials, HTTP 403 stub, stubs).
- Live Compose Admin: `admin@example.com` has `role=ADMIN`, `is_staff=True`, `is_superuser=False`, password hashed (`pbkdf2_`).

## Spec Change Log

## Review Triage Log

- low → patch — Blind: UTF-8 BOM on `deploy/smoke-check.ps1` — strip BOM so PowerShell/scripts stay clean.
- medium → patch — Blind: `.env.example` non-empty ADMIN defaults contradict “leave blank to skip” — blank defaults with enablement comments.
- false — Blind: Compose may not pass ADMIN_* into backend — `deploy/docker-compose.yml` uses `env_file: ../.env`, so ADMIN_* are forwarded.
- medium → patch — Blind: seed upsert never refreshes `full_name` — update `full_name` from `ADMIN_FULL_NAME` on upsert.
- medium → patch — Blind/Edge: concurrent seed `IntegrityError` — catch IntegrityError and fall back to get+update.
- defer — Blind: Django admin User forms still username-oriented — email UserAdmin forms/add_form needed for usable django-admin UX; not required for seed/RBAC AC.
- medium → patch — Blind: no DB CheckConstraint for role/staff matrix — add CheckConstraint + migration.
- low (rejected) — Blind: `User.save()` always `full_clean()` surprises partial updates — intentional invariant enforcement; everyday seed/API path is fine.
- medium → patch — Blind: email uniqueness test only half-covers different-case create — strengthen assert on second create.
- low (rejected) — Blind: `NotificationService.mark_read` untested — stub contract; create path covered; deepen later if stubs grow.
- low (rejected) — Blind: README tree indent for `env_contract.py` — docs cosmetics, not Story 1.3 AC.
- false — Acceptance: Story 1.1 hardening in 1.3 diff is an AC fail — uncommitted prior 1.1 review work in dirty tree; not caused by 1.3 intent delivery.
- defer — Blind: smoke redirect hard-requires `127.0.0.1` Location while Nginx preserves Host — localhost smoke base can false-fail; pre-existing 1.1 smoke hardening.
- low (rejected) — Blind: no test that CUSTOMER email is promoted to ADMIN on upsert — upsert path sets role/staff; covered by idempotent update test after create.
- false — Blind: empty Spec Change Log / Triage Log is a code defect — process sections filled by this review; reject “edit the spec” as a finding fix.
- medium → patch — Edge: inactive users pass IsCustomer/IsAdminRole — require `user.is_active`.
- medium → patch — Edge/VG: whitespace-only ADMIN_* treated as set by entrypoint → CommandError aborts container — strip/treat whitespace as unset before invoking seed.
- medium → patch — Edge: `create_superuser` allows `is_superuser=False` — raise ValueError unless True.
- defer — Edge: empty Host with `$http_host` — rare client; pre-existing 1.1 nginx change; revisit with proxy hardening.
- medium → patch — VG (pre-verified): Compose Admin seed unobserved by smoke — assert seeded Admin when ADMIN_* non-empty.
- medium → patch — VG (pre-verified): fail-closed only tested when both env missing — add email-only, password-only, whitespace-only cases.
- medium → patch — Acceptance: frozen matrix 403 not asserted via HTTP — add stub-view APIClient 403 test for IsAdminRole denial.
