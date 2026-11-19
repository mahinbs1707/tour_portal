# Architecture Rubric Review — Tour Portal

**Reviewed artifact:** `ARCHITECTURE-SPINE.md` (v1.0, `implementation-baseline`, altitude: system, paradigm: modular-monolith)  
**Context skimmed:** `.memlog.md` (not rewritten)  
**Sources checked against frontmatter:** `docs/tour-portal/PRD.md`, `docs/tour-portal/BRD.md`, UX `DESIGN.md` / `EXPERIENCE.md`  
**Review date:** 2026-11-15

## Overall verdict

**Needs revision — not ready as build-substrate.**

The spine is strong where the coaching path concentrated: modular monolith shape, same-origin session auth, RBAC vs Django staff, domain apps + services, booking/payment/window state machines, no seat inventory, mock `PaymentProvider`, UUID integrity, Docker Compose local baseline, and a verified stack pin set. Those decisions would keep implementers aligned on the money path.

It **fails the good-spine bar** because an entire PRD/BRD/UX MVP capability — **AI-powered tour recommendations** — has no AD, app, feature folder, capability row, or deferred entry. Search/filter and package media storage are likewise unbound at system altitude. Most ADs also omit **Prevents**, weakening enforceability for the level below. Fix the critical/high items before treating this as the implementation baseline.

## Checklist results

