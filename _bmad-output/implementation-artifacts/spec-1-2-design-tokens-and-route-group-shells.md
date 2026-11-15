---
title: '1.2 Design Tokens and Route-Group Shells'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b8af1316696fa0a45a51b24c2247d8bf45b08bbb'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-project_final-2026-11-15/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-project_final-2026-11-15/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Compose SPA is an unbranded placeholder. Without DESIGN tokens and Public/Customer/Admin shells, later Epic 1 auth and business UI have no accessible chrome or visual contract.

**Approach:** Add light-only coastal design tokens, React Router route groups with `PublicLayout`, `CustomerLayout`, and `AdminLayout`, skip link + landmarks, English externalized strings baseline, and placeholder empty homes—no auth/RBAC yet (Stories 1.3–1.6).

## Boundaries & Constraints

**Always:**
- Match DESIGN.md tokens: sand canvas `#F7F4EF`, lagoon primary `#0E6B6B`, coral accent `#A84830`, Fraunces + Source Sans 3 (+ IBM Plex Mono for mono), spacing/radii including `admin-sidebar-width` 240.
- Light-only theme (no dark mode).
- Layouts per AD-13 / EXPERIENCE: Public + Customer top nav; Admin sidebar 240px at `lg+`; below `lg` Admin uses icon rail and/or sheet (md: icons/sheet; `<md`: sheet); skip link; `header`/`nav`/`main` (+ Admin complementary) landmarks.
- `prefers-reduced-motion: reduce` disables decorative chrome motion.
- English MVP strings externalized (no hardcoded user-facing copy in components).
- Route namespaces: `/` public; `/app/customer/*`; `/app/admin/*` (AD-5). Placeholder empty homes for Customer and Admin.
- Landing chrome is hero-capable (brand as hero-level signal); do not ship full marketing content beyond shell + brand.
- Preserve MVP exclusions: seats, payments, JWT, quotations, email/SMS, object storage, microservices. No auth/session/apiClient (1.5), no RBAC seed (1.3), no role guards (1.6).
- Do not edit approved planning artifacts under `_bmad-output/planning-artifacts/` or `docs/tour-portal/`.

