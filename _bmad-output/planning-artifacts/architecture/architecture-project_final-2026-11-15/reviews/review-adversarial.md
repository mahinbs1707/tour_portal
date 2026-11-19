---
name: Adversarial Architecture Review — Tour Portal Spine
type: architecture-review
lens: adversarial
target: ARCHITECTURE-SPINE.md
version: 1.0
status: findings
created: 2026-11-15
altitude: unit-pair (one level below spine)
method: |
  Construct pairs of implementation units (epics / features / modules) that each
  obey every adopted AD to the letter, yet still ship incompatible shared-data
  shapes, dual owners of one entity, or conflicting state-mutation paths.
  Each pair is an architecture hole; close it with a new or tightened AD.
---

# Adversarial Review — Architecture Spine v1.0

## Verdict

**FAIL for implementation baseline.** The spine is coherent at system altitude, but several domain boundaries are *suggestive* rather than *exclusive*. Two competent teams (or two AI agents) can each satisfy AD-1–AD-15 while producing incompatible owners, schemas, and write paths. Until the holes below are closed with tightened ADs, the document is not a safe sole substrate for parallel epic work.

**Severity summary:** 7 structural holes (all focus areas hit); 2 of them are **blocker** class for parallel Construction; 3 are **high**; 2 are **medium** but will silently diverge FE/BE contracts.

---

## Method

For each focus area:

1. Name two units one level down from the spine (epic / feature / module).
2. Show how each unit obeys every relevant AD *literally*.
3. Show the incompatibility that still emerges (shared-data shape, dual ownership, conflicting mutation path).
4. Propose a new or tightened AD that closes the hole.

Assumptions deliberately *allowed* by silence in the spine are treated as legal moves.

---

## Hole 1 — Bookings vs Payments: who owns `PaymentWindow` writes?

### Pair

| Unit | Literal AD compliance |
|---|---|
| **Epic B — Booking Lifecycle** (`bookings` + `BookingService`) | AD-4 lists `BookingService` for “approval”; AD-7 says approval opens the payment window; AD-8 says use `transaction.atomic` for “Booking approval and payment-window creation”; AD-9 says `PaymentWindow` belongs to a Booking. Epic B therefore creates `PaymentWindow` *inside* `BookingService.approve()` so approval + window open stay atomic. |
| **Epic P — Payment Window & Attempts** (`payments` + `PaymentService` / `payment_window_service`) | AD-4 / AD-6 assign payment-window operations to `PaymentService`; AD-10 says “the payment-window service is responsible for evaluating and enforcing eligibility”; domain ownership table gives Payments “payment-window state.” Epic P owns the `PaymentWindow` model and all opens/extends/expires. |

### Clash (despite letter-perfect ADs)

1. **Dual write path for one entity.** Epic B creates windows on approve; Epic P also creates windows on “open after approval” API. Retries, admin re-approve edge cases, or a second approval endpoint produce **two `PaymentWindow` rows** or race on unique-vs-non-unique `booking_id`.
2. **Conflicting cardinality assumptions.** AD-9 ER: `Booking ||--o| PaymentWindow` (at most one). Epic B may model `OneToOneField`. Epic P may model `ForeignKey` + “latest open window” for reopen/extension history (AD-10 allows “extension-history model” *or* audit — so Epic P keeps multiple window rows “for history”). Both claim AD-9/AD-10 compliance; schemas diverge.
3. **Status authority split.** Epic B sets booking `APPROVED` and invents window status transitions as side effects. Epic P treats window status machine as sole authority (AD-7). A reopen that Epic P performs without touching booking is fine; a cancel-from-PENDING that Epic B performs without notifying PaymentService leaves orphan `OPEN` windows — neither AD forbids it.

**Incompatible shared-data shapes:** `PaymentWindow` as 1:1 vs 1:N; creation embedded in bookings vs payments; extension as mutate-in-place vs append-row.

### Close with

**Tighten AD-4 + AD-10 (new AD-16 recommended):**

- `PaymentWindow` model and *all* writes (create, expire, reopen, extend) live exclusively in `payments`.
- `BookingService.approve()` must call `PaymentService.open_window_for_booking(booking, approval_timestamp=…)` inside the same `transaction.atomic`; it must not import or write `PaymentWindow` ORM rows.
- Cardinality: exactly one active `PaymentWindow` per booking (DB unique on `booking_id`); extension mutates `deadline_at` on that row; history goes to audit or a separate `PaymentWindowExtension` table — not a second window.
- Rejection/cancellation paths that affect eligibility must invoke a named payments service method (or no-op contract), not leave windows dangling.

