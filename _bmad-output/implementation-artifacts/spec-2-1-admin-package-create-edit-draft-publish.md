---
title: '2.1 Admin Package Create, Edit, Draft, Publish'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'fb4c815d7a020542b4fb5cfdd4dfcba8817993cd'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins have no package inventory domain—Guests cannot later discover accurate catalog content, and publish/unpublish + audit do not exist.

**Approach:** Add a `packages` app with `TourPackage` + `PackageService`, Admin-only APIs/UI for create/edit, draft save, publish/unpublish (no seats), and persist audit rows atomically for create/update/publish_state_change.

## Boundaries & Constraints

**Always:**
- Admin-only mutations via `IsAdminRole` (`role == ADMIN`); Customer/Guest get 403. FE under `/app/admin/packages*` via existing Admin guards + `apiClient`.
- Catalog fields (PRD 5.2 / 18.2 text side): title, short/full description, destination(s), duration days+nights, starting location, base price, currency (free-text ISO code; OPEN-01 closed list = product follow-up), included/excluded services, itinerary, optional difficulty + cancellation/additional info. Cover/additional images nullable placeholders only—upload is Story 2.3.
- Lifecycle statuses: `DRAFT` | `PUBLISHED`. Create/save → draft; publish → `PUBLISHED`; unpublish → `DRAFT`. Only `PUBLISHED` is public-catalog eligible (public list UI = Epic 3). No package hard-delete in this story.
- Audit via exclusive `AuditService.record` in the same `transaction.atomic` as the state change; fail the transaction if audit fails. Actions: `package.create`, `package.update`, `package.publish_state_change`.
- No seat/capacity/remaining/slots fields or API surface. UUID PKs. Price display prep: `{amount} {CODE}` (no hardcoded `$`).
- MVP exclusions unchanged. Do not edit planning artifacts. Do not ship AvailableDate CRUD (2.2), media upload (2.3), or featured toggle/list polish (2.4)—`is_featured` may exist default `false` with no Admin toggle yet.
- Booking model does not exist yet: satisfy “historical bookings remain accessible” by never deleting the package on unpublish; full FK retention is proven when bookings land.

**Never:**
- Authorize package mutations with `is_staff` alone or in the FE alone.
- Invent seats, Stripe, JWT, quotations, email/SMS, object storage, or public Explore catalog UI.
- Hard-delete packages; skip or noop audit on create/update/publish_state_change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Save draft | Admin + valid required fields | Package stored `DRAFT`; `package.create` or `package.update` audit | 400 field errors keep form |
| Publish | Admin + existing draft | Status `PUBLISHED`; `package.publish_state_change` audit | Invalid → stay draft; surface errors |
| Unpublish | Admin + published package | Status `DRAFT`; package row retained; audit | Confirm in UI; API still authoritative |
| Non-Admin | Customer/Guest hits Admin package API | 403 | N/A |
| No seats | Inspect model/API/serializers | No capacity/seat/remaining/slots fields | N/A |

</frozen-after-approval>

## Code Map

- `backend/packages/` (new) -- `TourPackage` model, serializers, views, urls, `PackageService` (create/update/publish/unpublish); register in `INSTALLED_APPS` + `config/urls.py` under `/api/packages/`
- `backend/audit/` -- replace stub: `AuditLog` model + real `AuditService.record` persistence; update `tests/test_services.py`
- `backend/common/permissions.py` -- reuse `IsAdminRole`
- `backend/accounts/authentication.py` -- reuse `CsrfSessionAuthentication` via DRF defaults
- `frontend/src/features/packages/` (new) -- Admin list (minimal), create/edit form, publish/unpublish actions; wire in `App.jsx` replacing packages `PlaceholderPage`
- `frontend/src/services/apiClient.js` -- reuse for Admin package HTTP (no second client)
- `frontend/src/i18n/messages.js` -- Admin package form/status strings
- Continuity: Epic 1 Admin shell/guards; AuditService API shape from Story 1.3 stub

**Do not change:** planning docs; auth/seed/RBAC helpers beyond reuse; DESIGN token redesign; Stories 2.2–2.4 surfaces; `1-5a` rate-limit.

