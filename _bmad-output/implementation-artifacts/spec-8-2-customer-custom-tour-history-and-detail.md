---
title: '8.2 Customer Custom Tour History and Detail'
type: 'feature'
created: '2026-11-18'
status: 'approved'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: ''
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-1-custom-tour-submit-private-7-day-rule.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After submit (8.1), Customers only see a thin confirmation; there is no history list or detail page, and no owned GET APIs — they cannot track status or (later) rejection guidance.

**Approach:** Add Customer-scoped **list + detail** APIs and UI (mirror My bookings), restructure routes so history owns `/app/customer/custom-tours`, move the builder to `/new`, and surface status plus rejection reason/adjustments **when present** — without Admin review or reapply (8.3 / 8.4).

## Boundaries & Constraints

**Always:**
- Auth: authenticated **Customer** only; own records only (FR-CT-11–13, FR-CUST-07).
- History list shows: title, destination(s), travel dates (start–end), submission date, current status (FR-CUST-05).
- Detail shows full submission fields from 8.1 plus status; show **rejection reason** and **recommended adjustments** when non-empty (FR-CT-26) — Admin writers land in 8.3.
- Cross-customer / unknown id: **404** (not leak existence) — same pattern as bookings.
- Newest-first list ordering.
- Session + CSRF for session auth; GET needs session only.
- Confirmation (8.1) should deep-link to the new detail when an id is present.

**Never:** Admin list/approve/reject; reapply CTA/API; catalog publish; change create contract except route relocation of the form; invent traveler max; notifications beyond existing create.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|----------|--------------|----------|-------|
| Own list | Customer with N tours | GET array newest-first; statuses correct | — |
| Empty list | No tours | Empty history UI + CTA to create | — |
| Own detail | Own UUID | Full fields + status; rejection fields if set | — |
| Foreign id | Other customer's UUID | Not found | 404 |
| Guest | Unauthenticated | Denied | 401/403 |
| Multi-status | PENDING (+ APPROVED/REJECTED if seeded) | List/detail show correct status chip | — |

</frozen-after-approval>

## Decisions (Checkpoint 1)

- **1A** — History `/app/customer/custom-tours`; form `/new`; detail `/:id`
- **2A** — `rejection_reason` + `recommended_adjustments` on model (show when non-empty)
- **3A** — `GET/POST /api/custom-tours/` + `GET /<uuid>/`
- **4A** — Foreign tour → **404**
- **5A** — Confirmation + **View details** link

## Code Map

- `backend/custom_tours/views.py` — list+create view; detail view; ownership filter.
- `backend/custom_tours/serializers.py` — detail/list serializer (include rejection fields if 2A).
- `backend/custom_tours/models.py` + migration — optional rejection fields (2A).
- `backend/custom_tours/urls.py` — wire `<uuid>/`.
- `frontend/src/features/customTours/` — `MyCustomToursPage`, `CustomTourDetailPage`, API list/get; move form route; update confirmation + nav targets; tests.
- Continuity: 8.1 create + Idempotency-Key unchanged; Admin Placeholder until 8.3.

## Tasks & Acceptance

**Execution:**

- [x] BE list + detail GET, ownership 404, rejection fields on model
- [x] FE history + detail + route move for builder (`/new`)
- [x] Confirmation View details + history CTA
- [x] Tests: own list/detail; foreign 404; multi-status; FE smoke

**Acceptance Criteria:** (epics.md Story 8.2)

- Given I have custom tours in multiple statuses, when I open history and a detail, then I only see my records with correct status fields.

## Implementation Notes

- `GET /api/custom-tours/` + `GET /<uuid>/`; `rejection_reason` / `recommended_adjustments` migration `0002`.
- Routes: history `/app/customer/custom-tours`, form `/new`, detail `/:id`.

## Spec Change Log

- 2026-11-18 — Checkpoint 1 approved; Story 8.2 implemented.

## Review Triage Log

## Verification

**Commands (after implementation):**
- `cd backend && python manage.py test custom_tours`
- `cd frontend && npm test -- --run src/features/customTours`