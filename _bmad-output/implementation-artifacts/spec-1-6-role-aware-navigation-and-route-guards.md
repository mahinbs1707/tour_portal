---
title: '1.6 Role-Aware Navigation and Route Guards'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a7697d4502c89001b9301931ae6d281187e55423'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nav and routes ignore role. Guests can open Customer/Admin shells, Customers can open `/app/admin/*`, and Customer-only chrome is missing—so FE affordances do not match AuthProvider `role` (server still owns real authz).

**Approach:** Wire role-based nav sets (Guest / Customer top nav; Admin sidebar on `/app/admin/*`) and FE route guards keyed on `role` only: unauthorized Admin access → Customer home + status toast; Guests hitting gated Customer/Admin routes → Sign in (Sign up link available).

## Boundaries & Constraints

**Always:**
- Guest primary nav: Explore · AI · Sign in · Sign up (no Customer-only items).
- Customer primary nav: Explore · AI · My bookings · Custom tours · Notifications · Sign out.
- Admin uses `/app/admin/*` sidebar chrome; optional “View site”; do not put Admin ops links in public TopNav.
- FE guards use `user.role` only (`CUSTOMER` | `ADMIN`) — never `is_staff` alone.
- Customer (or Guest) opening `/app/admin/*` → redirect Customer home (`/app/customer`) with `role="status"` permission-denied toast (Guest → Sign in instead).
- Guest opening `/app/customer/*` (or other gated Customer surfaces) → redirect Sign in; Sign up remains reachable from nav/auth pages.
- Preserve AuthProvider bootstrap / session-ended modal from Story 1.5; security remains server-side (Admin APIs still deny non-Admin).
- MVP exclusions unchanged. Do not edit planning artifacts. Do not implement booking/catalog business UI beyond empty homes/placeholders.

**Never:**
- Authorize business actions in the FE alone.
- Use `is_staff` as the Admin route gate.
- Invent seat/payment/JWT features.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Guest nav | Unauthenticated on public shell | Explore, AI, Sign in, Sign up only | N/A |
| Customer nav | `role=CUSTOMER` on public/customer shell | Customer nav set including Sign out | N/A |
| Customer → Admin | Customer opens `/app/admin/*` | Redirect `/app/customer` + status toast | Toast permission denied |
| Guest → Admin/Customer | Guest opens `/app/admin/*` or `/app/customer/*` | Redirect Sign in | N/A |
| Admin shell | `role=ADMIN` on `/app/admin/*` | AdminLayout sidebar; access allowed | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/features/auth/AuthContext.jsx` -- reuse `user.role`, `bootstrapping`, `isAuthenticated`
- `frontend/src/layouts/PublicLayout.jsx` + `CustomerLayout.jsx` + `AdminLayout.jsx` -- role-aware nav item sets
- `frontend/src/App.jsx` -- wrap `/app/customer` and `/app/admin` with guard components
- `frontend/src/features/auth/` or `components/` -- `RequireAuth` / `RequireRole`; status toast helper
- `frontend/src/i18n/messages.js` -- permission-denied + nav strings as needed
- Continuity: Story 1.5 session; Story 1.2 shells; Story 1.3 `IsAdminRole` server deny

**Do not change:** planning docs; backend RBAC helpers beyond optional assert; DESIGN tokens redesign; login rate-limit (`1-5a`).

**Agent decisions:** Key guards on `role` after bootstrap completes (neutral chrome while `bootstrapping`). Guest → `/sign-in` with optional `?next=` return. Customer denied Admin → `/app/customer` + ephemeral status toast. Admin hitting `/app/customer/*` → redirect `/app/admin` (sidebar-first). Prefer Vitest/RTL for nav + guard matrix; one APIClient/DRF check that Customer still gets 403 on an Admin-only permission remains acceptable as documentation of server deny.

## Tasks & Acceptance

**Execution:**
- [x] `frontend` nav config -- Guest vs Customer TopNav sets; Admin sidebar-only ops -- FR-LP-08 / UX nav
- [x] `frontend` guards -- RequireAuth/RequireRole on `/app/customer/*` and `/app/admin/*` -- AD-3 / AD-13
- [x] `frontend` UX -- permission-denied status toast + redirects (Customer→Customer home; Guest→Sign in) -- EXPERIENCE
- [x] Tests -- Guest/Customer/Admin nav + guard matrix (incl. Customer blocked from Admin) -- Story 1.6 AC

**Acceptance Criteria:**
- Given I am a Guest, when I view primary nav, then I see Explore, AI, Sign in, Sign up (and not Customer-only items)
- Given I am a Customer and open `/app/admin/*`, when the guard runs, then I am redirected to Customer home with a status toast, and Admin APIs still deny me if called directly

## Implementation Notes

- `navConfig.js` + `resolveTopNavItems` — Guest / Customer / Admin-public / bootstrapping sets; Admin ops stay in `AdminSidebar`.
- `RequireAuth` + `RequireRole` wrap `/app/customer` and `/app/admin` in `App.jsx`; gates on `role` after bootstrap (never `is_staff`).
- Customer denied Admin → `/app/customer` + `role="status"` toast via location state; Guest → `/sign-in?next=`; Admin on Customer routes → `/app/admin`.
- `SignInPage` honors safe relative `?next=`; `StatusToast` ephemeral dismiss.
- Tests: `RoleNavGuards.test.jsx` matrix; shell Admin sheet test authenticates as ADMIN.

## Spec Change Log

## Review Triage Log

- medium → patch — Blind/VG: Guest→Sign in `?next=` unasserted — assert query; SignInPage honors safe next / rejects `//evil`.
- medium → patch — Edge: `safeNextPath` backslash / open-redirect shapes — harden + unit tests; keep hash when safe.
- medium → patch — Edge: null/unknown role ping-pong Customer↔Admin — Navigate to `/`; nav Sign out only.
- medium → patch — Blind: RequireAuth bootstrap inaccessible — shared aria-busy placeholder.
- medium → patch — Blind: StatusToast linger / no dismiss — clear on state loss + dismiss control.
- medium → patch — Blind: Admin public nav missing home — add Home → `/app/admin`.
- low → patch — Blind: double `renderApp` without unmount — unmount between renders.
- false — Blind: server Admin deny missing from this diff — already covered by `common.tests.test_permissions` (9 OK).
- false — Blind: sprint vs spec status mismatch mid-change — closed to done/review at present.
- low (rejected) — Blind: Guest must see Sign up after redirect — Sign-in page already links Sign up; not a new defect.

## Verification

**Commands:**
- `npm test` (frontend) -- **38/38 PASS** (nav/guards, safeNextPath, Sign in next)
- `docker compose … backend python manage.py test common.tests.test_permissions` -- **9/9 OK** (server Admin deny)
