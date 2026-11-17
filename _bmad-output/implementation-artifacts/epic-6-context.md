# Epic 6 Context: Admin Booking Decisions & Payment Window Control

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver Admin-facing booking review and decision workflows so operations can list, filter, and inspect booking requests, approve or reject pending items, and control the payment window lifecycle. Approval opens a 24-hour payment window (Customer becomes eligible to pay in Epic 7); rejection requires a persisted reason visible to the Customer. Approve/reject must enforce the 7-day advance rule at decision time, record audit events, and notify Customers. Reopen and extend restore checkout access on the single existing payment window without inventing a second row or resetting deadlines on reopen alone.

## Stories

- Story 6.1: Admin Bookings List, Filter, and Detail
- Story 6.2: Approve Booking and Open Payment Window
- Story 6.3: Reject Booking with Mandatory Reason
- Story 6.4: Reopen and Extend Payment Window

## Requirements & Constraints

- Admins view all bookings, filter by status, and open detail showing reference, customer, package, travel date, travelers, requirements, submission date, and separate booking / payment / payment-window states when applicable.
- Only `PENDING` bookings may be approved or rejected; `CANCELLED`, `APPROVED`, and `REJECTED` bookings cannot be decided again.
- Approve transitions booking to `APPROVED`, keeps payment at `UNPAID`, and opens the payment window with `deadline_at = approval_timestamp + 24 hours` using the recorded approval timestamp as the window start.
- Reject transitions to `REJECTED`, requires a non-empty reason stored on the booking and included in Customer-facing detail and notifications; checkout remains unavailable.
- Approve must be blocked if the selected start date fails the minimum 7 calendar-day advance rule at approval time (Asia/Dhaka calendar dates); the window stays `NOT_OPEN` and no approval deadline is applied.
- After 24 hours without successful payment, the window becomes `EXPIRED` while booking stays `APPROVED` and payment remains `UNPAID` (or last failed/cancelled attempt state).
- Reopen on an expired window updates the same row and **preserves** `deadline_at` (never grants a fresh 24 hours). Eligibility for payment requires `deadline_at` in the future; reopen-only with a past deadline does not make checkout available until Admin **extends** to a future deadline.
- Extend mutates `deadline_at` on that single window row and must be audited; optional extension history may supplement audit but is not the source of truth.
- Customers receive in-app notifications on approve (`booking.approved`, window opened) and reject (`booking.rejected`, includes reason). Do **not** implement optional payment-window expiry notifications unless product explicitly approves OPEN-04 (FR-NOTIF-03a).
- Payment eligibility begins only after approval; mock checkout UI and APIs are Epic 7 — this epic establishes Admin-side state so Customers see `APPROVED` + `UNPAID` + `OPEN` when eligible.
- Admin booking APIs are Admin-role only; Customers cannot access them.
- Partial scope for operational dashboard: surface or emphasize pending bookings requiring review where the Admin booking experience touches dashboard/list entry points (full dashboard KPI tiles are Epic 9).

## Technical Decisions

- Modular monolith: booking decisions in `bookings` (`BookingService`); all `PaymentWindow` creates and updates exclusively via `PaymentService` in `payments` (AD-16).
- Exactly one `PaymentWindow` per booking (unique `booking_id`); created at booking submit as `NOT_OPEN` (Epic 5). Approve calls `PaymentService.open_window_for_booking` inside the same `transaction.atomic` as status change — **update** the existing row to `OPEN`, never insert a second window.
- `BookingService` must not write `PaymentWindow` ORM directly; approve/reject/cancel orchestrate payments through the service interface.
- Payment eligibility is deadline-authoritative: compare current time to `deadline_at`; expiration must not rely solely on scheduled tasks for enforcement (scheduled work may update persisted `EXPIRED` state for reporting).
- Reopen preserves `deadline_at`; extension updates `deadline_at` and calls `AuditService` in the same atomic block as the state change.
- Closed notification events this epic emits: `booking.approved`, `booking.rejected` via `NotificationService` only (AD-17).
- Closed audit actions: `booking.approve`, `booking.reject`, `payment_window.reopen`, `payment_window.extend` via `AuditService` in the same transaction as the decision (AD-22).
- Status machines: booking `PENDING|APPROVED|REJECTED|CANCELLED`; payment transaction `UNPAID|PENDING|SUCCESS|FAILED|CANCELLED`; window `NOT_OPEN|OPEN|EXPIRED` (AD-7).
- Shared 7-day validator used on approve (AD-8, AD-20); `BUSINESS_TIMEZONE=Asia/Dhaka`.
- UUID primary keys; session auth + CSRF on Admin APIs (AD-2, AD-3).
- DRF standard errors and pagination for Admin list endpoints (AD-11).

## UX & Interaction Patterns

- Admin layout: sidebar on lg+, stacked card lists on smaller breakpoints — no horizontal-only tables (UX-DR5).
- Booking detail shows three separate labeled chips/rows for booking status, payment status, and payment-window state; `EXPIRED` is window state, not payment status (UX-DR6).
- Approve: confirm dialog — copy states 24h window starts on approve; block with clear messaging when 7-day rule fails.
- Reject: `alertdialog` with required reason field; reason shown to Customer.
- Reopen dialog: states original deadline unchanged; extend dialog: datetime for new expires-at, required when restoring payability after a past deadline.
- Dialogs: focus trap, Esc, restore focus, modal stack depth ≤1 (UX-DR8).
- Flow 2 (Admin booking review) and Flow 5 payment matrix rows through `OPEN` are acceptance references for approve/reject/reopen/extend behavior.

## Cross-Story Dependencies

- **Epic 5:** Booking submit and single `NOT_OPEN` `PaymentWindow` must exist before approve (Story 6.2 depends on Story 5.1 window creation).
- **Within epic:** 6.1 before 6.2 and 6.3; 6.2 before 6.4.
- **Epic 7:** Mock checkout and Pay now gating consume `APPROVED` + eligible window state produced here; do not build Customer checkout in this epic.
- **Epic 9:** Full Admin dashboard pending counts and notification center polish build on booking decision events started here.