---

## Hole 2 — Notifications vs domain services: who creates event records?

### Pair

| Unit | Literal AD compliance |
|---|---|
| **Feature N — Notification Inbox** (`notifications` + `NotificationService`) | AD-4 / AD-12: NotificationService owns “in-app notification creation and read operations”; domain table: Notifications owns notification records. Feature N exposes `NotificationService.create(recipient, type, payload)` and expects *callers* to invoke it. |
| **Feature D — Domain Workflows** (`BookingService`, `CustomTourService`, `PaymentService`) | AD-12: “Notifications are generated from relevant business events”; “create the notification record within the same database transaction”; “must not silently lose their associated notification records.” Feature D therefore *embeds* `Notification.objects.create(...)` (or duplicate helper) inside each service so the atomicity rule is satisfied without a cross-app call that might be forgotten. |

### Clash

1. **Two owners of one entity.** Feature N owns the model and dedupe keys; Feature D writes raw rows with different `type` strings (`booking.approved` vs `BOOKING_APPROVED` vs free text). AD-12 says avoid duplicates on retry but never names the dedupe key, event catalog, or required payload schema.
2. **Conflicting mutation paths.** Feature N’s API “create from event” expects structured `event_key` + idempotency token. Feature D’s approve path creates notifications without that token → retries of approval (AD-8 idempotency only named for payments) create **duplicate notifications**, violating AD-12’s spirit while each unit cites a different AD-12 sentence.
3. **Transaction placement ambiguity.** Feature D wraps booking+notification in one atomic block (AD-12). Feature N later adds async “fan-out” and moves creation to a post-commit hook “still coordinated with the business transaction” — letter-compliant under a generous reading — and booking succeeds while notification is lost, also violating AD-12’s other sentence.

**Incompatible shared-data shapes:** notification `type`/`event_key` enum; payload JSON; idempotency key; creation only via NotificationService vs ORM from any domain.

### Close with

**Tighten AD-12 (new AD-17):**

- Only `NotificationService` may insert `Notification` rows. Domain services must call it; direct ORM creates from other apps are forbidden.
- Publish a closed MVP event catalog (e.g. `booking.approved`, `booking.rejected`, `payment.success`, …) with required payload fields.
- Idempotency: `(event_key, entity_type, entity_id, recipient_id)` unique; domain retries must pass the same key.
- Creation for critical ops remains inside the caller’s `transaction.atomic`; NotificationService participates in that transaction — no post-commit-only creation for MVP in-app records.

---

## Hole 3 — Dashboard vs domain apps: who defines aggregates?

### Pair

| Unit | Literal AD compliance |
|---|---|
| **Module Dash — Dashboard Aggregation** (`dashboard`) | AD-4 lists `dashboard` for “Customer and Admin dashboard data”; domain ownership: Dashboard owns “Aggregated dashboard information”; capability map ties dashboards to AD-4. Module Dash queries bookings/payments/packages tables (or raw ORM) to build summary DTOs — it “does not manipulate another app’s internal state,” only reads. |
| **Modules Domain — Bookings / Payments / Packages read APIs** | AD-4 / dependency rules: cross-domain ops go through service interfaces; apps must not depend on another app’s views. Domain teams expose list/detail APIs and expect the dashboard *frontend* feature to compose them (AD-13 `features/dashboard`). Backend `dashboard` app is treated as a thin BFF that should call `BookingService` / `PaymentService` query methods — but those query methods were never required. |

### Clash

1. **Two aggregate contracts.** Module Dash invents `/api/dashboard/customer/` with fields `{pending_bookings, open_payment_windows, unread_notifications}`. Domain APIs independently paginate and filter; the React `features/dashboard` epic composes three calls and computes different counts (e.g. “open payment windows” counted as payment status `PENDING` vs window status `OPEN` — AD-7 separates these). Both UIs are AD-compliant; numbers disagree.
2. **Read-path coupling without a service interface.** Module Dash imports other apps’ models directly (reads are not “manipulating state,” so the ownership sentence does not bite). Domain teams later rename/refactor models → dashboard breaks. Dependency rule #4 (“explicit service interfaces”) is about *operations*, not named for reads → legal.
3. **Admin vs Customer payload ownership.** Unclear whether Admin dashboard KPIs live in `dashboard` or are ad-hoc Admin list endpoints in `bookings`/`payments`. Parallel Admin epics ship overlapping endpoints.

