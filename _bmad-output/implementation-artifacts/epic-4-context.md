# Epic 4 Context: AI Tour Recommendations

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Users submit a free-text preference prompt and receive at most five recommendations drawn only from published packages—visually distinct from search, with clear why-match copy and failure isolation so AI outages never break catalog browse or search. Enables guided discovery from natural-language preferences before booking.

## Stories

- Story 4.1: Recommendation Service and API
- Story 4.2: AI Recommendations UI

## Requirements & Constraints

- Guests and Customers can enter a free-text prompt (destination, budget, duration, travelers, interests, activities, other preferences). The system matches against published packages only—never invent packages, prices, availability dates, or unpublished inventory.
- At most five recommendations per prompt, ranked by relevance to stated preferences. Each result shows title, cover, destination, duration, price, and a short why-match explanation.
- Recommendations must be visually distinguishable from ordinary search results. Selecting a recommendation opens package detail; Book Now auth-return for Guests is preserved for booking work (Epic 5).
- No matches or AI/provider failure: show controlled empty/error fallback messaging; Explore and search remain fully usable. Loading must show an async indicator (progress + accessible live region).
- Exact `/api/recommendations/` path segments are open for implementation; the namespace is reserved.
- Out of MVP for this epic: seats, Stripe, JWT, quotations, email/SMS, object storage, microservices, booking submit.

## Technical Decisions

- Own domain in `recommendations` app + `RecommendationService`; frontend `features/recommendations`. Thin views; service coordinates matching.
- Provider interface behind `RecommendationService`: rule-based and/or LLM-assisted matching; local default may be `mock` / heuristic, selected via `AI_PROVIDER` (and related env).
- API surface under `/api/recommendations/` (exact paths chosen at implementation). Failures return controlled error/empty responses without affecting packages catalog or search endpoints.
- Recommendation pool is published packages only (same published-only rule as public catalog and search). Do not let AI own or replace browse/search.

## UX & Interaction Patterns

- Entry: AI recommendations via nav / Landing. Flow: submit prompt → ≤5 published matches + why (distinct from search) → detail → Book Now → Sign in (Guest) → return to booking path for that package (intent preserved). Failure: empty/fail fallback; Explore still works.
- `card-package` for AI results includes why-match; price `{amount} {CODE}`. Loading / empty / fail: explicit progress copy plus status live region; empty/fallback keeps a path to Explore. Cold-load skeletons elsewhere remain layout-matched with `aria-busy` where applicable.
- AI surfaces must not look like search results lists—visual distinction is required.

## Cross-Story Dependencies

- Requires Epic 3: published packages readable via catalog/detail (and search remaining healthy under AI failure).
- Story 4.2 depends on Story 4.1.
- Epic 5 consumes detail/Book Now auth-return from AI → detail; do not implement booking submit here.
- Critical test focus: never return unpublished; force provider failure → catalog/search still succeed; UI kill-API → Explore still works.
