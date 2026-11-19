# Accessibility Review — Tour Portal

**Scope:** `DESIGN.md` + `EXPERIENCE.md` (ux-project_final-2026-11-15)  
**Standard:** WCAG 2.2 Level AA  
**Method:** Token contrast verification + behavioral-spec gap analysis (findings only; spines not rewritten)

## Overall verdict

**Conditional fail for WCAG 2.2 AA readiness.** The spines set a strong intent floor (labeled status chips, dialog focus trap/Esc, auth `aria-*`, polite countdown live region, Admin card patterns). Measured tokens and missing interaction specs still leave **blocking focus-contrast failures**, **non-text UI contrast failures**, and several **SR/motion/touch behavioral gaps** that will not pass AA if implemented as written.

Accent `#A84830` on white **does** meet ≥4.5:1 (~5.78:1); the accent claim is correct. Broader “verified pairs” language overstates readiness.

## Findings

### Color contrast (tokens vs claims)

- **[critical]** Focus ring `{colors.ring}` `#0E6B6B` is effectively invisible on primary (`#0E6B6B`, ~1.00:1) and accent (`#A84830`, ~1.09:1) buttons — fails **2.4.7 Focus Visible** / **1.4.11 Non-text Contrast** (and undermines **2.4.13** intent). Offset `#F7F4EF` alone does not create a 3:1 indicator against the control fill when ring color matches or nearly matches the button. *Fix:* Specify a two-tone focus treatment (e.g. light inner + dark outer, or inverted ring + 2px offset) that maintains ≥3:1 against both the control and adjacent background for every button variant.

- **[high]** Input/card border `{colors.border}` / `{colors.input}` `#D4CBBF` vs white/card is ~**1.60:1** (vs sand ~**1.46:1**) — fails **1.4.11** for identifying boundaries of active controls when border is the only cue. *Fix:* Darken input/default borders to ≥3:1 vs adjacent fill (or add a second non-color cue that is not the sole identifier, plus a 3:1 focus/hover border).

- **[high]** Warning chip/text pair `{colors.warning-foreground}` `#1C2B33` on `{colors.warning}` `#B7791F` is ~**4.00:1** — fails **1.4.4** / **1.4.3** for normal text; chip typography is `{typography.label}` **12px / 600**, which is **not** large text. *Fix:* Darken warning fill or lighten/darken foreground to ≥4.5:1 at 12px, or raise chip text to ≥14px bold / ≥18px and still meet large-text thresholds.

- **[medium]** `{colors.muted-foreground}` `#5C6B73` on `{colors.muted}` `#E8E2D8` is ~**4.28:1** — fails AA for helper/placeholder-like copy on muted surfaces (disabled UI is exempt; helper text is not). *Fix:* Darken muted-foreground for use on muted backgrounds, or reserve muted-fg only on sand/white (≥5.03:1 / ≥5.52:1).

- **[medium]** Contrast “verified pairs” claim (primary/sand, foreground/sand, status pending/approved) omits failing pairs above and does not document non-text contrast. Accent AA claim for `#A84830` + white is **accurate** (~5.78:1); primary/sand (~5.74:1) and status/payment/window chip fg/bg pairs checked here all clear ≥4.5:1. *Fix:* Replace selective “verified” language with a full token matrix (text + UI + focus) and re-verify after token changes.

- **[low]** Primary/accent disabled pairs (~1.67:1 / ~3.02:1) are likely exempt as inactive controls, but spines never state the exemption or an alternate disabled affordance (opacity + `aria-disabled`). *Fix:* Document disabled as non-contrast-critical **and** require `aria-disabled` / focus skip rules so disabled CTAs are not only low-contrast paint.

### Keyboard, focus rings, modals, Esc

- **[critical]** Same as focus-ring contrast on primary/accent — keyboard users cannot reliably see focus on the main conversion controls (Book Now / Pay now / Simulate success). *Fix:* Same two-tone focus spec; include focus states in component inventory for all four button variants + chips + bell + icon rail.

