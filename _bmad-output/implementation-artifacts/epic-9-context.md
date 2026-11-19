# Epic 9 Context: Notification Center & Dashboards

<!-- Compiled from planning artifacts. Edit freely. -->

## Goal

Deliver in-app **notification inbox UX** and **dashboard read-models** on top of notification rows already created in Epics 5–8. No new notification event types (OPEN-05: do not invent Admin-targeted events).

## Stories

- Story 9.1: Notification Center Inbox
- Story 9.2: Customer Home Dashboard Aggregates
- Story 9.3: Admin Operational Dashboard

## Requirements & Constraints

- **Read path only:** `NotificationService` remains the exclusive writer (AD-17). Inbox stories add list/read/mark-read APIs + UI.
- **Recipient isolation:** Users see only `recipient_id == request.user.id` (FR-NOTIF-12; NFR-03).
- **Read state:** Mark read when user opens a notification item (FR-NOTIF-11a).
- **Unread affordance:** Unread distinguishable in list; badge shows unread count with `9+` cap (FR-NOTIF-11).
- **Deep links:** Each item links to the relevant Customer record (booking, custom tour, payment context via booking).
- **Catalog:** Use existing `MVP_EVENT_KEYS` only — no new keys in 9.1.
- **Admin inbox:** Optional/s sparse — same APIs work for any authenticated role; MVP events target Customers (OPEN-05).

## Technical Decisions

- Django `notifications` app gains read APIs; wire under `path("api/notifications/", ...)`.
- Session auth + CSRF on mutating routes; reuse `CsrfSessionAuthentication`.
- Message text derived server-side from `event_key` + `payload` (FR-NOTIF-09) with stable FE fallback labels.
- Customer route `/app/customer/notifications` replaces Placeholder; nav badge on Notifications link.

## Cross-Story Dependencies

- **Epics 5–8:** Notification rows exist for bookings, payments, custom tours.
- **9.2** depends on 9.1 for unread notification counts on dashboard.
- **9.3** depends on domain query services (AD-18) — separate from 9.1.