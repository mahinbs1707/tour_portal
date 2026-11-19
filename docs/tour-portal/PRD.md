# Product Requirements Document (PRD)
## Tour Portal — Tour Discovery, Booking & Custom Trip Management System

| Document Information | Details |
|---|---|
| Product Name | Tour Portal |
| Document Type | Product Requirements Document |
| Version | 1.5 |
| Status | Draft for Review |
| Date | 15 November 2026 |
| Related Document | [BRD.md](./BRD.md) |
| Target Platform | Responsive Web Application |
| Primary Roles | Guest, Customer, Admin |

---

# 1. Product Overview

## 1.1 Product Description

Tour Portal is a web-based tour discovery and management platform that allows travelers to explore published tour packages, receive AI-powered recommendations, submit booking requests, and create personalized custom tour plans.

The platform provides an administrative interface through which authorized administrators can manage tour packages, define available travel dates, review booking requests, and evaluate custom tour submissions.

The system has two primary authenticated roles: Customer and Admin. Guests can access public tour discovery features without registering.

## 1.2 Product Objectives

The product aims to:

1. Provide an intuitive platform for discovering and exploring tour packages.
2. Allow customers to search and filter available tours.
3. Provide AI-powered recommendations based on customer preferences.
4. Enable customers to submit booking requests for published tour packages.
5. Demonstrate a mock payment checkout experience after Admin approval (24-hour payment window), designed for a future Stripe swap-in.
6. Allow customers to create and submit personalized tour plans.
7. Provide administrators with tools to manage tour packages and review customer requests.
8. Provide transparent booking and custom-tour statuses through in-app notifications.
9. Maintain appropriate role-based access and customer data ownership.

## 1.3 User Roles

### Guest
An unauthenticated visitor who can:
- View the landing page.
- Browse published tour packages.
- Search and filter packages.
- View package details.
- Use AI tour recommendations.
- Access Sign up and Sign in pages.

Guests cannot submit booking requests, create custom tour submissions, or access private customer information.

### Customer
An authenticated traveler who can:
- Access all public discovery features.
- Submit booking requests for published tour packages.
- Complete mock payment within 24 hours after Admin approval (while the payment window is open).
- Cancel booking requests only before Admin approval (while `PENDING`).
- Create and submit custom tour plans.
- View their own bookings and custom tour submissions.
- Track approval and rejection statuses.
- Receive in-app notifications.
- Edit and resubmit rejected custom tour plans when reapplication is enabled.

### Admin
An authorized administrator who can:
- Access the administrative dashboard.
- Create, edit, publish, and unpublish tour packages.
- Define available travel dates for packages.
- Manage featured tour packages.
- View and review customer booking requests.
- Approve or reject booking requests.
- Reopen an expired payment window when authorized.
- Review custom tour submissions.
- Approve or reject custom tour submissions.
- Provide rejection reasons and recommended adjustments.
- Enable or disable customer reapplication.
- View booking and custom-tour records for administrative purposes.

---

# 2. Scope and Boundaries

## 2.1 In Scope — MVP

The initial release shall include:

1. Public landing page.
2. Customer registration and authentication.
3. Predefined Admin account authentication.
4. Role-based authorization.
5. Tour package management.
6. Public tour catalog.
7. Tour package detail pages.
8. Search and filtering.
9. AI-powered tour recommendations.
10. Catalog tour booking requests.
11. Mock payment checkout after Admin approval (24-hour deadline; simulated success, failure, and cancellation) with payment records separate from bookings.
11a. Minimum 7 calendar-day advance booking rule for catalog bookings and custom tour start dates.
12. Booking approval and rejection.
13. Pending booking cancellation by customers.
14. Custom tour creation and submission.
15. Custom tour approval and rejection.
16. Custom tour reapplication workflow.
17. Customer booking and submission history.
18. In-app notifications.
19. Admin dashboard and management interface.

## 2.2 Out of Scope — MVP

The following features are excluded from the initial release:

- Real online payment processing and collection of real payment instruments.
- Live Stripe (or any real payment gateway) charging in production.
- Seat inventory and remaining-capacity tracking.
- Automatic seat reservation or seat holds.
- Social authentication such as Google sign-in.
- Phone number OTP authentication.
- Native Android or iOS applications.
- Multiple administrative permission levels.
- Automatic publication of AI-generated tour packages.
- Public sharing of private custom tour submissions.
- Email and SMS notifications.
- Customer cancellation after booking approval.

---

# 3. Authentication and Authorization

## 3.1 Registration

FR-AUTH-01: The system shall provide a Customer Sign up page.

FR-AUTH-02: Customer registration shall require:
- Full name.
- Email address.
- Password.
- Confirm password.

FR-AUTH-03: Public registration shall create Customer accounts only.

FR-AUTH-04: Customers shall not be allowed to select or assign themselves the Admin role.

FR-AUTH-05: Admin accounts shall be provisioned through a predefined administrative account mechanism.

[ASSUMPTION] The initial Admin account shall be created through a secure database seed or environment-based provisioning process. Admin credentials shall not be exposed in public source code.

FR-AUTH-06: The system shall prevent registration using an email address that already exists.

## 3.2 Sign In

FR-AUTH-07: Customers and Admins shall use the same Sign in interface.

FR-AUTH-08: Sign in shall require a registered email address and password.

FR-AUTH-09: After successful authentication, users shall be redirected to the landing page.

FR-AUTH-10: The system shall identify the authenticated user's role and enforce the corresponding permissions.

FR-AUTH-11: Invalid credentials shall prevent authentication and display an appropriate error message.

FR-AUTH-12: Sign out shall terminate the authenticated session.

## 3.3 Authentication Validation

FR-AUTH-13: Required fields shall be validated before form submission.

FR-AUTH-14: Email addresses shall follow a valid email format.

FR-AUTH-15: Passwords shall meet the following minimum requirements:

[ASSUMPTION]
- At least 8 characters.
- At least one letter.
- At least one number.

FR-AUTH-16: Confirm password must match the password field.

FR-AUTH-17: Invalid password formats shall prevent account creation.

FR-AUTH-18: Duplicate email registration shall be rejected.

FR-AUTH-19: Invalid Sign in attempts shall not create an authenticated session.

FR-AUTH-20: Authentication and authorization checks shall be enforced on the server side.

[ASSUMPTION] Email verification, password reset, and account recovery are deferred from the MVP.

**Additional validation acceptance (incorrect attempts)**
- Empty required fields block submit; no account or session is created.
- Malformed email blocks Sign up / Sign in with a clear message.
- Invalid password format on Sign up blocks account creation and shows an invalid password format message stating the rules.
- Password / confirm password mismatch blocks Sign up with a distinct mismatch message.
- Duplicate email on Sign up creates no second account and does not sign the user in.
- Unknown email or wrong password on Sign in denies access with a generic “Invalid email or password” style message `[ASSUMPTION]`, creates no session, and does not redirect to the landing page.
- Failed attempts keep the user on the auth page; password fields are cleared; email may be retained.

