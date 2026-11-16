---
title: '3.4 Server-Side Search and Filters'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e7a6ec1593db38dda7bc1ab5c8fd1ab5920b5eb6'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Explore is browse-only—Guests/Customers cannot narrow published packages by text or destination/price/duration without leaving the catalog.

**Approach:** Extend the public published list with server-side free-text search and combinable destination/price/duration filters; add Explore controls with clear + no-match empty state. Client-only filtering is never authoritative.

## Boundaries & Constraints

**Always:**
- Search/filter operate on **published packages only** (`published()`); unpublished/draft never appear (FR-SEARCH-08). `AllowAny`; FE never sole auth.
- Free-text (`q`): case-insensitive match across title, destinations, short_description, full_description (OR within text; AND with filters) (FR-SEARCH-01/02/05).
- Filters (combinable, AND): destination (icontains on `destinations`); min/max price on `base_price`; duration = exact match on `duration_days` via a single integer control (FR-SEARCH-03/04).
- Clear restores default catalog (no search/filter params); informative no-match empty state with Clear (FR-SEARCH-06/07). Distinct from unfiltered empty catalog CTA.
- Reuse existing page-number pagination (page size 20). Invalid numeric filter values → **400** with field errors (parity with Admin featured validation style).
- Price display stays `{amount} {CODE}`. Loading skeletons/`aria-busy`; error recoverable. No AI / search microservice (AD-24 ORM).

**Never:**
- Client-side-only filtering as source of truth; invent a search service; Postgres FTS required (ORM `icontains` OK for MVP).
- Change Landing featured, package detail/Book Now, or Admin list/CRUD APIs (beyond leaving them alone).
- Epic 4 AI UI; Epic 5 booking; hardcode `$` prices; require login for Explore search.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Free-text + filters | `q` + destination/price/duration | Intersection of matches; published only | N/A |
| No matches | Criteria exclude all | Empty no-match state + Clear | N/A |
| Clear filters | Active criteria then Clear | Default published catalog page 1 | N/A |
| Draft in DB | Matches text but DRAFT | Excluded from results | N/A |
| Invalid price/duration | Non-numeric / min>max | 400 field errors | FE shows validation/error |
| Unauthenticated | Guest Explore search | 200 + filtered list | N/A |

</frozen-after-approval>

## Code Map

- `backend/packages/models.py` -- `title`, `destinations`, `short_description`, `full_description`, `base_price`, `duration_days`/`duration_nights`, `status`
- `backend/packages/services.py` -- `published()`; add `apply_public_catalog_filters(qs, params)` (or equivalent) for `q`/destination/price/duration
- `backend/packages/views.py` -- extend `PublicPackageListView.get_queryset` (+ validate in `list`); keep `?featured=` behavior for Landing
- `backend/packages/tests/` -- filter combos; unpublished excluded; invalid params 400; empty match
- `frontend/src/features/packages/packagesApi.js` -- extend `listPublishedPackages({ page, q, destination, min_price, max_price, duration… })`
- `frontend/src/features/packages/ExplorePage.jsx` -- search/filter form, Clear, no-match empty vs catalog-empty; pass params; reset page on apply
- `frontend/src/features/packages/AdminPackagesPage.jsx` -- UX pattern only (clear/filter-empty); do not change Admin API
- `frontend/src/i18n/messages.js` + Vitest -- explore search/filter/empty/clear copy
- Continuity: Story 3.1 Explore + pagination; Story 3.3 `?featured=` must keep working when search params absent

**Do not change:** planning docs; Landing featured UI; detail/Book Now; Admin feature/CRUD; Epic 4–5.

**Agent decisions:** Query param names: `q`, `destination`, `min_price`, `max_price`, `duration_days` (exact). Apply on form submit (not live keystroke spam). Clear clears controls and refetches unfiltered page 1. Prefer APITestCase + Vitest/RTL. Do not sync filters to the browser URL in this story unless trivial.

## Tasks & Acceptance

**Execution:**
- [x] `backend/packages` -- public search/filter query params + tests (combos, unpublished) -- FR-SEARCH-01…08
- [x] `frontend` Explore search/filter UI + Clear + no-match empty + API helper -- FR-SEARCH, UX empty-state
- [x] Tests -- match all criteria; no-match + clear; unpublished excluded -- Story 3.4 AC

