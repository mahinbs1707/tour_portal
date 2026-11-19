---
title: '8.4 Customer Reapply Flow'
type: 'feature'
created: '2026-11-18'
status: 'approved'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: ''
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-3-admin-custom-tour-review-approve-reject-reapply-flag.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Customers with **REJECTED** custom tours and `reapply_enabled` cannot edit and resubmit; disabled reapply is not enforced on API. Prior rejection context is not retained as review history across cycles (FR-CT-28/29).

**Approach:** Customer `POST` reapply on owned **REJECTED** + `reapply_enabled` tours: validate 7-day rule on edited dates, flip status → **PENDING**, clear active rejection fields for the new cycle, **append** prior decision to review history, emit `custom_tour.resubmitted`, UI reapply CTA + edit/review flow — mirror 8.1 form patterns.

## Boundaries & Constraints

**Always:**
- Only **Customer** owner; `CustomTourService.assert_reapply_allowed` before write.
- Reapply disabled or wrong status → **403** (or **409**) with no status change; FE hides/disables CTA + explanation (FR-CT-25, Story 8.4 AC).
- Resubmit payload = same field set as create (8.1); `assert_bookable_date(start_date)`; travelers ≥1 (OPEN-02).
- On success in one `transaction.atomic`: status **PENDING**; reset `reapply_enabled=False` until Admin decides again; store prior `rejection_reason` / `recommended_adjustments` + metadata in **review history**; bump `review_cycle`; `custom_tour.resubmitted` notification to Customer.
- Customer detail/history still show **current** row; history section or API field exposes prior cycles (FR-CT-29).
- Disabled reapply: no resubmit route in UI; API rejects.

**Never:** New catalog package; Admin APIs; change 8.3 approve/reject semantics; email/SMS; invent traveler max.

## I/O & Edge-Case Matrix

| Scenario | State | Expected | Error |
|----------|-------|----------|-------|
| Reapply happy | REJECTED + reapply on | PENDING; history append; notif | — |
| Reapply disabled | REJECTED + reapply off | Rejected | 403 |
| Wrong status | PENDING/APPROVED | No change | 403/409 |
| Start &lt;7d | edited dates invalid | No change | 400 |
| Foreign tour | other customer | Not found | 404 |
| Guest POST | unauthenticated | Denied | 401 |

</frozen-after-approval>

## Decisions (Checkpoint 1)

Reply e.g. `1A, 2A, 3A, 4A, 5A, 6A` or `approved` for defaults.

### 1 — Reapply API

- **1A (recommended)** — `POST /api/custom-tours/<uuid>/reapply/` with same JSON body as create (full replacement fields).
- **1B** — `PATCH` partial update only.

### 2 — Review history (FR-CT-28/29)

- **2A (recommended)** — New `CustomTourReview` model (PRD §18.7-lite): rows per cycle with `cycle`, `decision`, `rejection_reason`, `adjustments`, `decided_at`, `admin_id` nullable on resubmit-snapshot; Customer GET detail includes `review_history[]`.
- **2B** — JSON `review_history` on `CustomTour` only (no extra table).

### 3 — Fields after resubmit

- **3A (recommended)** — Clear `rejection_reason`, `recommended_adjustments`, `reapply_enabled` on the tour row; prior values copied into history before clear.
- **3B** — Keep rejection text visible on row until Admin decides again.

### 4 — HTTP when reapply blocked

- **4A (recommended)** — **403** with clear `detail` when `reapply_enabled` is false or status ≠ REJECTED.
- **4B** — **409** for wrong status, **403** only for disabled flag.

### 5 — Notification (FR-NOTIF-08)

- **5A (recommended)** — Add `custom_tour.resubmitted` to MVP event catalog; emit on successful reapply.
- **5B** — Reuse `custom_tour.submitted` event key (weaker traceability).

### 6 — Customer UI

- **6A (recommended)** — Detail page **Reapply** button when allowed → `/app/customer/custom-tours/:id/reapply` (reuse 8.1 form + review, pre-filled); disabled state uses existing hints (8.3).
- **6B** — Reapply only from list card, no dedicated route.

## Code Map

- `backend/custom_tours/models.py` — `CustomTourReview` + `review_cycle` on `CustomTour`.
- `backend/custom_tours/services.py` — `reapply(...)`; wire `assert_reapply_allowed`.
- `backend/custom_tours/views.py` — Customer reapply view; extend detail serializer.
- `frontend/.../CustomTourReapplyPage.jsx`, `customToursApi.reapplyCustomTour`, detail CTA.
- `notifications/services.py` — `custom_tour.resubmitted` if 5A.

## Tasks & Acceptance

**Execution:** (unchecked until post-approval)

- [ ] Model + migration + reapply service + notification + history append
- [ ] Customer POST API + tests (enabled/disabled/7d/ownership)
- [ ] FE reapply flow + CTA gating + tests
- [ ] Detail shows `review_history` when present

**Acceptance Criteria:** (epics.md Story 8.4)

- Given REJECTED + reapply enabled, when edit and resubmit, then PENDING, history retained, resubmit notification.
- Given reapply disabled, when view detail, then CTA hidden/disabled + API rejects resubmit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands (after implementation):**
- `cd backend && python manage.py test custom_tours`
- `cd frontend && npm test -- --run src/features/customTours`