---

# 4. Public Landing Page

## 4.1 Overview

The landing page shall serve as the primary entry point for guests, customers, and administrators.

FR-LP-01: The landing page shall be publicly accessible without authentication.

FR-LP-02: The page shall contain a hero section introducing the platform.

FR-LP-03: The page shall provide clear navigation to:
- Explore tours.
- Search tours.
- Create a custom tour.
- Sign in.
- Sign up.

FR-LP-04: The landing page shall display featured published tour packages.

FR-LP-05: Each featured package shall provide a link to its corresponding detail page.

FR-LP-06: Unpublished packages shall never appear in public landing-page sections.

FR-LP-07: If no featured packages are available, the system shall display an appropriate empty state.

FR-LP-08: Navigation elements shall adapt according to the authentication state and user role.

---

# 5. Tour Package Catalog

## 5.1 Tour Package Listing

FR-CAT-01: Guests and authenticated users shall be able to browse published tour packages.

FR-CAT-02: Each package card shall display:
- Tour title.
- Cover image.
- Short description.
- Destination.
- Duration.
- Starting price.
- Currency.

FR-CAT-03: Selecting a package shall navigate to its detail page.

FR-CAT-04: Only published packages shall appear in the public catalog.

FR-CAT-05: The system shall provide a clear empty state when no published packages are available.

## 5.2 Tour Package Details

FR-CAT-06: Each package detail page shall display:

**Basic information**
- Tour title.
- Cover image and additional images.
- Short description.
- Full description.

**Travel information**
- Destination.
- Duration in days and nights.
- Starting location.
- Available travel dates.
- Difficulty level, if provided.

**Pricing information**
- Base price.
- Currency.
- Included services.
- Excluded services.

**Tour itinerary**
- Day-by-day itinerary or itinerary highlights.

**Additional information**
- Cancellation policy, if provided.
- Other logistical information.

FR-CAT-07: Published and bookable packages shall display a Book Now action.

FR-CAT-08: Unpublished packages shall not allow new booking requests.

FR-CAT-09: The package detail page shall clearly indicate when a package is unavailable for booking.

FR-CAT-10: Package details shall reflect the latest information maintained by the Admin.

---

# 6. Search and Filtering

FR-SEARCH-01: Users shall be able to search published packages using free-text queries.

FR-SEARCH-02: Search shall match relevant package information, including:
- Tour title.
- Destination.
- Short description.
- Full description.

FR-SEARCH-03: The system shall provide the following filters:

- Destination.
- Minimum and maximum price.
- Tour duration.

FR-SEARCH-04: Users shall be able to combine multiple filters.

FR-SEARCH-05: Search results shall reflect all active search criteria.

FR-SEARCH-06: Users shall be able to clear filters and restore the default catalog results.

FR-SEARCH-07: The system shall display an informative empty state when no packages match the search criteria.

FR-SEARCH-08: Search results shall exclude unpublished packages.

[ASSUMPTION] Search and filtering shall operate on the existing published package catalog without requiring AI.

---

# 7. AI-Powered Tour Recommendations

## 7.1 Overview

The platform shall provide an AI recommendation feature that helps customers discover relevant tour packages using natural-language prompts.

FR-AI-01: Users shall be able to enter a free-text prompt describing their travel preferences.

FR-AI-02: Prompts may include:
- Preferred destination.
- Budget.
- Travel duration.
- Number of travelers.
- Travel interests.
- Preferred activities.
- Other travel preferences.

FR-AI-03: The system shall analyze the submitted prompt and identify relevant published packages.

FR-AI-04: Recommendations shall be generated from existing published tour packages only.

FR-AI-05: The system shall not generate fictional packages or recommend unpublished inventory.

FR-AI-06: Each recommendation shall display:
- Package title.
- Cover image.
- Destination.
- Duration.
- Price.
- A short explanation of why the package matches the prompt.

FR-AI-07: AI recommendations shall be visually distinguishable from ordinary search results.

FR-AI-08: Selecting a recommendation shall navigate to the relevant package detail page.

FR-AI-09: If no relevant package is found, the system shall display an appropriate fallback message.

FR-AI-10: AI service failures shall not prevent users from browsing or searching the normal catalog.

[ASSUMPTION] The system shall return up to five recommendations per prompt.

[ASSUMPTION] AI shall rank eligible packages according to relevance to the user's stated preferences.

---

# 8. Catalog Tour Booking

## 8.0 Final booking + payment workflow (canonical)

This is the authoritative end-to-end flow for catalog bookings. Detailed field rules, the 7-day advance rule (§8.4), and payment-window rules (§8A / AQ-18) apply inside this sequence.

| Step | Actor | What happens | Resulting state |
|---|---|---|---|
| 1 | Customer | Submits a booking request (eligible published package + Admin-defined start date ≥ 7 calendar days ahead). | **Booking status: `PENDING`**. Awaiting Admin review. **No payment option.** |
| 2 | Admin | Reviews the booking and approves or rejects it. | See step 3 or 4. |
| 3 | System / Customer | **If rejected** | **Booking status: `REJECTED`**. Admin **must** provide a rejection reason (shown to Customer). **No payment option.** |
| 4 | System / Customer | **If approved** | **Booking status: `APPROVED`**. **Payment status: `UNPAID`**. Customer is notified. **Payment window** opens; the **24-hour deadline starts from the Admin approval timestamp**. Checkout available while the window is `OPEN`. |
| 5 | Customer | Completes mock payment while the window is open (or fails/cancels an attempt). | Attempt outcomes: `SUCCESS` / `FAILED` / `CANCELLED`. On success, **Payment status: `SUCCESS`**. Booking remains `APPROVED`. Happy path: **Booking `PENDING` → `APPROVED`**, **Payment `UNPAID` → `SUCCESS`**. |
| 6 | Customer | Views final records | **Booking status**, **payment status**, and **payment-window state** are displayed **separately**. |

**Complementary rules** (do not change the step order above)
- Customer may **cancel** only while booking is `PENDING` (before Admin approval).
- If the Customer does **not** complete a successful payment within 24 hours of **Admin approval**: the **payment window** becomes `EXPIRED`; booking stays **`APPROVED`**; **payment status** remains **`UNPAID`** (or latest `FAILED`/`CANCELLED` attempt) — window expiry is **not** a payment transaction status; **no auto-cancel**.
- After the window expires, the Customer cannot pay unless Admin **reopens** the window. **Reopen does not change the deadline** (keeps the original expires-at from approval). To allow payment after the original deadline has passed, Admin must **explicitly extend** the deadline to a new future expires-at.
- `REJECTED` bookings never expose checkout.
- Customers may **retry** mock payment after `FAILED` or `CANCELLED` while the window remains `OPEN`.

