---
title: '6.2 Approve Booking and Open Payment Window'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8177f703e83aa555da545f44b62534140817fbda'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-1-admin-bookings-list-filter-and-detail.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins can view bookings (6.1) but cannot approve a PENDING request or open its existing `NOT_OPEN` payment window, so Customers never become payment-eligible for Epic 7.

**Approach:** Add Admin approve API + UI confirm: `BookingService.approve` in one atomic transaction updates booking to `APPROVED`, calls `PaymentService.open_window_for_booking` to update the **same** window to `OPEN` with `deadline_at = approval_timestamp + 24h`, records audit `booking.approve` and notifies `booking.approved` — blocked when the tour date fails the 7-day Asia/Dhaka rule at approval time.

## Boundaries & Constraints

**Always:**
- Admin-only (`IsAdminRole` + CSRF); only `PENDING` bookings may be approved.
- Exactly one `PaymentWindow` per booking: **update** existing `NOT_OPEN` → `OPEN`; never insert a second row; never write `PaymentWindow` ORM from `bookings` (AD-16).
- Payment remains `UNPAID`; set booking `approved_at` to the approval timestamp used for the window start.
- Window `deadline_at = approved_at + 24 hours`; set `opened_at` when opening.
- Re-check 7-day rule at approve time via packages validator; on failure reject with no status/window change.
- Same atomic block: status + window open + `AuditService.record(booking.approve)` + `NotificationService` `booking.approved` to the Customer.
- Admin detail: Approve only when `PENDING`; confirm dialog states that a 24h payment window starts on approve (UX-DR8).
- **After success (1A):** Stay on Admin detail; refresh live booking/payment/window statuses; Approve control disappears.
- **Confirm dialog (2A):** Fixed copy only (24h payment window starts on approve) — no computed deadline preview in the dialog.
- i18n; errors `role="alert"`; success `role="status"`.

**Never:** Reject (6.3); reopen/extend (6.4); Customer Pay/checkout (Epic 7); create a second PaymentWindow; change Customer create/cancel contracts; invent traveler max; seats/Stripe/JWT/email/SMS; optional window-expiry notifications (OPEN-04).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Approve OK | PENDING + valid ≥7d date + NOT_OPEN window | APPROVED; same window OPEN; deadline +24h; UNPAID; audit+notif; window count=1 | N/A |
| 7-day fail | PENDING but tour date &lt;7d ahead at approve | No change; window stays NOT_OPEN | 400; clear message |
| Not PENDING | APPROVED/REJECTED/CANCELLED | No change | 409 |
| Customer/guest | Non-admin session | Denied | 403 / auth guard |
| Missing window | PENDING without window (corrupt) | No approve | 400/409; no insert |

</frozen-after-approval>

## Code Map

- `backend/payments/services.py` — add `open_window_for_booking` (update existing NOT_OPEN → OPEN; set opened_at/deadline_at; refuse wrong status / missing row).
- `backend/bookings/services.py` — `BookingService.approve` (PENDING only; `assert_bookable_date`; atomic approve + PaymentService + AuditService + NotificationService).
- `backend/bookings/admin_views.py` + `urls.py` — `POST /api/bookings/admin/<uuid>/approve/`.
- `backend/audit/services.py` / `notifications/services.py` — reuse; `booking.approved` already in MVP keys.
- `frontend/.../AdminBookingDetailPage.jsx` + `adminBookingsApi.js` + `ConfirmDialog` + `messages.js` — Approve CTA when PENDING.
- Continuity: 6.1 Admin detail; 5.1 NOT_OPEN window at create.
- Do not change: Customer bookings APIs; reject/reopen/extend; Pay UI.

**Agent decisions:** Prefer `POST .../approve/`; 409 for non-PENDING; 400 for 7-day / missing window; timezone-aware deadline from `django.utils.timezone.now()`; FE stays on detail and reloads after success (1A); dialog fixed copy only (2A); vitest + APITestCase including window row-count=1.

## Tasks & Acceptance

**Execution:**
- [x] `backend/payments` + `bookings` — open_window + approve service/API + audit/notif + 7-day guard -- FR-BOOK-15/16/21*; AD-16/17/22
- [x] `frontend` Admin detail Approve + ConfirmDialog + API client + messages -- FR-AB-04; UX-DR8
- [x] Tests — happy path; window count=1; 7-day block; non-PENDING 409; Customer 403; notif+audit -- Story 6.2 AC

**Acceptance Criteria:**
- Given PENDING + valid date + NOT_OPEN window, when Admin confirms approve, then APPROVED, UNPAID, same window OPEN with deadline = approval + 24h, window count stays 1, audit + `booking.approved` written
- Given tour date violates 7-day rule at approve time, when Admin attempts approve, then rejected and window stays NOT_OPEN

## Implementation Notes

- `PaymentService.open_window_for_booking(booking, *, opened_at)` locks + updates the existing row (raises `PaymentWindowMissing` / `PaymentWindowNotOpenable`); `BookingService.approve` does lock → PENDING check (409) → `assert_bookable_date` (400) → status+`approved_at` → window open → audit `booking.approve` → notif `booking.approved`, all in one `transaction.atomic`.
- `POST /api/bookings/admin/<uuid>/approve/` returns the Admin detail shape; 404 unknown, 409 not PENDING / window not `NOT_OPEN`, 400 7-day or missing window.
- FE: Approve button + `ConfirmDialog` (fixed copy) on `AdminBookingDetailPage`; stays on detail, applies response statuses.
- Updated 6.1 `test_admin_endpoints_are_read_only` (dropped the approve/ 404 probe) and the 6.1 FE "no controls" test (Approve now allowed on PENDING).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Approve happy path + window count=1 + 7-day block | — | accept | Covered by `test_admin_booking_approve_api.py` + PaymentService unit tests |
| Dialog shows reference, not deadline preview | — | accept | Matches frozen 2A; `{reference}` only |
| Stay on detail after approve | — | accept | Matches frozen 1A; FE applies response and hides Approve |
| `select_for_update` untested under SQLite | low | defer | Atomic rollback tested; Postgres lock verify later |
| Admin API omits `deadline_at` field | low | defer | In audit/notif payload; Customer Pay UX is Epic 7 |
| 6.1 read-only tests adjusted for approve route | — | accept | Intentional for 6.2 surface |

## Verification

**Commands:**
- `cd backend && python manage.py test bookings payments` — expected: OK
- `cd frontend && npm test -- --run` covering Admin bookings approve tests — expected: OK
