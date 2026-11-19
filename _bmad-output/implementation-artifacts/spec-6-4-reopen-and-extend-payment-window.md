---
title: '6.4 Reopen and Extend Payment Window'
type: 'feature'
created: '2026-11-17'
status: 'approved'
baseline_commit: '0e193ab'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-2-approve-booking-and-open-payment-window.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-3-reject-booking-with-mandatory-reason.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After approval, an expired payment window leaves the Customer unable to pay; Admins have no reopen (preserve original deadline) or extend (set future `deadline_at`) controls, and eligibility is not enforced on deadline vs status alone.

**Approach:** Add Admin reopen + extend on the existing single `PaymentWindow` row via `PaymentService`, with audit `payment_window.reopen` / `payment_window.extend`, expose `deadline_at` on Admin booking detail, implement shared payment-eligibility (deadline-authoritative), and UI dialogs per UX-DR8 — without Customer checkout or Pay (Epic 7).

## Boundaries & Constraints

**Always:**
- Admin-only (`IsAdminRole` + CSRF); booking must be `APPROVED`; exactly one `PaymentWindow` per booking (AD-16).
- **Reopen:** only from window `EXPIRED`; updates same row to `OPEN`; **`deadline_at` unchanged**; audit `payment_window.reopen`.
- **Extend:** on that same row; set `deadline_at` to a **future** Admin-provided instant; window `OPEN` as applicable; audit `payment_window.extend`.
- **Eligibility:** payable only when booking `APPROVED`, payment not `SUCCESS`, window operable, and **`now < deadline_at`** (status alone is insufficient after reopen-with-past-deadline).
- Admin detail shows `deadline_at` and separate status chips; reopen/extend only when rules allow (not on PENDING).
- Reopen/extend dialogs: focus trap, Esc, restore focus; stack depth ≤1 (UX-DR8).
- Pay now stays hidden; no mock payment success path in this story.
- i18n; errors `role="alert"`; success `role="status"`.

**Never:** New PaymentWindow insert; reopen grants new +24h; change approve/reject; Customer checkout UI (Epic 7); Stripe/JWT/email/SMS; OPEN-04 expiry notifications; scheduled cron in production (optional callable expire helper for tests/admin only).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| Reopen only | APPROVED + EXPIRED + past deadline | OPEN; deadline unchanged; not eligible to pay | N/A |
| Extend | APPROVED + future deadline_at | deadline updated; eligible if now before new deadline | 400 past/invalid datetime |
| Pay attempt (eligibility) | APPROVED + OPEN + past deadline | Rejected ineligible | Per chosen verification path (Open Question) |
| Wrong window status | Reopen when not EXPIRED | No change | 409 |
| Customer/guest Admin API | Non-admin | Denied | 403 |

</frozen-after-approval>

## Decisions (Checkpoint 1)

- **1A** — `PaymentService` eligibility helper + unit tests; payment attempt API deferred to Epic 7.1.
- **2A** — `mark_expired_if_past_deadline` on `PaymentService` (tests/ops; no cron in 6.4).
- **3A** — Admin `datetime-local` → ISO `deadline_at` on extend.
- **4A** — Stay on Admin detail after reopen/extend success.

## Code Map

- `backend/payments/services.py` — `reopen_window_for_booking`, `extend_window_deadline`; optional expire helper; eligibility function used by tests (and stub API if B above).
- `backend/bookings/` — Admin `POST .../reopen/`, `POST .../extend/`; orchestration in `BookingService` or admin views; audit snapshots include `deadline_at`.
- `backend/bookings/serializers.py` — expose `payment_window_deadline_at` (or equivalent) on Admin detail.
- `frontend/.../AdminBookingDetailPage.jsx` — Reopen + Extend CTAs, dialogs, `adminBookingsApi` methods; show deadline; eligibility callout copy when past deadline.
- Continuity: 6.2 approve opened window; `PaymentWindow.EXPIRED` model field exists.
- Do not change: approve/reject contracts; Customer Pay UI.

**Agent decisions:** Extend rejects non-future deadlines in Asia/Dhaka-aware or UTC-aware `timezone.now()` comparison; vitest + APITestCase matrix rows from Story 6.4 AC.

## Tasks & Acceptance

**Execution:**
- [x] `backend/payments` + `bookings` — reopen/extend + eligibility + Admin APIs + audit -- FR-PAY-01c-f; AD-10,16,22; BR-16e
- [x] `frontend` Admin reopen/extend dialogs + deadline display + API client -- UX-DR8
- [x] Tests — reopen preserves deadline; extend enables eligibility; past deadline blocks pay path per AC -- Story 6.4 AC

**Acceptance Criteria:**
- Given APPROVED + EXPIRED + past `deadline_at`, when Admin reopens only, then `deadline_at` unchanged, eligibility false, Pay hidden
- Given reopened with past `deadline_at`, when Customer payment path runs without extend, then ineligible (no SUCCESS payment)
- Given Admin extends to a future `deadline_at`, when confirmed, then deadline updates, audit recorded, eligibility true while before new deadline

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `cd backend && python manage.py test bookings payments` — expected: OK
- `cd frontend && npm test -- --run` covering Admin reopen/extend — expected: OK