**Incompatible shared-data shapes:** dashboard DTO vs composed list DTOs; divergent definitions of “pending,” “action required,” “open window.”

### Close with

**New AD-18 — Dashboard is a read-model façade:**

- Customer and Admin dashboard HTTP endpoints live only under `dashboard`.
- `dashboard` must obtain aggregates through named query methods on domain services (or a shared read-model module in `common`), not by importing sibling apps’ models/tables ad hoc.
- Define MVP dashboard metrics and their exact predicates (status enums, time windows) in the AD or a binding appendix.
- Frontend `features/dashboard` consumes dashboard APIs only — no client-side re-aggregation of domain list endpoints for those same KPI tiles.

---

## Hole 4 — Accounts `role` vs Django `is_staff`

### Pair

| Unit | Literal AD compliance |
|---|---|
| **Epic AuthZ-App — Application RBAC** (`accounts` + DRF permissions) | AD-3: roles `CUSTOMER` \| `ADMIN` govern application-level authorization; object ownership on backend; `is_superuser` must not auto-mean App Admin. Epic AuthZ-App gates `/api/admin/*` on `user.role == ADMIN`. |
| **Epic AuthZ-Staff — Django Admin & seed** | AD-3: `is_staff` controls `/django-admin/*`; Admin accounts “seeded or provisioned.” Epic AuthZ-Staff seeds operators with `is_staff=True` and leaves `role=CUSTOMER` (or null) because “Django Admin is separate.” Alternatively seeds `role=ADMIN` without `is_staff`. |

### Clash

1. **Two meanings of “Admin.”** A user with `role=ADMIN` but `is_staff=False` can call Admin APIs and cannot open Django Admin — fine. A user with `is_staff=True` and `role=CUSTOMER` can open Django Admin (and thus mutate packages/bookings via staff UI) while App RBAC treats them as Customer on `/api/*`. AD-3 *distinguishes* the flags but never states the **required pairing invariant** for MVP seed users.
2. **Frontend guard divergence.** Customer/Admin route groups (AD-5, AD-13) key off `/api/auth/me/` which returns `role`. Staff-only users see Customer UX but retain dangerous Django Admin access — product-security mismatch the spine calls out only partially.
3. **Permission class split.** One epic writes `IsAdminRole`; another writes `IsAdminUser` (DRF’s `is_staff`). Both satisfy “Admin APIs require an authenticated Admin” under different definitions of Admin.

**Incompatible shared-data shapes:** `User.role` vs `is_staff` matrix; `/me/` payload; permission class semantics.

### Close with

**Tighten AD-3 (new AD-19):**

- MVP invariant: application `ADMIN` ⇒ `is_staff=True` (or document the opposite: Django Admin disabled in all non-ops envs and `is_staff` never used for app APIs).
- Application Admin APIs must check `role == ADMIN` only — never `is_staff` alone.
- Seed/provisioning checklist must set both flags consistently; reject states `{role:ADMIN, is_staff:False}` and `{role:CUSTOMER, is_staff:True}` unless an explicit ops break-glass role is defined.
- `/api/auth/me/` returns `role`, `is_staff`, `is_superuser` with documented FE usage: route guards use `role` only.

---

## Hole 5 — `AvailableDate` without seats (capacity-shaped ghosts)

### Pair

| Unit | Literal AD compliance |
|---|---|
| **Epic Pkg — Packages & Availability** | AD-8 / AD-9: no seat capacity, no remaining-seats columns; dates are calendar options + 7-day advance rule. Epic Pkg models `AvailableDate(tour_date, package_id, is_active)` and validates advance rule on create/list. |
| **Epic Bk — Booking Creation** | AD-7/AD-8: booking references selected availability date; date eligibility enforced on backend; selecting a date does not consume capacity. Epic Bk still needs *some* concurrency story for double-booking the same date — and AD-8’s payment concurrency rules are silent on bookings. Epic Bk adds `Booking.unique_together(package, date, customer)` *or* a soft “slots_taken” counter “for UX only, not capacity” — arguing AD-8 only forbids seat *inventory*, not booking counts. |

### Clash

