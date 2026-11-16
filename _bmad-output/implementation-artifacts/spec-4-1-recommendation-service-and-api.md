---
title: '4.1 Recommendation Service and API'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd53fa70a1c54c6eb1f84ab562520885340172f9b'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No recommendations backend—cannot return grounded published-package suggestions; provider failures undefined.

**Approach:** Add `recommendations` app with `RecommendationService` + provider interface (`AI_PROVIDER=mock` OK), public API returning ≤5 **published** packages only, failures isolated so catalog/search keep working.

## Boundaries & Constraints

**Always:**
- App `recommendations` in `INSTALLED_APPS`; **`POST /api/recommendations/`** JSON `{ "prompt": "..." }` (not GET).
- Provider via `settings.AI_PROVIDER` (`mock` default); no real LLM required for MVP.
- ≤5 results; each a real **published** `TourPackage` via `packages.services.published()` / `get_published`. Never invent or return drafts (FR-AI-03…05, BR-05).
- **200** only on successful processing (incl. empty `results` when no match). Body: `{ "results": [...] }` with card-shaped fields + optional `why`.
- Invalid/blank/whitespace/overlong `prompt` → **400** field errors on `prompt` (packages-search style). No provider call.
- Provider failures (controlled; never unhandled 500s that take down other apps); **no** package list:
  - **502** invalid/failed upstream → `{ "error": { "code": "provider_bad_response", "message": "..." } }`
  - **503** temporarily unavailable → `{ "error": { "code": "provider_unavailable", "message": "..." } }`
- Stable codes so FE (4.2) can distinguish: **400** validation, **502/503** provider, **200** `{ results: [] }` empty-success.
- Never expose credentials, internal exceptions, stack traces, or sensitive upstream details to clients.
- Must not break `GET /api/packages/` or search/filter (FR-AI-10; NFR-20…22). Auth: `AllowAny`.

**Never:** Use Explore search as the engine; invent inventory; JWT/Stripe/object storage; Story 4.2 UI; HTTP 200 with embedded provider error; hardcode `$` prices; leak credentials/stack traces/raw upstream.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Happy path | Valid prompt + matches | **200** `{ results: [≤5] }` (+ optional `why`) | N/A |
| No match / empty inventory | Valid prompt; none match | **200** `{ results: [] }` | Empty-success, not error |
| Blank / overlong prompt | Invalid body | **400** on `prompt` | No provider call |
| Provider bad response | Forced bad | **502** `provider_bad_response`; no list | Catalog/search still 200 |
| Provider unavailable | Forced down | **503** `provider_unavailable`; no list | Catalog/search still 200 |
| Drafts only | No published | **200** `{ results: [] }` | Never draft ids |
| Guest | No session | Same AllowAny paths | N/A |

</frozen-after-approval>

## Code Map

- `backend/config/settings.py` — `INSTALLED_APPS`; `AI_PROVIDER`; optional force-fail test hook
- `backend/config/urls.py` — `path("api/recommendations/", include(...))`
- `backend/recommendations/` — new: `urls`, `views`, `serializers`, `services`, `providers/{base,mock}`, `exceptions` (→502/503), tests
- Reuse `packages.services.published()` / `get_published` and public card field shape; do not alter Explore/Admin/packages contracts
- Continuity: Epic 3 catalog; `/ai` Placeholder until 4.2

**Agent decisions:** Prompt max **2000** chars (trim; reject empty after trim). Mock: deterministic keyword/heuristic over published title/destination/description, ≤5. Force 502 vs 503 via settings/provider for tests. Success body `{ "results": [...] }` only. Prefer APITestCase; match existing CSRF/POST patterns.

## Tasks & Acceptance

**Execution:**
- [x] `backend/recommendations` — app + service + mock provider + 502/503 mapping -- AD-23
- [x] urls/settings + `POST` endpoint + prompt 400 validation + tests -- FR-AI-03…05/10
- [x] Tests — ≤5 published-only; 200 empty vs 400 vs 502 vs 503; fail leaves packages/search OK -- Story 4.1 AC

**Acceptance Criteria:**
- Given published packages exist, when I POST a valid prompt to `/api/recommendations/`, then HTTP 200 with ≤5 real published package results
- Given the AI provider fails, when I call recommendations, then HTTP 502 or 503 with `{ error: { code, message } }` and no package list, and catalog/search still succeed
- Given an invalid prompt, when I POST, then HTTP 400 field errors on `prompt` with no sensitive leak

## Implementation Notes

- App `recommendations` with `RecommendationService`, provider interface, `MockRecommendationProvider` (token-overlap heuristic).
- `POST /api/recommendations/` — AllowAny + CSRF; prompt max 2000 (trim); success `{ results }`; provider 502/503 via `AI_PROVIDER_FORCE_FAIL`.
- Grounding via `packages.services.published()` / `get_published`; card fields + `why`.

## Spec Change Log

- 2026-11-16 — Implemented Story 4.1 backend; tasks marked complete.

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| FORCE_FAIL readable in prod env | medium | patch | settings reads env with no TESTING gate; mock honors it |
| .env.example missing FORCE_FAIL docs | low | reject | test-only hook; gating removes need to document |
| hydrate under-fills without backfill | low | reject | published-only inventory; under-fill preferable to inventing |
| hand-built card vs PublicPackageCardSerializer | low | reject | unlikely everyday drift; reuse adds coupling without AC demand |
| unbounded unsanitized `why` | medium | defer | mock emits short text; harden when real LLM lands |
| no test for hydrate drop of unpublished id | medium | patch | verification-gap; only inventory exclusion tested |
| broad `except Exception` → 502 | false | reject | intentional controlled mapping per frozen intent |
| unknown AI_PROVIDER → 502 | low | patch | intentional contract; add test only |
| list(published()) full load per request | medium | defer | fine for MVP catalog size; scale later |
| missing GET/null/customer/ranking tests | low | reject | unlikely everyday; 405 is DRF default |
| provider returns None → TypeError outside try → 500 | high | patch | `matches[:MAX_RESULTS]` after try; not ProviderError |
| invalid UUID package_id → non-404 → 500 | medium | patch | get_published/get_object_or_404 can raise ValueError/ValidationError |
| duplicate package_id cards | medium | patch | no dedup in _hydrate |
| malformed match AttributeError in _hydrate → 500 | high | patch | hydrate outside try/except Exception |
| huge whitespace-padded prompt accepted | medium | patch | CharField lacks max_length before strip |
| FORCE_FAIL outside tests (edge) | medium | patch | same root as FORCE_FAIL prod gate |
| provider hang / no timeout | medium | defer | mock is sync/local; timeout when real provider arrives |
| claim: provider fail can be bare 500 | high | patch | same root as None/hydrate escape |
| unexpected Exception → 502 untested | medium | patch | verification-gap; force-fail only raises ProviderError |
| invalid AI_PROVIDER untested | medium | patch | verification-gap |

## Verification

**Commands:**
- `DJANGO_USE_SQLITE=1 … manage.py test recommendations packages.tests.test_public_catalog packages.tests.test_public_search_filters` — OK; isolation green (35 tests)
- Targeted recommendations APITestCase — ≤5 published-only; 400/502/503 contracts