- **[high]** Focus trap is specified for **modal only**; drawers/sheets (mobile nav, Admin sidebar collapse) get Esc in Interaction Primitives but **no trap, initial focus, or restore-focus** rules. *Fix:* Apply the same dialog a11y contract to `{components.drawer-sheet}`: `role="dialog"`, labelled title, focus trap, Esc, return focus to invoker.

- **[high]** Dropdowns: Esc closes; trap explicitly **not** for menus — but no arrow-key roving tabindex, typeahead, or focus return to trigger. *Fix:* Specify menu keyboard pattern (ArrowUp/Down, Home/End, Enter/Space, Esc, focus restore) aligned to APG.

- **[medium]** No skip link / landmark map (header, main, nav, complementary Admin sidebar, contentinfo). Full-keyboard claim for Admin lists does not define tab stops for card → detail drill-in. *Fix:* Add landmarks + “Skip to main content”; define card-row activation (Enter/Space) and where focus lands on detail.

- **[medium]** Sticky mobile form CTA can obscure focused fields (**2.4.11 Focus Not Obscured**). *Fix:* Require focused control to scroll into view above sticky CTA, or collapse sticky chrome while keyboard-focusing fields.

- **[low]** Loading buttons replace visible label with spinner — accessible name / `aria-busy` / disable double-submit announced state not specified. *Fix:* Keep accessible name (visually hidden label or `aria-label`) + `aria-busy="true"` while loading.

### Screen reader (status, live regions, errors, dialogs)

- **[high]** Countdown: “live region … polite, ~1/min” is underspecified — missing `aria-live`/`aria-atomic`, what string is announced, initial announcement on banner mount, and assertive (or clear) announcement when window flips to `EXPIRED`. *Fix:* Define polite minute ticks + mount announcement; on expiry, update status chips and announce once (polite or assertive) that Pay is unavailable.

- **[high]** Toasts (permission denied, non-blocking success/fail) have **no** live-region / role rules — SR users may miss them. *Fix:* Status toasts → `role="status"`; errors needing attention → `role="alert"`; don’t rely on transient visuals alone.

- **[medium]** Accessibility Floor limits `aria-describedby` / `aria-invalid` to **auth/reject**; DESIGN inputs mention describedby for errors generally, but booking/custom/extend/reject reason flows don’t inherit an explicit SR error summary pattern (focus move to first error, error list). *Fix:* Unify: every form error linked via `aria-describedby`, `aria-invalid`, and focus management to first invalid field or summary.

- **[medium]** Confirm dialogs: “labelled title” only — no `aria-describedby` for body copy, and no `role="alertdialog"` for destructive/irreversible confirms (cancel, reject). *Fix:* Label + describe; use alertdialog where confirmation is required before destructive action.

- **[medium]** Skeletons / AI progress: sighted progress copy exists; no `aria-busy` / status live region for catalog or AI recommendation load. *Fix:* Mark loading regions `aria-busy` and announce AI completion/failure via status.

- **[low]** Status chips are text-labeled and “never color-only” — strong — but enum tokens (`APPROVED`, `UNPAID`) may be harsh for SR; no human-readable SR gloss. *Fix:* Optional visually positioned or `aria-label` prose (“Booking status: Approved”) while keeping visible glossary labels.

### Touch targets / mobile Admin cards

- **[high]** No minimum target size. WCAG **2.5.8** requires ≥**24×24** CSS px (spacing exception rules apply); consumer/Admin patterns (bell, badge, icon rail, chip-like controls, card chevrons) will regress without a floor. *Fix:* Mandate ≥24×24 (prefer 44×44 for primary actions) for bell, sidebar icons, card hit areas, dialog buttons, Pay/Book CTAs.

- **[medium]** Admin `sm`/`md` “card rows → detail” avoids H-scroll tables (good) but doesn’t specify expandable actions (approve/reject) vs navigate-only cards, nor focus order inside stacked cards. *Fix:* Define whether actions live on the card or only on detail; ensure each interactive target meets size and has an accessible name.

