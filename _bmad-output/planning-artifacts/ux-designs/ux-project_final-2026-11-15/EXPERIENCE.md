---
name: Tour Portal
description: Customer and Admin experience for tour discovery, booking, mock payment, and ops review.
status: final
sources:
  - docs/tour-portal/PRD.md
  - docs/tour-portal/BRD.md
updated: 2026-11-15
---

# Tour Portal — Experience Spine

> Behavioral / IA spine. Visual tokens live in `DESIGN.md` (`{path.to.token}`). Aligned to PRD/BRD **v1.5**. Component Pattern names match DESIGN.md `components:` keys. **Spines win on conflict** with mocks, wireframes, or imports. Runtime data slots `{amount}`, `{CODE}`, `{expires-at}`, `{n}` are not DESIGN tokens. No key-screen mockups shipped — implement from spine tables.

## Foundation

**Form-factor:** Responsive web (desktop, tablet, mobile). No native apps.

**Surfaces:** (1) Public / Customer portal — top nav. (2) Admin Dashboard — sidebar ops console.

**UI system `[ASSUMPTION]`:** shadcn/ui + Tailwind; `DESIGN.md` is the brand-layer delta.

**Theme (decided):** Light-only.  
**Language (decided):** English MVP; localization-ready (externalized strings; locale-aware date/number/currency formatters — no hardcoded formats in components).

**Status glossary (canonical — use everywhere)**

| Machine | Values |
|---|---|
| Booking | `PENDING` · `APPROVED` · `REJECTED` · `CANCELLED` |
| Payment (transaction) | `UNPAID` · `PENDING` · `SUCCESS` · `FAILED` · `CANCELLED` |
| Payment window | `NOT_OPEN` · `OPEN` · `EXPIRED` |

**Canonical happy path:** Booking `PENDING` → `APPROVED` · Payment `UNPAID` → `SUCCESS`.  
**Deadline:** 24 hours from **Admin approval timestamp**. Window `EXPIRED` ≠ payment status; booking stays `APPROVED`; no auto-cancel.  
**Reopen:** restores access; **preserves original deadline**. **Extend:** only way to change `expires-at` (confirm new deadline).  
**Reject booking:** reason **mandatory**; shown to Customer.  
**Retry:** after `FAILED` / `CANCELLED` while window `OPEN`.

## Information Architecture

### Public / Customer

| Surface | Reached from | Purpose |
|---|---|---|
| Landing | `/`, logo | Brand hero, Featured, entry points |
| Explore | Nav | Published catalog |
| Search & filter results | Catalog controls | Narrow / empty no-match |
| Package detail | Card / AI | Detail; Book Now |
| AI recommendations | Nav / Landing | Prompt → ≤5 published + why |
| Sign up | Nav / gates | Customer only |
| Sign in | Nav / gates | Customer + Admin |
| Customer home | Post-auth hub | Discovery · booking status · pending payment |
| Booking form / review / confirmation | Book Now | Request (≥7 calendar days); confirm; `PENDING` |
| Booking history / detail | Nav / notif | Statuses; cancel if PENDING; Pay if eligible |
| Mock checkout | Pay now | Simulate SUCCESS / FAILED / CANCELLED |
| Custom tour builder / review / history / detail | Nav | Private plan lifecycle |
| Notifications | Bell | List; unread count; mark read on open |

### Admin

| Surface | Reached from | Purpose |
|---|---|---|
| Admin home | `/admin` | Stats; pending highlights |
| Packages list / create-edit | Sidebar | CRUD, dates, featured, publish |
| Bookings list / review detail | Sidebar | Approve/reject; payment + window; reopen; extend |
| Custom tours list / review detail | Sidebar | Approve/reject + reason; adjustments; reapply |
| Admin notifications | Bell | Sparse ops alerts `[ASSUMPTION: low volume]` |

**Nav:** Guest — Explore · AI · Sign in · Sign up. Customer — + My bookings · Custom tours · Notifications · Sign out. Admin — sidebar only; “View site” optional. Modal stack depth ≤ 1; checkout is a full page.

## Voice and Tone

| Do | Don't |
|---|---|
| “Approved — pay within 24 hours of approval.” | “Pay now or booking will be cancelled.” |
| “Booking: APPROVED · Payment: UNPAID · Window: OPEN” | One merged “Paid/Approved” status |
| “Dates within the next 7 days aren’t available — tours need at least a week to prepare.” | Silent disabled dates with no explanation |
| “Reopen payment access (deadline unchanged).” / “Extend deadline to …” | “Reopen (+24h)” |
| “Mock payment — no real charges.” | Hide simulation |

## Component Patterns

Names = DESIGN.md `components:` keys (visual specs there).