## 8.1 Booking Eligibility

FR-BOOK-01: Only authenticated Customers shall be able to submit booking requests.

FR-BOOK-02: Guests who select Book Now shall be redirected to Sign in or Sign up.

FR-BOOK-03: After successful authentication, the customer shall be returned to the intended booking process.

FR-BOOK-04: Customers shall only be able to request bookings for published and bookable packages.

FR-BOOK-04a: Customers shall book an existing tour package only if the selected available start date is at least **7 calendar days** after the booking request date (see AQ-20 / Section 8.4).

FR-BOOK-05: The selected package shall be associated with the booking request.

## 8.2 Booking Form

FR-BOOK-06: The booking form shall contain:

| Field | Requirement |
|---|---|
| Selected package | Automatically populated |
| Preferred travel date | Required; selected from Admin-defined dates |
| Number of travelers | Required |
| Customer name | Required; populated from account where available |
| Contact email | Required; populated from account |
| Contact number | Required |
| Additional requirements | Optional |

[ASSUMPTION] The number of travelers must be a positive integer.

FR-BOOK-07: The preferred travel date shall be selected from the dates configured for the package by the Admin that also satisfy the minimum 7 calendar-day advance rule.

FR-BOOK-08: The system shall prevent submission if a selected date is no longer available or violates the 7-day advance rule.

FR-BOOK-09: The system shall validate required fields before submission.

FR-BOOK-10: Customers shall be able to review their booking details before final submission.

FR-BOOK-11: Submitting a valid booking form shall create a booking request with `PENDING` status.

FR-BOOK-12: The customer shall receive an in-app notification confirming submission.

FR-BOOK-13: The system shall display a booking confirmation containing the booking reference and current status.

FR-BOOK-13a: After submission, the booking awaits Admin review. Mock checkout is **not** available while status is `PENDING` (see Section 8.0 / 8A).

## 8.3 Booking Status

The booking workflow shall support the following statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

FR-BOOK-14: Newly submitted bookings shall start with `PENDING`.

FR-BOOK-15: Admins shall be able to approve or reject pending bookings.

FR-BOOK-16: Approved bookings shall transition to `APPROVED`.

FR-BOOK-17: Rejected bookings shall transition to `REJECTED`.

FR-BOOK-17a: Rejecting a booking **requires** an Admin rejection reason. The reason shall be persisted and displayed to the Customer on booking detail and in the rejection notification.

FR-BOOK-18: Customers shall be able to cancel their own bookings **only before Admin approval** (while status is `PENDING`).

FR-BOOK-19: A cancelled booking shall transition to `CANCELLED`.

FR-BOOK-20: Customers shall not be able to cancel approved, rejected, or already cancelled bookings.

FR-BOOK-21: Admins shall not be able to approve or reject a booking that is no longer pending.

FR-BOOK-21a: Admins shall not approve a booking whose selected start date violates the minimum 7 calendar-day advance rule at the time of approval (see Section 8.4).

FR-BOOK-22: Each status change shall be persisted and reflected in the customer's booking history.

FR-BOOK-23: Customers shall receive an in-app notification when an Admin approves or rejects their booking.

FR-BOOK-24: Customers shall receive an in-app notification when their booking cancellation is completed.

FR-BOOK-25: Payment eligibility begins **only after** Admin approval. After approval, the Customer may proceed to mock checkout per Section 8A (AQ-18).

FR-BOOK-26: On Admin approval, the system shall record the **approval timestamp** used as the start of the 24-hour payment window.

[ASSUMPTION] A rejected booking cannot be resubmitted as the same booking record. The Customer may create a new booking request if the package remains bookable.

## 8.4 Minimum advance booking period (AQ-20 — Decided)

FR-ADV-01: Customers can book an existing tour package only if its selected available start date is at least **7 calendar days** after the booking request date.

FR-ADV-02: Customers can create and submit a custom tour request only if the proposed tour start date is at least **7 calendar days** after the submission date.

FR-ADV-03: Tour dates within the next 7 calendar days must not be selectable or submittable.

FR-ADV-04: The system must validate this rule on both the **frontend** and the **backend**.

FR-ADV-05: Admins shall be prevented from approving a booking or custom tour that violates this requirement if its start date has become invalid by the time of approval.

FR-ADV-06: The 7-day period shall be calculated using the system’s **configured timezone** and **calendar dates**, not a rolling 168-hour duration, so date selection remains predictable.

**Example:** If a customer submits a booking request on 15 November, the earliest eligible tour start date is 22 November (in the configured timezone’s calendar).

**Acceptance — Advance booking**
- Given today is 15 November in the configured timezone, when the customer opens date selection for a package, then dates on or before 21 November are not selectable; 22 November and later eligible Admin-defined dates are selectable.
- Given a custom tour start date fewer than 7 calendar days ahead, when the customer submits, then submission is rejected with a clear validation message.
- Given a booking whose start date no longer satisfies the 7-day rule at approval time, when an Admin tries to approve, then approval is blocked.

---

# 8A. Payment Integration Strategy

## 8A.1 MVP Scope — Mock Payment Integration

The MVP shall include a **simulated payment workflow** to demonstrate the customer payment experience without processing actual financial transactions.

**Status:** Mock payment integration is planned for the MVP. Real Stripe integration is deferred.

**Payment eligibility (decided):** Customers may initiate payment **only after Admin approval**, not immediately after submitting a booking request.

## 8A.1a Payment deadline (AQ-18 — Decided)

FR-PAY-01: Customers must complete payment within **24 hours** of Admin approval.

FR-PAY-01a: The countdown starts from the booking’s **approval timestamp**.

FR-PAY-01b: The payment option remains available during the 24-hour period while the booking is `APPROVED` and the payment window is open.

FR-PAY-01c: If payment is not completed within 24 hours:
- The payment window **expires**.
- The booking remains **`APPROVED`**.
- The payment status remains **`UNPAID`** (or reflects the latest failed/cancelled attempt separately).
- The system does **not** automatically cancel the booking.
- Admin can review the booking and decide what action to take.

FR-PAY-01d: Customers cannot initiate payment after the deadline unless Admin takes an authorized action to **reopen** the payment window.

FR-PAY-01e: Admins shall have an authorized action to **reopen** the payment window for an `APPROVED` booking whose window is `EXPIRED`. **Reopen preserves the original deadline** (approval timestamp + 24 hours). Reopen does **not** automatically grant another 24 hours.

