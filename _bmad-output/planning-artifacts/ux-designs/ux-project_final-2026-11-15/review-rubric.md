# Spine Pair Review — project_final

## Overall verdict

The Tour Portal spine pair is an **adequate** contract for the load-bearing booking → approve → mock-pay path: status glossaries match PRD/BRD v1.5 (`SUCCESS`, window-only `EXPIRED`, mandatory reject reason, reopen ≠ +24h), color tokens carry hex, and contrast targets are stated. Downstream consumers can implement the money path from EXPERIENCE Key Flows + DESIGN chips without inventing product rules. Clean source-extract is **not** fully achieved: DESIGN kebab-case components and EXPERIENCE action-named patterns do not share one name set, Admin package CRUD has IA but no Key Flow, and spines still claim source **v1.4** while PRD/BRD are **v1.5**. Fix those and this pair moves to strong.

Workspace inventory: `DESIGN.md`, `EXPERIENCE.md`, `.memlog.md`; `imports/` and `.working/` exist and are empty; **no** `mockups/` or `wireframes/` directories.

---

## 1. Flow coverage — adequate

Checked major MVP journeys from PRD/BRD (auth, catalog book+pay, cancel-while-PENDING, Admin booking review, AI→auth return, custom-tour reject/reapply, payment matrix, notifications, session expiry) against EXPERIENCE.md Key Flows A–7.

### Findings

- **high** Admin Packages list / create-edit (CRUD, dates, featured, publish) is an IA surface with no Key Flow, protagonist, climax, or failure path (EXPERIENCE.md § Information Architecture → Admin; Key Flows omit it). *Fix:* Add Flow 8 — Mira publishes/features a package (or fails validation / unpublish) with numbered steps.
- **medium** Flow 1 collapses discovery→submit as “1–5” instead of discrete numbered steps (EXPERIENCE.md § Flow 1). *Fix:* Expand to numbered steps (Explore/detail → Book Now → form → review → confirmation).
- **medium** Flow 3 (Omar AI) and Flow 4 (Priya custom) lack an explicit climax beat and thin failure structure vs Flow 1/2 (EXPERIENCE.md § Flow 3–4). *Fix:* Add one climax line + failure bullets each (AI empty/fail; reapply off; approve custom).
- **low** Flow 1b / Flow 6 / Flow 7 are short but usable; discovery/search is only implied inside Flow 1 (EXPERIENCE.md). *Fix:* Optional Flow 0 guest Explore→Search empty/no-match if stories need it.

**Covered well:** Flow A (Jordan auth + Book Now return), Flow 1/1b/2/5 (Amina/Mira booking+payment matrix), reopen+extend, reject+reason.

---

## 2. Token completeness — strong

Checked every YAML color/typography/rounded/spacing/component token and every `{path.to.token}` in DESIGN.md prose/components. All color values are hex. Contrast: WCAG 2.2 AA ≥4.5:1 stated; accent `#A84830` documented as AA fix vs prior `#C45C3E`.

### Findings

- **medium** `button-primary` hover/active/disabled use raw hex (`#0A5555`, `#084444`, `#A8C5C5`, `#F7F4EF`) instead of named color tokens (DESIGN.md frontmatter `components.button-primary`). *Fix:* Add `primary-hover` / `primary-active` / `primary-disabled-*` under `colors:` and reference them.
- **low** Template placeholders `{amount}`, `{CURRENCY}` / `{CODE}`, `{expires-at}` are not DESIGN tokens (DESIGN.md price line; EXPERIENCE.md Component Patterns / Flow copy). Harmless if treated as runtime fields; extractors may false-flag. *Fix:* Document once under Foundation as “data slots, not tokens,” and unify `{CODE}` vs `{CURRENCY}`.
- **low** DESIGN frontmatter omits optional `description` (design-md-spec). *Fix:* Add one-line product statement.

**No critical misses:** every `{colors.*}`, `{typography.*}`, `{rounded.*}`, `{spacing.*}`, `{components.*}` path used in DESIGN prose resolves.

---

## 3. Component coverage — thin

Extracted DESIGN frontmatter component keys vs EXPERIENCE Component Patterns names. Visual + behavioral coverage exists *by intent*, but **names do not match**, so consumers cannot join rows by string equality.

### Findings

