---
title: '3.3 Landing Hero and Featured Packages'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '40cb784daa099236b1ff0e34f164c9f9af7d7d7d'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/` is brand chrome only—Guests never see a hero or featured published packages that Admin already marks.

**Approach:** Upgrade public Landing with a hero-banner introducing Tour Portal plus a featured section fed by a published+featured public query; cards link to detail; empty featured gets a clear empty state. Nav stays role-aware via existing PublicLayout.

## Boundaries & Constraints

**Always:**
- Landing `/` remains `AllowAny` public (FR-LP-01). Featured packages: **published and `is_featured=true` only** (FR-LP-04/06). Unpublished/draft never appear.
- Hero introduces the platform with brand-level **Tour Portal** signal (UX-DR4); featured cards reuse `PackageCard` → `/explore/:id` (FR-LP-05).
- Empty featured: shared empty-state pattern (headline + one sentence + one CTA, typically Explore) (FR-LP-07).
- Navigation adapts by auth/role via existing `PublicLayout` / `resolveTopNavItems` (FR-LP-08)—do not invent a second nav. Guest chrome stays Explore · AI · Sign in · Sign up (Story AC); Search filters are Story 3.4; custom-tour create stays later.
- Public featured query is server-authoritative (`AllowAny`); FE filters are never sole authorization.
- Price on cards stays `{amount} {CODE}` via existing helpers. Skeletons/`aria-busy` while featured loads; error state recoverable.
- Hero visual: brand + short promise/copy + Explore CTA inside a `hero-banner` aspect frame (21/9 desktop, 4/5 mobile) using existing coastal design tokens/atmosphere; no photo asset; decorative `alt=""` if any non-content image is used.

**Never:**
- Show draft/unpublished in featured; client-only featured filtering as the source of truth.
- Redesign Admin feature/unfeature APIs or Explore/detail/Book Now.
- Implement Story 3.4 search/filters, Epic 4 AI UI, Epic 5 booking submit.
- Hardcode `$` prices; require login to view Landing/featured.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Guest opens `/` | Featured published exist | Hero + featured cards linking to detail | N/A |
| Empty featured | No published+featured | Hero + empty state + Explore CTA | N/A |
| Draft marked featured in DB (invalid) | Draft + is_featured | Public query excludes (status gate) | N/A |
| Featured load fails | API error | Error message; rest of Landing usable | Retry or Navigate Explore |
| Auth Customer/Admin on `/` | Session present | Same hero/featured; nav adapts via layout | N/A |

</frozen-after-approval>

## Code Map

- `backend/packages/services.py` -- `published()`; add featured published helper or filter (`is_featured=True`) for Landing
- `backend/packages/views.py` + `urls.py` -- extend `PublicPackageListView` with `?featured=true` (published ∩ featured only; invalid values 400 like Admin) **or** dedicated featured list—prefer query-param parity with Admin
- `backend/packages/serializers.py` -- reuse `PublicPackageCardSerializer` (do not expose admin-only `is_featured` on cards unless needed; filtering is server-side)
- `backend/packages/tests/` -- unpublished never in `?featured=true`; draft excluded; empty list OK
- `frontend/src/features/packages/packagesApi.js` -- `listPublishedPackages({ featured: true })` (or thin `listFeaturedPackages` wrapper)
- `frontend/src/features/packages/PackageCard.jsx` -- reuse for featured grid
- `frontend/src/features/public/LandingPage.jsx` -- hero-banner + featured section + empty/error/skeleton
- `frontend/src/layouts/PublicLayout.jsx` + `navConfig.js` -- reuse; do not fork nav for Landing
- `frontend/src/i18n/messages.js` -- landing hero/featured/empty copy
- Continuity: Story 2.4 `is_featured` + feature APIs; Story 3.1 public list + `PackageCard` + Explore empty-state pattern; Story 3.2 detail links

**Do not change:** planning docs; Admin feature endpoints; Explore list/detail; Stories 3.4; Epic 4–5.

**Agent decisions:** Prefer `GET /api/packages/?featured=true` on the existing public list (published queryset ∧ `is_featured`) over a new URL. Landing shows first page of featured (shared page size 20)—no Landing pagination UI unless count exceeds and product asks later. Hero includes one primary Explore CTA in addition to top nav. Prefer APITestCase + Vitest/RTL.

## Tasks & Acceptance

**Execution:**
- [x] `backend/packages` -- public featured query + tests (unpublished never) -- FR-LP-04/06
- [x] `frontend` Landing hero + featured grid/empty/skeleton + API helper -- FR-LP-01…08, UX-DR2/4
- [x] Tests -- featured published only; empty featured state; hero present -- Story 3.3 AC

**Acceptance Criteria:**
- Given I open `/` without auth, when the landing loads, then I see hero branding and navigation to Explore, AI, Sign in/up, and featured packages are published only
- Given no featured published packages, when Landing loads, then an empty featured state is shown

## Implementation Notes

- 2026-11-16 — Implemented Story 3.3: `GET /api/packages/?featured=true|false` on public list (published ∩ featured; invalid → 400); `featured_published()` helper; Landing hero-banner (21/9 desktop, 4/5 mobile, token atmosphere, Explore CTA) + featured grid via `PackageCard` / `listFeaturedPackages`; empty/skeleton/error+retry. Verified: Django `packages` **68 OK** (`.test-venv` + SQLite); Vitest `src/features/packages` + `src/features/public` **58 OK**. Risk: Landing shows first featured page only (page size 20), no pagination UI. Did not commit.
- 2026-11-16 — Review fixes: public list `get_queryset` uses `featured_published()` / `published().filter(is_featured=False)`; FE featured param case-normalized via `String(...).toLowerCase()`; Landing hero gradients token-only (`color-mix` + CSS vars); nullish package rows filtered before map; Vitest covers malformed `results`. Targeted tests: Django featured **8 OK**; Vitest public API + Landing **20 OK**.

## Spec Change Log

## Review Triage Log

- medium → patch — Blind: `featured_published()` unused; view inlines `published().filter(is_featured=…)` — wire helper for `featured=true` (and non-featured branch) so Landing query can't drift from the helper.
- false — Blind: sprint `in-progress` vs spec `in-review` — process; step-05 moves sprint to `review`.
- false — Blind: Customer/Admin Landing nav untested — nav is `PublicLayout` / `resolveTopNavItems`; role chrome covered outside Landing; matrix expects layout reuse.
- medium → patch — Blind: no Vitest for non-array `results` → generic error — add coverage for that branch.
- medium → patch — Blind: hero hardcodes `#c5dede` / raw `rgba` — replace with design-token CSS variables only.
- defer — Blind/Edge: featured count > page size silently truncated — intentional agent decision (first page only); no Landing pagination UI this story.
- low (rejected) — Blind: duplicate public vs Admin featured validation tuples — Admin pre-existing; unifying adds cross-surface churn without user harm.
- low (rejected) — Blind: missing `TRUE`/`FALSE` case tests — view already `.lower()`s; everyday clients send lowercase.
- low (rejected) — Blind: error Explore link reuses `heroCta` — cosmetic copy sharing; empty state already has dedicated CTA.
- medium → patch — Blind/Edge: `listPublishedPackages` drops non-canonical `featured` (e.g. `"TRUE"`) so callers get unfiltered catalog — normalize case; ignore invalid without sending bare list as “featured”.
- false — Blind: Tailwind `w-3/4` / `w-1/2` may be missing — standard Tailwind width fractions; project already uses Tailwind utility classes elsewhere.
- low (rejected) — Blind: redundant `assertNotIn` after empty results — test noise only.
- medium → patch — Edge: `results` with nullish rows → `key={pkg.id}` throws before `PackageCard` guard — filter to objects with `id` before map.
- (verification-gap) — No verification gaps found.

## Verification

**Commands:**
- `DJANGO_USE_SQLITE=1 … manage.py test packages` -- **68/68 OK** (post-review)
- `npm test -- src/features/packages src/features/public` -- **61/61 PASS** (post-review)