**Never:**
- Dark theme, JWT, real payment UI, seat inventory, traveler maximums.
- Server authz or `/api` session work in this story.
- Horizontal-only Admin tables as the mobile list pattern (prepare card→detail chrome only).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Guest landing | Open `/` | Public shell; Tour Portal brand hero-capable; DESIGN primary/accent/background tokens; skip link; header/nav/main; light-only | Missing landmark/skip → fail AC |
| Customer home placeholder | Open `/app/customer` (or home path) | CustomerLayout top nav + empty home placeholder | N/A |
| Admin desktop | Open `/app/admin` at `≥ lg` | AdminLayout sidebar 240px + empty home | N/A |
| Admin narrow | Open Admin nav at `< lg` | Sheet and/or icon rail (not fixed 240px-only); list chrome ready for card→detail | Must not require H-scroll tables |
| Reduced motion | `prefers-reduced-motion: reduce` | No decorative chrome motion | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/App.jsx`, `main.jsx`, `index.css` -- replace placeholder with router + tokenized shell
- `frontend/package.json` -- add React Router 7.18.5; Tailwind (+ PostCSS/autoprefixer); fonts; minimal UI primitives as needed (shadcn-compatible kit per epic assumption)
- `_bmad-output/.../DESIGN.md` -- token source of truth (colors, type, space, radius)
- `_bmad-output/.../EXPERIENCE.md` -- nav sets, breakpoints, skip/landmarks, reduced-motion, Admin responsive
- `_bmad-output/implementation-artifacts/epic-1-context.md` -- epic constraints
- `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md` -- continuity: Compose serves built SPA; rebuild frontend after FE changes; HOST_PORT 8080
- Architecture AD-5, AD-13 -- route groups + feature folder layout

**Do not change:** `deploy/` Compose/nginx (unless SPA build tooling requires a harmless FE Dockerfile tweak), backend domain code, approved planning docs.

**Agent decisions:** Tailwind CSS + CSS variables mapped 1:1 to DESIGN tokens; add React Router DOM 7.18.5; AD-13 folders (`layouts/`, `features/`, `components/ui`, `i18n` or `messages`); Guest nav stubs Explore/AI/Sign in/Sign up (non-functional or empty placeholders); Customer/Admin nav chrome present with stub links (guards in 1.6); Admin `<lg` = sheet primary, md may show icon rail triggering sheet; fonts via Google Fonts link in `index.html` for MVP; strings in a single English messages module.

## Tasks & Acceptance

**Execution:**
- [x] `frontend` tooling -- add Tailwind + React Router 7.18.5 (+ lockfile update) -- kit baseline
- [x] `frontend` tokens -- CSS variables / theme from DESIGN.md (colors, type, space, radius); light-only -- visual contract
- [x] `frontend` i18n messages -- externalize English shell strings -- NFR localization-ready baseline
- [x] `frontend` layouts -- `PublicLayout`, `CustomerLayout`, `AdminLayout` with skip link, landmarks, reduced-motion -- EXPERIENCE chrome
- [x] `frontend` routes -- `/`, `/app/customer/*`, `/app/admin/*` placeholders + Landing hero-capable brand -- AD-5 shells
- [x] Verify matrix (visual token smoke; skip/landmarks; Admin `<lg` sheet/rail) via Compose rebuild + browser/smoke -- Story 1.2 AC

**Acceptance Criteria:**
- Given I open `/` as a Guest, when the page renders, then Tour Portal brand is hero-capable on Landing chrome and tokens match DESIGN.md primary/accent/background, and a skip link and header/nav/main landmarks exist, and theme is light-only
- Given I view Admin layout at `< lg`, when I open Admin navigation, then lists are prepared for card/detail patterns (no reliance on horizontal-only tables), and sidebar becomes sheet or icon rail per EXPERIENCE

## Implementation Notes

- 2026-11-16: Tailwind v4 (`@tailwindcss/vite`) + React Router 7.18.5; DESIGN tokens as CSS variables in `src/index.css` (light-only).
- Layouts: Public/Customer top nav; Admin `lg+` 240px sidebar, `md` icon rail+sheet, `<md` sheet; skip link + landmarks; English `i18n/messages.js`.
- Verified at `http://localhost:8080`: `--color-background #f7f4ef`, `--color-primary #0e6b6b`, `--color-accent #a84830`, `color-scheme: light`, skip link + header/nav/main present; Admin card-list placeholder chrome.
- Auth/RBAC/apiClient deferred to 1.3–1.6; fonts via Google Fonts CDN.
- Review patches: externalized Admin label; persistent nav landmarks; Admin header all breakpoints; Sheet body scroll lock + breakpoint close; Landing brand+promise only; Vitest shell tests (`npm test`) PASS; Compose smoke PASS after rebuild.

## Spec Change Log

## Review Triage Log

- medium → patch — Hardcoded “Admin” in `AdminSidebarDesktop` — externalize via `messages`
- medium → patch — Mobile `TopNav` / Admin `<md` have no `nav` landmark until sheet opens — keep a landmark `nav` in the tree when closed
- medium → patch — Admin omits `header` at `md`/`lg+` — provide header landmark at all breakpoints
- medium → patch — Sheet lacks body scroll lock; sheet can stay open across breakpoint — lock overflow; close on md+/lg+ match
- low → patch — Admin menu missing `aria-controls`; CSS comment mojibake; unused `closeAdminNav` — direct fixes
- medium → patch — Landing extra marketing subheading beyond brand+promise — remove subheading
- medium → patch — No automated check of client-rendered shells/skip/Admin `<lg` — add lightweight RTL/vitest (or equivalent) for PublicLayout landmarks + Admin sheet open
- false — Accent unused in chrome — tokens are defined; accent use in CTAs comes with later feature UI
- false — Admin icon rail must open sheet — EXPERIENCE allows icons/sheet; rail `NavLink`s are valid at md
- false — `path=*` → `/` — intentional SPA unknown-route handling for shell story
- low (rejected) — Full `@theme` for every status token — not required for 1.2 shell AC
- defer — Sheet `aria-hidden` on background — deepen with fuller dialog kit later

- medium → patch — Hardcoded “Admin” in `AdminSidebarDesktop` — externalize via `messages`
- medium → patch — Mobile `TopNav` / Admin `<md` have no `nav` landmark until sheet opens — keep a landmark `nav` in the tree when closed
- medium → patch — Admin omits `header` at `md`/`lg+` — provide header landmark at all breakpoints
- medium → patch — Sheet lacks body scroll lock; sheet can stay open across breakpoint — lock overflow; close on md+/lg+ match
- low → patch — Admin menu missing `aria-controls`; CSS comment mojibake; unused `closeAdminNav` — direct fixes
- medium → patch — Landing extra marketing subheading beyond brand+promise — remove subheading
- medium → patch — No automated check of client-rendered shells/skip/Admin `<lg` — add lightweight RTL/vitest (or equivalent) for PublicLayout landmarks + Admin sheet open
- false — Accent unused in chrome — tokens are defined; accent use in CTAs comes with later feature UI
- false — Admin icon rail must open sheet — EXPERIENCE allows icons/sheet; rail `NavLink`s are valid at md
- false — `path=*` → `/` — intentional SPA unknown-route handling for shell story
- low (rejected) — Full `@theme` for every status token — not required for 1.2 shell AC
- defer — Sheet `aria-hidden` on background — deepen with fuller dialog kit later