| Checklist item | Result | Notes |
|---|---|---|
| Fixes real divergence points for the level below; misses none that matter | **Fail** | Booking/pay/auth/module boundaries well fixed; AI, search, and media are load-bearing MVP divergence points left open. |
| Every AD Rule is enforceable and prevents its stated divergence | **Partial** | AD-1/AD-2 strong (Binds + Prevents + Rules). Many later ADs lack **Prevents**; several Rules use soft language (`should`, “appropriate”, “consistent”) without a concrete convention. |
| Nothing under Deferred could let two units diverge unacceptably | **Pass (with caveat)** | Listed deferrals (cloud, JWT, Stripe, quotations, seats, dual FE, custom error envelope, Django Admin on/off, Nginx tag, test pins, password reset) are acceptable. **Gap:** AI and media are not deferred — they are silently absent, which is worse than an explicit deferral. |
| Named tech verified-current | **Pass** | Verified 2026-11-15: Django **6.1.3**, DRF **3.18.3**, React / React DOM **19.3.1**, Vite **8.3.8**, Python **≥3.12** for Django 6.1. PostgreSQL **18.x** consistent with memlog (18.7). Nginx “Stable image” intentionally loose (also Deferred). `@vitejs/plugin-react` **6.3.0** claimed; not re-checked beyond memlog. |
| Ratifies rather than invents brownfield | **Pass** | Greenfield Tour Portal; stack and URL namespaces match `.memlog.md` adopted decisions; no invented brownfield constraints. |
| Spec-driven: covers Tour Portal MVP capabilities from frontmatter sources | **Fail** | Money path, roles, custom tours (sans quotations), notifications, audit, 7-day rule covered. **Missing:** AI recommendations (PRD §2.1 #9 / FR-AI-*; BRD BO-2; UX Flow 3). **Weak:** search/filter (PRD §6), package media/images (PRD catalog + Admin CRUD), registration endpoint surface. |
| No silent whole dimension at system altitude — esp. operational/environmental envelope | **Fail** | AI subsystem + its env/provider envelope entirely silent. Package image storage/serving silent. Local ops (Compose, secrets, health) present in AD-15; production cloud correctly unbound but media/AI env still needed for local MVP. |
| AD IDs stable; Binds/Prevents/Rule present; paradigm named | **Partial** | Paradigm named (`modular-monolith`). AD-1…AD-15 IDs stable and sequential. **Prevents** present only on AD-1 and AD-2. AD-14 lacks Binds/Prevents. |

## Findings

- **[critical]** AI-powered recommendations are in-scope MVP (PRD §2.1 item 9, FR-AI-01…10, NFR-20…22; BRD BO-2 / A-7; UX EXPERIENCE Flow 3 / AI nav) but appear nowhere in the spine: no domain app, no FE feature, no AD, no capability-map row, not even Deferred. Two units can invent incompatible providers, grounding rules, failure isolation, and API shapes. *Fix:* Add an AD (e.g. AD-16) binding catalog-only grounding, ≤5 results, failure isolation from browse/search, ownership (`packages` service vs dedicated `recommendations` module), and env for the chosen MVP approach (rule-based / LLM / hybrid); map capability + FE feature; list any post-MVP AI expansion under Deferred.

- **[high]** Search and filtering (PRD §6 FR-SEARCH-*; BRD discovery; UX empty/search states) have no architectural bind beyond a vague AD-11 “consistent … filtering” line and no capability-map row. Query params, published-only enforcement, and FE vs BE search ownership can diverge. *Fix:* Add Rules under `packages` (or AD-11) for server-side search/filter on published packages only, parameter conventions, and a capability-map row; optionally note MVP implementation (ORM filters / Postgres full-text) so units do not fork.

- **[high]** Package cover/additional images are required by PRD catalog/detail/AI cards and Admin package management, but the spine is silent on media storage, upload authz, URL serving (Nginx/static/media), and size/type limits — a full environmental dimension at system altitude. *Fix:* Adopt a local-MVP media rule (e.g. Django media volume + Nginx `/media/`, Admin-only upload, allowed types/sizes) and defer object storage to deploy planning if desired.

- **[high]** Checklist requires **Binds / Prevents / Rules** on ADs; only AD-1 and AD-2 have **Prevents**. AD-3…AD-15 (except thin AD-14) omit the divergence they block, so lower-level units cannot test “what this decision forbids.” *Fix:* Add a one-line **Prevents:** to each adopted AD (e.g. AD-3: FE-only authz; AD-6: Stripe/card data in MVP; AD-7: invented statuses; AD-8: seat inventory; AD-13: pages-by-type sprawl; AD-15: per-dev ad-hoc runtimes without Compose).

- **[high]** Capability-to-architecture mapping (§10) omits AI recommendations, search/filter, Customer registration/signup, and Admin package/media management — so the map claims MVP coverage it does not have. *Fix:* Extend the table for every PRD §2.1 in-scope item (or explicitly mark out-of-spine with Deferred + owner).

- **[medium]** AD-2 auth endpoint table lists login/logout/me/csrf but not Customer **registration** (PRD FR-AUTH-01…06). Signup path, role-forcing to CUSTOMER, and duplicate-email rejection lack a bound endpoint/service rule. *Fix:* Add `POST /api/auth/register/` (or equivalent) Rules: Customer-only creation, unique email, password policy per PRD, no Admin self-assignment.

- **[medium]** AD-7 publishes explicit Booking / Payment / Payment-window enums but Custom Tour only has prose — PRD FR-CT uses `PENDING | APPROVED | REJECTED` plus reapply → `PENDING`. Units can invent extra statuses or drop reapply flags. *Fix:* Add Custom-tour status enum and Rules for reject reason, adjustments, reapply enablement, 7-day check at approval (FR-CT-18a).

- **[medium]** Several Rules are not crisp enough to prevent divergence: AD-2 “appropriate SameSite” and “basic protection” against failed logins; AD-8 concurrent attempts “should” prevent; AD-11 “consistent pagination, filtering, and sorting” without naming the convention; AD-15 “appropriate health checks.” *Fix:* Pin SameSite (e.g. `Lax`), state a minimum throttle/lockout, change concurrent payment to **must**, name pagination defaults (e.g. DRF `PageNumberPagination`, page size), and require Compose healthchecks for Postgres + backend.

- **[medium]** AD-14 testing strategy has no **Binds** / **Prevents** and leaves framework pins deferred (acceptable) but does not bind ownership of the 15 critical scenarios to CI or package layout — two units can skip critical cases while still “having tests.” *Fix:* Add Binds: MVP quality gate; Prevents: FE-only verification of authz/payment rules; Rule: listed critical scenarios are mandatory backend (and where relevant E2E) coverage before merge.

- **[medium]** Operational/environmental envelope for MVP local run is partly present (AD-15) but silent on **business timezone default**, **CSRF_TRUSTED_ORIGINS / cookie domain for Compose**, and **AI/media secrets or paths** — implementers will invent incompatible `.env` shapes. *Fix:* Add a short Env baseline table (required keys, non-secret defaults for local, secrets never in VCS) under AD-15 or Cross-Cutting.

- **[low]** Nginx pinned only as “Stable image” (also Deferred) — fine if Compose seed documents a digest later; low risk while Deferred stays explicit. *Fix:* When Compose lands, pin image digest/tag in deploy artifacts; keep spine Deferred until then.

- **[low]** Password hashing (NFR-04) relies on implicit Django defaults rather than an AD-2 Rule — low risk if Django auth is mandatory, but not stated. *Fix:* One Rule: use Django password hashers only; never log plaintext passwords.

## Strengths (non-blocking)

- Paradigm, system structure, and dependency rules are clear for a modular monolith + single SPA.
- AD-2 / AD-3 correctly separate session+CSRF security from UX route guards and Django `is_staff` vs application `ADMIN`.
- AD-7 / AD-8 / AD-10 align with PRD/BRD/UX on pay-after-APPROVED, window `EXPIRED` without auto-cancel, reopen ≠ new deadline, extend audited, no seat capacity.
- AD-6 PaymentProvider + mock-only is a clean extension seam for Stripe.
- Stack versions match current releases as of review date (see checklist).
- Deferred list is mostly honest about cloud, JWT, Stripe, quotations, and seats.

## Recommended gate

Do **not** advance as `implementation-baseline` until at least the **critical** AI bind and the **high** search, media, Prevents, and capability-map gaps are closed (or explicitly Deferred with “unacceptable divergence” rationale — AI should not be deferred given PRD MVP scope).