FR-PAY-01f: Admins shall have a separate authorized action to **extend** the payment deadline (set a new future `expires-at`). Extending is the only way to move the deadline later than the original approval-based expiry. Reopen after the original deadline has passed is effective for checkout only once the deadline has been explicitly extended to a future time.

FR-PAY-01g: Customers may retry mock payment after a `FAILED` or `CANCELLED` attempt while the payment window remains `OPEN`.

## 8A.1b Mock checkout behavior

FR-PAY-02: The mock checkout shall simulate at least these payment attempt outcomes (shown to the Customer as the payment status for that attempt):
- Successful payment (`SUCCESS`).
- Failed payment (`FAILED`).
- Cancelled payment attempt (`CANCELLED`).

FR-PAY-03: Payment transactions and payment statuses shall be stored in a **separate payment record**, linked to the related booking, and shall not be embedded as the booking record itself.

FR-PAY-04: The system shall **not** collect or process real payment card numbers, bank credentials, or other real payment instruments in the MVP.

FR-PAY-05: Mock checkout UI may use clearly labeled simulated controls (for example buttons to choose Simulate success / Simulate failure / Cancel) so testers can exercise each outcome.

FR-PAY-06: Each payment attempt / payment record shall persist at least:
- Payment ID.
- Related booking ID.
- Customer ID.
- Amount and currency (derived from the booked package / booking context).
- **Payment status** (transaction): `UNPAID` \| `PENDING` \| `SUCCESS` \| `FAILED` \| `CANCELLED`.
- **Payment window state** (separate from payment status): `NOT_OPEN` \| `OPEN` \| `EXPIRED`, plus `opened-at` and `expires-at`. (After payment `SUCCESS`, checkout is hidden regardless of window; do not use `EXPIRED` as a payment status.)
- Provider type (`MOCK` for MVP).
- Creation and update timestamps.

**Terminology:** `EXPIRED` applies only to the **payment window**, never as a substitute for payment transaction status. An expired window leaves payment status as `UNPAID` (or the latest `FAILED`/`CANCELLED` attempt) while booking stays `APPROVED`.

FR-PAY-07: Customers shall see the payment status associated with their booking in booking confirmation and/or booking history, including remaining time in the payment window when open.

FR-PAY-08: Failed or cancelled mock payments shall not invent a successful payment record. The booking remains `APPROVED`; payment remains unpaid/failed/cancelled as recorded until a successful payment or window expiry.

FR-PAY-09: Admins shall be able to view payment status and payment-window state for a booking when reviewing booking details.

FR-PAY-10: Customers shall receive an in-app notification when a booking is approved and the payment window opens; `[ASSUMPTION]` optional notification when the payment window is about to expire or has expired.

FR-PAY-10a: Before Admin approval, Customers shall not access mock checkout for that booking.

FR-PAY-10b: For bookings with status `REJECTED` or `CANCELLED`, Customers shall not access mock checkout.

FR-PAY-10c: Booking status and payment status shall always be displayed as separate fields in Customer-facing booking history/detail and in Admin booking review.

## 8A.2 Provider abstraction (Stripe-ready design)

FR-PAY-11: The payment module shall be designed behind a provider abstraction (for example a payment service interface) so the booking workflow calls provider-agnostic operations such as “create payment attempt” and “record payment result.”

FR-PAY-12: Replacing the mock provider with Stripe in a future release shall not require major changes to the booking request/approval workflow or to the logical shape of booking and payment records (provider-specific fields may be added without redesigning booking status machines).

FR-PAY-13: Payment records shall include a provider discriminator (`MOCK` now; `STRIPE` later) and optional external provider reference fields reserved for future use.

## 8A.3 Future Scope — Stripe Integration

A real Stripe payment gateway may be integrated in a future release. The architecture shall support replacing the mock payment provider with Stripe while retaining the existing booking and payment data structure.

**Deferred:** live Stripe charges, webhooks, refunds, and PCI-sensitive card capture.

**Acceptance — Final workflow + mock payment**
- Given the Customer submits a valid booking, when submission succeeds, then booking is `PENDING`, Admin can review it, and checkout is not available.
- Given Admin rejects a booking without a reason, when they submit, then rejection is blocked until a reason is provided.
- Given Admin rejects with a reason, when the Customer views it, then booking is `REJECTED`, the reason is visible, and no payment option is shown.
- Given Admin approves the booking, when the Customer is notified, then booking is `APPROVED`, payment is `UNPAID`, checkout is available, and the 24-hour window countdown starts from the **approval timestamp**.
- Given mock success within the window, when checkout completes, then payment status is `SUCCESS`, booking remains `APPROVED`, and booking / payment / window states are shown separately.
- Given mock failure or cancel within the window, when checkout completes, then payment status is `FAILED` or `CANCELLED`, booking remains `APPROVED`, and the Customer may retry while the window is `OPEN`.
- Given 24 hours pass from approval without a SUCCESS payment, when the window expires, then window state is `EXPIRED`; payment status stays `UNPAID` (or latest failed/cancelled); booking remains `APPROVED`; booking is not auto-cancelled.
- Given an expired window, when Admin reopens without extending, then the original deadline is unchanged; checkout is available only if that deadline is still in the future.
- Given Admin explicitly extends the deadline to a future time, when confirmed, then the window can be `OPEN` until the new expires-at.

---

# 9. Custom Tour Planning

## 9.1 Overview

Customers shall be able to create personalized tour plans that are not part of the published catalog.

All custom tour submissions shall remain private to their respective owners.

FR-CT-01: Only authenticated Customers shall be able to create custom tour plans.

FR-CT-02: Guests who select Create Custom Tour shall be redirected to Sign in or Sign up.

FR-CT-03: The custom tour builder shall provide a structured form.

## 9.2 Custom Tour Form

The form shall include:

| Field | Requirement |
|---|---|
| Tour title | Required |
| Destination(s) | Required |
| Preferred start date | Required |
| Preferred end date | Required |
| Number of travelers | Required |
| Estimated budget | Required |
| Currency | Required |
| Accommodation preferences | Optional |
| Transportation preferences | Optional |
| Preferred activities | Optional |
| Additional requirements | Optional |

FR-CT-04: The system shall validate all required fields before submission.

FR-CT-04a: The proposed tour start date shall be at least **7 calendar days** after the submission date (AQ-20 / Section 8.4). Dates within the next 7 calendar days shall not be selectable or submittable.

FR-CT-05: The end date shall not be earlier than the start date.

FR-CT-06: The number of travelers shall be a positive integer.

FR-CT-07: Budget values shall be positive.

FR-CT-08: Customers shall be able to review their custom tour information before submission.

FR-CT-09: Successful submission shall create a custom tour record with `PENDING` status.