**Agent decisions:** Status enum `DRAFT`|`PUBLISHED` (unpublish → draft). Duration as `duration_days` + `duration_nights` integers. Destinations / included / excluded / itinerary as text fields. `is_featured` boolean default false, no UI. Persist `AuditLog` now so ACs are real. Minimal Admin list + form (card polish = 2.4). Prefer APITestCase + Vitest/RTL. No public package endpoints in this story.

## Tasks & Acceptance

**Execution:**
- [x] `backend/audit` -- AuditLog model + real `AuditService.record`; atomic-safe -- AD-4 / AD-22
- [x] `backend/packages` -- TourPackage + PackageService + Admin APIs (CRUD draft + publish/unpublish); IsAdminRole; no seats -- FR-PKG-01…04, 06, 09…12
- [x] `frontend/src/features/packages` + `App.jsx` -- Admin create/edit/draft/publish/unpublish UX via apiClient -- Flow 8
- [x] Tests -- Admin-only 403; draft→publish audit; unpublish retains row; no seat fields -- Story 2.1 AC

**Acceptance Criteria:**
- Given I am an Admin on Packages → Create, when I save a valid draft then publish, then the package is stored and marked published and an audit record is written and no capacity/seat fields exist
- Given I unpublish a published package, when I confirm unpublish, then it is no longer published (new bookings would be blocked) and the package record remains

## Implementation Notes

- `AuditLog` + persistent `AuditService.record`; package lifecycle calls it inside `transaction.atomic`.
- `packages` app: `TourPackage` (`DRAFT`|`PUBLISHED`), `PackageService`, Admin APIs under `/api/packages/admin/`.
- FE: Admin list/empty-state, create/edit form, confirm publish/unpublish; price helper `{amount} {CODE}`.
- Migrations: `audit/migrations/0001_*`, `packages/migrations/0001_*`. Compose backend rebuilt for tests.

## Spec Change Log

## Review Triage Log

- medium → patch — Blind: global DEFAULT_PAGINATION_CLASS — removed global default; packages Admin list uses `AdminPackagePagination` only.
- medium → patch — Blind/Edge: Admin list page 1 only — FE next/prev + count; reject non-`results` shape.
- medium → patch — Blind/Edge/claim: cover_image/additional_images writable — read-only until Story 2.3; service omits media writes.
- medium → patch — Blind/Edge/claim: invalid publish/unpublish transitions — reject non-DRAFT publish / non-PUBLISHED unpublish; `select_for_update`.
- medium → patch — Blind: is_staff alone unverified — force_authenticate CUSTOMER+is_staff mock → 403.
- medium → patch — Blind/VG: audit failure rollback — service test forces `record` raise; package/audit counts stay 0.
- medium → patch — Blind/Edge: ConfirmDialog Tab escape — Tab cycles within dialog.
- medium → patch — Blind: duration_days min=0 — FE min=1 + client Number guards.
- medium → patch — Blind/VG: FE “draft then publish” test — asserts update+publish after confirm.
- false — Blind: mojibake in UI copy — source UTF-8 ellipsis/dashes fine; diff encoding artifact.
- medium → patch — Blind/VG: customer/guest mutate endpoints — PATCH/publish/unpublish 403 coverage.
- medium → patch — Blind/VG: DELETE untested — Admin DELETE → 405 + row retained.
- low → patch — Blind: aria-required missing — required/`aria-required` on required fields.
- medium → patch — Blind/Edge: whitespace-only required text — serializer strip/blank reject.
- medium → patch — Blind: publish/unpublish queryset diverge — shared mixin `get_package` + ValidationError→400.
- medium → patch — Edge: InvalidOperation base_price in service — ValidationError mapping.
- medium → patch — Edge: load fail then save — `loadFailed` disables mutations.
- medium → patch — Edge: update-ok/publish-fail UX — sync form from update before publish.
- medium → patch — Edge: create missing id — guard before navigate.
- medium → patch — VG: Admin list contract untested — `test_admin_list_returns_created_package`.
- low (rejected) — Edge: unknown status labeled Draft — only DRAFT|PUBLISHED exist.
- defer — Other: unpublish clears `is_featured` without dedicated assert — Story 2.4 featured UX.

## Verification

**Commands:**
- `docker compose -f deploy/docker-compose.yml --env-file .env exec -T -e DJANGO_USE_SQLITE=1 backend python manage.py test packages audit` -- **15/15 OK**
- `npm test` (frontend) -- **43/43 PASS** (incl. 5 Admin packages UI)