1. **Capacity-shaped fields by another name.** Epic Bk’s `slots_taken` / `max_group_size` / “fully booked” badge reintroduces seat semantics the product deferred. Epic Pkg refuses those fields. FE packages feature shows infinite availability; bookings feature shows “full” — both cite AD-8 differently.
2. **Missing exclusive write rule for date eligibility.** Who validates the 7-day rule at booking create vs at admin approve (AD-8 mentions both)? Epic Pkg validates at date definition; Epic Bk validates at create; Admin approve epic validates again with a different timezone boundary interpretation (AD timezone rules exist but “business timezone” config ownership is unnamed). Edge bookings near midnight diverge.
3. **Orphan / stale dates.** Soft-delete vs hard-delete of `AvailableDate` after bookings reference it: AD-9 wants referential integrity; neither epic owns the lifecycle when a date is removed.

**Incompatible shared-data shapes:** presence/absence of count fields; unique constraints on bookings-per-date; date lifecycle; 7-day predicate implementation.

### Close with

**Tighten AD-8 / AD-9 (new AD-20):**

- Forbidden field/concepts list expanded: no `capacity`, `seats`, `remaining`, `slots`, `max_bookings`, or UI copy implying limited seats — including derived “fully booked.”
- Concurrent bookings for the same `AvailableDate` are **allowed** in MVP (N customers may book the same calendar option); do not add uniqueness on `(package, date)` across customers.
- Single shared validator module (owned by `packages` or `common`) for the 7-day advance rule; both booking create and admin approve must call it; business timezone setting is named and single-sourced.
- `AvailableDate` deactivation: deactivate flag only; never delete rows with existing booking FKs; bookings retain historical date FK.

---

## Hole 6 — CSRF / session across FE feature services

### Pair

| Unit | Literal AD compliance |
|---|---|
| **Feature Auth — Session bootstrap** | AD-2: session cookie HttpOnly; CSRF mandatory for unsafe methods; `GET /api/auth/csrf/`; `/me/` on SPA init; no secrets in localStorage. Feature Auth fetches CSRF once, stores token in memory/React context, attaches `X-CSCSRToken` on its own mutations. |
| **Features Domain — bookings / payments / custom-tours / notifications API clients** | AD-2: “Frontend must obtain and submit the CSRF token for protected mutations”; AD-13: each feature may contain “API/service functions.” Each feature module implements its own `fetch`/`axios` wrapper, reading CSRF from `document.cookie` (non-HttpOnly CSRF cookie) *or* skipping header on “safe-looking” POSTs, or caching a stale token from first paint. |

### Clash

1. **Multiple CSRF acquisition strategies.** Auth feature uses dedicated bootstrap endpoint; payments feature reads cookie directly; bookings feature relies on a shared axios interceptor that was never mandated. Under SameSite / Secure / cookie-name variance (AD-2 says “configure an appropriate SameSite” but does not pin `Lax`/`Strict` or cookie names), one client works in Compose and another fails in a preview deploy — both “follow AD-2.”
2. **Session expiry handling fork.** AD-2: “Session expiration must be handled gracefully.” Auth feature redirects to login on 401. Payments feature retries once and surfaces raw DRF error. Dashboard feature clears local user state but leaves CSRF context → subsequent mutations 403 forever until hard refresh.
3. **No single HTTP client contract.** AD-1/AD-13 imply one SPA talking to `/api/*`, but never require one shared API client. Parallel feature epics ship incompatible auth headers, credentials (`credentials: 'include'` omitted in one Vite proxy path), and error parsing (AD-11 DRF-standard vs ad-hoc).

**Incompatible shared-data shapes:** CSRF token source of truth; 401/403 handling; cookie/SameSite assumptions; presence of a shared `apiClient`.

### Close with

**Tighten AD-2 + AD-13 (new AD-21):**

- Exactly one shared frontend HTTP client (`src/services/apiClient` or equivalent) owns: `credentials: 'include'`, CSRF read/attach, 401 → session-expired handler, DRF error normalization.
- Feature API modules may only call through that client.
- Pin CSRF cookie name, header name, SameSite=`Lax` (or chosen value), and Secure rules for local vs production in the AD.
- CSRF bootstrap: Auth provider calls `/api/auth/csrf/` once at app init; client refreshes CSRF on 403 CSRF failures once, then fails closed.

---

## Hole 7 — Audit vs domain writes

### Pair

| Unit | Literal AD compliance |
|---|---|
| **Module Audit — AuditService** | AD-4 / AD-12: AuditService records administrative actions; audit history not editable; records actor, action, target, timestamp, before/after. Module Audit exposes `AuditService.record(...)` and an Admin read API. |
| **Domain Admin mutations — BookingService / CustomTourService / PaymentService / PackageService** | AD-12 lists actions that “should” be recorded (approval, rejection, window reopen/extension, package changes). Domain services write audit rows inline *or* skip when “not important,” because the list is exemplary (“including”) not mandatory-closed. Payment-window extension is also allowed to use “audit records *or* an appropriate extension-history model” (AD-10) — so PaymentService skips AuditService entirely and uses a local history table. |

