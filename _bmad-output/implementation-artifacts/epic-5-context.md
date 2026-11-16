# Epic 5 Context: Request a Catalog Booking

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Authenticated Customers submit catalog booking requests for published packages at least 7 calendar days ahead (Asia/Dhaka), review before confirm, land in `PENDING` with a single payment window `NOT_OPEN`, cancel only while pending, and track requests in history/detail with booking/payment/window statuses kept separate and Pay hidden. Delivers the customer ask-to-book path before Admin decision or checkout.

## Stories

- Story 5.1: Booking Create API with 7-Day Rule (Asia/Dhaka)
- Story 5.2: Booking Form, Review, and Auth Return
- Story 5.3: Booking Confirmation, History, Detail, and Cancel Pending

## Requirements & Constraints

- Only authenticated Customers may submit; Guests hitting Book Now go Sign in/up and return to the booking flow for that package. Book only published, bookable packages with an Admin-defined available start date ≥7 calendar days after the request date (calendar days in `BUSINESS_TIMEZONE=Asia/Dhaka`, not a rolling 168 hours). Enforce on frontend and backend; reject unavailable or rule-violating dates with no booking or window row created.
- Form: package auto-populated; required preferred travel date, travelers (positive integer ≥1), name, contact email, contact number; optional additional requirements. Pre-fill name/email from account where available. Review step before final submit. OPEN-02 unresolved: do not invent a travelers maximum.
- Successful submit creates booking `PENDING` with a reference; payment stays unpaid / checkout unavailable; confirmation shows reference + status. Customer gets in-app `booking.submitted` notification.
- History/detail: own bookings only — reference, package, travel date, travelers, submission date, current statuses. Cancel only while `PENDING` (confirm dialog) → `CANCELLED` + `booking.cancelled` notification; cannot cancel again or cancel approved/rejected/cancelled. Pay now stays hidden; statuses never merged into one label.
- No seat capacity, “fully booked,” or uniqueness preventing concurrent customers on the same available date. Out of this epic: Admin approve/reject, opening the 24h window, mock checkout, Stripe, JWT, email/SMS.

## Technical Decisions

- Domain: `bookings` + `BookingService`; payment window writes exclusively via `PaymentService` in `payments`. On create inside `transaction.atomic`: status `PENDING`; call `PaymentService` to create exactly one `PaymentWindow` with `NOT_OPEN` (unique `booking_id`); never write `PaymentWindow` ORM from bookings. Checkout remains unavailable while `NOT_OPEN`.
- Status machines: Booking `PENDING|APPROVED|REJECTED|CANCELLED`; Payment `UNPAID|PENDING|SUCCESS|FAILED|CANCELLED`; Window `NOT_OPEN|OPEN|EXPIRED`. Customer cancel allowed only in `PENDING`.
- Shared 7-day validator owned by `packages` (`BUSINESS_TIMEZONE`); booking create must call it. UUID PKs; booking references customer, package, and available date.
- Notifications only via `NotificationService` in the same atomic block: epic emits `booking.submitted` and `booking.cancelled` to the submitting Customer. Idempotency key `(event_key, entity_type, entity_id, recipient_id)`. Frontend uses shared session+CSRF `apiClient`.

## UX & Interaction Patterns

- Flow: Book Now (Guest → auth → return to form) → date picker disables next 7 days with preparation helper → required-field validation → review → submit → confirmation `PENDING` / Window `NOT_OPEN` / Pay hidden. Flow 1b: cancel while pending with confirm. Flow 7: session expiry mid-draft → Sign in → restore non-sensitive draft (never passwords).
- Always show separate labeled chips for Booking / Payment / Window when payment context applies. `pay-now` visible only when `APPROVED` AND window `OPEN` AND payment ≠ `SUCCESS` — so hidden throughout this epic. Offline banner blocks submit. Advance-rule block: inline unavailable dates + explanation. Cancel uses confirm dialog (alertdialog pattern). Success toasts `role="status"`; errors `role="alert"`.

## Cross-Story Dependencies

- Requires Epics 1–3 (auth/session, published catalog + available dates, Book Now entry). Story 5.2 depends on 5.1; 5.3 depends on 5.1–5.2.
- Epic 6 updates the existing `NOT_OPEN` window on approve (must not create a second row). Epic 7 owns Pay/checkout UI. Do not open the window or implement mock payment here.