- **high** Naming split blocks clean extract. DESIGN: `button-primary`, `button-accent`, `card-package`, `status-chip`, `payment-chip`, `window-chip`, `modal-dialog`, `drawer-sheet`, `dropdown-menu`, `nav-header`, `admin-sidebar`, `hero-banner`, `input-field`. EXPERIENCE: `Package card`, `Book Now`, `Status trio`, `Pay now`, `Cancel booking`, `Mock checkout`, `Approve`, `Reject`, `Reopen payment`, `Extend deadline`, `Notification bell`, `Admin list (sm/md)`, `Date picker` (EXPERIENCE.md § Component Patterns; DESIGN.md § Components + frontmatter). *Fix:* One shared registry (prefer DESIGN keys); EXPERIENCE rows rename to those keys; map actions (`book-now` → `button-accent`) in a single alias column if needed.
- **high** EXPERIENCE actions with real rules but no DESIGN visual component row: `Book Now`, `Pay now`, `Mock checkout`, `Date picker`, `Notification bell`, `Approve`/`Reject`/`Reopen`/`Extend` (dialogs only via `modal-dialog`). *Fix:* Either add DESIGN component entries (or variants) or mark them as “behavior-only, visual = `{components.button-accent}` / `{components.modal-dialog}`” with explicit refs.
- **medium** DESIGN components with weak/missing EXPERIENCE behavioral rows: `hero-banner`, `input-field`, `drawer-sheet`, `dropdown-menu`, `nav-header`, chip triad (folded into “Status trio”). *Fix:* Add EXPERIENCE rows (or a “inherits Interaction Primitives” note per key).
- **medium** Notifications + empty/loading are visual rules in DESIGN prose only — not frontmatter `components:` keys (DESIGN.md § Notifications / Empty / loading). *Fix:* Add `notification-bell` and `empty-state` (and optionally `skeleton`) to frontmatter + EXPERIENCE.

Behavioral depth for Pay now, Status trio, Reject reason, Reopen/Extend is **strong** once naming is fixed.

---

## 4. State coverage — adequate

Walked Public/Customer + Admin IA surfaces against EXPERIENCE.md § State Patterns (+ Interaction / Accessibility).

### Findings

- **medium** Payment transaction `PENDING` is in the glossary and DESIGN `payment-pending-*` tokens but has no State Patterns row or checkout “processing” treatment (EXPERIENCE.md § Foundation glossary vs § State Patterns). *Fix:* Add row: mock attempt in flight → Payment `PENDING`, Pay disabled, then SUCCESS/FAILED/CANCELLED.
- **medium** Explicit **offline** state absent; only “Network / server error” banner (EXPERIENCE.md § State Patterns). *Fix:* Add offline toast/banner + no checkout submit while offline.
- **medium** Package detail “unavailable / unpublished / not bookable” (PRD FR-CAT-08/09) has no dedicated state (IA Package detail; State Patterns silent). *Fix:* Add surface state: Book Now hidden + explanation.
- **low** Admin list empty and Customer home with no bookings rely on generic empty pattern — acceptable if stories inherit “Empty featured / catalog / search / notifications” wording expanded to “any empty list.”

**Covered well:** cold-load skeletons; empty featured/catalog/search/notifications; AI load/empty/fail; booking/payment/window matrix; auth validation; permission denied; session expiry + draft restore; 7-day advance block; REJECTED reason visible.

---

## 5. Visual reference coverage — adequate

Listed workspace visual dirs: `mockups/` — missing; `wireframes/` — missing; `imports/` — present, **empty**; `.working/` — present, **empty**. Spines state spines-win-on-conflict once each; **no** inline mockup/wireframe/import links; therefore **no orphans**.

### Findings

- **medium** Zero promoted visual anchors for Landing hero, status trio, mock checkout, or Admin review — architecture/story-dev get prose only (workspace root under `ux-project_final-2026-11-15/`). *Fix:* Promote 2–4 HTML/Excalidraw refs into `mockups/` or `wireframes/` and link from DESIGN Components / EXPERIENCE Key Flows.
- **low** Empty `imports/` directory with no spine mention is harmless clutter. *Fix:* Leave empty or drop until used.

---

## 6. Bloat & overspecification — strong

### Findings

