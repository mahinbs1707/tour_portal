---
title: '5.1 Booking Create API with 7-Day Rule (Asia/Dhaka)'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '287041637d26b8f6afdf5188aa60eab4b462e671'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Customers cannot submit catalog booking requests—there is no booking create API, no PENDING booking + NOT_OPEN payment window, and no `booking.submitted` notification on create.

**Approach:** Add `bookings` + `payments` domain pieces so an authenticated Customer can POST a valid booking for a published package / active available date ≥7 calendar days ahead (Asia/Dhaka), creating `PENDING` booking + exactly one `PaymentWindow` `NOT_OPEN` via `PaymentService` in one atomic transaction, with idempotent `booking.submitted` via `NotificationService`.

## Boundaries & Constraints

**Always:**
- Auth: authenticated **Customer** only (`IsCustomer`); Guest → 401/403. CSRF on session POST.
- Endpoint under `/api/bookings/` (create). Payload includes package id, available-date id (or date resolving to one), travelers (≥1 integer; **no max** — OPEN-02), contact name/email/phone, optional additional requirements.
- Validate: package **published**; date **active** AvailableDate for that package; date passes shared `packages` 7-day validator (`BUSINESS_TIMEZONE=Asia/Dhaka` / `assert_bookable_date` / `min_bookable_date`). Failures → 400; **no** booking or window row.
- On success inside `transaction.atomic`: Booking `PENDING` + human-visible **reference**; call `PaymentService` to create **exactly one** `PaymentWindow` with `NOT_OPEN` (unique `booking_id`); payment `UNPAID` / checkout unavailable; emit `booking.submitted` via `NotificationService` only (same transaction).
- **Reference (display/lookup, not an auth secret):** opaque short code derived from the booking UUID — **8–12 uppercase hex**; DB **unique** on `reference`; full UUID remains PK; on the extremely unlikely collision, regenerate/retry. No sequence table.
- Never write `PaymentWindow` ORM from `bookings` (AD-16). Concurrent bookings same date allowed (no seats).
- Notification idempotency: unique `(event_key, entity_type, entity_id, recipient_id)` — retry must not duplicate `booking.submitted`.

**Never:** FE booking form/review/auth-return (5.2); cancel/history/detail (5.3); open window / approve (Epic 6); mock checkout/Pay UI (Epic 7); invent traveler max; seats/capacity; JWT/Stripe/email/SMS; hard-delete AvailableDate; sequential/date-prefixed reference generators.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Happy path | Customer + published + date ≥7d | 201 booking PENDING + unique opaque hex reference; 1 window NOT_OPEN; payment UNPAID; notif created | N/A |
| Retry notif identity | Same booking.submitted key again | No duplicate notification | Idempotent create |
| Date within 7 days | Active date < min_bookable | 400; no booking/window | Asia/Dhaka calendar rule |
| Unpublished / inactive date | Draft pkg or inactive date | 400; no rows | N/A |
| Guest | Unauthenticated | 401/403 | N/A |
| Travelers invalid | 0 / negative / non-int | 400 on travelers | No invented max |
| Missing required contact fields | Blank name/email/phone | 400 field errors | N/A |

</frozen-after-approval>

## Code Map

- New: `backend/bookings/` — models (`Booking` statuses), `BookingService.create`, serializers, views, urls, tests
- New: `backend/payments/` — `Payment` (UNPAID…), `PaymentWindow` (NOT_OPEN…), `PaymentService.create_not_open_for_booking` (only writer of windows)
- `backend/notifications/` — upgrade stub → persist notifications + unique idempotency; keep `NotificationService.create` API
- Reuse: `packages.validators` (`assert_bookable_date`, `min_bookable_date`); `packages.services.get_published` / AvailableDate; `common.permissions.IsCustomer`; `AuditService` if AD requires on create (check spine — prefer record if pattern exists)
- Wire: `INSTALLED_APPS`, `config/urls.py`
- Continuity: Epic 3 published + dates; FE `/app/bookings/new` stays Placeholder until 5.2
- Do not change: Explore/Admin package APIs; recommendations; FE booking UX

**Agent decisions:** `POST /api/bookings/`; travelers `IntegerField(min_value=1)` no max; resolve AvailableDate by id belonging to package; UUID PKs; reference = 12 uppercase hex from UUID (unique + collision retry); PaymentService creates window (+ UNPAID payment row if model requires); prefer APITestCase + atomic failure tests.

## Tasks & Acceptance

**Execution:**
- [x] `backend/payments` — Payment + PaymentWindow + PaymentService NOT_OPEN create (unique booking_id) -- AD-9/16
- [x] `backend/bookings` — Booking model + BookingService.create + POST API + 7-day/published guards -- FR-BOOK / AD-7/8/20
- [x] `backend/notifications` — persist + idempotent `booking.submitted` -- AD-17; FR-NOTIF-01
- [x] Tests — happy path; <7d reject; guest deny; unpublished; unique window; notif idempotent -- Story 5.1 AC

**Acceptance Criteria:**
- Given authenticated Customer + published package + available date ≥7 calendar days ahead (Asia/Dhaka), when I POST a valid booking, then booking is `PENDING` with a reference, exactly one `PaymentWindow` is `NOT_OPEN`, payment is `UNPAID`, and `booking.submitted` is created via NotificationService in the same transaction
- Given the same successful booking’s `booking.submitted` is recorded again with the same idempotency identity, then no duplicate notification is created
- Given a selected date within the next 7 calendar days in Asia/Dhaka, when I submit, then the backend rejects with no booking/window rows

## Implementation Notes

- `bookings` + `payments` apps; `POST /api/bookings/`; opaque 12-char hex reference; Notification persistence + idempotency.
- Review patches: notif None raise; reference IntegrityError scoping; payment_window DoesNotExist; travelers validator; requirements max_length; Admin + cross-package tests.

## Spec Change Log

- 2026-11-16 — Implemented Story 5.1; review patches applied; tasks complete.

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Payment amount ignores travelers | low | defer | AC requires UNPAID snapshot; no product rule to multiply base_price × travelers in 5.1 |
| Notification IntegrityError → None | high | patch | `.first()` can be None; booking still commits |
| IntegrityError always treated as ref collision | medium | patch | masks non-reference DB failures |
| getattr payment_window raises DoesNotExist | medium | patch | reverse OneToOne descriptor raises |
| get_payment_status uses oldest payment | low | defer | only one UNPAID row in 5.1; revisit Epic 7 |
| Payment not unique on booking | false | reject | intentional multi-attempt ledger for later epics |
| travelers=0 possible at DB | medium | patch | PositiveIntegerField allows 0; add MinValueValidator |
| additional_requirements unbounded | medium | patch | add max_length on serializer |
| contact_phone format | low | reject | MVP non-empty + max_length enough |
| Admin not denied in API tests | medium | patch | verification-gap |
| cross-package available_date untested | medium | patch | verification-gap |
| mark_read untested | low | reject | not in 5.1 create AC |
| idempotency_key fallback untested | low | reject | create path uses entity_type+id |
| no payment URLs | false | reject | intentional; create via PaymentService only |
| BookingService skips role check | false | reject | view enforces IsCustomer |
| TOCTOU package/date after check | medium | defer | rare race; select_for_update later if needed |
| AC claim silent missing notif | high | patch | same root as IntegrityError→None |

## Verification

**Commands:**
- `DJANGO_USE_SQLITE=1 … manage.py test bookings payments notifications packages.tests` — expected: OK; 7-day + isolation cases green
