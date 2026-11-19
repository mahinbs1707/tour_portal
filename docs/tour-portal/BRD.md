# Business Requirements Document (BRD)
## Tour Portal

| Field | Value |
|---|---|
| Document type | BRD |
| Product | Tour Portal |
| Version | 1.5 Draft |
| Status | Draft for review |
| Date | 2026-11-15 |
| Owner | Product / Business |
| Related Document | [PRD.md](./PRD.md) |

---

## 1. Executive summary

Tour Portal is a role-based web platform where travelers discover and book curated tour packages, get AI-assisted recommendations from a free-text prompt, and submit custom tour plans for admin review. Admins manage catalog packages and available travel dates, review bookings and custom plans, approve or reject submissions, and can enable a reapply path with guidance when a custom plan is rejected.

Guests browse publicly. Customers register via public Sign up. Admins use a predefined/seeded account. Catalog and custom-tour start dates must be at least 7 calendar days ahead. Status changes are communicated through in-app notifications.

**Final catalog booking workflow:** (1) Customer submits → booking `PENDING`; (2) Admin approves or rejects (**rejection reason required**, shown to Customer); (3) if `REJECTED`, no payment; (4) if `APPROVED`, payment starts `UNPAID`, Customer can checkout within **24 hours from approval**; (5) mock payment → `SUCCESS` / `FAILED` / `CANCELLED` (retry while window open); happy path payment `UNPAID` → `SUCCESS`; (6) booking status, payment status, and payment-window state shown separately. Window expiry does not auto-cancel the booking. Admin **reopen** keeps the original deadline; **extend** is required to change it.

---

## 2. Business objectives

| ID | Objective | Success signal |
|---|---|---|
| BO-1 | Increase tour package discovery and booking conversion | Completed bookings from catalog packages |
| BO-2 | Personalize discovery with AI recommendations | Users who search via prompt and open or book a recommended package |
| BO-3 | Capture demand that catalog packages do not cover | Custom tour submissions and approved custom plans |
| BO-4 | Give operations a controlled review workflow | Admin approve / reject / reapply decisions with auditability |
| BO-5 | Present a premium first impression | Landing page engagement (time on page, CTA clicks to catalog/search) |
| BO-6 | Keep customers informed without email/SMS in MVP | In-app notification engagement on booking and custom-tour events |
| BO-7 | Demonstrate payment UX without real charges | Mock payments completed within the post-approval window |

---

## 3. Business problem

Travelers often cannot find a package that matches dates, interests, budget, or group needs. Without a structured custom-request path, that demand is lost or handled offline with poor traceability. Without AI-assisted discovery, search remains rigid and conversion suffers. Last-minute bookings and unpaid approvals create operational risk without clear advance-booking and payment-window rules.

Operators need one place to publish packages, define travel dates, review customer requests, manage payment windows, and communicate rejection reasons plus adjustment guidance without losing submission history.

---

## 4. Stakeholders

| Stakeholder | Interest |
|---|---|
| Traveler / Customer | Discover packages, book (≥7 days ahead), pay after approval, cancel only while pending, custom tours + reapply |
| Portal Admin | Packages/dates, approve/reject, reopen expired payment windows, custom-tour review |
| Business owner | Bookings, conversion, operational efficiency |
| Support / operations | Clear rejection reasons, reapply cycles, unpaid-but-approved follow-up |

---

## 5. User roles (business view)

### 5.1 Guest
- Browse landing, catalog, search, package detail, AI recommendations
- Access Sign up / Sign in
- Cannot book, create custom tours, or see private customer data

### 5.2 Customer (public registration)
- All guest discovery features
- Book published packages with Admin-defined dates ≥7 calendar days ahead
- Cancel own bookings only while PENDING (before Admin approval)
- Pay via mock checkout only after Admin approval, within 24 hours
- Create/submit custom tours with start date ≥7 calendar days ahead; reapply when enabled
- View own history; receive in-app notifications

### 5.3 Admin (predefined account — not public Sign up)
- Dashboard and package CRUD (draft/publish/unpublish/featured)
- Manage available travel dates
- Approve/reject bookings and custom tours (blocked if 7-day rule violated at approval time)
- Reopen expired payment windows
- On custom reject: reason, recommended adjustments, reapply enablement

---

## 6. In scope (MVP)

Aligned with PRD §2.1 including: 7-day advance booking, pay-after-approval mock payment with 24-hour deadline, Admin payment-window reopen, and Stripe-ready payment abstraction.

---

## 7. Out of scope (MVP)

Aligned with PRD §2.2: real payment gateway charging (Stripe deferred), seat inventory/holds, social/OTP auth, native apps, multi-admin permission levels, auto-publishing AI packages, public custom-tour sharing, email/SMS notifications, cancel after booking approval. Mock payment checkout is in MVP.

---

## 8. Business rules

### Key timing rules