FR-CT-10: The customer shall receive an in-app notification confirming submission.

## 9.3 Privacy and Ownership

FR-CT-11: Custom tour submissions shall be private to their respective customers.

FR-CT-12: Customers shall only be able to view and manage their own custom tour submissions.

FR-CT-13: Customers shall not be able to view another customer's custom tour details.

FR-CT-14: Admins shall have access to custom tour submissions for administrative review.

FR-CT-15: Approval of a custom tour shall not automatically publish it in the public catalog.

FR-CT-16: Approved custom tours shall remain private to their respective owners.

## 9.4 Custom Tour Status

The workflow shall support:

- `PENDING`
- `APPROVED`
- `REJECTED`

FR-CT-17: Every new submission shall enter `PENDING`.

FR-CT-18: Admins shall be able to approve or reject pending submissions.

FR-CT-18a: Admins shall not approve a custom tour whose start date violates the minimum 7 calendar-day advance rule at the time of approval.

FR-CT-19: Approved submissions shall transition to `APPROVED`.

FR-CT-20: Rejected submissions shall transition to `REJECTED`.

FR-CT-21: Admin rejection shall include a mandatory rejection reason.

FR-CT-22: Admins may provide recommended adjustments.

FR-CT-23: Admins shall control whether reapplication is permitted for a rejected submission.

## 9.5 Custom Tour Reapplication

FR-CT-24: If reapplication is enabled, the customer shall be able to edit and resubmit the rejected custom tour.

FR-CT-25: If reapplication is disabled, the customer shall not be able to resubmit that rejected submission.

FR-CT-26: Customers shall be able to view the rejection reason and recommended adjustments.

FR-CT-27: Resubmission shall change the status back to `PENDING`.

FR-CT-28: Each resubmission shall create a new review cycle.

FR-CT-29: Previous review decisions and rejection information shall be retained in the history.

FR-CT-30: After approval, the custom tour shall remain private and shall not become a public catalog package.

---

# 10. Admin Dashboard

## 10.1 Dashboard Overview

FR-ADM-01: Only authenticated Admins shall be able to access the Admin dashboard.

FR-ADM-02: The dashboard shall display key operational statistics:

- Total tour packages.
- Published packages.
- Draft/unpublished packages.
- Pending booking requests.
- Approved booking requests.
- Rejected booking requests.
- Pending custom tour submissions.
- Approved custom tour submissions.
- Rejected custom tour submissions.

FR-ADM-03: The dashboard shall provide navigation to package management, booking management, and custom tour management.

FR-ADM-04: The dashboard shall highlight pending requests requiring review.

---

# 11. Admin Tour Package Management

FR-PKG-01: Admins shall be able to create tour packages.

FR-PKG-02: Admins shall be able to edit existing tour packages.

FR-PKG-03: Admins shall be able to save packages as drafts.

FR-PKG-04: Admins shall be able to publish and unpublish packages.

FR-PKG-05: Admins shall be able to mark published packages as featured or remove their featured status.

FR-PKG-06: Admins shall be able to manage the package information defined in Section 5.2.

FR-PKG-07: Admins shall be able to define one or more available travel dates for each package.

FR-PKG-08: Admins shall be able to add, edit, and remove available travel dates.

FR-PKG-09: Only published packages shall appear in the public catalog, normal search results, and AI recommendation pool.

FR-PKG-10: Unpublishing a package shall prevent new booking requests.

FR-PKG-11: Existing booking records shall remain accessible after a package is unpublished.

FR-PKG-12: Package updates shall be reflected in the public catalog and package detail pages.

[ASSUMPTION] Package deletion shall be restricted when historical bookings exist. Admins should unpublish such packages instead.

---

# 12. Admin Booking Management

FR-AB-01: Admins shall be able to view all booking requests.

FR-AB-02: Admins shall be able to filter bookings by status.

FR-AB-03: Admins shall be able to view booking details, including:
- Booking reference.
- Customer information.
- Selected package.
- Preferred travel date.
- Number of travelers.
- Additional requirements.
- Submission date.
- Current status.

FR-AB-04: Admins shall be able to approve pending bookings.

FR-AB-05: Admins shall be able to reject pending bookings.

FR-AB-05a: Rejecting a booking **requires** a non-empty rejection reason. The reason shall be stored on the booking and shown to the Customer.

FR-AB-05b: Admins shall be able to **reopen** an expired payment window and, separately, **extend** the payment deadline (see FR-PAY-01e / FR-PAY-01f). Reopen alone does not reset the deadline.

FR-AB-06: Admin decisions shall update the booking status.

FR-AB-07: Admins shall not be able to approve or reject cancelled or already processed bookings.

FR-AB-08: Customers shall receive an in-app notification after an Admin decision (rejection notifications include the rejection reason).

FR-AB-09: Admins shall be able to view booking history and previous decisions.

---

# 13. Admin Custom Tour Management

FR-ACT-01: Admins shall be able to view all custom tour submissions.

FR-ACT-02: Admins shall be able to filter submissions by status.

FR-ACT-03: Admins shall be able to view the complete submitted custom tour information.

FR-ACT-04: Admins shall be able to approve pending custom tours.

FR-ACT-05: Admins shall be able to reject pending custom tours.

FR-ACT-06: Admins shall provide a rejection reason when rejecting a custom tour.

FR-ACT-07: Admins may provide recommended adjustments.

FR-ACT-08: Admins shall be able to enable or disable reapplication.

FR-ACT-09: Admin decisions shall update the submission status.

FR-ACT-10: Customers shall receive an in-app notification when a decision is made.

FR-ACT-11: Admins shall be able to view previous review cycles.

FR-ACT-12: Admin approval shall not publish the custom tour in the public catalog.

---

# 14. Customer Dashboard and History

FR-CUST-01: Authenticated Customers shall have access to a personal dashboard or account area.

FR-CUST-02: Customers shall be able to view their booking history.

FR-CUST-03: Customers shall be able to view their custom tour submission history.

FR-CUST-04: Booking records shall display:
- Booking reference.
- Tour package.
- Travel date.
- Number of travelers.
- Submission date.
- Current status.

FR-CUST-05: Custom tour records shall display:
- Custom tour title.
- Destination(s).
- Requested travel dates.
- Submission date.
- Current status.

FR-CUST-06: Customers shall be able to open individual records to view complete details.

FR-CUST-07: Customers shall only have access to records belonging to their own account.

FR-CUST-08: Customers shall be able to cancel their own pending booking requests.

FR-CUST-09: Customers shall be able to reapply to rejected custom tour submissions only when the Admin has enabled reapplication.

---

# 15. In-App Notifications

## 15.1 Overview

The system shall provide in-app notifications to communicate important booking and custom tour events.

