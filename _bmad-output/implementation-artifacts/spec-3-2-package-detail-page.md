---
title: '3.2 Package Detail Page'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '548416eafebe96122341a5930b3a39549acd9ee0'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Explore cards link to a stub—Guests/Customers cannot inspect full package info or see whether Book Now applies.

**Approach:** Add a public published-only detail API + Explore detail page with FR-CAT-06 sections, active dates, images with aspect boxes, and Book Now only when published **and bookable**; otherwise hide Book Now and show why. Booking submit stays Epic 5 (CTA gates/links only).

## Boundaries & Constraints

**Always:**
- Public detail: `AllowAny`; FE guards never sole auth. Unpublished/draft → **404** (never bookable publicly).
- Detail payload includes FR-CAT-06 sections: title; cover + additional images; short/full description; destinations; duration days/nights; starting location; **active** available dates (`is_active=true`); optional difficulty; base price + currency; included/excluded; itinerary; cancellation/additional when present. Price `{amount} {CODE}`.
- **Bookable** (server-computed): package is `PUBLISHED` **and** has ≥1 active `AvailableDate` with `tour_date >= min_bookable_date()` (packages validators, `BUSINESS_TIMEZONE` / 7 calendar days). Expose `is_bookable` (+ short `unavailable_reason` when false) on the public detail response.
- Book Now (accent): show only when `is_bookable`. Guest → Sign in (preserve return to this detail / future booking). Customer → stub booking entry `/app/bookings/new?package=<id>` (Placeholder until Epic 5)—do not implement booking form/submit.
- Not bookable (published but no qualifying dates, or inactive-only dates): hide Book Now; show clear explanation (FR-CAT-09).
- Replace `PackageDetailPlaceholderPage` with real detail at `/explore/:id`. Images: cover + gallery with aspect boxes (cover 4/3); empty-cover fallback OK.
- MVP exclusions unchanged. No seats, Stripe, JWT, search (3.4), Landing featured (3.3), booking create.

**Never:**
- Return draft/unpublished on public detail; show Book Now for non-bookable packages.
- Invent booking submit/payment; authorize public detail with required login.
- Hardcode `$` prices; use Admin serializer as the public detail contract without a public-scoped shape.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bookable published | Active date ≥ min_bookable | Detail sections + Book Now | N/A |
| Published not bookable | No active dates / all < min_bookable | Detail + explanation; no Book Now | N/A |
| Draft/unpublished id | Public GET detail | 404 | N/A |
| Guest Book Now | Click CTA | Navigate Sign in with return intent | N/A |
| Customer Book Now | Click CTA | Navigate booking stub with package id | N/A |
| Empty cover | `cover_image` blank | Empty-cover / aspect box; no broken img | onError fallback |

</frozen-after-approval>

## Code Map

- `backend/packages/validators.py` -- reuse `min_bookable_date` / advance helpers
- `backend/packages/services.py` -- `get_published(pk)`; compute `is_bookable` from active dates vs min_bookable
- `backend/packages/serializers.py` -- public detail serializer (sections + active dates + `is_bookable` / `unavailable_reason`)
- `backend/packages/views.py` + `urls.py` -- `GET /api/packages/<uuid:pk>/` AllowAny published-only
- `backend/packages/tests/` -- bookable/not-bookable/404 unpublished; Guest unauth OK
- `frontend/src/features/packages/` -- replace placeholder with `PackageDetailPage`; `getPublishedPackage`; Book Now gating via Auth; link Guest→sign-in, Customer→`/app/bookings/new`
- `frontend/src/App.jsx` -- wire detail page; optional bookings/new Placeholder under Customer routes
- `frontend/src/i18n/messages.js` + Vitest -- detail sections, Book Now / unavailable
- Continuity: Story 3.1 Explore cards → `/explore/:id`; Epic 2 AvailableDate + media URLs; `formatPackagePrice`

**Do not change:** planning docs; Admin APIs; Explore list; Stories 3.3–3.4; Epic 5 booking create.

**Agent decisions:** Public detail at `GET /api/packages/<id>/`. Bookable = published + ≥1 active date ≥ `min_bookable_date()`. Show all active dates on detail (even near-term) but Book Now only when bookable. Guest Book Now → `/sign-in?next=/explore/<id>` (or equivalent). Customer → `/app/bookings/new?package=<id>` placeholder. Prefer APITestCase + Vitest/RTL.

## Tasks & Acceptance

**Execution:**
- [x] `backend/packages` -- public detail API + bookable computation + tests -- FR-CAT-06…10
- [x] `frontend` PackageDetailPage + Book Now gate/links; replace stub -- UX-DR2 book-now
- [x] Tests -- bookable shows CTA; not bookable hides + explanation; unpublished 404 -- Story 3.2 AC

**Acceptance Criteria:**
- Given a published bookable package exists, when I open its detail page, then I see the required information sections and a Book Now action
- Given a package is not bookable, when I open detail, then Book Now is hidden and an explanation is shown

## Implementation Notes

- `GET /api/packages/<uuid>/` AllowAny; `get_published` 404 for draft; `compute_bookability` via `min_bookable_date`.
- `PublicPackageDetailSerializer` + active dates; `PackageDetailPage` replaces stub; Book Now Guest→sign-in, Customer→bookings/new stub.
- Tests: `test_public_detail.py` + `PackageDetailPage.test.jsx`.

## Spec Change Log

## Review Triage Log

- medium → patch — Blind: remove leftover `PackageDetailPlaceholderPage` + Explore placeholder assertions; ensure `getPublishedPackage` covered in public API tests.
- false — Blind: sprint `in-progress` — process; step-05 → `review`.
- defer — Blind: Guest post-auth lands on detail not booking stub — Epic 5 owns booking return; detail return is intentional for now.
- medium → patch — Blind: hide Book Now for Admin (Guest/Customer only).
- medium → patch — Blind: mount `/app/bookings/new` under CustomerLayout with clearer stub copy.
- medium → patch — Blind: locale-format date list; prefer i18n unavailable copy (map server reason code → messages).
- medium → patch — Blind: avoid duplicate date queries on detail serializer (reuse/prefetch).
- medium → patch — VG: assert dates section + empty dates; non-404 error UI; multi-date ascending order API test.
- defer — VG: booking stub route smoke — href pinned; Epic 5 replaces stub.
- medium → patch — Edge: clear state on missing id; don’t overlay bootstrapping with error/not-found; fix aria-labelledby; hide empty gallery after all onError; guard `getPublishedPackage` id.
- low (rejected) — Blind: compute_bookability reason for non-published — public path only calls via published retrieve.

## Verification

**Commands:**
- `DJANGO_USE_SQLITE=1 … manage.py test packages.tests.test_public_detail` -- **9/9 OK**
- `npm test -- src/features/packages` -- **49/49 PASS** (post-review)
