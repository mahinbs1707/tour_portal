---
name: Tour Portal
description: Consumer tour discovery, booking, mock payment, and Admin ops — premium coastal visual layer.
status: final
sources:
  - docs/tour-portal/PRD.md
  - docs/tour-portal/BRD.md
updated: 2026-11-15
colors:
  # Decided: modern, premium, trustworthy coastal (not overly tropical). Light-only MVP.
  background: '#F7F4EF'
  foreground: '#1C2B33'
  muted: '#E8E2D8'
  muted-foreground: '#3D4A52' # ≥4.5:1 on muted / sand
  card: '#FFFFFF'
  card-foreground: '#1C2B33'
  border: '#8A8278' # ≥3:1 non-text vs white/card (1.4.11)
  input: '#8A8278'
  ring: '#1C2B33' # outer focus ring (≥3:1 on sand/white)
  ring-inner: '#FFFFFF' # inner focus halo on filled buttons
  primary: '#0E6B6B'
  primary-foreground: '#F7F4EF'
  primary-hover: '#0A5555'
  primary-active: '#084444'
  primary-disabled-bg: '#A8C5C5'
  primary-disabled-fg: '#F7F4EF'
  secondary: '#1C2B33'
  secondary-foreground: '#F7F4EF'
  # Accent AA ≥4.5:1 with white
  accent: '#A84830'
  accent-foreground: '#FFFFFF'
  accent-hover: '#8F3C28'
  accent-active: '#7A3422'
  accent-disabled-bg: '#E8C4B8'
  accent-disabled-fg: '#8A6A60'
  destructive: '#B42318'
  destructive-foreground: '#FFFFFF'
  success: '#1F7A4C'
  success-foreground: '#FFFFFF'
  warning: '#FEF3C7'
  warning-foreground: '#92400E' # ≥4.5:1 at 12px label
  focus-ring-offset: '#F7F4EF'
  # Booking status chips
  status-pending-bg: '#FEF3C7'
  status-pending-fg: '#92400E'
  status-approved-bg: '#D1FAE5'
  status-approved-fg: '#065F46'
  status-rejected-bg: '#FEE2E2'
  status-rejected-fg: '#991B1B'
  status-cancelled-bg: '#E5E7EB'
  status-cancelled-fg: '#374151'
  # Payment status chips (transaction only — never EXPIRED)
  payment-unpaid-bg: '#E0E7FF'
  payment-unpaid-fg: '#3730A3'
  payment-pending-bg: '#FEF3C7'
  payment-pending-fg: '#92400E'
  payment-success-bg: '#D1FAE5'
  payment-success-fg: '#065F46'
  payment-failed-bg: '#FEE2E2'
  payment-failed-fg: '#991B1B'
  payment-cancelled-bg: '#E5E7EB'
  payment-cancelled-fg: '#374151'
  # Payment-window chips (separate machine)
  window-not-open-bg: '#F3F4F6'
  window-not-open-fg: '#4B5563'
  window-open-bg: '#DBEAFE'
  window-open-fg: '#1E40AF'
  window-expired-bg: '#F3F4F6'
  window-expired-fg: '#4B5563'
