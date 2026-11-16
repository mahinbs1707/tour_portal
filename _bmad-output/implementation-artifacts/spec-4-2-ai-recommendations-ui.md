---
title: '4.2 AI Recommendations UI'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e47846f5e7d2bb401e02869673bf35ad1b5e8a05'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-1-recommendation-service-and-api.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/ai` is still a Placeholder—Guests/Customers cannot submit a preference prompt or see recommendation cards with why-match, loading, or failure fallbacks.

**Approach:** Replace `/ai` with a recommendations UI that POSTs to Story 4.1’s API, shows ≤5 dedicated recommendation cards (cover/title/why → detail), add a secondary Landing CTA to `/ai`, and keep Explore usable on empty/provider failure.

## Boundaries & Constraints

**Always:**
- Public page at `/ai` (replace Placeholder); Guests and Customers may use it (AllowAny API).
- Prompt form → `POST /api/recommendations/` via existing `apiClient` (CSRF). Prompt rules match 4.1: trim; reject blank; max **2000**.
- Success **200** with results: ≤5 **`RecommendationCard`**s showing package info + AI **why**; click → `/explore/:id` (PackageDetail Book Now / Guest `?next=` unchanged).
- Dedicated `RecommendationCard` (not `PackageCard`): reuse shared primitives/formatters where useful; do **not** duplicate package business logic; leave `PackageCard` unchanged for catalog browse.
- Success **200** empty `results`: empty-success fallback (not error chrome).
- **400** field errors on `prompt`: validation messaging; no fake cards.
- **502/503** `{ error: { code, message } }`: provider-failure fallback; no list; Explore/search still reachable and working.
- Loading: progress copy + accessible status live region (`aria-live` / `aria-busy` as appropriate) (NFR-10; UX-DR11).
- Landing: keep **Explore Packages** as primary CTA; add **secondary** CTA (e.g. “Find tours with AI”) → `/ai`; preserve approved coastal visual design and responsive layout.
- AI page + Landing CTA: accessible, responsive, covered by appropriate tests.
- i18n via `frontend/src/i18n/messages.js`.

**Never:** Call Explore search as the engine; invent packages; change Admin/packages APIs; implement booking submit (Epic 5); reimplement Book Now on the AI page; change Story 4.1 HTTP contracts; mutate `PackageCard` for catalog behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Happy path | Valid prompt; 200 ≤5 | RecommendationCards + why; open detail | N/A |
| Empty success | 200 `{ results: [] }` | Empty fallback + Explore link | Not error chrome |
| Provider fail | 502/503 | Fail fallback; Explore still works | No cards |
| Validation | Blank/overlong / 400 | Field error on prompt | No cards |
| Loading | In-flight POST | Progress + live region | N/A |
| Landing CTA | Guest on Landing | Secondary CTA → `/ai`; primary stays Explore | N/A |
| Guest AI | Unauthenticated | Same page/API; detail Book Now → sign-in | N/A |
| Isolation | AI API mocked fail | Explore still loads | Catalog unaffected |

</frozen-after-approval>

## Code Map

- `frontend/src/App.jsx` — replace `PlaceholderPage` on `path="ai"` with recommendations page
- `frontend/src/features/recommendations/` — new: page, `RecommendationCard`, API wrapper, tests
- `frontend/src/features/packages/PackageCard.jsx` — **do not change** catalog card behavior
- `frontend/src/features/public/LandingPage.jsx` (+ test) — secondary CTA → `/ai`; keep primary Explore; coastal layout
- `frontend/src/services/apiClient.js` — reuse `apiRequest` / CSRF / `ApiError` / `normalizeDrfError`
- `frontend/src/i18n/messages.js` — `messages.ai` (+ Landing secondary CTA copy)
- `frontend/src/config/navConfig.js` — already links `/ai`; keep
- Continuity: Story 4.1 POST contracts; PackageDetail Book Now / `?next=`; shared `formatPackagePrice` OK
- Do not change: Explore search/filters; Admin; booking stub; 4.1 backend

**Agent decisions:** Client blank/length checks before POST; distinct copy for 400 vs 502/503 vs empty-200; kill-API isolation in FE tests. Prefer vitest + RTL + MemoryRouter. RecommendationCard may share cover/price formatting helpers with packages without rewriting PackageCard.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/features/recommendations/` — page + RecommendationCard + API + loading/empty/fail/validation -- FR-AI-01/02/06…09; NFR-10
- [x] `App.jsx` + `messages.js` + `LandingPage` — wire `/ai`; secondary Landing CTA; responsive/a11y -- UX-DR11/16 Flow 3
- [x] Tests — ≤5+why; empty; 400; 502/503; loading a11y; Landing CTA; Explore isolation -- Story 4.2 AC

**Acceptance Criteria:**
- Given I am on AI recommendations, when I submit a prompt and results exist, then I see ≤5 distinct RecommendationCards with cover/title/why and can open detail
- Given no matches or AI fails, when I submit a prompt, then I see fallback messaging and can still use Explore/search
- Given I am on Landing, when I use the secondary AI CTA, then I reach `/ai` while Explore remains the primary CTA

## Implementation Notes

- `/ai` → `AiRecommendationsPage`; dedicated `RecommendationCard`; Landing secondary CTA; `PackageCard` untouched.
- Review patches: aria-describedby, h3 titles, status/alert roles, id filter/dedupe, unmount generation bump, provider message typeof guard, generic-fail + title/cover tests.

## Spec Change Log

- 2026-11-16 — Implemented Story 4.2 UI; review patches applied; tasks complete.

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| aria-describedby drops hint on error | medium | patch | only `ai-prompt-error` when fieldError set |
| missing short_description on card | false | reject | FR-AI-06 does not require it; title/cover/why/meta covered |
| card title h2 under results h2 | medium | patch | flattened heading outline |
| no live character count | low | reject | maxLength + hint enough for MVP |
| silent slice >5 | low | reject | BE already ≤5; FE slice defensive |
| blank hint vs alert copy | low | reject | hint + required error both intentional |
| empty/fail panels lack role | medium | patch | live region titles only; panels need status/alert |
| RecommendationCard branch unit tests | low | reject | covered via page tests after title/cover asserts |
| missing id → fewer cards than status | medium | patch | null return without filtering list first |
| unbounded why layout | medium | defer | same as 4.1; harden with real LLM |
| setState after unmount | medium | patch | generation ref does not bump on unmount |
| promptTooLong unreachable via form | false | reject | maxLength intentional; validatePrompt still used |
| reuse explore duration/cover i18n | low | reject | intentional shared primitives |
| weak Explore isolation helper | low | reject | fail→Explore case already covers isolation |
| null result entries throw on item.id | medium | patch | map without null guard |
| missing-id results chrome empty | medium | patch | same filter/dedupe root |
| duplicate recommendation ids | medium | patch | unstable keys |
| hung POST no timeout | medium | defer | browser/network; revisit with real LLM SLO |
| providerErrorMessage non-string | low | patch | coerce only when typeof string |
| generic non-502/503 fail untested | medium | patch | verification-gap |
| happy path omits title/cover asserts | medium | patch | verification-gap |

## Verification

**Commands:**
- `cd frontend && npm test -- --run src/features/recommendations src/features/public/LandingPage.test.jsx` — expected: OK (20 tests)
- Isolation: mock recommendations API fail → Explore still renders
