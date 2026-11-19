---
title: '7.1 PaymentProvider Mock and Payment Attempt API'
type: 'feature'
created: '2026-11-17'
status: 'approved'
baseline_commit: '0e193ab'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: ''
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-4-reopen-and-extend-payment-window.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Customers have no API to record mock payment attempts against eligible bookings; the single UNPAID row from booking create cannot represent FAILED/CANCELLED retries or enforce one SUCCESS per booking under concurrency.

**Approach:** Add `PaymentProvider` + `MockPaymentProvider`, extend `PaymentService` with attempt recording, expose a Customer-scoped **payment attempt API** using `assert_payment_eligible`, DB uniqueness for one SUCCESS per booking, and in-app `payment.success` / `payment.failed` notifications — **no checkout UI** (Story 7.2).

## Boundaries & Constraints

**Always:**
- Customer owns booking; session + CSRF (AD-2, AD-3).
- Eligibility via shared helper (6.4): `APPROVED`, window operable, `now < deadline_at`, no `SUCCESS` payment yet.
- Mock provider only; `provider=MOCK`; optional `attempt_reference` / external id fields reserved (FR-PAY-13).
- Attempt outcomes: `SUCCESS`, `FAILED`, `CANCELLED`; booking status unchanged on all outcomes.
- SUCCESS: at most one per booking — partial unique constraint + `select_for_update` on booking/payment in one atomic block.
- Repeat/concurrent SUCCESS: second request rejected or idempotent (no second SUCCESS row).
- Ineligible attempt: 403/409/400 with no new SUCCESS; FR-PAY-10a/10b.
- Notifications: `payment.success` on SUCCESS; `payment.failed` on FAILED (same transaction as persist); CANCELLED notification TBD (Open Question).
- No Pay now UI, no countdown, no offline guard in this story.

**Never:** Real card fields; Stripe; change Admin booking flows; window reopen/extend; Customer deadline display beyond existing serializers (7.2); OPEN-04 expiry notifications; invent traveler max.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected | Error |
|----------|-------|----------|-------|
| Eligible SUCCESS | APPROVED + OPEN + future deadline | One SUCCESS row; notif success | — |
| Repeat SUCCESS | Second SUCCESS | No second SUCCESS row | 409 or idempotent 200 with same payment |
| Concurrent SUCCESS | Two parallel requests | ≤1 SUCCESS committed | Other rejects cleanly |
| FAILED / CANCELLED | Eligible + outcome | New attempt row; booking APPROVED | — |
| Ineligible | PENDING / past deadline / EXPIRED | Rejected | 403/409 |
| Wrong customer | Other user's booking | Denied | 403 |

</frozen-after-approval>

## Decisions (Checkpoint 1)

- **1A** — `POST /api/bookings/<uuid>/payments/attempt/` + `{ "outcome" }`.
- **2A** — New `Payment` row per attempt; `payment_status` = latest attempt.
- **3A** — **409** when SUCCESS already exists.
- **4A** — No notification on `CANCELLED`.

## Code Map

- `backend/payments/providers/` — `PaymentProvider` protocol + `MockPaymentProvider`.
- `backend/payments/services.py` — `record_mock_attempt` (or similar); uses eligibility + provider.
- `backend/payments/models.py` — migration: partial unique `SUCCESS` per booking if not present.
- `backend/payments/views.py` + urls — Customer attempt endpoint.
- `backend/bookings/serializers.py` — optionally switch `get_payment_status` to **latest** attempt (agent decision if 1A ledger).
- Continuity: `payments/eligibility.py`, booking create UNPAID row.

## Tasks & Acceptance

**Execution:**
- [x] Provider + `PaymentService` attempt path + DB constraint + notifications
- [x] Customer attempt API + ownership tests + concurrency tests (AD-14)
- [x] Serializer latest-payment status if multi-row ledger

**Acceptance Criteria:** (from epics.md Story 7.1 — eligible SUCCESS, repeat/concurrent guard, ineligible reject)

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd backend && python manage.py test payments bookings` — expected OK
- Concurrent SUCCESS test included in payments suite