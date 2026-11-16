---
title: '3.1 Public Catalog Listing'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '2fcb0667144ed6ea7c8ac7c0f4af8ec7ad4e24a5'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Guests have no public Explore catalog—published packages from Epic 2 are invisible to discovery.

**Approach:** Add an unauthenticated published-only list API plus an Explore page of `card-package` cards (price `{amount} {CODE}`), empty state with one CTA, and page-number pagination—no search/filters/detail/Landing featured yet.

## Boundaries & Constraints

**Always:**
- Public list requires no auth (`AllowAny`); FE route guards never sole authorization. Admin mutations stay behind `IsAdminRole` on `/api/packages/admin/`.
- List **only** `status=PUBLISHED`. Draft/unpublished never appear. Guest, Customer, and Admin (as public visitors) all see the same published catalog.
- Card fields: title, cover image URL, short description, destination(s), duration (days/nights), starting price, currency; include `id` for detail navigation. Price display `{amount} {CODE}` (reuse `formatPackagePrice`); no hardcoded `$`.
- Separate **public** serializer/list response—do not reuse Admin serializer as-is (no Admin-only write shape; keep public payload card-scoped).
- Pagination: page-number; default page size **20** (match AdminPackagePagination). Document via code constant.
- Explore at `/explore` under `PublicLayout`, replacing `PlaceholderPage`. Empty catalog: shared empty-state pattern (headline + sentence + **one** CTA → Landing `/`). Loading: simple busy/skeleton with `aria-busy`.
- Cards link to `/explore/:id` for Story 3.2; this story may leave detail as a minimal placeholder route (not full detail API/UI).
- MVP exclusions unchanged. No seats, Stripe, JWT, search/filter (3.4), Landing featured (3.3), Book Now/detail (3.2), booking submit.

**Never:**
- List drafts/unpublished on the public API or Explore UI.
- Authorize public list with session required; invent search microservice or client-only catalog authority.
- Ship Admin list UX changes as this story’s goal; hardcode `$` prices.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Published exist | Guest opens Explore / GET public list | Cards with title, cover, short desc, destination, duration, price+currency; paginated | N/A |
| Empty published | No PUBLISHED rows | Empty state + one CTA to `/` | N/A |
| Drafts only | Only DRAFT packages | API excludes them; Explore empty state | N/A |
| Unauth OK | No session on public list | 200 + published results | N/A |
| Page 2 | `?page=2` when enough rows | Next page of published only | Invalid page → DRF empty/404 per convention |

</frozen-after-approval>

## Code Map

- `backend/packages/serializers.py` -- add public card serializer (read-only card fields)
- `backend/packages/services.py` or queryset helper -- `published()` queryset (status=PUBLISHED)
- `backend/packages/views.py` + `urls.py` -- `GET /api/packages/` (or equivalent public list under packages URLconf) `AllowAny` + page size 20; keep `/admin/` Admin-only
- `backend/packages/tests/` -- unpublished excluded; empty; unauth 200; card fields present
- `frontend/src/features/packages/` -- public list API helper; `ExplorePage` / `PackageCard`; reuse `formatPackagePrice`
- `frontend/src/App.jsx` -- `/explore` → ExplorePage; optional `/explore/:id` placeholder for 3.2
- `frontend/src/i18n/messages.js` + Vitest -- Explore empty/list copy + tests
- Continuity: Epic 2 `TourPackage`, `MEDIA` cover URLs, AdminPackagePagination size 20, PublicLayout nav Explore link

**Do not change:** planning docs; Admin package CRUD/media/dates/featured; Story 3.2–3.4 full surfaces beyond placeholder detail route.

**Agent decisions:** Public list at `GET /api/packages/` (admin remains `/api/packages/admin/`). Public serializer card-scoped. Detail route stub only. Empty CTA → `/`. Page size 20. Prefer APITestCase + Vitest/RTL.

## Tasks & Acceptance

**Execution:**
- [x] `backend/packages` -- public published-only list API + serializer + tests -- FR-CAT-01…05, AD-11/24
- [x] `frontend` Explore page + cards + empty state; wire App route -- UX-DR2/14
- [x] Tests -- unpublished excluded; empty CTA; card fields; unauth OK -- Story 3.1 AC

**Acceptance Criteria:**
- Given published packages exist, when I open Explore, then I see cards with title, cover, short description, destination, duration, starting price, currency
- Given no published packages exist, when I open Explore, then I see an empty state with one clear CTA
- Given draft/unpublished packages exist, when I call the public catalog API, then they are excluded

## Implementation Notes

- `GET /api/packages/` AllowAny + `published()` queryset; `PublicPackageCardSerializer`; `PACKAGE_LIST_PAGE_SIZE=20`.
- Explore `/explore` with `PackageCard` + empty CTA → `/`; `/explore/:id` stub for 3.2.
- Tests: `test_public_catalog.py` + Explore/public Vitest.

## Spec Change Log

## Review Triage Log

- false — Blind: Placeholder missing from diff — file exists on disk as `PackageDetailPlaceholderPage.jsx`; include in commit.
- medium → patch — Blind: Guest/Customer/Admin-as-visitor same public list untested for authenticated roles — add Customer (and Admin) session GET `/api/packages/` still published-only.
- medium → patch — Blind/VG: Explore pagination UI untested — click next asserts `listPublishedPackages({ page: 2 })`.
- low → patch — Blind: error path has no retry — add retry control calling `loadPage(page)`.
- medium → patch — Blind/Edge: error catch leaves stale count/hasNext/hasPrev — reset pagination flags on error.
- low (rejected) — Blind: unmount cards while loading — acceptable MVP loading pattern; skeletons deferred.
- false — Blind: sprint still in-progress — process; step-05 sets review.
- false — Blind: action_items `ref` vs `refs` — Epic 2 retro script output; out of Story 3.1 scope.
- false — Blind: PackageService-split action after Epic 3 start — prior retro timing; not a 3.1 code defect.
- low (rejected) — Blind: FE `PACKAGE_LIST_PAGE_SIZE` unused in fetch — backend owns page size; constant documents shared default.
- low → patch — Blind: dead `cancelled` only checked before await — rely on generation bump; simplify effect.
- medium → patch — VG: Explore load-failure alert untested.
- medium → patch — VG/Blind: empty-cover PackageCard branch untested.
- medium → patch — Edge: PackageCard null/`id` guards + cover `onError` fallback.
- medium → patch — Edge: `listPublishedPackages` coerce invalid page to 1.

## Verification

**Commands:**
- Docker Compose packages test unavailable this session; local SQLite **50/50 OK** (implementer)
- `npm test -- src/features/packages` (frontend) -- **41/41 PASS** (post-review)