FR-NOTIF-01: Customers shall receive a notification after submitting a booking request.

FR-NOTIF-02: Customers shall receive a notification when a booking is approved (including that the 24-hour payment window has opened).

FR-NOTIF-03: Customers shall receive a notification when a booking is rejected (including the rejection reason).

FR-NOTIF-03a: `[ASSUMPTION]` Customers may receive a notification when the payment window expires unpaid.

FR-NOTIF-04: Customers shall receive a notification after cancelling a pending booking.

FR-NOTIF-05: Customers shall receive a notification after submitting a custom tour.

FR-NOTIF-06: Customers shall receive a notification when a custom tour is approved or rejected.

FR-NOTIF-07: Customers shall receive a notification when reapplication is enabled for a rejected custom tour.

FR-NOTIF-08: Customers shall receive a notification after successfully resubmitting a custom tour.

FR-NOTIF-09: Each notification shall contain a meaningful message, creation timestamp, and relevant record reference.

FR-NOTIF-10: Users shall be able to view their notification list.

FR-NOTIF-11: Users shall be able to identify unread notifications.

FR-NOTIF-11a: Notifications shall be marked as read when the user opens them (list item or deep-linked detail).

FR-NOTIF-12: Notifications shall be visible only to their intended recipients.

---

# 16. Business Rules

### Key timing rules (v1.4)

| Rule | Requirement |
|---|---|
| Minimum advance booking | At least **7 calendar days** before the tour start date (configured timezone; calendar dates, not rolling 168 hours) |
| Payment eligibility | Only **after Admin approval** |
| Payment deadline | Within **24 hours** after Admin approval (from approval timestamp) |
| Customer cancellation | Only **before Admin approval** (while `PENDING`) |

| ID | Business Rule |
|---|---|
| BR-01 | Guests may browse public tour information without authentication. |
| BR-02 | Only Customers may submit booking requests and custom tour plans. |
| BR-03 | Only authorized Admins may manage catalog packages and review customer requests. |
| BR-04 | Public registration shall create Customer accounts only. |
| BR-05 | Only published packages may be displayed publicly or recommended by AI. |
| BR-06 | Booking requests must reference an Admin-defined available travel date. |
| BR-06a | **Minimum advance booking:** selected/proposed tour start date must be at least **7 calendar days** after the booking request or custom-tour submission date (configured timezone, calendar dates — not a rolling 168 hours). |
| BR-07 | Every new booking request starts as PENDING. |
| BR-08 | **Customer cancellation:** only before Admin approval (while PENDING). |
| BR-09 | Admins may approve or reject only PENDING bookings. |
| BR-09a | Admins must not approve bookings or custom tours that violate the 7-day advance rule at approval time. |
| BR-10 | Every new custom tour submission starts as PENDING. |
| BR-11 | Custom tour rejection requires a rejection reason. |
| BR-12 | Custom tour reapplication is permitted only when enabled by an Admin. |
| BR-13 | Each custom tour resubmission starts a new PENDING review cycle. |
| BR-14 | Custom tours remain private to their owners, including after approval. |
| BR-15 | Approval of a custom tour does not publish it as a catalog package. |
| BR-16 | MVP includes mock payment only; no real payment instruments are collected or charged. Real Stripe/gateway charging is deferred. |
| BR-16a | Payment transactions are stored separately from booking records and linked by booking ID. |
| BR-16b | The payment module must remain swappable from MOCK to Stripe without redesigning the booking workflow. |
| BR-16c | **Payment eligibility:** Customers may pay only after Admin approval (`APPROVED`); never while `PENDING` / `REJECTED` / `CANCELLED`. |
| BR-16d | **Payment deadline:** payment must be completed within **24 hours** of the **Admin approval timestamp**; on expiry the **window** is `EXPIRED` (not a payment transaction status), booking stays APPROVED, payment stays UNPAID (or latest failed/cancelled), and the booking is not auto-cancelled. |
| BR-16f | **Separate statuses:** booking status, payment status, and payment-window state are stored and displayed separately. |
| BR-16e | After deadline, payment requires Admin **reopen**; reopen **preserves the original deadline**; Admin must **explicitly extend** to change expires-at. |
| BR-16g | Catalog booking rejection **requires** an Admin reason, displayed to the Customer. |
| BR-16h | Customers may retry mock payment after FAILED/CANCELLED while the payment window is OPEN. |
| BR-17 | Historical booking and review records must remain accessible for authorized users. |
| BR-18 | Invalid Sign up / Sign in attempts must not create a session; users stay on the auth page with clear validation or error messages. |
| BR-19 | Sign up must reject passwords that do not match the required password format. |
| BR-20 | Seat / remaining-capacity inventory is not part of the MVP. |

---

# 17. Non-Functional Requirements

## 17.1 Security

NFR-01: The system shall enforce server-side authentication and authorization.

NFR-02: Admin routes and administrative actions shall be inaccessible to Guests and Customers.

NFR-03: Customers shall only access their own booking, custom tour, and notification records.

NFR-04: Passwords shall be securely hashed and shall never be stored or logged in plaintext.

NFR-05: Authentication sessions shall be handled securely.

NFR-06: Sensitive administrative credentials shall not be exposed in client-side code or public repositories.

NFR-07: The system shall validate all user-submitted data on the server.

## 17.2 Performance

NFR-08: Public catalog pages should load within a reasonable time under normal usage.

NFR-09: Search and filtering should return results without unnecessary delays.

NFR-10: The system shall provide loading indicators for asynchronous operations, including AI recommendations.

## 17.3 Usability

NFR-11: The interface shall be intuitive and consistent across all application areas.

NFR-12: Forms shall provide clear field-level validation messages.

NFR-13: All major actions shall provide appropriate success, failure, or confirmation feedback.

NFR-14: The interface shall be responsive across desktop, tablet, and mobile screen sizes.

## 17.4 Reliability and Data Integrity

NFR-15: Booking and custom tour records shall persist after page refresh or session restart.

NFR-16: Status transitions shall be validated and persisted reliably.

NFR-17: Unauthorized or invalid status transitions shall be rejected.

NFR-18: Administrative decisions shall retain their associated history.

NFR-19: Duplicate submissions caused by repeated requests shall be prevented where appropriate.

## 17.5 AI Reliability

NFR-20: AI recommendation failures shall not affect normal catalog browsing.

NFR-21: AI recommendations shall be grounded in existing published package data.

NFR-22: AI responses shall not invent package prices, availability dates, or package records.

---

# 18. Logical Data Model

The following entities are required for the MVP.

## 18.1 User
- User ID
- Full name
- Email
- Password hash
- Role
- Account creation timestamp
- Account status

