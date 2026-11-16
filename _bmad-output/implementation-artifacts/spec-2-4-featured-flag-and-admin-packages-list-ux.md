---
title: '2.4 Featured Flag and Admin Packages List UX'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e59dfd850f93b677c700538529168e43601bbdd5'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins cannot mark published packages featured for Landing, and the Admin packages list lacks filters / featured affordances needed for tablet-friendly catalog ops.

**Approach:** Add Admin-only feature/unfeature for **published** packages (persist `is_featured`), list filters, and polish the existing stacked-card Admin list + detail so narrow viewports stay card/drill-in (no horizontal-only tables)—no public Landing UI yet.

## Boundaries & Constraints

**Always:**
- Admin-only via `IsAdminRole`; Customer/Guest → 403. FE under `/app/admin/packages*` via `apiClient`.
- Feature/unfeature only when `status == PUBLISHED`. Reject featuring drafts (clear 400). Unpublish already clears `is_featured`—keep that and cover with a test.
- Keep JSON create/update `is_featured` read-only; mutate only via dedicated feature/unfeature endpoints (same shape as publish/unpublish). Audit successful feature/unfeature as `package.update` in `transaction.atomic`.
- Admin list: query filters for `status` (`DRAFT`|`PUBLISHED`) and `featured` (`true`|`false`); pagination unchanged. Stacked cards → detail on all breakpoints (no table). Cards show status + featured chip; empty-state + Create CTA retained.
- Detail/edit: feature/unfeature control when published; after unpublish, UI shows not featured.
- Persist `is_featured` so Epic 3 Landing can query later; do **not** ship public Landing/Explore endpoints here.
- MVP exclusions unchanged. No seats, Stripe, JWT, object storage, public catalog.

**Never:**
- Authorize with `is_staff` alone or FE-only checks.
- Allow featuring a non-published package; invent public featured Landing UI; replace cards with a wide-only table.
- Skip audit on successful feature/unfeature; mutate `is_featured` via JSON PATCH.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Feature published | Admin + PUBLISHED package | `is_featured=true`; audit `package.update` | N/A |
| Unfeature | Admin + featured published | `is_featured=false`; audit | N/A |
| Feature draft | Admin + DRAFT | Rejected; unchanged | 400 clear error |
| Non-Admin | Customer/Guest feature API | 403 | N/A |
| Unpublish featured | Admin unpublishes | Status DRAFT; `is_featured=false` | N/A |
| List filter | Admin `?status=` / `?featured=` | Filtered page of results | Invalid filter → 400 or ignore per agent |
| Narrow list | Admin on md/sm | Stacked cards → detail; no horizontal-only table | N/A |

</frozen-after-approval>

## Code Map

- `backend/packages/models.py` -- reuse `is_featured` (no migration)
- `backend/packages/services.py` -- `feature` / `unfeature` (published-only); keep unpublish clearing featured; audit `package.update`
- `backend/packages/serializers.py` -- keep `is_featured` read-only on TourPackageSerializer
- `backend/packages/views.py` + `urls.py` -- `POST …/admin/<pk>/feature/` + `…/unfeature/`; Admin list `filter_queryset` for `status` + `featured` query params; reuse `IsAdminRole` / pagination
- `frontend/src/features/packages/packagesApi.js` -- feature/unfeature + list query params
- `frontend/src/features/packages/AdminPackagesPage.jsx` -- status/featured filters; featured chip on cards; keep stacked-card layout (no table)
- `frontend/src/features/packages/AdminPackageFormPage.jsx` -- feature/unfeature when PUBLISHED; sync `is_featured` after publish/unpublish
- `frontend/src/i18n/messages.js` + Vitest -- labels + coverage
- Continuity: Story 2.1–2.3 package lifecycle, media panel, dates panel, ConfirmDialog; deferred assert that unpublish clears featured

**Do not change:** planning docs; auth/seed; media upload; dates logic; Epic 3 public Landing/Explore.

**Agent decisions:** Dedicated feature/unfeature routes (not JSON PATCH). Invalid list filter values → 400. Audit as `package.update`. List already card-based—enhance with filters/chips, do not introduce tables. No public featured endpoint in this story.

## Tasks & Acceptance

**Execution:**
- [x] `backend/packages` -- feature/unfeature service+APIs; list filters; unpublish-clears-featured test; Admin-only -- FR-PKG-05
- [x] `frontend/src/features/packages` -- list filters + featured chip; detail feature toggle; stacked cards retained -- UX-DR5, Flow 8
- [x] Tests -- feature published OK; draft feature 400; non-Admin 403; unpublish clears featured; filter query; narrow list remains cards -- Story 2.4 AC

**Acceptance Criteria:**
- Given I have a published package, when I mark it featured, then featured status persists and is available to Landing queries (field returned/filterable for later Epic 3)
- Given I use Admin packages on a narrow viewport, when I browse the list, then I get stacked cards / detail drill-in rather than horizontal-only tables

## Implementation Notes

- `PackageService.feature` / `unfeature` (published-only); audit `package.update`; unpublish clears featured.
- Routes: `POST …/admin/<pk>/feature/` and `…/unfeature/`; list `?status=` / `?featured=` (invalid → 400).
- FE: list filters + featured chip; detail feature toggle; stacked cards (no table).
- Tests: `test_featured_and_list_filters.py` + AdminPackages Vitest filter/chip/toggle cases.

## Spec Change Log

## Review Triage Log

- false — Blind: sprint still `in-progress` — process; step-05 sets `review`.
- medium → patch — Blind: filter-empty copy says clear filters but no Clear control — add Clear filters when filters active.
- medium → patch — Blind/VG: detail unfeature path untested — add Vitest case.
- medium → patch — Blind/VG: unfeature audit not asserted — extend BE test.
- medium → patch — Blind: feature/unfeature always audits when already at target — no-op return without redundant audit when already featured/unfeatured.
- low (rejected) — Blind: no ConfirmDialog on feature — less destructive than unpublish; intent does not require confirm.
- low → patch — Blind: missing `aria-pressed` on feature toggle.
- medium → patch — Blind/Edge: list load ignores cancelled / stale filter response — request-generation guard before setState.
- low (rejected) — Blind: list omits “not featured” chip — intentional; detail shows both.
- false — Blind: epic-2-context wording — regenerate artifact, not a Story 2.4 code defect.
- false — Edge: package deleted mid-feature → 500 — no package hard-delete API; unreachable.
- medium → patch — VG: packagesApi list/feature/unfeature URL shapes untested.
- medium → patch — VG: unfeature draft rejection untested.
- defer — VG: filter-empty title copy untested — copy-only; Clear control + API shape patches matter more.

## Verification

**Commands:**
- `docker compose -f deploy/docker-compose.yml --env-file .env exec -T -e DJANGO_USE_SQLITE=1 backend python manage.py test packages` -- Docker Desktop unavailable this session; implementer reported **41/41 OK** via local SQLite
- `npm test -- src/features/packages` (frontend) -- **28/28 PASS** (post-review)
