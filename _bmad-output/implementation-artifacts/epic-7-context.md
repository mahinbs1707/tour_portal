# Epic 7 Context: Mock Payment Checkout

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let Customers complete **mock** checkout against eligible approved bookings: record payment attempts separately from booking status, enforce **one SUCCESS payment per booking** at the DB layer, surface Pay now only when eligible, and polish retry/countdown/offline UX — without real card data or Stripe.

## Stories

- Story 7.1: PaymentProvider Mock and Payment Attempt API
- Story 7.2: Pay Now Gating and Mock Checkout UI
- Story 7.3: Retry, Countdown Accessibility, and Offline Pay Guard

## Requirements & Constraints

- Eligibility: booking `APPROVED`, payment-window `OPEN` (or operable per deadline rules), `now < deadline_at`, no existing `SUCCESS` payment (deadline-authoritative; Epic 6 reopen/extend).
- `PaymentProvider` abstraction; MVP `MockPaymentProvider` only (AD-6). `PaymentService` owns eligibility, attempts, and window writes (AD-16).
- Each attempt is a **payment row** linked to the booking (FR-PAY-03); booking stays `APPROVED` on success (FR-PAY-08).
- Mock outcomes: `SUCCESS`, `FAILED`, `CANCELLED` (FR-PAY-02). No real card fields (FR-PAY-04).
- **One SUCCESS per booking**: transactional locking + uniqueness — concurrent/repeated SUCCESS must not create two successes (Story 7.1 AC, AD-14).
- Ineligible states (`PENDING`, `REJECTED`, `CANCELLED`, wrong window, past deadline): API rejects; no SUCCESS row (FR-PAY-10a/10b).
- Notifications: `payment.success`, `payment.failed` via `NotificationService` (Story 7.1 scope); optional expiry notification remains OPEN-04 / out of scope.
- Customer APIs: ownership-scoped session auth + CSRF (AD-2, AD-3). Booking vs payment vs window remain separate fields in responses (FR-PAY-10c, UX-DR6).
- 7.2 adds full-page mock checkout + Pay now gating (FR-PAY-05, 07, 10c; UX-DR6/7/16). 7.3 adds retry, `aria-live` countdown, offline guard (FR-PAY-01g; UX-DR11/12).

## Technical Decisions

- Reuse `payments/eligibility.py` from Story 6.4 (`is_payment_eligible` / `assert_payment_eligible`).
- Initial UNPAID row created at booking submit (Epic 5); Epic 7 clarifies whether attempts **append new rows** or update the ledger — see Story 7.1 spec decision.
- Partial unique constraint (or equivalent) on `(booking_id)` where `status = SUCCESS` for SQLite/Postgres under migration.
- Audit/notifications in same `transaction.atomic` as attempt commit where required (AD-17, AD-22 patterns from Epic 6).
- Deferred: latest-payment-in-list serializers (`deferred-work.md`); Stripe; window expiry push (OPEN-04).

## UX & Interaction Patterns

- Separate chips for booking / payment / window everywhere (UX-DR6). Pay hidden until eligible (7.2).
- Mock checkout page: legend “Mock payment — no real charges” (AD-6, UX-DR16).
- Simulate success / failure / cancel as labeled controls (FR-PAY-05).
- Countdown with polite `aria-live` updates ~1/min while window OPEN (7.3).

## Cross-Story Dependencies

- **Epic 6:** Admin approve/open window, eligibility helper, reopen/extend — must be in place before 7.1.
- **Within epic:** 7.1 → 7.2 → 7.3.
- **Epic 5:** Booking create + initial UNPAID payment row + customer booking APIs.