## 18.2 TourPackage
- Package ID
- Title
- Short description
- Full description
- Destination(s)
- Duration
- Starting location
- Price
- Currency
- Cover image
- Additional images
- Included services
- Excluded services
- Itinerary
- Difficulty level
- Cancellation policy
- Publication status
- Featured status
- Creation and update timestamps

## 18.3 PackageAvailableDate
- Available date ID
- Package ID
- Travel date
- Availability status

## 18.4 BookingOrder
- Booking ID
- Booking reference
- Customer ID
- Package ID
- Selected travel date
- Number of travelers
- Contact number
- Additional requirements
- Booking status
- Submission timestamp
- Approval timestamp (nullable until approved)
- Payment window status (`NOT_OPEN` \| `OPEN` \| `EXPIRED`)
- Last update timestamp

## 18.5 BookingDecision
- Decision ID
- Booking ID
- Admin ID
- Decision
- Rejection reason, if applicable
- Decision timestamp

## 18.6 CustomTourSubmission
- Submission ID
- Customer ID
- Tour title
- Destination(s)
- Start date
- End date
- Number of travelers
- Estimated budget
- Currency
- Accommodation preferences
- Transportation preferences
- Preferred activities
- Additional requirements
- Current status
- Submission timestamp
- Last update timestamp

## 18.7 CustomTourDecision
- Decision ID
- Submission ID
- Admin ID
- Decision
- Rejection reason
- Recommended adjustments
- Reapplication enabled
- Review cycle
- Decision timestamp

## 18.8 Notification
- Notification ID
- Recipient user ID
- Related record ID
- Notification type
- Message
- Read status
- Creation timestamp

## 18.9 AIRecommendationRequest
[ASSUMPTION] Optional persistence for recommendation history.

- Request ID
- Customer ID, if authenticated
- Submitted prompt
- Recommended package IDs
- Creation timestamp

## 18.10 PaymentTransaction
- Payment ID
- Booking ID (foreign key; payment is separate from the booking record)
- Customer ID
- Amount
- Currency
- Payment status (`UNPAID` \| `PENDING` \| `SUCCESS` \| `FAILED` \| `CANCELLED`) — transaction only; not window state
- Payment window state (`NOT_OPEN` \| `OPEN` \| `EXPIRED`) — separate from payment status
- Payment window opened at (approval timestamp; reopen does not rewrite the original deadline)
- Payment window expires at (originally approval timestamp + 24 hours; changed only by explicit Admin extend)
- Provider type (`MOCK` in MVP; `STRIPE` reserved for future)
- External provider reference (nullable; for future Stripe payment intent / charge id)
- Creation timestamp
- Last update timestamp

---

# 19. Status Workflows

## 19.1 Booking Status

Allowed transitions:

PENDING → APPROVED

PENDING → REJECTED

PENDING → CANCELLED

No further transitions are permitted in the MVP.

## 19.2 Custom Tour Status

Allowed transitions:

PENDING → APPROVED

PENDING → REJECTED

REJECTED → PENDING (only when reapplication is enabled and the customer resubmits).

APPROVED is a terminal state in the MVP.

Previous decisions and review cycles shall be retained.

## 19.3 Payment status vs payment window (mock)

Keep these two machines separate.

**Canonical happy path (Customer-visible):**  
Booking `PENDING` → `APPROVED` · Payment `UNPAID` → `SUCCESS`  
(The 24-hour payment window opens at Admin approval and runs in parallel; it is not a booking status.)

**Payment status (transaction):**

- Starts `UNPAID` when the booking is approved.
- Attempt in flight may show `PENDING`.
- While window is `OPEN`: attempt → `SUCCESS` | `FAILED` | `CANCELLED`.
- After `FAILED` / `CANCELLED`, Customer may retry while window is `OPEN` (overall may remain `UNPAID` or show latest attempt; UI always separates booking vs payment).
- `SUCCESS` is terminal for payment success.

**Payment window state (not a payment transaction status):**

- `NOT_OPEN` before approval.
- `OPEN` on Admin approval; **expires-at = approval timestamp + 24 hours**.
- `OPEN` → `EXPIRED` when now ≥ expires-at with no `SUCCESS` payment.
- When payment becomes `SUCCESS`, Pay now is hidden; window state may remain `OPEN` until natural expiry or simply stop being actionable — UI prioritizes Payment `SUCCESS` over window chrome.
- Admin **reopen**: may return window to `OPEN` **without changing expires-at**.
- Admin **extend**: explicitly sets a new future expires-at (only way to move the deadline later).

On window `EXPIRED` without success: booking stays `APPROVED`; payment status stays `UNPAID` (or latest `FAILED`/`CANCELLED`). **No auto-cancel.**

---

# 20. Permissions Matrix

| Feature / Action | Guest | Customer | Admin |
|---|---|---|---|
| View landing page | Yes | Yes | Yes |
| Browse published packages | Yes | Yes | Yes |
| Search and filter | Yes | Yes | Yes |
| View package details | Yes | Yes | Yes |
| Use AI recommendations | Yes | Yes | Yes |
| Register as Customer | Yes | No | No |
| Sign in | Yes | Yes | Yes |
| Book a package | No | Yes | No |
| Mock payment checkout | No | Own APPROVED booking only, while payment window OPEN | No |
| View payment status for a booking | No | Own only | Yes |
| Reopen expired payment window | No | No | Yes |
| Cancel pending booking | No | Own only, before Admin approval | No |
| View booking history | No | Own only | All |
| Create custom tour | No | Yes | No |
| View custom tour submissions | No | Own only | All |
| Reapply to custom tour | No | Own only, when enabled | Enable/disable |
| Manage packages | No | No | Yes |
| Manage available dates | No | No | Yes |
| Approve/reject bookings | No | No | Yes |
| Approve/reject custom tours | No | No | Yes |
| View own notifications | No | Yes | Yes |
| Access Admin dashboard | No | No | Yes |

---

# 21. MVP Acceptance Criteria

The MVP shall be considered functionally complete when the following criteria are satisfied.

## Authentication
- [ ] Customer registration works.
- [ ] Admin authentication works using the predefined Admin account.
- [ ] Public registration cannot create Admin accounts.
- [ ] Invalid credentials are rejected.
- [ ] Invalid password format blocks Sign up.
- [ ] Role-based access restrictions work.
- [ ] Sign out terminates the session.

## Public Discovery
- [ ] Landing page is accessible without authentication.
- [ ] Published packages appear in the catalog.
- [ ] Unpublished packages are excluded.
- [ ] Package details display all required information.
- [ ] Search and filters work correctly.
- [ ] Empty search results are handled gracefully.

## AI Recommendations
- [ ] Users can submit natural-language travel prompts.
- [ ] Recommendations reference existing published packages.
- [ ] Relevant recommendations are displayed.
- [ ] Unpublished or fictional packages are never recommended.
- [ ] AI failures have a graceful fallback.

