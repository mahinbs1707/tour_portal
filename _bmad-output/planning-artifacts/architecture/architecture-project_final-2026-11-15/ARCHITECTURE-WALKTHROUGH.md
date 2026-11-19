# Tour Portal — Architecture Walkthrough

**Audience:** reviewers, supervisors, and stakeholders  
**Companion:** `ARCHITECTURE-SPINE.md` (builder contract)  
**Status:** implementation-baseline companion · 2026-11-15  
**Spine:** `ARCHITECTURE-SPINE.md` v1.0

## What we are building

Tour Portal is a web product where guests explore tours, customers book and request custom trips, and admins approve work and oversee mock payments. Product rules (who may pay when, status labels, 7-day advance booking) live in the PRD/BRD/UX docs. This note explains **how the software is put together**.

## Big picture

Three user-facing areas share **one React website** and talk to **one Django API**, which stores everything in **one PostgreSQL database**.

| Area | Who | Path |
|---|---|---|
| Public site | Anyone | `/` |
| Customer area | Signed-in customers | `/app/customer/*` |
| Admin console | Seeded admins | `/app/admin/*` |
| JSON API | Browser (same site) | `/api/*` |
| Django staff admin | Operators (optional) | `/django-admin/*` |

Frontend and backend are separate codebases, but users hit them through the **same website origin** (via Nginx in local Docker). That lets the browser keep a secure login **session cookie** instead of storing tokens in JavaScript storage.

## Why this shape

- **One SPA** keeps MVP delivery simple; Public / Customer / Admin are route groups and layouts, not three products.
- **Modular Django apps** (`accounts`, `packages`, `bookings`, `payments`, …) keep booking and payment rules from scattering, without microservices.
- **Session + CSRF** matches a browser-first MVP; JWT can be added later for mobile without redesigning domains.
- **Mock payments** behind a `PaymentProvider` interface prove checkout UX now and leave a clean slot for Stripe later.
- **Docker Compose locally** proves same-origin login early; cloud choice is deferred on purpose.

## How a booking gets paid (architecture view)

1. Customer submits a booking → API creates booking `PENDING` (no pay).
2. Admin approves → API sets booking `APPROVED`, opens payment window (24h from approval).
3. Customer pays via mock provider → payment `SUCCESS`; booking stays `APPROVED`.
4. Booking status, payment status, and payment window stay **separate** fields forever.

Rejection requires a reason. Reopening payment does **not** silently add 24 hours; extending the deadline is an explicit admin action.

## What builders must not break

Summarized from the spine (`AD-1` … `AD-24`, v1.1):

1. Do not split into microservices or dual frontends for MVP.  
2. Do not replace session auth with JWT for MVP.  
3. Do not trust React routes alone for security (`role` only for FE guards).  
4. Do not put complex workflows only in API views — use domain services.  
5. Do not merge payment window `EXPIRED` into payment transaction status.  
6. Do not add custom-tour quotations, seat capacity/availability, or real card charging in MVP.  
7. Do not lock the design to one cloud vendor in the architecture itself.  
8. Enforce payment deadlines and idempotent payment attempts on the backend.  
9. Only `payments` writes `PaymentWindow`; approve calls `PaymentService` inside one transaction.  
10. Only `NotificationService` / `AuditService` write those rows (closed catalogs).  
11. AI recommendations ground on published packages only and must not break browse/search.  
12. One shared frontend `apiClient` owns CSRF/session handling.

## Stack (current seed)

Verified mid-November 2026: React 19.3 + Vite 8.3 + React Router 7.18, Django 6.1 + DRF 3.18, PostgreSQL 18, Node ≥20.19/≥22.12, psycopg3. Exact pins live in lockfiles once the repo is scaffolded.

## Where to go next

- **Builders / AI agents:** follow `ARCHITECTURE-SPINE.md`.  
- **Product behavior:** `docs/tour-portal/PRD.md` and UX spines under `_bmad-output/planning-artifacts/ux-designs/`.  
- **Stories / build:** `bmad-create-epics-and-stories` or `bmad-spec` to adopt this spine as a companion.