| Rule | Requirement |
|---|---|
| Minimum advance booking | At least 7 calendar days before the tour start date (configured timezone; calendar dates) |
| Payment eligibility | Only after Admin approval |
| Payment deadline | Within 24 hours after Admin approval |
| Customer cancellation | Only before Admin approval |

| ID | Rule |
|---|---|
| BR-01 | Guests may browse public tour information without authentication |
| BR-02 | Only Customers may submit booking requests and custom tour plans |
| BR-03 | Only authorized Admins may manage catalog packages and review customer requests |
| BR-04 | Public registration shall create Customer accounts only |
| BR-05 | Only published packages may be displayed publicly or recommended by AI |
| BR-06 | Booking requests must reference an Admin-defined available travel date |
| BR-06a | Minimum 7 calendar-day advance booking for catalog and custom-tour start dates |
| BR-07 | Every new booking request starts as PENDING |
| BR-08 | Customers may cancel their own bookings only while PENDING |
| BR-09 | Admins may approve or reject only PENDING bookings |
| BR-09a | Admins must not approve bookings/custom tours that violate the 7-day rule at approval time |
| BR-10 | Every new custom tour submission starts as PENDING |
| BR-11 | Custom tour rejection requires a rejection reason |
| BR-12 | Custom tour reapplication is permitted only when enabled by an Admin |
| BR-13 | Each custom tour resubmission starts a new PENDING review cycle |
| BR-14 | Custom tours remain private to their owners, including after approval |
| BR-15 | Approval of a custom tour does not publish it as a catalog package |
| BR-16 | MVP uses mock payment only; Stripe deferred |
| BR-16a | Payment records are separate from bookings; provider swappable to Stripe |
| BR-16c | Payment only after Admin approval (`APPROVED`); never while `PENDING` / `REJECTED` / `CANCELLED` |
| BR-16f | Booking status and payment status are displayed and stored separately |
| BR-09b | Catalog booking rejection requires a reason displayed to the Customer |
| BR-16d | 24-hour payment window from Admin approval; on expiry window=EXPIRED, booking stays APPROVED, payment stays UNPAID (or latest failed/cancelled), no auto-cancel |
| BR-16e | Pay after expiry only if Admin reopens; reopen preserves original deadline; explicit extend required to change expires-at |
| BR-16h | Retry mock payment after FAILED/CANCELLED while window OPEN |
| BR-17 | Historical booking and review records must remain accessible for authorized users |
| BR-18 | Invalid Sign up / Sign in attempts must not create a session |
| BR-19 | Sign up must reject invalid password formats |
| BR-20 | Seat / remaining-capacity inventory is not part of the MVP |

---

## 9. Assumptions and open decisions

| ID | Assumption / open item | Impact if wrong |
|---|---|---|
| A-1 | Public Sign up = Customer only; Admin via secure seed/env provisioning | Auth and ops model change |
| A-2 | Password format: min 8 chars + letter + number; confirm password required | Validation UX changes |
| A-3 | Email verification / password reset deferred | Account recovery later |
| A-4 | Packages support multiple available travel dates | Booking form/date model |
| A-5 | **Decided:** mock payment after Admin approval; 24h window; no auto-cancel on unpaid expiry | Gateway / ops process |
| A-6 | In-app notifications only (no email/SMS) | Comms channel changes |
| A-7 | AI recommends from published catalog only; up to 5 results | AI scope changes |
| A-8 | **Decided:** 7 calendar-day advance booking (timezone calendar dates) | Date UX / validation |
| A-9 | **Decided:** reopen preserves original deadline; Admin must explicitly extend to change expires-at | Ops tooling |
| A-11 | **Decided:** booking rejection reason required and shown to Customer | Review UX |
| A-12 | **Decided:** notifications mark as read when opened | Notification UX |
| A-10 | See PRD §23 AQ items still TBD | Delivery risk |

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| AI recommendations are low quality | Constrain to catalog inventory; show prompt + explanation; fall back to search |
| Custom plans generate high admin load | Structured form; rejection templates; reapply only when useful |
| Unpaid APPROVED bookings accumulate | Admin review queue for expired payment windows; reopen or manual follow-up |
| Advance-booking edge cases near midnight | Use configured timezone calendar dates, not rolling hours |
| Available dates removed after bookings exist | Resolve AQ-06 before build; retain historical booking date |

---

## 11. High-level success metrics

- Catalog booking requests created
- Share of bookings with start date ≥7 days ahead (should be 100% of accepted submits)
- Payments completed within 24h of approval
- Expired unpaid windows vs Admin reopens
- Pending booking cancellations vs approvals
- Custom tour submissions / reapplied
- Admin decision turnaround time
- AI recommendation → detail → booking conversion

---

## 12. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Business owner | | Pending | |
| Product | | Pending | |

---

## Related documents

- [PRD.md](./PRD.md) — Product requirements, features, acceptance criteria
