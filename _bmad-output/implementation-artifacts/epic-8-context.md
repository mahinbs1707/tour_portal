# Epic 8 Context: Custom Tour Plans

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let authenticated Customers submit **private** bespoke tour requests (never public catalog), validated with the same **7 calendar-day advance** rule as bookings (Asia/Dhaka). Admins later approve/reject with reason, adjustments, and reapply control; Customers track history and resubmit when enabled — without auto-publishing approved plans as packages.

## Stories

- Story 8.1: Custom Tour Submit (Private, 7-Day Rule)
- Story 8.2: Customer Custom Tour History and Detail
- Story 8.3: Admin Custom Tour Review (Approve/Reject/Reapply Flag)
- Story 8.4: Customer Reapply Flow

## Requirements & Constraints

- **Privacy:** Custom tours are Customer-private; other Customers get 403/404 on detail; no public catalog or Explore APIs surface custom tour rows (FR-CT-12/13, FR-CT-30; AD-7).
- **Auth:** Only authenticated **Customers** create/submit (FR-CT-01). Guests who choose Create custom tour → Sign in/up with safe return (FR-CT-02).
- **Form:** Structured builder per PRD §18.6 — title, destination(s), start/end dates, travelers (≥1 integer; **no max** — OPEN-02), estimated budget + currency, accommodation/transport/activities prefs, additional requirements; review before submit (FR-CT-03…09, FR-CT-08).
- **Dates:** Start ≥ `min_bookable_date()` via shared `packages.validators` (FR-CT-04/04a, FR-ADV-02; AD-20). End ≥ start (FR-CT-05). Budget positive (FR-CT-07).
- **Status:** New submissions `PENDING` only (AD-7). No `TourPackage` / catalog publish on submit or approve in this epic’s stories as scoped in epics.md.
- **Notifications:** `custom_tour.submitted` to submitting Customer only on successful create, inside the same `transaction.atomic` as the row, via `NotificationService` with idempotent `(event_key, entity_type, entity_id, recipient_id)` (FR-CT-10, FR-NOTIF-05; AD-17). Failed validation → no row and no notification.
- **Later stories:** 8.2 history/detail; 8.3 Admin list/approve/reject (7-day re-check at approval — FR-ADV-05); 8.4 reapply when `reapply_enabled`; notifications `custom_tour.approved|rejected|…` (FR-NOTIF-06–08). Admin notification **events** to Admins remain out of MVP (OPEN-05).

## Technical Decisions

- New Django app `custom_tours` with `CustomTourService` (mirror `bookings` + `BookingService` patterns). UUID PKs; `customer` FK; statuses `PENDING|APPROVED|REJECTED` (AD-7).
- Reuse `packages.validators.assert_bookable_date` / `min_bookable_date` for start date on create (Epic 5 parity).
- Customer APIs: session auth + CSRF (`apiClient`); `IsCustomer`. No Admin/customer cross-read without role.
- `CustomTourDecision` model may be stubbed or deferred until 8.3; 8.1 needs only submission entity + audit hook if pattern exists.
- Frontend feature folder `frontend/src/features/customTours/`; routes already stubbed at `/app/customer/custom-tours` (Placeholder → 8.1 form).
- Currency: valid ISO code string (OPEN-01 — free-text ISO, no invented closed list).

## UX & Interaction Patterns

- Flow: Customer nav → builder → field validation → **review** → submit → confirmation with `PENDING` status (Pay/catalog N/A).
- Start date picker: disable dates before `minBookableDateIso` (FE informational; BE authoritative).
- Guest: landing/nav “Create custom tour” or customer nav link → auth with `?next=` back to builder.
- Status chip: Custom tour `PENDING` only in 8.1 success surfaces; do not merge with booking/payment language.

## Cross-Story Dependencies

- **Epic 1:** Auth, role guards, Customer shell routes.
- **Epic 5:** Shared 7-day validator ownership and notification idempotency patterns.
- **Within epic:** 8.1 → 8.2 → 8.3 → 8.4.
- **Epic 9:** Notification center inbox consumes rows created here; no new event keys beyond catalog.