- **low** EXPERIENCE § Decided product/UX rules largely restates Foundation + glossary (EXPERIENCE.md § Decided product/UX rules). Useful as a checklist; slightly redundant. *Fix:* Keep as bullet contract or fold into Foundation to avoid dual maintenance.
- **low** DESIGN Brand & Style editorial is appropriate for DESIGN; not overspecified into EXPERIENCE.

No pixel-farming where tokens suffice; payment rules are tables/enums not essay restatement of full PRD. Open gaps correctly limited to product TBD.

---

## 7. Inheritance discipline — adequate

Sources `docs/tour-portal/PRD.md` and `BRD.md` resolve. Spot-check vs spines: booking `PENDING|APPROVED|REJECTED|CANCELLED`; payment `UNPAID|PENDING|SUCCESS|FAILED|CANCELLED`; window `NOT_OPEN|OPEN|EXPIRED`; reject reason mandatory + Customer-visible; 24h from approval; reopen preserves deadline; extend changes `expires-at`; no auto-cancel — **aligned with PRD/BRD v1.5**. EXPERIENCE `{colors.ring}`, `{colors.accent}` resolve to DESIGN.

### Findings

- **high** Component name identity across spines fails (see §3) — inheritance rule “identical names” broken.
- **medium** Both spines claim PRD/BRD **v1.4**; sources are **Version 1.5** (DESIGN.md / EXPERIENCE.md intro banners; PRD.md / BRD.md headers). *Fix:* Bump spine banners to v1.5 (or pin commit/hash).
- **medium** Mock checkout copy uses “CANCEL” instead of enum `CANCELLED` (EXPERIENCE.md § Component Patterns → Mock checkout). *Fix:* Use `CANCELLED` everywhere.
- **medium** Currency slot inconsistent: `{CURRENCY}` vs `{CODE}` (EXPERIENCE.md Component Patterns vs Decided rules §8). *Fix:* One placeholder name.
- **medium** `.memlog.md` still records stale assumption (AQ-04 optional reject; AQ-19 reopen +24h) and a decision line “UNPAID→SUCCEEDED”, while later overrides/decisions correct them (.memlog.md). Spines are correct; audit trail confuses reviewers. *Fix:* Memlog note “superseded — see override/decision SUCCESS + required reject + reopen preserves deadline.”
- **low** UJ/requirement IDs (FR-*, AQ-*) rarely cited verbatim in Key Flow titles — Fast-path OK; story-dev may want FR anchors.

---

## 8. Shape fit — strong

DESIGN body order matches canonical lock: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. EXPERIENCE required defaults present: Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows. Responsive (multi-surface) and Inspiration & Anti-patterns present and earned. Invented § Decided product/UX rules and § Remaining open gaps are defensible for consumer handoff.

### Findings

- **low** Optional DESIGN `description` frontmatter field absent (see §2).

---

## Mechanical notes

| Check | Result |
|---|---|
| Sources resolve | Yes — `docs/tour-portal/PRD.md`, `BRD.md` |
| Source version vs spine banner | Mismatch — sources **1.5**, spines say **v1.4** |
| Status glossary DESIGN ↔ EXPERIENCE ↔ PRD | Match (`SUCCESS`; window-only `EXPIRED`) |
| Reject reason | Mandatory + Customer-visible — committed |
| Payment window / reopen / extend | Committed; matches PRD FR-PAY-01e/f |
| Color hex completeness | Complete |
| `{path.to.token}` in DESIGN | All resolve |
| Component name crosswalk | **Fails** — different naming schemes |
| Enum slip | “CANCEL” vs `CANCELLED` in Mock checkout row |
| Placeholder slip | `{CURRENCY}` vs `{CODE}` |
| mockups/ | Directory absent |
| wireframes/ | Directory absent |
| imports/ | Empty |
| Mermaid | None present (N/A) |
| Status | Both spines `draft` |

**Severity totals:** critical 0 · high 4 · medium 13 · low 9  
*(High = Admin package Key Flow gap; DESIGN↔EXPERIENCE name split; EXPERIENCE actions without DESIGN visual rows; inheritance “identical names” failure. Name-split and inheritance are the same root cause if consolidated → high 3.)*

**Consumer extract readiness:** Money-path product rules — yes. Full spine-as-schema (tokens + 1:1 components + every IA surface flow + visuals) — not yet; remediate naming registry, Admin package flow, version banner, and Payment `PENDING`/offline/unavailable states first.