**Acceptance Criteria:**
- Given published packages with distinct destinations/prices, when I apply free-text and filters, then results match all active criteria and exclude unpublished
- Given no packages match, when I search, then I see an informative empty state and can clear filters

## Implementation Notes

- Added `parse_public_catalog_filters` / `apply_public_catalog_filters` in `backend/packages/services.py`; `PublicPackageListView` validates then applies `q`, `destination`, `min_price`, `max_price`, `duration_days` on published (and optional featured) querysets. Invalid numerics / min>max → 400 field errors.
- Explore: submit-only filter form, Clear → unfiltered page 1, distinct `explore-no-match` empty vs catalog-empty; `listPublishedPackages` forwards filter params. No URL sync.
- Verified: `packages` Django suite **77/77 OK** (SQLite); `npm test -- src/features/packages` **58/58 PASS**. Filters not synced to browser URL (per agent decision).
- Walkthrough elicitation (error handling) — **applied correctness patches:** `q`/`destination` max 200 → 400; public list never masks invalid filters as 200+empty (DRF 400 instead of `.none()`); Explore distinguishes success / zero-match / failed request; HTTP 400 shows field errors + Clear primary (no Retry); Retry only for retryable/5xx. **Deferred:** `QuerySet.extra` refactor; public rate limit; FE numeric pre-validation (see `deferred-work.md`). Risk notes for reviewers: (1) validation vs no-match vs retryable must stay distinct, (2) length caps on free-text, (3) keep LIKE parameterized until expression refactor.

## Spec Change Log

## Review Triage Log

- medium → patch — Blind/VG: apply “resets to page 1” test never leaves page 1 — strengthen: navigate page 2 then Apply; assert `page: 1` + filters.
- medium → patch — VG: pagination/retry never asserted with active filters — after Apply, next/retry must keep `q`/filter params.
- medium → patch — VG: form `explore-clear-filters` unwired in tests — cover primary Clear, not only no-match Clear.
- medium → patch — Blind: no Vitest for 400 validation → error banner — add case; ApiError.message already surfaces first field error (not per-input binding).
- medium → patch — Blind/Edge: accept negative prices / duration ≤0 / non-finite Decimals — reject with 400 field errors; add API tests.
- medium → patch — Blind: `icontains` does not escape `%`/`_` — escape LIKE metacharacters for `q` and destination.
- medium → patch — Blind/Edge: defensive `get_queryset` re-parses raw params and can raise outside `list()` — apply cleaned filters only; if filters missing, parse in try/except and return empty published QS on ValidationError (never 500).
- medium → patch — Blind: double-parse cleaned dict through `apply_public_catalog_filters` — apply should consume cleaned dict from `parse_*` without re-stringifying/re-validating.
- medium → patch — Edge: filter apply fails while `page > 1` → retry uses stale page — on load error set `page` to 1 (or retry always `loadPage(1, appliedFilters)` when recovering from filter apply).
- false — Blind: sprint/spec still `in-progress` while tasks checked — process; step-05 → sprint `review`.
- false — Blind: FE “never” shows validation — `ApiError.message` uses first field error; matrix satisfied without per-field inputs.
- low (rejected) — Blind: Explore lacks skeleton UI on refetch — pre-existing 3.1 loading text + `aria-busy`; skeleton upgrade not required to ship search.
- low (rejected) — Blind: no live-region for result changes — a11y polish beyond story AC.
- low (rejected) — Blind: Implementation Notes lack CI artifact — notes are agent-owned verification record.
- false — Blind: missing single-sided price / whitespace-only API tests — whitespace omitted by `_optional_query_str`; single-sided bounds covered by combine test branches / optional add if cheap in same patch.
- defer — none beyond intentional no URL sync (agent decision).

## Verification

**Commands:**
- `DJANGO_USE_SQLITE=1 … manage.py test packages` -- **82/82 OK** (post walkthrough error-handling patches)
- `npm test -- src/features/packages` -- **63/63 PASS** (post walkthrough error-handling patches)
