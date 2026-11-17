---
title: '6.1 Admin Bookings List, Filter, and Detail'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ad8f6f16ba12866969da8d190bf19bd43301ea85'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-3-booking-confirmation-history-detail-and-cancel-pending.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-retro-2026-11-17.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/app/admin/bookings` is still a Placeholder, so Admins cannot list, filter, or inspect booking requests (customer, package, travel date, travelers, requirements, separate booking/payment/window statuses) before Stories 6.2–6.4 add decisions.

**Approach:** Add Admin-only list (filter by booking status, paginated) and detail APIs plus Admin UI that replaces the Placeholder with a card-list + detail view reusing Epic 5 status chips — read-only for decisions (no approve/reject/window controls yet).

## Boundaries & Constraints

**Always:**
- Admin session + CSRF; `IsAdminRole` only on Admin booking endpoints (Customers get 403).
- List: all bookings; filter by booking `status`; DRF pagination (AD-11); card-row Admin list chrome (UX-DR5).
- **Default filter (1A):** initial list load has **no status filter** (all bookings); Admin may choose a status filter afterward.
- Detail: reference, customer identity, package title, travel date, travelers, requirements, submission time, **separate** Booking / Payment / Window statuses (UX-DR6).
- **Customer identity (2A):** detail shows account **full name + email**, and also the booking contact name/email/phone fields already on the row.
- UUID `id` in Admin FE routes and API paths; `reference` is human-facing label only.
- i18n via `messages.js`; load errors `role="alert"`; empty/filter-empty states.

**Never:** Approve/reject; open/reopen/extend payment window; write `PaymentWindow` from bookings; Customer checkout/Pay; change Customer `GET/POST /api/bookings/` or cancel contracts; invent traveler max (OPEN-02); seats/Stripe/JWT/email/SMS.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| List all | Admin authenticated | Paginated rows; statuses separate; no decision CTAs | Empty state if none |
| Filter PENDING | `?status=PENDING` | Only PENDING rows | Invalid status → 400 |
| Detail | Admin + booking id | Full fields + three statuses | 404 missing |
| Customer hits Admin API | Customer session | Denied | 403 |
| Guest hits Admin UI | Unauthenticated | Sign-in / guard redirect | Existing RequireAuth |

</frozen-after-approval>

## Code Map

- `backend/bookings/` — new Admin list/detail views + urls (mirror `packages/admin/` separation); reuse `_owned_bookings` select/prefetch pattern without customer filter; extend serializer with `package_title` + customer fields per Open Question; do not alter Customer list/create/detail/cancel.
- `backend/common/permissions.py` — reuse `IsAdminRole`; `CsrfSessionAuthentication`.
- `frontend/src/App.jsx` — replace Admin bookings Placeholder; add `/app/admin/bookings/:id`.
- `frontend/src/features/` — Admin bookings list/detail pages + API client; reuse `BookingStatusChips`, `formatSubmittedAt`, Admin packages card/filter/pagination patterns (`AdminPackagesPage`).
- Continuity: Epic 5 booking model/response fields; Epic 5 retro open items (idempotency etc.) out of scope here.
- Do not change: Customer bookings UI/APIs; PaymentService writers; notifications/audit for decisions (6.2+).

**Agent decisions:** Prefer `/api/bookings/admin/` + `/api/bookings/admin/<uuid>/`; page size aligned with Admin packages; initial FE filter = All (1A); serializer exposes `customer_full_name` + `customer_email` (2A); Cancel/Pay/Approve buttons absent on Admin detail in 6.1; vitest + APITestCase.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookings/` — Admin list+detail API, status filter, pagination, ownership-free queryset, Customer 403 -- FR-AB-01…03; AD-11
- [x] `frontend` Admin bookings pages + App routes + messages + API client -- FR-AB-*; UX-DR5/6
- [x] Tests — filter PENDING; detail fields; Customer denied; empty states -- Story 6.1 AC

**Acceptance Criteria:**
- Given PENDING and APPROVED bookings exist, when Admin filters by PENDING, then only pending rows show and detail opens with required fields
- Given a Customer session, when they call Admin booking APIs, then access is denied
- Given Admin detail, when viewing a booking, then Booking / Payment / Window statuses appear as separate labels and no approve/reject/Pay controls are present

## Implementation Notes

- Admin `GET /api/bookings/admin/` + `/admin/<uuid>/`; page size 20; default no status filter; `AdminBookingSerializer` adds customer_full_name/email; Customer APIs untouched.
- FE `AdminBookingsPage` / `AdminBookingDetailPage` + App routes; reuses BookingStatusChips; no decision/Pay CTAs.
- Tests: `test_admin_booking_api.py`; `AdminBookings.test.jsx`; `AdminBookingRoutes.test.jsx`; bookings BE 42 OK; Admin FE 23 OK after review patches.
- Review patches: Retry last request + invalid-page fallback; empty name/detail placeholders; clear booking on load; remove dead page-size export; filter-from-page-2 + guest route tests.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Retry uses stale page after failed Next | medium | patch | lastRequested + Retry; 404 page>1 → page 1 |
| Filter reset-to-page-1 test never left page 1 | medium | patch | test goes Next then filters |
| Empty customer_full_name awkward label | low | patch | name omitted when blank |
| Detail flashes previous booking on id change | medium | patch | clear booking at load start |
| Blank detail fields empty dd | low | patch | statusNotAvailable placeholder |
| Dead ADMIN_BOOKING_LIST_PAGE_SIZE FE export | low | patch | removed |
| Guest AppRoutes admin bookings untested | medium | patch | sign-in redirect + no API call |
| Filter/page lost on Back (no URL state) | low | defer | MVP in-memory; revisit if triage friction |
| N+1 payments order_by bypasses prefetch | medium | defer | shared serializer; 20/page acceptable for now |
| Search by reference/customer | low | defer | out of 6.1 AC; later polish |
| Stale-response race tests | low | defer | generationRef present; hard to hit |
| a11y aria-live / plural copy | low | defer | polish |
| Invalid empty ?status= 400 | low | reject | FE never sends empty status param |
| PlaceholderPage orphan | false | reject | still used by other Admin routes |

## Verification

**Commands:**
- `cd backend && python manage.py test bookings` — expected: OK
- `cd frontend && npm test -- --run` covering new Admin bookings tests — expected: OK
