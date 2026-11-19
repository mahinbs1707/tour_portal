---
title: '7.2 Pay Now Gating and Mock Checkout UI'
type: 'feature'
created: '2026-11-17'
status: 'approved'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: ''
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-1-paymentprovider-mock-and-payment-attempt-api.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-3-booking-confirmation-history-detail-and-cancel-pending.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Customers cannot reach mock checkout even when the attempt API and eligible window exist; Pay now is hidden everywhere, so FR-PAY-05/07/10c and UX Flow 5 climax are unmet.

**Approach:** Expose **payment eligibility** on Customer booking detail, show **Pay now** only when eligible, add a **full-page mock checkout** (no card fields) with success/failure/cancel simulate buttons calling `POST .../payments/attempt/`, then return to detail with refreshed chips — countdown, offline guard, and aria-live deadline polish stay in Story 7.3.

## Boundaries & Constraints

**Always:**
- **Pay now** visible iff server says `payment_eligible === true` (same rules as 7.1: `APPROVED`, window open, future deadline, no SUCCESS).
- Hidden when `payment_status === SUCCESS` or ineligible (PENDING, REJECTED, CANCELLED, `NOT_OPEN`, past deadline, etc.).
- Checkout route under Customer shell; prominent mock legend (AD-6 / UX-DR16): no real charges.
- Three simulate actions map 1:1 to API outcomes `SUCCESS`, `FAILED`, `CANCELLED`.
- No card inputs, Stripe, or provider secrets.
- Booking / payment / window **separate chips** on detail and post-checkout (UX-DR6, FR-PAY-10c).
- Error handling: 403/409 from attempt API surfaced with `role="alert"`; generic 5xx/outcome-unknown refresh pattern (matches 5.3 / 6.2).
- i18n strings in `messages.js`; Customer auth + CSRF via existing `apiRequest`.
- My bookings list, confirmation page: **no Pay** (detail-only entry unless decided otherwise).

**Never:** New payment APIs beyond 7.1 attempt; Admin UI changes; countdown `aria-live`; offline Pay block (7.3); Pay on ineligible states; change create/cancel booking flows.

## I/O & Edge-Case Matrix

| Scenario | UI | Expected |
|----------|-----|----------|
| APPROVED + OPEN + eligible + UNPAID/FAILED | Detail | Pay now → checkout |
| SUCCESS | Detail | Pay hidden |
| Simulate SUCCESS | Checkout | 201 → detail refreshed, Pay hidden |
| Simulate FAILED/CANCELLED | Checkout | 201 → detail shows new payment chip; Pay still visible if still eligible |
| 409 second SUCCESS | Checkout | Alert; navigate back or refresh detail |
| Ineligible deep-link to checkout | Checkout | Block with message + back link |

</frozen-after-approval>

## Decisions (Checkpoint 1)

- **1A** — `payment_eligible` + `payment_window_deadline_at` on Customer detail API.
- **2A** — `/app/customer/bookings/:id/pay` (`MockCheckoutPage`).
- **3A** — Redirect to detail with pay-success message after SUCCESS.
- **4A** — Pay visible while still `payment_eligible` after FAILED/CANCELLED.

## Code Map

- `backend/bookings/serializers.py` — Customer detail fields if 1A.
- `frontend/src/features/bookings/` — `canPayNow(booking)` helper; `BookingDetailPage` Pay CTA; `MockCheckoutPage.jsx`; `bookingsApi.submitPaymentAttempt`.
- `frontend/src/App.jsx` — customer route `bookings/:id/pay`.
- `frontend/src/i18n/messages.js` — checkout copy + mock legend.
- Tests: `BookingDetailPage` / `MockCheckoutPage` / route tests; extend `BookingHistory.test.jsx` Pay gating.

## Tasks & Acceptance

**Execution:**
- [x] BE Customer detail eligibility fields (if 1A)
- [x] FE gating + checkout page + API client
- [x] Vitest matrix for show/hide Pay + mock-only checkout

**Acceptance Criteria:** (epics.md 7.2 — Pay shown when APPROVED/OPEN/UNPAID eligible; hidden after SUCCESS; mock-only checkout)

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd backend && python manage.py test bookings payments` — expected OK
- `cd frontend && npm test -- --run src/features/bookings` — expected OK