typography:
  # Decided: Fraunces + Source Sans 3 with system fallbacks
  display:
    fontFamily: "Fraunces, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif"
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.15'
    letterSpacing: '-0.02em'
  display-sm:
    fontFamily: "Fraunces, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif"
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: '-0.01em'
  headline:
    fontFamily: "Fraunces, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif"
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.55'
  body-sm:
    fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: "'Source Sans 3', 'Source Sans Pro', 'Segoe UI', system-ui, sans-serif"
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0.04em'
  mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', monospace"
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  section-gap: 64px
  max-content-width: 1200px
  admin-sidebar-width: 240px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
    hover-background: '{colors.primary-hover}'
    active-background: '{colors.primary-active}'
    disabled-background: '{colors.primary-disabled-bg}'
    disabled-foreground: '{colors.primary-disabled-fg}'
    focus: '2px {colors.ring-inner} + 2px {colors.ring} (≥3:1 two-tone)'
    min-touch: 44px
    loading: 'aria-busy=true; keep accessible name; text “Loading” under prefers-reduced-motion'
  button-accent:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.md}'
    hover-background: '{colors.accent-hover}'
    active-background: '{colors.accent-active}'
    disabled-background: '{colors.accent-disabled-bg}'
    disabled-foreground: '{colors.accent-disabled-fg}'
    focus: '2px {colors.ring-inner} + 2px {colors.ring}'
    min-contrast: '4.5:1 vs accent-foreground'
    min-touch: 44px
  book-now:
    visual: '{components.button-accent}'
  pay-now:
    visual: '{components.button-accent}'
  mock-checkout:
    visual: '{components.button-secondary}'
    legend: 'Mock payment outcome (no real charges)'
  date-picker:
    visual: '{components.input-field}'
  notification-bell:
    background: 'transparent'
    foreground: '{colors.foreground}'
    min-touch: 44px
    badge-name-pattern: 'Notifications, {n} unread | Notifications, 9 or more unread'
  empty-state:
    title: '{typography.display-sm}'
    body: '{typography.body}'
  approve-dialog:
    visual: '{components.modal-dialog}'
    role: dialog
  reject-dialog:
    visual: '{components.modal-dialog}'
    role: alertdialog
  reopen-dialog:
    visual: '{components.modal-dialog}'
  extend-dialog:
    visual: '{components.modal-dialog}'
  button-secondary:
    background: 'transparent'
    foreground: '{colors.primary}'
    border: '{colors.border}'
    radius: '{rounded.md}'
    hover-background: '{colors.muted}'
    focus-ring: '{colors.ring}'
  button-destructive:
    background: '{colors.destructive}'
    foreground: '{colors.destructive-foreground}'
    radius: '{rounded.md}'
  card-package:
    background: '{colors.card}'
    foreground: '{colors.card-foreground}'
    radius: '{rounded.lg}'
    border: '{colors.border}'
    image-aspect: '4 / 3'
    image-object-fit: cover
  hero-banner:
    image-aspect-desktop: '21 / 9'
    image-aspect-mobile: '4 / 5'
    image-object-fit: cover
    overlay: 'none'
  input-field:
    background: '{colors.card}'
    foreground: '{colors.foreground}'
    border: '{colors.input}'
    radius: '{rounded.md}'
    focus-ring: '{colors.ring}'
    error-border: '{colors.destructive}'
    error-text: '{colors.destructive}'
    success-border: '{colors.success}'
    disabled-background: '{colors.muted}'
    disabled-foreground: '{colors.muted-foreground}'
  status-chip:
    radius: '{rounded.full}'
    typography: '{typography.label}'
  payment-chip:
    radius: '{rounded.full}'
    typography: '{typography.label}'
  window-chip:
    radius: '{rounded.full}'
    typography: '{typography.label}'
  modal-dialog:
    radius: '{rounded.lg}'
    scrim: 'rgba(28, 43, 51, 0.4)'
    max-width: 480px
  drawer-sheet:
    radius: '{rounded.lg}'
    scrim: 'rgba(28, 43, 51, 0.4)'
  dropdown-menu:
    background: '{colors.card}'
    border: '{colors.border}'
    radius: '{rounded.md}'
    shadow: '0 8px 24px rgba(28, 43, 51, 0.12)'
  nav-header:
    background: '{colors.card}'
    foreground: '{colors.foreground}'
    border: '{colors.border}'
  admin-sidebar:
    background: '{colors.secondary}'
    foreground: '{colors.secondary-foreground}'
    width: '{spacing.admin-sidebar-width}'
---

# Tour Portal — Design Spine

> Visual identity for Tour Portal (Customer portal + Admin Dashboard). Paired with `EXPERIENCE.md`. **Spines win on conflict** with any mock, wireframe, or import. Product rules align to PRD/BRD **v1.5** (payment **`SUCCESS`**). Shared `components:` keys are the join keys for EXPERIENCE.md. No key-screen mockups shipped — implement from tokens + component specs.

## Brand & Style

Tour Portal feels like a **modern, premium, trustworthy travel desk** — calm confidence, not a tropical resort brochure or flashy OTA collage. Discovery is image-led and restrained; booking, approval, and mock payment are institutional-grade and clear.

**Style (decided):** Premium coastal — sand canvas, lagoon primary, darkened coral accent for conversion CTAs. Real-place photography with natural grade; no palm clichés, neon beach gradients, or souvenir ornament. Admin is denser and tool-like on the same tokens.

**Brand signal:** **Tour Portal** is hero-level on Landing (wordmark + short promise), not nav-only chrome.

**Theme (decided):** Light-only MVP.

**Photography (decided):** High-quality destination images; consistent aspect ratios (see Components); lazy-load below the fold; `width`/`height` or aspect-ratio boxes to prevent CLS; no text stickers on hero media.

## Colors

| Role | Token | Notes |
|---|---|---|
| Canvas | `{colors.background}` | Warm sand public surfaces |
| Ink | `{colors.foreground}` | Body + headings |
| Primary | `{colors.primary}` | Nav, links, default primary buttons |
| Accent | `{colors.accent}` `#A84830` | Book Now / Pay now / Simulate success — **AA ≥4.5:1** with `{colors.accent-foreground}` |
| Booking chips | `status-*` | PENDING / APPROVED / REJECTED / CANCELLED |
| Payment chips | `payment-*` | UNPAID / PENDING / SUCCESS / FAILED / CANCELLED only |
| Window chips | `window-*` | NOT_OPEN / OPEN / EXPIRED only |

**Contrast requirements (decided):** WCAG 2.2 AA — text ≥4.5:1; non-text UI (borders, focus) ≥3:1. Accent `#A84830` + white ≥4.5:1. Borders `#8A8278` for control boundaries. Focus on filled buttons is **two-tone** (`{colors.ring-inner}` + `{colors.ring}`), never a same-hue ring on primary/accent. Disabled controls may drop contrast but use `aria-disabled` and are skipped in tab order when inert. Prefer-reduced-motion: no decorative animation; sheets instant; loading uses text not only spinners. Never convey status by color alone.

