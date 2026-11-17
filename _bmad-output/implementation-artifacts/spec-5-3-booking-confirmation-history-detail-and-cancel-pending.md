---
title: '5.3 Booking Confirmation, History, Detail, and Cancel Pending'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e0eabdaf37344b9b93260e498289bcbe2b8f33b8'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-2-booking-form-review-and-auth-return.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After submit, confirmation is thin/client-only, `/app/customer/bookings` is still a Placeholder, and Customers cannot view owned booking history/detail or cancel while `PENDING` (no cancel API or `booking.cancelled` emission yet).

**Approach:** Add Customer-owned list/detail/cancel APIs (ownership enforced; cancel only while `PENDING` with `booking.cancelled` via `NotificationService`), replace the history Placeholder with list + detail (separate Booking / Payment / Window statuses; Pay hidden), wire cancel through the existing confirm-dialog pattern, and enrich confirmation so reference + PENDING / Window `NOT_OPEN` / Pay hidden match Epic 5 Flow 1b.

## Boundaries & Constraints

**Always:**
- Customer session + CSRF (`IsCustomer` / `CsrfSessionAuthentication`); own bookings only (404 for other customers’ ids).
- List/history and detail show: reference, package identity (title), travel date, travelers, submission time, and **separate** booking / payment / window status labels (never one merged chip).
- Cancel only when booking `status === PENDING`, after confirm dialog (alertdialog / focus trap / Esc); transition to `CANCELLED` + emit `booking.cancelled` in the same atomic block; second cancel rejected.
- Pay now stays hidden; checkout inaccessible; do not open or rewrite `PaymentWindow` from bookings (AD-16).
- Confirmation shows reference + Booking `PENDING`, Window `NOT_OPEN` context, Pay hidden (closes 5.2 thin-page deferral for history CTA).
- **Identity (1A):** API and FE detail routes use booking UUID `id`; `reference` is the human-facing label only (not the URL key).
- **Confirmation (2A):** Confirmation page fetches the booking (by id from create navigation and/or lookup) so refresh shows live Booking / Payment / Window statuses; Pay stays hidden.
- i18n via `messages.js`; errors `role="alert"`; success/status toasts `role="status"` where used.

**Never:** Admin approve/reject; open/extend payment window; mock Pay/checkout (Epic 7); seats; Stripe/JWT/email/SMS; change Story 5.1 `POST /api/bookings/` create contract; invent traveler max (OPEN-02); write `PaymentWindow` ORM from bookings; put opaque `reference` in API/FE path segments as the primary key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| History | Customer with bookings | Own rows only; statuses separate; Pay absent | Empty state if none |
| Detail | Own booking id | Full fields + three statuses; Cancel iff PENDING | 404 other owner / missing |
| Cancel OK | Own PENDING + confirm | `CANCELLED` + `booking.cancelled`; Cancel gone | N/A |
| Cancel blocked | APPROVED / CANCELLED / REJECTED | No status change | 400/409; no notif |
| Confirmation | Just submitted / refresh | Fetch live booking; reference + three statuses; Pay hidden | Missing id/ref soft recovery; load error + Retry |
| Guest / Admin | Hit customer booking routes | Denied / redirected by existing auth guards | N/A |

</frozen-after-approval>

## Code Map

- `backend/bookings/` — extend beyond create-only: `BookingService.cancel`; list/detail views; urls; extend/add serializers (`package_title`; keep `payment_status` / `payment_window_status` separate). Reuse `Booking`, `BookingStatus`, `BookingResponseSerializer`, `IsCustomer`, `CsrfSessionAuthentication`, `_validation_response`.
- `backend/notifications/services.py` — emit `booking.cancelled` (already in `MVP_EVENT_KEYS`); mirror `booking.submitted` idempotency key shape; do not change NotificationService public API shape.
- `backend/payments/` — read window/payment status only; **do not** write windows from cancel.
- `frontend/src/features/bookings/` — `listMyBookings` / `getBooking` / `cancelBooking`; history list page; detail page with Cancel + `ConfirmDialog`; enrich or keep confirmation per Open Question; tests.
- `frontend/src/features/packages/ConfirmDialog.jsx` — reuse for cancel confirm (UX-DR8).
- `frontend/src/App.jsx` — replace `/app/customer/bookings` Placeholder; add detail route; keep form/confirmation under `/app/bookings/…`.
- `frontend/src/i18n/messages.js` — history/detail/cancel/status/window labels.
- Continuity: 5.1 create + response fields; 5.2 form → confirmation CTA to My bookings; deferred “viewMyBookings → Placeholder”.
- Do not change: Explore/Admin package APIs; recommendations; Epic 6/7 payment open/checkout.

