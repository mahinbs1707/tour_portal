---
title: '2.2 Available Dates Management (Deactivate, Never Hard-Delete with Bookings)'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '7a775950903550724308d87522210b946450a428'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Packages have no Admin-managed travel dates, so later booking cannot offer calendar options, and there is no safe deactivate path when a date is referenced by bookings.

**Approach:** Add `AvailableDate` under `packages` with Admin APIs/UI to add/edit/remove dates (no seats), hard-delete only when unreferenced, deactivate (`is_active=false`) when bookings reference the row, plus the shared 7-calendar-day advance helper (warn in Admin UI; booking enforce later).

## Boundaries & Constraints

**Always:**
- Admin-only date mutations via `IsAdminRole`; Customer/Guest → 403. FE under existing `/app/admin/packages/:id` (or nested dates section) via `apiClient`.
- Model: UUID PK; FK to `TourPackage`; `tour_date` (date); `is_active` (default true). No seat/capacity/remaining/slots fields. Do not unique-constrain across customers for bookings; for Admin inventory, unique `(package, tour_date)` is allowed so one calendar option per day per package.
- Remove path: if no booking FK references → hard-delete OK; if referenced → reject hard-delete and allow deactivate so the date is not offered for new bookings while the row remains. Booking model may not exist yet: detect references via reverse relation `bookings` when present; tests may simulate a referenced date without shipping Epic 5 booking APIs.
- Audit atomically with the change: `available_date.create`, `available_date.deactivate` (closed catalog). Fail the transaction if audit fails.
- Shared 7-calendar-day advance validator lives in `packages` using `BUSINESS_TIMEZONE` (Asia/Dhaka default), callable later from bookings/custom tours. Admin UI warns when a selected/added date falls within the next 7 calendar days; do not hard-block Admin create on that rule in this story (booking backend will enforce later).
- MVP exclusions unchanged. Do not edit planning artifacts. No media (2.3), featured UX (2.4), public catalog, or real booking submit.

**Never:**
- Authorize date mutations with `is_staff` alone or in the FE alone.
- Invent seat inventory, “fully booked,” Stripe, JWT, or object storage.
- Hard-delete an `AvailableDate` that still has booking FK references.
- Skip or noop audit on create/deactivate.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add date | Admin + valid future `tour_date` | Date stored `is_active=true`; `available_date.create` audit | 400 on invalid/duplicate package+date |
| Warn <7 days | Admin picks date within next 7 calendar days (Asia/Dhaka) | UI warning; create still allowed | Helper explains lead time |
| Remove unreferenced | Admin deletes date with no booking refs | Row hard-deleted; no longer listed | N/A |
| Delete referenced | Admin DELETE when booking FK exists | Rejected; row unchanged | 409/400 clear error |
| Deactivate referenced | Admin deactivates referenced date | `is_active=false`; audit `available_date.deactivate`; still retained | N/A |
| No seats | Inspect model/API | No capacity/seat/remaining/slots | N/A |
| Non-Admin | Customer/Guest hits date APIs | 403 | N/A |

</frozen-after-approval>

## Code Map

- `backend/packages/models.py` -- add `AvailableDate` (FK `TourPackage`, `tour_date`, `is_active`); unique `(package, tour_date)`
- `backend/packages/services.py` -- extend `PackageService` (or date helpers): create/update/delete/deactivate + audit; `has_booking_references()` via related `bookings` manager when present
- `backend/packages/validators.py` (new) -- shared `min_bookable_date` / 7-calendar-day advance using `settings.BUSINESS_TIMEZONE`
- `backend/packages/serializers.py` + `views.py` + `urls.py` -- Admin nested routes e.g. `/api/packages/admin/<package_id>/dates/` + detail/deactivate/delete
- `backend/common/permissions.py` -- reuse `IsAdminRole`
- `frontend/src/features/packages/` -- date list/add/edit/remove/deactivate on package edit page; warn <7 days; reuse `ConfirmDialog` / `apiClient`
- `frontend/src/i18n/messages.js` -- date management strings
- Continuity: Story 2.1 `TourPackage`, `PackageService`, Admin form, `AuditService`

**Do not change:** planning docs; auth/seed; package publish lifecycle beyond attaching dates; Stories 2.3–2.4; invent Booking CRUD UI.

**Agent decisions:** Unique `(package, tour_date)`. Admin create of near-term dates allowed with UI warning only. Hard-delete when unreferenced; deactivate when referenced. Reference detection via `bookings` reverse relation (mock/simulate in tests until Epic 5). No new audit action for plain date field edits beyond create/deactivate. Prefer APITestCase + Vitest/RTL.

## Tasks & Acceptance

**Execution:**
- [x] `backend/packages` -- AvailableDate model + migration; create/edit/delete/deactivate + audit; 7-day validator module; no seats -- FR-PKG-07/08, AD-20, OPEN-03
- [x] `frontend/src/features/packages` -- Admin date management on package edit + <7-day warning -- Flow 8 / UX date picker
- [x] Tests -- unreferenced delete OK; referenced delete rejected + deactivate OK; Admin-only; no seat fields; audit on create/deactivate -- Story 2.2 AC

**Acceptance Criteria:**
- Given a package has an available date with no bookings, when I remove that date via Admin, then the date is removed and no longer offered
- Given a package has an available date referenced by a booking, when I attempt to hard-delete that date, then the system rejects hard-delete and I can deactivate it so it is not offered for new bookings while the row remains
- Given I manage dates, when I inspect the data model/API, then there are no seat/capacity/remaining/slots fields

## Implementation Notes

- `AvailableDate` + `uniq_package_tour_date`; nested Admin APIs under `/api/packages/admin/<package_id>/dates/`.
- `packages.validators` shared 7-day advance helpers; FE warns only.
- Delete → 409 when `has_booking_references()`; deactivate audits `available_date.deactivate`.
- Admin dates panel on package edit only (after create).

## Spec Change Log

## Review Triage Log

- (session) Matrix covered by `test_available_dates` + AdminAvailableDates Vitest; subagent review layers skipped (usage limit) — human may re-run Blind/Edge/VG if desired.

## Verification

**Commands:**
- `docker compose -f deploy/docker-compose.yml --env-file .env exec -T -e DJANGO_USE_SQLITE=1 backend python manage.py test packages` -- **21/21 OK**
- `npm test -- src/features/packages` (frontend) -- **9/9 PASS**
