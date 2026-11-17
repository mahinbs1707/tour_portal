---
title: '6.3 Reject Booking with Mandatory Reason'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'af64e024976d7d2544979f6ceff2ff8a15471f1d'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-2-approve-booking-and-open-payment-window.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-1-admin-bookings-list-filter-and-detail.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins can approve PENDING bookings (6.2) but cannot reject them with a persisted reason, so Customers never see why a request was denied and the booking stays PENDING.

**Approach:** Add Admin reject API + alertdialog with required reason: `BookingService.reject` atomically sets `REJECTED` + `rejection_reason`, leaves the existing `PaymentWindow` as `NOT_OPEN` (never opens), records audit `booking.reject`, and notifies `booking.rejected` (payload includes reason). Expose the reason on Customer (and Admin) detail. Empty/whitespace reason is blocked FE and BE.

## Boundaries & Constraints

**Always:**
- Admin-only (`IsAdminRole` + CSRF); only `PENDING` may be rejected.
- Persist non-empty trimmed `rejection_reason`; empty/whitespace blocked (400 / FE disable or field error).
- Existing PaymentWindow stays `NOT_OPEN`; do **not** call `open_window_for_booking` or write PaymentWindow ORM from bookings.
- Same atomic block: status + reason + `AuditService` `booking.reject` + `NotificationService` `booking.rejected` (reason in payload).
- Admin detail: Reject control only when `PENDING`; confirm UX is an **alertdialog** with required reason field (UX-DR8).
- **After success (1A):** Stay on Admin detail; refresh live status; show persisted reason; Approve/Reject controls disappear.
- **Reason max length (2A):** Cap at **2000** characters (same as booking `additional_requirements`); FE and BE enforce.
- Customer booking detail shows rejection reason when status is `REJECTED`; checkout/Pay remain unavailable.
- Serialize `rejection_reason` on Admin + Customer detail responses.
- i18n; errors `role="alert"`; success `role="status"`.

**Never:** Change approve/open-window (6.2); reopen/extend (6.4); Customer Pay/checkout (Epic 7); invent traveler max; seats/Stripe/JWT/email/SMS; open or expire the window on reject.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Reject OK | PENDING + non-empty reason | REJECTED; reason stored; window NOT_OPEN; audit+notif with reason | N/A |
| Empty reason | PENDING + blank/whitespace | No change | FE blocks; BE 400 |
| Not PENDING | APPROVED/REJECTED/CANCELLED | No change | 409 |
| Customer detail | Own REJECTED booking | Reason visible; no Pay | N/A |
| Customer/guest Admin API | Non-admin | Denied | 403 / auth guard |

</frozen-after-approval>

## Code Map

- `backend/bookings/services.py` — `reject` mirroring `approve` without PaymentService open; `BookingNotRejectable`.
- `backend/bookings/admin_views.py` + `urls.py` — `POST /api/bookings/admin/<uuid>/reject/` with reason body.
- `backend/bookings/serializers.py` — include `rejection_reason` on detail/Admin serializers (create response may stay without it or include empty).
- `frontend/.../AdminBookingDetailPage.jsx` — Reject + reason alertdialog (extend ConfirmDialog or small dedicated dialog); `rejectAdminBooking`.
- `frontend/.../BookingDetailPage.jsx` — show reason when REJECTED.
- Continuity: 6.1 detail; 6.2 Approve pattern; model field already exists.
- Do not change: `PaymentService.open_window_for_booking`; approve path; customer cancel rules beyond showing reason.

**Agent decisions:** Prefer `POST .../reject/` JSON `{ "rejection_reason": "..." }`; 409 non-PENDING; 400 empty/too-long reason; max_length 2000 (2A); FE stays on detail after success (1A); vitest + APITestCase; no 7-day check on reject (epics do not require it).

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookings` — reject service/API + audit/notif + reason validation; window unchanged -- FR-BOOK-17*; FR-NOTIF-03; AD-17/22
- [x] `frontend` Admin reject dialog + Customer/Admin reason display + API/messages -- FR-AB-05*; UX-DR8
- [x] Tests — empty blocked; happy path; window NOT_OPEN; Customer sees reason; 409/403 -- Story 6.3 AC

**Acceptance Criteria:**
- Given PENDING, when Admin rejects without a reason, then the action is blocked
- Given PENDING, when Admin rejects with a reason, then status is REJECTED, reason is visible to the Customer, notification includes reason, and checkout remains unavailable

## Implementation Notes

- `BookingService.reject(admin, booking_id, reason)`: trims/validates reason (blank 400, >2000 400) → lock → PENDING check (409 `BookingNotRejectable`) → status + `rejection_reason` → audit `booking.reject` → notif `booking.rejected` (reason in payload), one `transaction.atomic`. PaymentWindow untouched (no `PaymentService` call).
- `POST /api/bookings/admin/<uuid>/reject/` body `{rejection_reason}`; returns Admin detail shape. `rejection_reason` now on `BookingDetailSerializer` (Customer list/detail + Admin); create response unchanged.
- FE: Reject button + alertdialog (`ConfirmDialog` gained optional `children` / `initialFocusRef`) with required reason textarea (maxLength 2000, blank/too-long blocked client-side, server field error keeps dialog open); stays on detail (1A); Admin and Customer detail show the reason when `REJECTED`.
- Tests: `test_admin_booking_reject_api.py`; `AdminBookingReject.test.jsx`; updated 6.2-era FE test that asserted Approve was the only button.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Empty reason blocked FE+BE; happy path REJECTED + reason + window NOT_OPEN | — | accept | `test_admin_booking_reject_api.py` + `AdminBookingReject.test.jsx` |
| Customer detail shows reason when REJECTED | — | accept | BookingHistory tests + serializer field |
| Stay on Admin detail after reject (1A); max 2000 (2A) | — | accept | Matches frozen Always |
| Esc during in-flight reject closes dialog (approve parity) | low | defer | Same pattern as 6.2 Approve dialog |
| select_for_update untested on SQLite | low | defer | Same as 6.2 Postgres lock defer |

## Verification

**Commands:**
- `cd backend && python manage.py test bookings` — expected: OK
- `cd frontend && npm test -- --run` covering Admin reject + Customer detail reason — expected: OK
