---
title: '8.1 Custom Tour Submit (Private, 7-Day Rule)'
type: 'feature'
created: '2026-11-17'
status: 'approved'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: ''
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/docs/tour-portal/PRD.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Customers cannot submit private custom tour requests — there is no `custom_tours` domain, no create API, no builder UI (route is a Placeholder), and no `custom_tour.submitted` notification on successful submit.

**Approach:** Add `custom_tours` app + `CustomTourService.create`, Customer `POST` API with PRD §18.6 fields and shared 7-day validation, idempotent `custom_tour.submitted` in the same atomic transaction, and Customer builder + review step wired to `/app/customer/custom-tours` with Guest auth return — **no** history/detail (8.2), Admin review (8.3), or reapply (8.4).

## Boundaries & Constraints

**Always:**
- Auth: authenticated **Customer** only (`IsCustomer`); Guest → Sign in/up with safe `?next=` to custom tour builder. CSRF on session POST.
- Payload aligns with PRD **CustomTourSubmission** fields: title, destination(s), start_date, end_date, travelers (≥1), estimated_budget, currency, accommodation_preferences, transportation_preferences, preferred_activities, additional_requirements (optional where PRD allows empty).
- Validate: `assert_bookable_date(start_date)` (Asia/Dhaka); `end_date >= start_date`; travelers positive integer ≥1 (**no max** — OPEN-02); budget > 0; currency non-empty ISO-style string (OPEN-01). Failures → 400; **no** custom tour row or notification.
- On success in `transaction.atomic`: CustomTour `PENDING`, owned by `request.user`; emit `custom_tour.submitted` via `NotificationService` with `entity_type`/`entity_id` for the new row (same transaction).
- Notification idempotency: duplicate `(event_key, entity_type, entity_id, recipient_id)` must not create a second notification (retry after successful create).
- **Privacy:** No public/list catalog exposure; other customers cannot read created rows (list/detail APIs for own records land in 8.2 — 8.1 may expose only create + thin success response).
- Guest gating on nav/entry to builder (FR-CT-02).

**Never:** Admin approve/reject APIs or UI; reapply; `CustomTourDecision` writes (8.3); history/detail pages (8.2); publish/link to `TourPackage`; JWT/Stripe/email/SMS; invent traveler max; Admin recipient notifications (OPEN-05); quotation workflows.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Happy path | Customer + valid form ≥7d | 201 `PENDING`; `custom_tour.submitted` | N/A |
| Start &lt; 7d | start within window | 400; no row; no notif | BE authoritative |
| End before start | invalid range | 400 | Field errors |
| Travelers invalid | 0 / negative | 400 | No invented max |
| Budget invalid | ≤0 or missing | 400 | |
| Guest POST | unauthenticated | 401/403 | |
| Notif retry | same submit entity | Single notification | Idempotent create |
| Failed atomic | notif/service error | No orphaned row | Rollback entire txn |

</frozen-after-approval>

## Decisions (Checkpoint 1)

- **1A** — `POST /api/custom-tours/`
- **2A** — Full PRD §18.6 field set (optional preference text areas)
- **3A** — Optional `Idempotency-Key` header; same customer + key → same row (200 replay / 201 create)
- **4A** — Single `destination` text field
- **5A** — Builder + review on `/app/customer/custom-tours` + thin confirmation
- **6A** — UUID only (no hex reference)

## Code Map

- **New:** `backend/custom_tours/` — models (`CustomTour` + status enum), `CustomTourService.create`, serializers, Customer create view, urls, migrations, tests.
- **Wire:** `INSTALLED_APPS`, `config/urls.py`.
- **Reuse:** `packages.validators`; `notifications.services.NotificationService`; `common.permissions.IsCustomer`; booking patterns for atomic + idempotency tests.
- **New:** `frontend/src/features/customTours/` — form, review, `customToursApi.create`, confirmation snippet, `messages`, tests.
- **Update:** `frontend/src/App.jsx` — replace customer custom-tours Placeholder; optional Guest entry from landing/nav with `?next=`.
- **Continuity:** Placeholder admin/customer routes unchanged for admin list until 8.3; Explore/catalog untouched.

## Tasks & Acceptance

**Execution:**

- [x] `backend/custom_tours` — model, service, POST API, 7-day + field validation, transactional notification
- [x] Tests — happy path; &lt;7d reject; end&lt;start; guest deny; notif idempotent; idempotency header replay
- [x] `frontend/src/features/customTours` — builder + review + create + thin confirmation + Guest auth return
- [x] Vitest — FE validation blocks; submit success; idempotency key on submit

**Acceptance Criteria:** (from epics.md Story 8.1)

- Given Customer + valid form (≥7 days), when I submit successfully, then record is `PENDING`, private to me, and `custom_tour.submitted` is created in the same transaction.
- Given the same successful create’s notification identity is recorded again, then no duplicate notification.
- Given start within 7 days, when I submit, then backend rejects with no row and no notification.

## Implementation Notes

- `backend/custom_tours` — `CustomTour` + `CustomTourSubmitIdempotency`; `POST /api/custom-tours/`; `CustomTourService.create` + `custom_tour.submitted` in one transaction.
- `frontend/src/features/customTours` — builder/review, `Idempotency-Key` per submit attempt, confirmation at `/app/customer/custom-tours/confirmation?id=`.

## Spec Change Log

- 2026-11-17 — Checkpoint 1 approved (1A–6A); implemented Story 8.1.

## Review Triage Log

## Verification

**Commands (after implementation):**
- `cd backend && python manage.py test custom_tours`
- `cd frontend && npm test -- --run src/features/customTours`