### Clash

1. **Dual owners of “what happened.”** Admin Activity UI (capability map → audit) expects Audit rows for extensions; Payments epic stores extensions only in `PaymentWindowExtension`. Both satisfy AD-10/AD-12. Product cannot answer “show all admin decisions” from one store.
2. **Best-effort vs transactional audit.** One domain wraps audit write in the same `transaction.atomic` as the decision (consistent with notification guidance by analogy). Another fires audit after commit “so payment isn’t blocked.” Failures yield decisions without audit — AD-12 says audit “must” for history integrity in tone but only “should include” for fields; no failure policy.
3. **Schema drift.** Free-form `action` strings (`approve_booking` vs `booking.approved`); target entity sometimes UUID only, sometimes URL; before/after sometimes omitted. Parallel Admin epics cannot query or display a unified timeline.

**Incompatible shared-data shapes:** audit vs domain-local history; action vocabulary; transactional guarantees; Admin timeline API source.

### Close with

**Tighten AD-12 Audit section (new AD-22):**

- Closed MVP audit action catalog; all listed Admin decisions **must** call `AuditService.record` inside the same atomic block as the state change.
- Domain-local history tables (e.g. payment-window extensions) are allowed only as *supplements*; they do not replace AuditService entries for the same action.
- Only `audit` app may insert audit rows; audit rows are append-only (DB/user permissions reinforce AD-12 immutability).
- Failure policy: if audit write fails, the business transaction fails (MVP: no best-effort audit for the closed catalog).

---

## Cross-cutting pattern (meta-finding)

Across holes 1–3, 7 (and partly 2), the spine uses **responsibility tables** and **“suggested” service ownership** without **exclusive write ownership**, **cardinality locks**, **event/action catalogs**, or **required call direction**. AD-4’s “must not directly manipulate another app’s internal state without using its defined service interface” is necessary but insufficient: it does not define those interfaces, nor whether *reads* and *side-effect records* (notifications, audit, payment windows) count as “internal state.”

Adversarial units exploit:

| Spine phrase | Adversarial reading |
|---|---|
| “Suggested service ownership” | Optional; invent another owner |
| “including” (audit/notification events) | Open set; omit or duplicate |
| “or an appropriate … model” | Fork the store |
| “Aggregated dashboard information” | Raw SQL/ORM across apps |
| “Distinguish role vs is_staff” | Allow any matrix |
| “No seat capacity” | Add non-seat counters |
| “Frontend must obtain CSRF” | Each feature obtains differently |

---

## Recommended AD backlog (close holes before parallel Construction)

| ID | Action | Closes |
|---|---|---|
| AD-16 | Exclusive PaymentWindow write ownership + 1:1 cardinality + approve→PaymentService call | Hole 1 |
| AD-17 | Exclusive NotificationService writes + event catalog + idempotency key | Hole 2 |
| AD-18 | Dashboard read-model façade + metric predicates + no FE re-aggregation | Hole 3 |
| AD-19 | `role`/`is_staff` seed invariant + Admin API checks role only | Hole 4 |
| AD-20 | Expand no-capacity ban; allow multi-book same date; shared 7-day validator | Hole 5 |
| AD-21 | Single FE apiClient; pin CSRF/session cookie policy | Hole 6 |
| AD-22 | Closed audit catalog; mandatory atomic AuditService; supplements ≠ replacement | Hole 7 |

Optional spine edit (supports all): replace “Suggested service ownership” with **Binding service ownership** and add a one-page **write-ownership matrix** (entity → sole writer service → allowed callers).

---

## Out of scope / not raised as holes

- Mock-only payments (AD-6) — clear enough for MVP.
- Single SPA / single DB (AD-1) — hard boundary; adversaries cannot split deployables without violating the letter.
- UUID PKs and DRF error format — low ambiguity for parallel units.
- Cloud unbound (AD-15) — intentional deferral, not an incompatibility pair.

---

## Reviewer note

This review does **not** claim the current spine is internally contradictory when read as one architect’s intent. It claims the spine is **under-determined for adversarial parallel implementation**. Closing AD-16–AD-22 (or equivalent tightenings of AD-3, AD-4, AD-8, AD-10, AD-12, AD-13) is the minimum to make the document a safe implementation baseline for multiple epics/features/modules.