| Component | Behavioral rules |
|---|---|
| `card-package` | Click → detail; price `{amount} {CODE}`; AI shows why-match |
| `book-now` | Uses `{components.button-accent}`. Guest → auth return; Customer → form; ineligible dates explained (7-day rule). Hidden if package not bookable |
| `status-chip` / `payment-chip` / `window-chip` | Status trio: separate labeled chips; never color-only; optional SR gloss “Booking status: Approved” |
| `pay-now` | `{components.button-accent}`. Visible iff `APPROVED` AND window `OPEN` AND payment ≠ `SUCCESS`; else hidden |
| `mock-checkout` | Fieldset legend “Mock payment outcome (no real charges)”; buttons: “Simulate successful payment”, “Simulate failed payment”, “Simulate cancelled payment” → `SUCCESS` / `FAILED` / `CANCELLED` |
| `approve-dialog` | Confirm: “Approve this booking? 24h payment window starts now.”; blocked if 7-day rule fails |
| `reject-dialog` | `alertdialog`; **reason required**; shown to Customer |
| `reopen-dialog` | “Reopen access. Original deadline `{expires-at}` stays unchanged.” |
| `extend-dialog` | Datetime + confirm new `{expires-at}`; required if original deadline past |
| `notification-bell` | Accessible name “Notifications, {n} unread”; open → mark read + deep link; focus main h1 after nav |
| `date-picker` | Next 7 calendar days not selectable; helper explains preparation lead time |
| `empty-state` | Headline + sentence + one CTA for any empty list |
| `drawer-sheet` | Same a11y as modal: trap, Esc, labelled, restore focus (mobile nav / Admin sheet) |
| `nav-header` / `admin-sidebar` | Landmarks; skip link to main; Admin `sm`/`md` card rows → detail (actions on detail) |
| `input-field` | All forms: `aria-invalid` + `aria-describedby`; focus first error; paste/autofill allowed on passwords |
| `hero-banner` | Landing only; no overlay stickers; decorative image alt empty or short place name |

## State Patterns

| State | Treatment |
|---|---|
| Cold load | Layout-matched skeletons; region `aria-busy` |
| Empty featured / catalog / search / notifications / Admin lists | `{components.empty-state}` |
| AI loading / empty / fail | Progress + status live region; fallback; Explore works |
| Offline | Banner: “You’re offline.” Block Pay / submit; retry when online |
| Network / server error | Banner + retry; preserve form inputs; `role="alert"` for errors |
| Package not bookable | Book Now hidden; explanation (unpublished / unavailable) |
| Booking PENDING | Booking PENDING · Window NOT_OPEN · Pay hidden · Cancel available |
| Booking REJECTED | Reason always visible · Pay hidden |
| APPROVED + OPEN + UNPAID | Banner countdown · Pay now |
| Payment PENDING (attempt in flight) | Pay disabled; “Processing mock payment…”; then SUCCESS/FAILED/CANCELLED |
| Payment SUCCESS | Booking APPROVED · Payment SUCCESS · Pay hidden |
| FAILED / CANCELLED + OPEN | Show status · Retry Pay |
| Window EXPIRED | Window EXPIRED · Payment UNPAID (or latest FAILED/CANCELLED) · Booking APPROVED · Pay hidden |
| Auth validation | Stay on page; field errors; no session |
| Permission denied | Redirect Customer home + `role="status"` toast |
| Session expiry | Modal: “Your session ended.” Sign in; restore non-sensitive draft |
| Advance-rule block | Inline: dates inside 7 days unavailable + preparation explanation |

## Interaction Primitives

- Pointer + touch; full keyboard for forms, dialogs, Admin lists.
- Focus visible `{colors.ring}`; Esc closes top dialog/sheet.
- Confirm: cancel booking; approve; reject (+ reason); reopen; extend.
- Toasts for non-blocking success/fail; persistent errors stay on form.
- Banned: hover-only critical actions on `sm`; checkout before approval; real cards; auto-cancel; merging status machines; `SUCCEEDED` label.

## Accessibility Floor

- WCAG 2.2 AA; two-tone focus on filled CTAs (`{colors.ring-inner}` + `{colors.ring}`); borders ≥3:1.
- Status never color-only; touch targets ≥24px (prefer 44px primary).
- Countdown: `aria-live="polite"` `aria-atomic="true"`; announce on mount; tick ~1/min; on EXPIRED announce once that Pay is unavailable.
- Toasts: success `role="status"`; errors `role="alert"`.
- Modals **and** drawers: trap, labelled title, `aria-describedby` body, Esc, restore focus; destructive confirms = `alertdialog`.
- Forms: every error `aria-invalid` + `aria-describedby`; focus first invalid; password paste/autofill allowed.
- `prefers-reduced-motion: reduce` → no decorative motion; text Loading instead of spinner-only.
- Skip link + landmarks; sticky mobile CTA must not obscure focused fields (scroll into view).

## Responsive & Platform