## Booking
- [ ] Customers can submit booking requests.
- [ ] Guests are redirected to authentication before booking.
- [ ] Customers can select Admin-defined travel dates.
- [ ] Required booking fields are validated.
- [ ] New bookings enter PENDING.
- [ ] Admins can approve and reject pending bookings.
- [ ] Customers can cancel their own pending bookings.
- [ ] Approved, rejected, and cancelled bookings cannot be cancelled by Customers.
- [ ] Customers can view their booking history.
- [ ] Booking status changes trigger in-app notifications.

## Advance booking (7 calendar days)
- [ ] Catalog date pickers hide/disable start dates within the next 7 calendar days (configured timezone).
- [ ] Custom tour start dates within 7 calendar days are rejected on frontend and backend.
- [ ] Admin cannot approve a booking or custom tour that violates the 7-day rule at approval time.

## Mock Payment (final workflow)
- [ ] After submit: booking is PENDING; checkout unavailable; awaiting Admin review.
- [ ] On REJECTED: rejection reason required and shown to Customer; no payment option.
- [ ] On APPROVED: payment UNPAID; Customer notified; checkout available; 24-hour window from approval timestamp.
- [ ] Happy path statuses: Booking PENDING→APPROVED; Payment UNPAID→SUCCESS (shown separately).
- [ ] Mock checkout can simulate SUCCESS / FAILED / CANCELLED while the window is open; retry allowed while OPEN.
- [ ] Booking status, payment status, and payment-window state are shown separately (EXPIRED = window only).
- [ ] On deadline expiry without success: window EXPIRED, booking stays APPROVED, payment stays UNPAID (or latest failed/cancelled), no auto-cancel.
- [ ] Reopen preserves original deadline; Extend is required to move expires-at; pay after expiry only when window is effectively OPEN again.
- [ ] Payment records are stored separately from bookings and linked by booking ID.
- [ ] No real payment instrument data is collected.
- [ ] Payment module uses a provider abstraction suitable for a future Stripe swap.

## Custom Tours
- [ ] Customers can create custom tour plans.
- [ ] Required fields are validated.
- [ ] New submissions enter PENDING.
- [ ] Admins can approve and reject custom tours.
- [ ] Rejection requires a reason.
- [ ] Admins can provide recommended adjustments.
- [ ] Admins can enable or disable reapplication.
- [ ] Customers can reapply only when enabled.
- [ ] Resubmission starts a new review cycle.
- [ ] Previous review history is retained.
- [ ] Custom tours remain private after approval.

## Admin Management
- [ ] Admins can create, edit, publish, and unpublish packages.
- [ ] Admins can manage package travel dates.
- [ ] Admins can manage featured packages.
- [ ] Admins can review booking requests.
- [ ] Admins can review custom tour submissions.
- [ ] Admin dashboard statistics reflect persisted records.

## Notifications and Security
- [ ] Customers receive in-app notifications for relevant events.
- [ ] Users cannot access another customer's private records.
- [ ] Customers cannot access Admin functions.
- [ ] Sensitive authentication information is protected.
- [ ] Important records persist after page refresh.

---

# 22. Suggested Development Phases

| Phase | Scope |
|---|---|
| Phase 1 — Foundation | Project setup, database, authentication, roles, predefined Admin |
| Phase 2 — Public Experience | Landing page, navigation, catalog, package details |
| Phase 3 — Package Administration | Package CRUD, publishing, featured packages, available dates |
| Phase 4 — Discovery | Search, filters, AI recommendations |
| Phase 5 — Booking | Booking form, 7-day advance validation, submission, Admin review, cancel-before-approval, history |
| Phase 5b — Mock Payment | Pay-after-approval, 24h window, expiry/reopen, mock outcomes, PaymentTransaction, Stripe-ready hooks |
| Phase 6 — Custom Tours | Custom tour builder, submission, Admin review, reapplication |
| Phase 7 — Notifications | In-app notification system and read status |
| Phase 8 — Quality Assurance | Functional testing, authorization testing, validation, responsive testing, regression testing |

---

# 23. Open Questions and Assumptions

The following items require confirmation before final development:

| ID | Item | Status |
|---|---|---|
| AQ-01 | Exact Admin provisioning method and initial credentials | [TBD] |
| AQ-02 | Email verification and password reset | [ASSUMPTION: Deferred] |
| AQ-03 | Currency selection and supported currencies | [TBD] |
| AQ-04 | Whether booking requests require an Admin rejection reason | **Decided:** Required; displayed to Customer |
| AQ-05 | Whether a package can have multiple available travel dates | [ASSUMPTION: Yes] |
| AQ-06 | Whether available travel dates can be removed after bookings exist | [TBD] |
| AQ-07 | Maximum number of travelers per booking | [TBD] |
| AQ-08 | Whether notifications can be marked as read | **Decided:** Yes — mark as read when opened |
| AQ-09 | Whether customers can edit a custom tour after approval | [ASSUMPTION: No] |
| AQ-10 | Whether customers can submit multiple custom tours simultaneously | [ASSUMPTION: Yes] |
| AQ-11 | Whether AI recommendation history is stored | [ASSUMPTION: Optional] |
| AQ-12 | Whether the AI recommendation feature is available to Guests | [ASSUMPTION: Yes] |
| AQ-13 | Password format beyond min 8 + letter + number | [ASSUMPTION: As stated in FR-AUTH-15] |
| AQ-14 | Sign in error wording stays generic (no email enumeration) | [ASSUMPTION: Yes] |
| AQ-15 | Payment vs Admin approval order | **Decided:** payment only after Admin approval |
| AQ-16 | Can customers retry mock payment after failure/cancel on the same booking while window is open? | **Decided:** Yes |
| AQ-17 | Timing of Stripe integration (post-MVP release target) | [TBD] |
| AQ-18 | Payment deadline | **Decided:** 24 hours from **Admin approval timestamp**; window `EXPIRED` ≠ payment status; booking stays APPROVED; payment stays UNPAID (or latest failed/cancelled); no auto-cancel; pay after expiry only if Admin reopens (and extends if original deadline has passed) |
| AQ-19 | Duration of reopened payment window | **Decided:** Reopen preserves the **original** deadline; Admin must **explicitly extend** to change expires-at (no automatic +24h) |
| AQ-20 | Minimum advance booking period | **Decided:** 7 calendar days (configured timezone calendar dates, not rolling 168 hours); applies to catalog bookings and custom tour start dates; FE+BE validation; Admin cannot approve if invalid at approval time |

---

# 24. Product Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Product Owner | | Pending | |
| Project Supervisor | | Pending | |
| Development Lead | | Pending | |

**End of Document**
