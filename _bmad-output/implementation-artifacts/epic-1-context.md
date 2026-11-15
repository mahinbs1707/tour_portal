# Epic 1 Context: Secure Access & Experience Shell

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up the Tour Portal MVP foundation so Guests see a branded public shell and Customers/Admins can register (Customer only), sign in/out, and hold a secure same-origin session—with Compose runtime, design tokens, route-group layouts, shared `apiClient` (session + CSRF), server RBAC, Admin seed, and Notification/Audit service stubs. No business workflows beyond empty authenticated homes; later epics emit events onto these stubs safely.

## Stories

- Story 1.1: Local Compose Runtime Baseline
- Story 1.2: Design Tokens and Route-Group Shells
- Story 1.3: User Model, Roles, and Admin Seed
- Story 1.4: Customer Registration
- Story 1.5: Sign In, Sign Out, Session Bootstrap, and Shared apiClient
- Story 1.6: Role-Aware Navigation and Route Guards

## Requirements & Constraints

- Roles: Guest (unauthenticated public browse), Customer (public Sign up only), Admin (seeded/provisioned only—never self-assigned).
- Sign up fields: full name, email, password, confirm password. Always create `CUSTOMER`. Reject duplicate email; reject weak passwords (baseline: ≥8 chars, ≥1 letter, ≥1 number); confirm must match.
- Shared Sign in for Customer and Admin (email + password). Success → landing. Invalid credentials → no session, stay on auth, generic “Invalid email or password” style message; clear password fields (email may stay).
- Sign out invalidates the session; nav returns to Guest set.
- Server enforces authz; FE guards are UX only. Admin APIs require `role == ADMIN` (not `is_staff` alone). Customers cannot open Admin routes.
- Passwords hashed only; never logged plaintext. Admin credentials via env/seed—not committed.
- Sessions handled securely (HttpOnly cookie; Secure in production). Email verification / password reset / account recovery deferred.
- Shell UX: consistent, responsive, field-level validation messages, clear success/failure feedback. English MVP with externalized strings.
- Guests may browse public surfaces without auth; gated actions redirect to Sign in/up.
- Non-blocking assumptions: shadcn/ui + Tailwind kit; password policy baseline above; generic invalid-credentials copy.

## Technical Decisions

- Modular monolith: one React+Vite SPA, one Django+DRF API, one PostgreSQL DB, Nginx same-origin via Docker Compose (`frontend/`, `backend/`, `deploy/`).
- Stack baseline: Python ≥3.12, Django 6.1.x, DRF 3.x, Postgres 18.x, Node ≥20.19/≥22.12, React 19.x, Vite 8.x. `BUSINESS_TIMEZONE=Asia/Dhaka`. Secrets via env (`.env.example` only).
- URL namespaces: `/` public SPA; `/app/customer/*`; `/app/admin/*`; `/api/*`; `/media/*`; `/django-admin/*`. Nginx must not SPA-fallback `/api/*`, `/media/*`, or `/django-admin/*`.
- Auth endpoints: `POST /api/auth/register/`, `login/`, `logout/`; `GET /api/auth/me/`, `/api/auth/csrf/`. Session cookie: HttpOnly, SameSite=Lax, Secure in prod. CSRF cookie `csrftoken` (JS-readable); header `X-CSRFToken`. No JWT; no tokens in localStorage. Login rate-limit/lockout against repeated failures.
- User model: UUID PK, unique email, password hash, role `CUSTOMER|ADMIN`, plus `is_staff`/`is_superuser`. Seed invariant: `ADMIN` ⇒ `is_staff=True`; reject illegal role/staff matrices. Permission helpers are role-based.
- Backend apps for this epic: `accounts`, `common`, plus stub interfaces for `NotificationService` / `AuditService` (no domain events yet). Domain logic in services; thin views.
- Frontend: feature folders; layouts `PublicLayout`, `CustomerLayout`, `AdminLayout`; auth under `features/auth`. Exactly one shared `apiClient` owns `credentials: 'include'`, CSRF attach, 401 → session-expired handler, DRF error normalization. Bootstrap: call CSRF once at init; optional single CSRF refresh on 403 then fail closed. `/me/` returns `role`, `is_staff`, `is_superuser`; route guards key on `role` only.
- Deferred out of MVP: seats, Stripe, JWT, quotations, email/SMS, object storage, microservices, password recovery.

## UX & Interaction Patterns

- Brand: Tour Portal hero-capable on Landing; premium coastal light-only theme (sand canvas, lagoon primary, coral accent); Fraunces + Source Sans 3 tokens; Admin denser on same tokens.
- Chrome: Public/Customer top nav; Admin sidebar 240px on `lg+`, icon rail/sheet below; skip link + landmarks (header/nav/main/complementary). Prefer-reduced-motion: no decorative chrome motion.
- Nav sets: Guest — Explore · AI · Sign in · Sign up. Customer — add My bookings · Custom tours · Notifications · Sign out. Admin — sidebar only (“View site” optional).
- Auth flow: Sign up success → Customer session → Landing. Sign in → Landing. Failures stay on page with field/status errors, no session. Session expiry modal (“Your session ended.”) + Sign in; restore non-sensitive drafts later (hook ready). Permission denied → Customer home + status toast.
- A11y floor: WCAG 2.2 AA; two-tone focus on filled CTAs; forms use `aria-invalid` / described-by; password paste/autofill allowed; touch targets ≥24px (prefer 44px primary). Admin lists on tablet/phone: card → detail, not horizontal-only tables.
- Empty authenticated homes are placeholders; business feature UI lands in later epics.

## Cross-Story Dependencies

- Implement Stories 1.1 → 1.6 in order within this epic.
- 1.2 and 1.3 depend on Compose/backend baseline (1.1). Registration (1.4) needs shell + user/RBAC seed. Session/apiClient (1.5) needs accounts + register path. Nav/guards (1.6) need working session bootstrap.
- Epics 2–9 assume Epic 1 complete: shared client, RBAC, route groups, and Notification/Audit stubs ready for event emission.
- Critical test focus for this epic: Compose healthy; CUSTOMER-only registration + duplicate email reject; Customer denied on Admin APIs; CSRF on unsafe methods; no secrets in localStorage/repo.