| Breakpoint | Customer | Admin |
|---|---|---|
| `≥ lg` | Top nav; 3-col grid | Sidebar 240px; tables OK |
| `md` | 2-col; statuses stacked | Sidebar icons/sheet; **card list → detail** |
| `< md` | Hamburger; sticky form CTA; checkout full-screen | Sheet nav; **card/detail**, not H-scroll tables |

Primary Admin persona: desktop; tablet/phone must complete approve/reject/reopen/extend without horizontal-only tables.

## Inspiration & Anti-patterns

- Lift: calm travel discovery; clear ops desk.
- Reject: fake cancel-urgency; merged order status; hidden mock payment; seat maps.

## Key Flows

### Flow A — Sign up / Sign in / Sign out (Jordan)

1. Guest opens Sign up → valid name/email/password/confirm → Customer session → Landing.  
2. Sign in with same email → Landing; role Customer.  
3. Sign out → session cleared → public nav.  
**Failure:** validation / duplicate email / bad credentials → stay on auth; no session.  
**Climax:** Book Now gate returns Jordan to booking after Sign in.

### Flow 1 — Amina books (success)

1. Amina browses Explore / Featured → opens package detail.  
2. Book Now → Sign up/in → returns to booking form.  
3. Selects Admin date ≥7 days; fills travelers/contact; continues to review.  
4. Submits → confirmation: Booking `PENDING`, Window `NOT_OPEN`; notification.  
5. Mira approves via `approve-dialog` → Payment `UNPAID`, Window `OPEN`, 24h from approval.  
6. **Climax:** Amina opens Pay now → mock checkout → “Simulate successful payment” → Payment `SUCCESS`; booking stays `APPROVED`; statuses remain separate in history.

**Failures:** Reject + reason; date <7 days blocked; payment FAILED then retry; window EXPIRED then Admin reopen+extend; offline blocks Pay.

### Flow 1b — Cancel before approval

Amina cancels while `PENDING` (confirm) → `CANCELLED`; Pay never available.

### Flow 2 — Mira Admin booking review

1. Pending queue → detail.  
2. Approve confirm → window opens at approval time. **Or** Reject confirm + required reason.  
3. Later EXPIRED: Reopen (deadline unchanged) + Extend (new expires-at confirmed).  
**Failure:** Approve blocked by 7-day rule at approval time.

### Flow 3 — Omar AI → auth return

1. Omar submits AI prompt.  
2. Sees ≤5 published matches + why (distinct from search).  
3. Opens detail → Book Now → Sign in.  
4. **Climax:** Lands back on booking path for that package — intent preserved.  
**Failure:** AI empty/fail → fallback; Explore still works.

### Flow 4 — Priya custom tour reapply

1. Priya submits custom plan (≥7 days) → `PENDING`.  
2. Mira rejects with required reason + adjustments; enables reapply.  
3. Priya opens notification (marks read) → edits → resubmits.  
4. **Climax:** New `PENDING` review cycle; prior rejection retained; never auto-published.  
**Failure:** Reapply disabled → edit CTA hidden; message explains Admin must enable.

### Flow 8 — Mira publishes a package (Admin)

1. Mira opens Packages → Create.  
2. Fills package fields + available dates (≥7 days ahead for bookable dates).  
3. Saves draft → publishes → optionally features.  
4. **Climax:** Package appears on Explore / Featured for Guests.  
**Failure:** Validation errors keep draft; unpublish removes from catalog but historical bookings retain date.

### Flow 5 — Payment matrix (Amina)

| Event | Booking | Payment | Window |
|---|---|---|---|
| Submit | PENDING | — | NOT_OPEN |
| Approve | APPROVED | UNPAID | OPEN |
| Simulate fail | APPROVED | FAILED | OPEN |
| Retry success | APPROVED | SUCCESS | OPEN (Pay hidden) |
| No pay until deadline | APPROVED | UNPAID | EXPIRED |
| Reopen only (deadline past) | APPROVED | UNPAID | still not payable until Extend |
| Extend + reopen | APPROVED | UNPAID | OPEN until new expires-at |

### Flow 6 — Notifications

Bell shows unread count → open item marks read → deep link. Empty: caught-up state. Rejection notif includes reason.

### Flow 7 — Session expiry mid-form

While drafting booking, session ends → message + Sign in → form draft restored (no password fields).

## Remaining open gaps (product TBD only)

*(Decided rules live in Foundation + glossary above — do not duplicate here.)*


1. UI kit library choice beyond “shadcn-like” tokens (`[ASSUMPTION]` shadcn/ui).  
2. Supported currency list (AQ-03).  
3. Max travelers cap (AQ-07) — **Unresolved:** do not invent a max; positive integer (≥1) only until decided.  
4. Removing available dates after bookings exist (AQ-06) — **Resolved in architecture:** deactivate, never hard-delete when booking FKs exist.  
5. Optional window-expiry notification (FR-NOTIF-03a).  
6. Admin notification event set (volume may be sparse).
