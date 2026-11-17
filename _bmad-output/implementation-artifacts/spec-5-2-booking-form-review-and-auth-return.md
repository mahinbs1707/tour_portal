---
title: '5.2 Booking Form, Review, and Auth Return'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '0c7852e919992eb96dfb10d6695b4da326e2ddc6'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/app/bookings/new` is still a Placeholder, Guest Book Now returns to detail (not the form), and Customers cannot complete a reviewed booking submit against Story 5.1’s API.

**Approach:** Replace the stub with a Customer booking form + review step that POSTs to `/api/bookings/`, fix Guest Book Now auth-return to the form for that package, enforce FE 7-day / required-field rules (BE remains authoritative), and restore non-sensitive draft fields after re-auth.

## Boundaries & Constraints

**Always:**
- Route `/app/bookings/new?package=<id>` behind existing `RequireAuth` + `RequireRole CUSTOMER` (replace Placeholder).
- Guest Book Now → Sign in/up with `?next=` pointing at **booking form** for that package (not package detail). After auth as Customer, land on the form.
- Form: package auto-populated from `?package=`; preferred travel date from **published package available dates**; travelers ≥1 (**no max** — OPEN-02); name; contact email; contact phone; optional additional requirements. Pre-fill name/email from session/`/api/auth/me/` when available.
- Date UX: dates within next 7 calendar days (Asia/Dhaka / `minBookableDateIso`) not selectable; show preparation helper; only Admin-defined available dates offered.
- FE blocks continue/submit on missing/invalid required fields (field-level messages); no create call when blocked.
- Review step before final confirm; confirm calls Story 5.1 `POST /api/bookings/` via `apiClient` (CSRF); map 400 field errors.
- On success: navigate to a **thin confirmation page** showing **reference + Booking PENDING** (Story 5.3 polishes history/detail/cancel later).
- Draft restore: persist non-sensitive fields in **`sessionStorage` keyed by package id** (tab/session-scoped); restore after re-auth; never store passwords.
- i18n via `messages.js`; accessible field errors (`role="alert"`).

**Never:** Change 5.1 create contracts; invent traveler max; seats; 5.3 history/cancel/Pay; open window; Admin/Explore search; JWT/Stripe/email/SMS; `localStorage` draft persistence.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Guest Book Now | Guest on bookable detail | Sign-in/up → `/app/bookings/new?package=` | N/A |
| Customer form | Valid package + bookable dates | Form + review → POST → thin confirmation (ref + PENDING) | FE blocks incomplete |
| Date picker | Open picker | <7d not selectable + helper | N/A |
| FE validation | Omit required field | Blocked; no API call | Field errors |
| BE bypass | Incomplete POST | 400; no booking | Show field errors |
| Draft restore | Session expired → re-auth | Non-sensitive fields from sessionStorage | Passwords never |
| Unbookable package | Not bookable / no dates | Unavailable messaging; no submit | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/App.jsx` — wire booking form + thin confirmation route
- `frontend/src/features/bookings/` — form+review, confirmation page, `POST /api/bookings/` client, sessionStorage draft helpers, tests
- `frontend/src/features/packages/PackageDetailPage.jsx` — Guest Book Now `next` → booking form (closes deferred 3.2 auth-return)
- `frontend/src/features/auth/SignInPage.jsx` / `SignUpPage.jsx` / `safeNextPath.js` — Sign-up honors `?next=`
- Reuse: `getPublishedPackage`, `minBookableDateIso` / `isWithinAdvanceWindow`, `apiRequest`, `ApiError.fieldErrors`, `messages`, me prefill
- Continuity: Story 5.1 create API; `/app/customer/bookings` stub until 5.3
- Do not change: `backend/bookings` contracts; Admin; Explore search; recommendations

**Agent decisions:** Date = select bookable `available_dates` only. Travelers ≥1 no max; requirements max 2000. Confirmation route e.g. `/app/bookings/confirmation?reference=` (or state). Wire SignUp `?next=` like SignIn. Prefer vitest + RTL.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/features/bookings/` — form + review + create client + sessionStorage draft + thin confirmation -- FR-BOOK-02/03/06/07/09/10
- [x] `PackageDetailPage` + auth pages — Guest/Customer Book Now → form; SignUp next -- UX Flow 1 / FR-BOOK-02
- [x] `App.jsx` + `messages.js` — wire form + confirmation routes -- Story 5.2 AC
- [x] Tests — Guest return; date helper; FE block; BE 400; review submit → confirmation; draft restore -- Story 5.2 AC

**Acceptance Criteria:**
- Given Guest on bookable detail, when Book Now + Sign in, then return to booking form for that package
- Given booking form, when date picker opens, then next 7 calendar days (Asia/Dhaka) are not selectable and helper is shown
- Given omitted required field, when continue/submit, then FE blocks with field errors and no booking is created
- Given incomplete payload bypassing FE, when POST hits API, then 400 and no booking row
- Given valid review confirm, when submit, then create API is called and user sees thin confirmation with reference + PENDING
- Given session expiry mid-draft, when Sign in again, then non-sensitive draft fields restore from sessionStorage

## Implementation Notes

- Booking form + review + thin confirmation; Guest Book Now → form; sessionStorage drafts; SignUp/SignIn `?next=`.
- Review patches: force PENDING confirm; draft clear/validate; FE max lengths; generic ApiError; `/app/bookings` index; auth next tests; bookingsApi.test.

## Spec Change Log

- 2026-11-17 — Implemented Story 5.2; review patches applied; tasks complete.

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Orphan bookingStub messages | low | patch | remove unused stub copy |
| Confirmation trusts status query | medium | patch | force display PENDING (thin 5.2 page) |
| viewMyBookings → Placeholder | low | defer | intentional until 5.3 history |
| Import helpers from PackageDetailPage | low | defer | extract shared helper later |
| Stale draft date / no clear on unavailable | medium | patch | clear draft; drop invalid available_date_id on restore |
| sessionStorage PII mislabeled | low | patch | clarify comment (still non-password) |
| FE max lengths name/phone | medium | patch | match BE 255/64 before review |
| Missing explore links on load error | low | patch | add Explore recovery where easy |
| Asia/Dhaka FE vs local Date | medium | defer | same Admin helper; BE authoritative |
| Silent empty fieldError values | medium | patch | fall back to generic status error |
| bookableDates memo stale across midnight | medium | patch | include calendar day key in deps / recompute |
| /app/bookings index empty | medium | patch | Navigate to `new` or safe landing |
| SessionExpired / SignIn↔SignUp next untested | medium | patch | add href assertions |
| Draft autosave / clear on submit untested on page | medium | patch | assert sessionStorage from form path |
| bookingsApi POST shape untested | medium | patch | add bookingsApi.test.js |
| App confirmation route untested | low | defer | navigate target + page test cover happy path |
| Confirmation missing-reference untested | low | defer | edge vs main flow |

## Verification

**Commands:**
- `cd frontend && npm test -- --run src/features/bookings src/features/packages/PackageDetailPage.test.jsx` — expected: OK
- Optional: auth SignUp `?next=` tests if touched