**Agent decisions:** List `GET /api/bookings/`, detail `GET /api/bookings/<uuid>/`, cancel `POST /api/bookings/<uuid>/cancel/`; FE `/app/customer/bookings` + `/app/customer/bookings/:id`; confirmation navigates with booking `id` (and may keep `reference` for display fallback) then GETs detail; card-row list chrome; separate labeled status chips; Cancel only on detail; no pagination MVP (`-created_at`); vitest + RTL + APITestCase.

## Tasks & Acceptance

**Execution:**
- [x] `backend/bookings/` — list + detail + cancel service/API + ownership + `booking.cancelled` -- FR-BOOK-18…20,22,24; FR-NOTIF-04; AD-17
- [x] `frontend/src/features/bookings/` + `App.jsx` + `messages.js` — history, detail, cancel dialog, confirmation enrichment, API clients -- FR-CUST-*; UX Flow 1b
- [x] Tests — own-only; cancel PENDING; block non-PENDING; Pay hidden; other-customer 404; notif on cancel -- Story 5.3 AC

**Acceptance Criteria:**
- Given I just submitted a booking, when I view confirmation and history detail, then I see reference and Booking `PENDING`, Pay now is hidden, and payment checkout is inaccessible
- Given my booking is PENDING, when I confirm cancel, then status becomes `CANCELLED`, I receive a cancellation notification, and I cannot cancel again
- Given another Customer’s booking id, when I request detail or cancel, then I do not see or change that booking

## Implementation Notes

- BE: list/detail/cancel on UUID; `BookingService.cancel` + `booking.cancelled` atomic; 409 for non-PENDING; create POST contract unchanged; history serializer adds `package_title`.
- FE: MyBookingsPage + BookingDetailPage + ConfirmDialog alertdialog; confirmation fetches by `?booking=`; form navigates with id+reference; Pay never rendered.
- Tests: `test_booking_history_cancel_api.py`; `BookingHistory.test.jsx`; confirmation rewrite; `BookingRoutes.test.jsx`; bookings suite OK; frontend bookings 48 OK after review patches.
- Review patches: confirmation note/404/reference; detail cancel reset + ambiguous cancel; list `-id` order; AppRoutes coverage; localized list errors.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Confirmation NOT_OPEN note for CANCELLED/REJECTED | medium | patch | note gated only on window status; cancel never clears NOT_OPEN |
| Confirmation load error hides referenceFallback | medium | patch | reference only in missing branch; error path omits it |
| Confirmation Retry on 404 | medium | patch | Retry always rendered on error; 404 cannot succeed |
| Detail cancelSuccess/error/confirm persist across `:id` | medium | patch | no reset on id change |
| Cancel network/timeout shows hard failure without refresh | medium | patch | non-ApiError → cancelGeneric; may have committed |
| List order_by only `-created_at` | low | patch | same-timestamp order nondeterministic; add `-id` |
| AppRoutes history/detail untested | medium | patch | verification-gap: page tests use private Routes |
| Confirmation 404 message untested | low | patch | only 500 error path asserted |
| Create outcomeUnknown for 401/403 | medium | defer | from 5.2 elicitation path; not introduced by 5.3 history/cancel |
| POST create not idempotent | medium | defer | already tracked from 5.2; API hardening |
| Unbounded list / no pagination | low | defer | MVP own-bookings; intent allows no pagination |
| N+1 / query-count tests missing | low | defer | prefetch present; scale not this story |
| Cancel capacity/AvailableDate release | false | reject | epic never seats/capacity |
| URL name booking-create → list-create breaks reverse | false | reject | no remaining reverse('booking-create') |
| Notification None check dead | low | reject | mirrors create; everyday harm unlikely |
| statusLabel orphan / packageHeading unused | low | reject | cosmetic i18n leftovers |
| ConfirmDialog role prop unvalidated | low | reject | used only as alertdialog here; Esc/trap already covered in history tests |
| dl→div confirmation semantics | low | reject | chips still labeled; everyday AT impact low |
| Double-click test weak / submittingRef | low | defer | pre-existing 5.2 test shape |
| MyBookings raw err.message | low | patch | localize to historyErrors.listGeneric |
| Stale booking when bookingId cleared | low | reject | confirmation always has id or missing path in product flow |
| Unstructured 500 on cancel | low | reject | generic FE handling sufficient for MVP |
| Diff hygiene bookingsApi.test.js | low | patch | format closing braces |

## Verification

**Commands:**
- `cd backend && python manage.py test bookings` — expected: OK (create + new list/detail/cancel)
- `cd frontend && npm test -- --run src/features/bookings` — expected: OK