## Typography

**Decided:** Fraunces (display/headlines) + Source Sans 3 (UI/body) + IBM Plex Mono (references, timers), each with the fallback stacks in frontmatter. Prefer webfonts; if load fails, fallbacks keep hierarchy readable. No Inter/Roboto/Arial as primary brand faces.

## Layout & Spacing

- Public/Customer: max width `{spacing.max-content-width}`; 12-col fluid; `{spacing.section-gap}` between Landing sections; package grid 1/2/3 cols by breakpoint.
- Admin: sidebar `{spacing.admin-sidebar-width}` on `lg+`; content fluid.
- Booking detail always shows **three** separate labeled rows when payment applies: Booking status · Payment status · Payment window (when relevant).
- Margins: `{spacing.margin-mobile}` / `{spacing.margin-desktop}`.

## Elevation & Depth

Soft tonal depth: cards use 1px `{colors.border}`; hover shadow `0 8px 16px rgba(28, 43, 51, 0.08)`. Modal/drawer scrim `{components.modal-dialog.scrim}`. No neon multi-layer glow.

## Shapes

Controls `{rounded.md}`; cards/images `{rounded.lg}`; chips `{rounded.full}` only. Primary/accent buttons are elongated rectangles — not pills.

## Components

### Buttons
- Variants: `{components.button-primary}`, `{components.button-accent}`, `{components.button-secondary}`, `{components.button-destructive}`.
- States: default · hover · focus (ring `{colors.ring}` + offset `{colors.focus-ring-offset}`) · active · disabled · loading (spinner replaces label; button stays width-stable; not double-submittable).

### Package card & hero
- Card image `{components.card-package.image-aspect}` `4/3`, `object-fit: cover`, `{rounded.lg}` on image top corners matching card.
- Hero `{components.hero-banner}`: `21/9` desktop, `4/5` mobile; no overlay badges on media.
- Price display (decided): `{amount}` + space + ISO currency code from package (e.g. `1200 USD`); locale-aware number formatting hooks for future i18n; no hardcoded `$` concatenation in components.

### Status / payment / window chips
- Always text-labeled: `Booking: APPROVED`, `Payment: UNPAID`, `Window: OPEN`.
- Payment enum in UI/docs/API: **`UNPAID` | `PENDING` | `SUCCESS` | `FAILED` | `CANCELLED`** — never `EXPIRED`, never `SUCCEEDED`.
- Window enum: **`NOT_OPEN` | `OPEN` | `EXPIRED`**.

### Inputs
- Label above field; helper/error below via `aria-describedby`.
- States: default · focus · error (`{components.input-field.error-*}`) · success (optional post-validate) · disabled.

### Modal, drawer, dropdown, confirm
- Confirm dialogs (`{components.modal-dialog}`): Cancel booking; Admin reject (reason required) as `alertdialog`; Admin approve; Reopen; Extend (shows new expires-at). Label + `aria-describedby` body; focus trap; Esc; restore focus.
- Drawers (`{components.drawer-sheet}`): same dialog a11y contract as modals (`role="dialog"`, labelled title, trap, Esc, restore focus) for mobile nav and Admin sheet.
- Dropdowns (`{components.dropdown-menu}`): ArrowUp/Down, Home/End, Enter/Space, Esc, focus restore to trigger (APG menu).
- Touch targets ≥24×24 CSS px (prefer 44×44 for primary CTAs, bell, sidebar icons).
- Skip link “Skip to main content”; landmarks: header, nav, main, complementary (Admin sidebar).

### Navigation chrome
- Public: `{components.nav-header}`; `< md` hamburger → sheet.
- Admin: `{components.admin-sidebar}`; `< lg` → icon rail or sheet; **lists on tablet/mobile use stacked cards / detail drill-in**, not horizontal-only tables (decided).

### Notifications
- Unread: accent dot + bold title; badge count on bell (caps `9+`).
- Open → mark read; empty: “You’re all caught up.” + Explore CTA.

### Empty / loading
- Empty: `{typography.display-sm}` + one sentence + one CTA.
- Loading: skeletons matching final layout; AI has explicit progress copy.

## Do's and Don'ts

**Do**
- Keep booking, payment, and window statuses as separate labeled chips.
- Gate Pay now until booking `APPROVED` and window `OPEN`.
- Use `SUCCESS` (not `SUCCEEDED`) everywhere.
- Darkened coral `{colors.accent}` for conversion CTAs meeting AA.
- Show required rejection reason on Customer surfaces.
- Preserve form draft in sessionStorage on auth/session expiry where safe (no passwords).

**Don't**
- Treat window `EXPIRED` as a payment transaction status.
- Auto +24h on reopen; imply auto-cancel on unpaid expiry.
- Merge statuses; use tropical clichés; collect real cards; overlay stickers on hero photos.
