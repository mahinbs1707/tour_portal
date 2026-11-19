---
title: '7.3 Retry, Countdown Accessibility, and Offline Pay Guard'
type: 'feature'
created: '2026-11-17'
status: 'approved'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: ''
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-2-pay-now-gating-and-mock-checkout-ui.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-1-paymentprovider-mock-and-payment-attempt-api.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After a failed or cancelled mock attempt, Customers lack clear retry guidance; there is no accessible countdown for the payment window; Pay/checkout still fire when offline; and expiry is not announced accessibly.

**Approach:** Add **retry affordances** (FAILED/CANCELLED + still eligible), a **polite `aria-live` countdown** (~1/min) on detail and checkout while the window is OPEN with a future deadline, **block Pay + simulate actions when offline** (banner + disabled controls), and **one-time EXPIRED / pay-unavailable announcement** when the deadline passes or window is `EXPIRED` — building on 7.1/7.2 without new APIs.

## Boundaries & Constraints

**Always:**
- Retry = existing Pay now + checkout flow while `payment_eligible` and window operable (FR-PAY-01g); verify FAILED → SUCCESS path in tests.
- Countdown source: `payment_window_deadline_at` from Customer detail API (UX-DR12): `aria-live="polite"`, `aria-atomic="true"`, announce on mount + ~every 60s.
- Visible countdown copy on detail (and checkout if in scope) using Asia/Dhaka–consistent formatting (reuse `formatSubmittedAt` / new `formatTimeRemaining`).
- Offline: `navigator.onLine` + `online`/`offline` events; when offline, disable Pay link and checkout simulate buttons; show blocking banner (UX-DR11); no attempt POST while offline.
- When deadline elapsed or `payment_window_status === EXPIRED` (or eligibility false due to past deadline): announce pay unavailable **once per page visit**; hide/disable Pay.
- Failed/cancelled payment chip remains; optional short retry hint copy on detail (i18n).
- No new backend endpoints; optional lightweight detail **reload on countdown boundary** only if Open Question selects polling.

**Never:** Stripe; new payment rules; Admin changes; OPEN-04 expiry notifications; booking submit offline guard (unless explicitly widened); change 7.1 attempt contract.

## I/O & Edge-Case Matrix

| Scenario | Expected |
|----------|----------|
| FAILED + eligible + OPEN | Pay visible; checkout SUCCESS → Pay hidden |
| OPEN + future deadline | Live region mounts with remaining time; updates ~1/min |
| Offline on detail | Pay disabled; banner visible |
| Offline on checkout | Simulate buttons disabled; banner visible |
| Past deadline / EXPIRED | One polite announce; Pay hidden |
| SUCCESS | No countdown; no Pay |

</frozen-after-approval>

## Decisions (Checkpoint 1 — user approved)

- **1A** — Countdown + `aria-live` on detail and checkout.
- **2A** — Offline guard on Pay path only (detail + checkout).
- **3A** — Client-only countdown; no polling.
- **4A** — Expired announce on past deadline, `EXPIRED`, or lost eligibility (once per visit).

## Code Map

- `frontend/src/features/bookings/` — `PaymentWindowCountdown.jsx` (live region); `useOnlineStatus.js`; offline banner; retry hint on `BookingDetailPage`; wire `MockCheckoutPage`.
- `frontend/src/i18n/messages.js` — countdown, offline, retry, expired announce strings.
- Tests: vitest for live region tick (fake timers), offline disables Pay/simulate, FAILED→SUCCESS retry; optional a11y assertions.

## Tasks & Acceptance

**Execution:**
- [x] Countdown component + mount/minute updates
- [x] Offline guard on Pay + checkout
- [x] Retry copy + tests (FAILED → SUCCESS)
- [x] EXPIRED one-shot announcement

**Acceptance Criteria:** epics.md Story 7.3 (retry SUCCESS, countdown a11y, offline block implied by UX-DR11)

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd frontend && npm test -- --run src/features/bookings` — expected OK
- `cd backend && python manage.py test bookings payments` — regression OK (no BE change unless poll chosen)