- **[low]** `{typography.label}` 12px chips may read as tappable while being decorative — risk of mis-hit adjacent controls. *Fix:* If chips are non-interactive, ensure they aren’t in the tab order and don’t steal hit targets from nearby buttons.

### Motion / reduced motion

- **[high]** No `prefers-reduced-motion` policy anywhere — spinners, drawer/sheet transitions, skeleton shimmer, hover elevation, and any countdown animation are unconstrained (**2.3.3** is AAA, but reduced-motion is an expected AA-adjacent floor for modern UX and vestibular safety). *Fix:* Require `prefers-reduced-motion: reduce` → no decorative motion; instant show/hide for sheets; static skeletons; non-animated busy indicators (text “Loading”).

- **[medium]** Button loading “spinner replaces label” implies continuous animation without a reduced-motion alternative. *Fix:* Swap to textual Loading state under reduced motion.

### Notification badge / unread state

- **[high]** Bell badge count (`9+`) has no accessible name pattern — decorative badge fails to expose unread count to SR/name computation. *Fix:* Control name like “Notifications, 3 unread” / “Notifications, 9 or more unread”; hide decorative badge from SR with `aria-hidden` when name carries the count.

- **[medium]** Unread list: accent dot + bold title (not color-only — good) but no explicit “Unread” text/SR prefix; bold alone is not programmatically exposed. *Fix:* Add visually hidden “Unread” (or `aria-current`/semantic marker) per unread row; keep bold + dot as visual reinforcement.

- **[medium]** New notification arrival while panel closed: no live update for badge. *Fix:* When count changes, update accessible name; optional polite status if product wants arrival announcement (keep quiet if sparse Admin volume).

- **[low]** “Open → mark read” is fine behaviorally; ensure deep-link navigation announces destination page title/h1 after route change. *Fix:* Focus management to main heading after notification deep link.

### Auth errors & payment mock controls

- **[high]** Mock checkout actions labeled as simulate SUCCESS / FAILED / CANCEL — short enum-style names risk ambiguity with booking/payment status chips and with “Cancel” dialog actions. *Fix:* Require explicit button names: e.g. “Simulate successful payment”, “Simulate failed payment”, “Simulate cancelled payment”; group with `fieldset`/`legend` “Mock payment outcome (no real charges)”.

- **[medium]** Auth errors: association called out for auth/reject, but duplicate-email vs bad-credentials vs confirm-mismatch field targeting is unspecified; “stay on page; field errors” doesn’t require linking error text ids. *Fix:* Map each failure to field(s) + `aria-describedby`; announce summary for form-level errors (duplicate email).

- **[medium]** Accessible Authentication (**3.3.8** AA): no statement that password managers, paste, and show-password are allowed (common shadcn defaults sometimes fight this). *Fix:* Explicitly allow paste/autofill; avoid cognition tests; keep visible labels (already: label above field).

- **[low]** “Mock payment — no real charges” is strong tone guidance but not bound to an always-visible `aria-describedby` on the mock control group. *Fix:* Persist helper text and reference it from the outcome controls.

## What’s strong

- Status trio always text-labeled; payment vs window machines separated; “never color-only” stated in both spines.
- Accent deliberately darkened for AA with white; chip fg/bg pairs checked here largely clear 4.5:1.
- Dialog intent: focus trap, labelled title, return focus, Esc; modal stack depth ≤ 1.
- Inputs: label above; helper/error via `aria-describedby` in DESIGN.
- Auth/reject called out for `aria-invalid` / describedby; rejection reason mandatory and Customer-visible.
- Countdown called out as a live region (polite, throttled) — right instinct.
- Admin mobile/tablet: cards → detail instead of horizontal-only tables; sticky mobile CTA for forms.
- Unread uses bold + accent (not color alone); empty notification state specified.
- Mock payment honesty in voice/tone; no real card collection.
- Keyboard called out as first-class for forms, dialogs, Admin lists; hover-only critical actions banned on `sm`.
