---
title: '8.3 Admin Custom Tour Review (Approve/Reject/Reapply Flag)'
type: 'feature'
created: '2026-11-18'
status: 'approved'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: ''
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-2-customer-custom-tour-history-and-detail.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-2-approve-booking-and-open-payment-window.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-3-reject-booking-with-mandatory-reason.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins cannot review custom tour submissions — no Admin list/filter/detail, no approve/reject with reason/adjustments/reapply flag, no 7-day re-check at approval, no customer notifications or audit on decision.

**Approach:** Mirror Admin booking review (6.1–6.3): `custom_tours` Admin APIs + `CustomTourService.approve|reject` (+ optional reapply toggle), transactional audit + Customer notifications (`custom_tour.approved` / `custom_tour.rejected` / reapply-enabled per decisions), Admin SPA list/detail/actions — **no** catalog publish, **no** Customer resubmit body (8.4), **no** Admin decision notification events (OPEN-05).

## Boundaries & Constraints

**Always:**
- Admin session + `IsAdminRole`; CSRF on writes.
- List: all submissions, newest first; optional `?status=` filter (`PENDING|APPROVED|REJECTED`).
- Detail: full submission + customer identity fields (mirror Admin booking shape where sensible).
- Approve: only `PENDING`; `assert_bookable_date(start_date)` at approval time (Asia/Dhaka); → `APPROVED`; remains private; **no** `TourPackage` row (FR-CT-30, FR-ACT-12).
- Reject: only `PENDING`; mandatory trimmed `rejection_reason` (max 2000); optional `recommended_adjustments`; set `reapply_enabled` per decision; → `REJECTED`.
- Same transaction as status change: `AuditService` + `NotificationService` to **submitting Customer** only.
- Customer detail (8.2) already surfaces `rejection_reason` / `recommended_adjustments`; add read-only `reapply_enabled` for Customer when rejected.
- Disabled `reapply_enabled` must be authoritative for 8.4 resubmit (guard in service layer; 8.3 may expose flag only or add 403 stub — see Decisions).

**Never:** Public Explore/catalog exposure; quotation workflows; email/SMS; Customer resubmit/edit UI completion (8.4); Admin notification inbox events; invent traveler max; JWT/Stripe.

## I/O & Edge-Case Matrix

| Scenario | State | Expected | Error |
|----------|-------|----------|-------|
| Approve valid | PENDING + start ≥7d | APPROVED; notif approved; audit | — |
| Approve invalid date | PENDING + start &lt;7d now | Still PENDING; no publish | 400 |
| Approve wrong status | APPROVED/REJECTED | No change | 409 |
| Reject with reason | PENDING | REJECTED + reason; notif rejected; audit | — |
| Reject no reason | PENDING | Rejected | 400 |
| Reapply on reject | `reapply_enabled: true` | Customer sees + notif per decision | — |
| Reapply off | REJECTED, flag false | Customer detail shows disabled; 8.4 blocks resubmit | — |
| Guest/customer Admin API | non-Admin | Denied | 403 |

</frozen-after-approval>

## Decisions (Checkpoint 1)

Reply e.g. `1A, 2A, 3A, 4A, 5A, 6A` or edit the spec before approval.

### 1 — Admin API layout

- **1A (recommended)** — `/api/custom-tours/admin/`, `/admin/<uuid>/`, `/admin/<uuid>/approve/`, `/admin/<uuid>/reject/` (parity with bookings under `bookings/urls.py`).
- **1B** — Top-level `/api/admin/custom-tours/…`

### 2 — Review history (FR-ACT-11)

- **2A (recommended)** — MVP: decisions on the `CustomTour` row + `audit` entries; Admin detail shows current decision fields only; **`CustomTourDecision` table deferred to 8.4** when resubmit cycles land.
- **2B** — Add `CustomTourDecision` model (PRD §18.7) now; Admin detail lists prior cycles.

### 3 — Reapply control (FR-ACT-08)

- **3A (recommended)** — Set `reapply_enabled` in **reject** body only (default `false`); optional follow-up story endpoint if toggle-after-reject needed later.
- **3B** — Reject sets reason/adjustments only; separate `POST …/reapply/` on `REJECTED` to enable/disable.

### 4 — Customer resubmit blocking in this story

- **4A (recommended)** — **8.3:** expose `reapply_enabled` on Customer detail; add `CustomTourService.assert_reapply_allowed()` for 8.4; **no** resubmit POST yet (8.3 tests = Admin + Customer read shape).
- **4B** — **8.3:** implement `POST /api/custom-tours/<uuid>/reapply/` that returns **403** when disabled (full body in 8.4).

### 5 — Notifications

- **5A (recommended)** — On approve → `custom_tour.approved`; on reject → `custom_tour.rejected` (payload includes reason snippet). If reject sets `reapply_enabled: true`, also emit **`custom_tour.reapply_enabled`** (extend MVP event catalog in code; same transaction).
- **5B** — Reject only sends `custom_tour.rejected`; omit FR-NOTIF-07 until product amends AD-17.

### 6 — Admin UI

- **6A (recommended)** — Replace Admin Placeholder: list + filter + detail with Approve / Reject forms (reason required; adjustments optional; reapply checkbox on reject) — mirror `AdminBookingsPage` / `AdminBookingDetailPage`.
- **6B** — APIs only; Admin UI in a fast-follow.

## Code Map

- `backend/custom_tours/admin_views.py`, `services.py` (`approve`, `reject`), serializers `AdminCustomTourSerializer`, reject body serializer.
- `backend/custom_tours/models.py` — `reapply_enabled`, `approved_at` (optional), migration.
- `backend/custom_tours/urls.py` — admin routes **before** `<uuid:tour_id>/` customer detail.
- `backend/notifications/services.py` — add `custom_tour.reapply_enabled` if **5A**.
- `frontend/src/features/customTours/` — `adminCustomToursApi.js`, `AdminCustomToursPage`, `AdminCustomTourDetailPage`; wire `App.jsx` admin route.
- Customer: `CustomTourDetailSerializer` + detail UI — show `reapply_enabled` when `REJECTED`.
- Continuity: 8.4 resubmit uses `reapply_enabled` + `assert_reapply_allowed`.

## Tasks & Acceptance

**Execution:**

- [x] Model + service approve/reject + audit + notifications + `assert_reapply_allowed`
- [x] Admin list/filter/detail + approve/reject APIs + tests
- [x] Admin UI + Customer `reapply_enabled` display
- [x] 7-day block at approve; no package create on approve

**Acceptance Criteria:** (from epics.md Story 8.3 — approve valid/invalid date, reject with reason/reapply, reapply disabled blocks resubmit when applicable per Decision 4)

## Implementation Notes

- Admin API under `/api/custom-tours/admin/`; `CustomTourService.approve|reject`; `custom_tour.reapply_enabled` notification when reject enables reapply.
- Migration `0003_story_8_3_admin_decision_fields`; customer detail shows reapply hints; resubmit POST deferred to 8.4 (`assert_reapply_allowed` ready).

## Spec Change Log

- 2026-11-18 — Checkpoint approved; Story 8.3 implemented.

## Review Triage Log

## Verification

**Commands (after implementation):**
- `cd backend && python manage.py test custom_tours`
- `cd frontend && npm test -- --run src/features/customTours`