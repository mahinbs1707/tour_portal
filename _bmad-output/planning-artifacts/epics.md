---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/tour-portal/PRD.md
  - docs/tour-portal/BRD.md
  - _bmad-output/planning-artifacts/ux-designs/ux-project_final-2026-11-15/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-project_final-2026-11-15/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-project_final-2026-11-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-project_final-2026-11-15/ARCHITECTURE-WALKTHROUGH.md
excludedDocuments:
  - architecture reviews/*
  - architecture .memlog.md
project_name: project_final
product: Tour Portal
businessTimezone: Asia/Dhaka
status: approved
workflow: complete
approved: 2026-11-16
updated: 2026-11-16
validation:
  frCoverage: 208/209 (FR-NOTIF-03a deferred OPEN-04)
  stories: 33
  epics: 9
  architectureStarter: docker-compose-baseline (Story 1.1)
  forwardDeps: none-detected
---

# project_final - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Tour Portal (project_final), decomposing the requirements from the PRD, BRD, UX Design/Experience contract, and Architecture Spine v1.1 into implementable stories.

**Authoritative inputs:** PRD v1.5 · BRD v1.5 · DESIGN.md (final) · EXPERIENCE.md (final) · ARCHITECTURE-SPINE.md v1.1 · ARCHITECTURE-WALKTHROUGH.md.

**Confirmed:** `BUSINESS_TIMEZONE=Asia/Dhaka`.

**Out of MVP (do not introduce):** seat inventory/capacity, custom-tour quotations, Stripe charging, JWT, object storage, email/SMS, microservices, password reset/email verification, AI auto-published packages.

## Requirements Inventory

### Functional Requirements

_209 functional requirements from PRD v1.5 (including lettered IDs such as FR-BOOK-04a, FR-PAY-01a–g). Primary inventory lines may inline lettered siblings; coverage map lists each ID separately._

FR-AUTH-01: The system shall provide a Customer Sign up page.
FR-AUTH-02: Customer registration shall require: - Full name. - Email address. - Password. - Confirm password.
FR-AUTH-03: Public registration shall create Customer accounts only.
FR-AUTH-04: Customers shall not be allowed to select or assign themselves the Admin role.
FR-AUTH-05: Admin accounts shall be provisioned through a predefined administrative account mechanism. [ASSUMPTION] The initial Admin account shall be created through a secure database seed or environment-based provisioning process. Admin credentials shall not be exposed in public source code.
FR-AUTH-06: The system shall prevent registration using an email address that already exists.
FR-AUTH-07: Customers and Admins shall use the same Sign in interface.
FR-AUTH-08: Sign in shall require a registered email address and password.
FR-AUTH-09: After successful authentication, users shall be redirected to the landing page.
FR-AUTH-10: The system shall identify the authenticated user's role and enforce the corresponding permissions.
FR-AUTH-11: Invalid credentials shall prevent authentication and display an appropriate error message.
FR-AUTH-12: Sign out shall terminate the authenticated session.
FR-AUTH-13: Required fields shall be validated before form submission.
FR-AUTH-14: Email addresses shall follow a valid email format.
FR-AUTH-15: Passwords shall meet the following minimum requirements: [ASSUMPTION] - At least 8 characters. - At least one letter. - At least one number.
FR-AUTH-16: Confirm password must match the password field.
FR-AUTH-17: Invalid password formats shall prevent account creation.
FR-AUTH-18: Duplicate email registration shall be rejected.
FR-AUTH-19: Invalid Sign in attempts shall not create an authenticated session.
FR-AUTH-20: Authentication and authorization checks shall be enforced on the server side. [ASSUMPTION] Email verification, password reset, and account recovery are deferred from the MVP. **Additional validation acceptance (incorrect attempts)** - Empty required fields block submit; no account or session is created. - Malformed email blocks Sign up / Sign in with a clear message. - Invalid password format on Sign up blocks account creation and shows an invalid password format message stating the rules. - ...
FR-LP-01: The landing page shall be publicly accessible without authentication.
FR-LP-02: The page shall contain a hero section introducing the platform.
FR-LP-03: The page shall provide clear navigation to: - Explore tours. - Search tours. - Create a custom tour. - Sign in. - Sign up.
FR-LP-04: The landing page shall display featured published tour packages.
FR-LP-05: Each featured package shall provide a link to its corresponding detail page.
FR-LP-06: Unpublished packages shall never appear in public landing-page sections.
FR-LP-07: If no featured packages are available, the system shall display an appropriate empty state.
FR-LP-08: Navigation elements shall adapt according to the authentication state and user role. ---
FR-CAT-01: Guests and authenticated users shall be able to browse published tour packages.
FR-CAT-02: Each package card shall display: - Tour title. - Cover image. - Short description. - Destination. - Duration. - Starting price. - Currency.
FR-CAT-03: Selecting a package shall navigate to its detail page.
FR-CAT-04: Only published packages shall appear in the public catalog.
FR-CAT-05: The system shall provide a clear empty state when no published packages are available.
FR-CAT-06: Each package detail page shall display: **Basic information** - Tour title. - Cover image and additional images. - Short description. - Full description. **Travel information** - Destination. - Duration in days and nights. - Starting location. - Available travel dates. - Difficulty level, if provided. **Pricing information** - Base price. - Currency. - Included services. - Excluded services. **Tour itinerary** - Day-by-day itinerary or itinerary highlights. **Additional information** - Cancel...
FR-CAT-07: Published and bookable packages shall display a Book Now action.
FR-CAT-08: Unpublished packages shall not allow new booking requests.
FR-CAT-09: The package detail page shall clearly indicate when a package is unavailable for booking.
FR-CAT-10: Package details shall reflect the latest information maintained by the Admin. ---
FR-SEARCH-01: Users shall be able to search published packages using free-text queries.
FR-SEARCH-02: Search shall match relevant package information, including: - Tour title. - Destination. - Short description. - Full description.
FR-SEARCH-03: The system shall provide the following filters: - Destination. - Minimum and maximum price. - Tour duration.
FR-SEARCH-04: Users shall be able to combine multiple filters.
FR-SEARCH-05: Search results shall reflect all active search criteria.
FR-SEARCH-06: Users shall be able to clear filters and restore the default catalog results.
FR-SEARCH-07: The system shall display an informative empty state when no packages match the search criteria.
FR-SEARCH-08: Search results shall exclude unpublished packages. [ASSUMPTION] Search and filtering shall operate on the existing published package catalog without requiring AI. ---
FR-AI-01: Users shall be able to enter a free-text prompt describing their travel preferences.
FR-AI-02: Prompts may include: - Preferred destination. - Budget. - Travel duration. - Number of travelers. - Travel interests. - Preferred activities. - Other travel preferences.
FR-AI-03: The system shall analyze the submitted prompt and identify relevant published packages.
FR-AI-04: Recommendations shall be generated from existing published tour packages only.
FR-AI-05: The system shall not generate fictional packages or recommend unpublished inventory.
FR-AI-06: Each recommendation shall display: - Package title. - Cover image. - Destination. - Duration. - Price. - A short explanation of why the package matches the prompt.
FR-AI-07: AI recommendations shall be visually distinguishable from ordinary search results.
FR-AI-08: Selecting a recommendation shall navigate to the relevant package detail page.
FR-AI-09: If no relevant package is found, the system shall display an appropriate fallback message.
FR-AI-10: AI service failures shall not prevent users from browsing or searching the normal catalog. [ASSUMPTION] The system shall return up to five recommendations per prompt. [ASSUMPTION] AI shall rank eligible packages according to relevance to the user's stated preferences. ---
FR-BOOK-01: Only authenticated Customers shall be able to submit booking requests.
FR-BOOK-02: Guests who select Book Now shall be redirected to Sign in or Sign up.
FR-BOOK-03: After successful authentication, the customer shall be returned to the intended booking process.
FR-BOOK-04: Customers shall only be able to request bookings for published and bookable packages. FR-BOOK-04a: Customers shall book an existing tour package only if the selected available start date is at least **7 calendar days** after the booking request date (see AQ-20 / Section 8.4).
FR-BOOK-05: The selected package shall be associated with the booking request.
FR-BOOK-06: The booking form shall contain: | Field | Requirement | |---|---| | Selected package | Automatically populated | | Preferred travel date | Required; selected from Admin-defined dates | | Number of travelers | Required | | Customer name | Required; populated from account where available | | Contact email | Required; populated from account | | Contact number | Required | | Additional requirements | Optional | [ASSUMPTION] The number of travelers must be a positive integer.
FR-BOOK-07: The preferred travel date shall be selected from the dates configured for the package by the Admin that also satisfy the minimum 7 calendar-day advance rule.
FR-BOOK-08: The system shall prevent submission if a selected date is no longer available or violates the 7-day advance rule.
FR-BOOK-09: The system shall validate required fields before submission.
FR-BOOK-10: Customers shall be able to review their booking details before final submission.
FR-BOOK-11: Submitting a valid booking form shall create a booking request with `PENDING` status.
FR-BOOK-12: The customer shall receive an in-app notification confirming submission.
FR-BOOK-13: The system shall display a booking confirmation containing the booking reference and current status. FR-BOOK-13a: After submission, the booking awaits Admin review. Mock checkout is **not** available while status is `PENDING` (see Section 8.0 / 8A).
FR-BOOK-14: Newly submitted bookings shall start with `PENDING`.
FR-BOOK-15: Admins shall be able to approve or reject pending bookings.
FR-BOOK-16: Approved bookings shall transition to `APPROVED`.
FR-BOOK-17: Rejected bookings shall transition to `REJECTED`. FR-BOOK-17a: Rejecting a booking **requires** an Admin rejection reason. The reason shall be persisted and displayed to the Customer on booking detail and in the rejection notification.
FR-BOOK-18: Customers shall be able to cancel their own bookings **only before Admin approval** (while status is `PENDING`).
FR-BOOK-19: A cancelled booking shall transition to `CANCELLED`.
FR-BOOK-20: Customers shall not be able to cancel approved, rejected, or already cancelled bookings.
FR-BOOK-21: Admins shall not be able to approve or reject a booking that is no longer pending. FR-BOOK-21a: Admins shall not approve a booking whose selected start date violates the minimum 7 calendar-day advance rule at the time of approval (see Section 8.4).
FR-BOOK-22: Each status change shall be persisted and reflected in the customer's booking history.
FR-BOOK-23: Customers shall receive an in-app notification when an Admin approves or rejects their booking.
FR-BOOK-24: Customers shall receive an in-app notification when their booking cancellation is completed.
FR-BOOK-25: Payment eligibility begins **only after** Admin approval. After approval, the Customer may proceed to mock checkout per Section 8A (AQ-18).
FR-BOOK-26: On Admin approval, the system shall record the **approval timestamp** used as the start of the 24-hour payment window. [ASSUMPTION] A rejected booking cannot be resubmitted as the same booking record. The Customer may create a new booking request if the package remains bookable.
FR-ADV-01: Customers can book an existing tour package only if its selected available start date is at least **7 calendar days** after the booking request date.
FR-ADV-02: Customers can create and submit a custom tour request only if the proposed tour start date is at least **7 calendar days** after the submission date.
FR-ADV-03: Tour dates within the next 7 calendar days must not be selectable or submittable.
FR-ADV-04: The system must validate this rule on both the **frontend** and the **backend**.
FR-ADV-05: Admins shall be prevented from approving a booking or custom tour that violates this requirement if its start date has become invalid by the time of approval.
FR-ADV-06: The 7-day period shall be calculated using the system’s **configured timezone** and **calendar dates**, not a rolling 168-hour duration, so date selection remains predictable. **Example:** If a customer submits a booking request on 15 November, the earliest eligible tour start date is 22 November (in the configured timezone’s calendar). **Acceptance — Advance booking** - Given today is 15 November in the configured timezone, when the customer opens date selection for a package, then dates on ...
FR-PAY-01: Customers must complete payment within **24 hours** of Admin approval. FR-PAY-01a: The countdown starts from the booking’s **approval timestamp**. FR-PAY-01b: The payment option remains available during the 24-hour period while the booking is `APPROVED` and the payment window is open. FR-PAY-01c: If payment is not completed within 24 hours: - The payment window **expires**. - The booking remains **`APPROVED`**. - The payment status remains **`UNPAID`** (or reflects the latest failed/cancelled...
FR-PAY-02: The mock checkout shall simulate at least these payment attempt outcomes (shown to the Customer as the payment status for that attempt): - Successful payment (`SUCCESS`). - Failed payment (`FAILED`). - Cancelled payment attempt (`CANCELLED`).
FR-PAY-03: Payment transactions and payment statuses shall be stored in a **separate payment record**, linked to the related booking, and shall not be embedded as the booking record itself.
FR-PAY-04: The system shall **not** collect or process real payment card numbers, bank credentials, or other real payment instruments in the MVP.
FR-PAY-05: Mock checkout UI may use clearly labeled simulated controls (for example buttons to choose Simulate success / Simulate failure / Cancel) so testers can exercise each outcome.
FR-PAY-06: Each payment attempt / payment record shall persist at least: - Payment ID. - Related booking ID. - Customer ID. - Amount and currency (derived from the booked package / booking context). - **Payment status** (transaction): `UNPAID` \| `PENDING` \| `SUCCESS` \| `FAILED` \| `CANCELLED`. - **Payment window state** (separate from payment status): `NOT_OPEN` \| `OPEN` \| `EXPIRED`, plus `opened-at` and `expires-at`. (After payment `SUCCESS`, checkout is hidden regardless of window; do not use `EX...
FR-PAY-07: Customers shall see the payment status associated with their booking in booking confirmation and/or booking history, including remaining time in the payment window when open.
FR-PAY-08: Failed or cancelled mock payments shall not invent a successful payment record. The booking remains `APPROVED`; payment remains unpaid/failed/cancelled as recorded until a successful payment or window expiry.
FR-PAY-09: Admins shall be able to view payment status and payment-window state for a booking when reviewing booking details.
FR-PAY-10: Customers shall receive an in-app notification when a booking is approved and the payment window opens; `[ASSUMPTION]` optional notification when the payment window is about to expire or has expired. FR-PAY-10a: Before Admin approval, Customers shall not access mock checkout for that booking. FR-PAY-10b: For bookings with status `REJECTED` or `CANCELLED`, Customers shall not access mock checkout. FR-PAY-10c: Booking status and payment status shall always be displayed as separate fields in Cus...
FR-PAY-11: The payment module shall be designed behind a provider abstraction (for example a payment service interface) so the booking workflow calls provider-agnostic operations such as “create payment attempt” and “record payment result.”
FR-PAY-12: Replacing the mock provider with Stripe in a future release shall not require major changes to the booking request/approval workflow or to the logical shape of booking and payment records (provider-specific fields may be added without redesigning booking status machines).
FR-PAY-13: Payment records shall include a provider discriminator (`MOCK` now; `STRIPE` later) and optional external provider reference fields reserved for future use.
FR-CT-01: Only authenticated Customers shall be able to create custom tour plans.
FR-CT-02: Guests who select Create Custom Tour shall be redirected to Sign in or Sign up.
FR-CT-03: The custom tour builder shall provide a structured form.
FR-CT-04: The system shall validate all required fields before submission. FR-CT-04a: The proposed tour start date shall be at least **7 calendar days** after the submission date (AQ-20 / Section 8.4). Dates within the next 7 calendar days shall not be selectable or submittable.
FR-CT-05: The end date shall not be earlier than the start date.
FR-CT-06: The number of travelers shall be a positive integer.
FR-CT-07: Budget values shall be positive.
FR-CT-08: Customers shall be able to review their custom tour information before submission.
FR-CT-09: Successful submission shall create a custom tour record with `PENDING` status.
FR-CT-10: The customer shall receive an in-app notification confirming submission.
FR-CT-11: Custom tour submissions shall be private to their respective customers.
FR-CT-12: Customers shall only be able to view and manage their own custom tour submissions.
FR-CT-13: Customers shall not be able to view another customer's custom tour details.
FR-CT-14: Admins shall have access to custom tour submissions for administrative review.
FR-CT-15: Approval of a custom tour shall not automatically publish it in the public catalog.
FR-CT-16: Approved custom tours shall remain private to their respective owners.
FR-CT-17: Every new submission shall enter `PENDING`.
FR-CT-18: Admins shall be able to approve or reject pending submissions. FR-CT-18a: Admins shall not approve a custom tour whose start date violates the minimum 7 calendar-day advance rule at the time of approval.
FR-CT-19: Approved submissions shall transition to `APPROVED`.
FR-CT-20: Rejected submissions shall transition to `REJECTED`.
FR-CT-21: Admin rejection shall include a mandatory rejection reason.
FR-CT-22: Admins may provide recommended adjustments.
FR-CT-23: Admins shall control whether reapplication is permitted for a rejected submission.
FR-CT-24: If reapplication is enabled, the customer shall be able to edit and resubmit the rejected custom tour.
FR-CT-25: If reapplication is disabled, the customer shall not be able to resubmit that rejected submission.
FR-CT-26: Customers shall be able to view the rejection reason and recommended adjustments.
FR-CT-27: Resubmission shall change the status back to `PENDING`.
FR-CT-28: Each resubmission shall create a new review cycle.
FR-CT-29: Previous review decisions and rejection information shall be retained in the history.
FR-CT-30: After approval, the custom tour shall remain private and shall not become a public catalog package. ---
FR-ADM-01: Only authenticated Admins shall be able to access the Admin dashboard.
FR-ADM-02: The dashboard shall display key operational statistics: - Total tour packages. - Published packages. - Draft/unpublished packages. - Pending booking requests. - Approved booking requests. - Rejected booking requests. - Pending custom tour submissions. - Approved custom tour submissions. - Rejected custom tour submissions.
FR-ADM-03: The dashboard shall provide navigation to package management, booking management, and custom tour management.
FR-ADM-04: The dashboard shall highlight pending requests requiring review. ---
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
FR-PKG-12: Package updates shall be reflected in the public catalog and package detail pages. [ASSUMPTION] Package deletion shall be restricted when historical bookings exist. Admins should unpublish such packages instead. ---
FR-AB-01: Admins shall be able to view all booking requests.
FR-AB-02: Admins shall be able to filter bookings by status.
FR-AB-03: Admins shall be able to view booking details, including: - Booking reference. - Customer information. - Selected package. - Preferred travel date. - Number of travelers. - Additional requirements. - Submission date. - Current status.
FR-AB-04: Admins shall be able to approve pending bookings.
FR-AB-05: Admins shall be able to reject pending bookings. FR-AB-05a: Rejecting a booking **requires** a non-empty rejection reason. The reason shall be stored on the booking and shown to the Customer. FR-AB-05b: Admins shall be able to **reopen** an expired payment window and, separately, **extend** the payment deadline (see FR-PAY-01e / FR-PAY-01f). Reopen alone does not reset the deadline.
FR-AB-06: Admin decisions shall update the booking status.
FR-AB-07: Admins shall not be able to approve or reject cancelled or already processed bookings.
FR-AB-08: Customers shall receive an in-app notification after an Admin decision (rejection notifications include the rejection reason).
FR-AB-09: Admins shall be able to view booking history and previous decisions. ---
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
FR-ACT-12: Admin approval shall not publish the custom tour in the public catalog. ---
FR-CUST-01: Authenticated Customers shall have access to a personal dashboard or account area.
FR-CUST-02: Customers shall be able to view their booking history.
FR-CUST-03: Customers shall be able to view their custom tour submission history.
FR-CUST-04: Booking records shall display: - Booking reference. - Tour package. - Travel date. - Number of travelers. - Submission date. - Current status.
FR-CUST-05: Custom tour records shall display: - Custom tour title. - Destination(s). - Requested travel dates. - Submission date. - Current status.
FR-CUST-06: Customers shall be able to open individual records to view complete details.
FR-CUST-07: Customers shall only have access to records belonging to their own account.
FR-CUST-08: Customers shall be able to cancel their own pending booking requests.
FR-CUST-09: Customers shall be able to reapply to rejected custom tour submissions only when the Admin has enabled reapplication. ---
FR-NOTIF-01: Customers shall receive a notification after submitting a booking request.
FR-NOTIF-02: Customers shall receive a notification when a booking is approved (including that the 24-hour payment window has opened).
FR-NOTIF-03: Customers shall receive a notification when a booking is rejected (including the rejection reason). FR-NOTIF-03a: `[ASSUMPTION]` Customers may receive a notification when the payment window expires unpaid.
FR-NOTIF-04: Customers shall receive a notification after cancelling a pending booking.
FR-NOTIF-05: Customers shall receive a notification after submitting a custom tour.
FR-NOTIF-06: Customers shall receive a notification when a custom tour is approved or rejected.
FR-NOTIF-07: Customers shall receive a notification when reapplication is enabled for a rejected custom tour.
FR-NOTIF-08: Customers shall receive a notification after successfully resubmitting a custom tour.
FR-NOTIF-09: Each notification shall contain a meaningful message, creation timestamp, and relevant record reference.
FR-NOTIF-10: Users shall be able to view their notification list.
FR-NOTIF-11: Users shall be able to identify unread notifications. FR-NOTIF-11a: Notifications shall be marked as read when the user opens them (list item or deep-linked detail).
FR-NOTIF-12: Notifications shall be visible only to their intended recipients. ---

### NonFunctional Requirements

_22 non-functional requirements extracted from PRD v1.5._

NFR-01: The system shall enforce server-side authentication and authorization.
NFR-02: Admin routes and administrative actions shall be inaccessible to Guests and Customers.
NFR-03: Customers shall only access their own booking, custom tour, and notification records.
NFR-04: Passwords shall be securely hashed and shall never be stored or logged in plaintext.
NFR-05: Authentication sessions shall be handled securely.
NFR-06: Sensitive administrative credentials shall not be exposed in client-side code or public repositories.
NFR-07: The system shall validate all user-submitted data on the server. ## 17.2 Performance
NFR-08: Public catalog pages should load within a reasonable time under normal usage.
NFR-09: Search and filtering should return results without unnecessary delays.
NFR-10: The system shall provide loading indicators for asynchronous operations, including AI recommendations. ## 17.3 Usability
NFR-11: The interface shall be intuitive and consistent across all application areas.
NFR-12: Forms shall provide clear field-level validation messages.
NFR-13: All major actions shall provide appropriate success, failure, or confirmation feedback.
NFR-14: The interface shall be responsive across desktop, tablet, and mobile screen sizes. ## 17.4 Reliability and Data Integrity
NFR-15: Booking and custom tour records shall persist after page refresh or session restart.
NFR-16: Status transitions shall be validated and persisted reliably.
NFR-17: Unauthorized or invalid status transitions shall be rejected.
NFR-18: Administrative decisions shall retain their associated history.
NFR-19: Duplicate submissions caused by repeated requests shall be prevented where appropriate. ## 17.5 AI Reliability
NFR-20: AI recommendation failures shall not affect normal catalog browsing.
NFR-21: AI recommendations shall be grounded in existing published package data.
NFR-22: AI responses shall not invent package prices, availability dates, or package records. --- # 18. Logical Data Model The following entities are required for the MVP. ## 18.1 User - User ID - Full name - Email - Password hash - Role - Account creation timestamp - Account status ## 18.2 TourPackage - Package ID - Title - Short description - Full description - Destination(s) - Duration - Starting location - Price - Currency - Cover image - Additional images - Included services - Excluded services ...

### Additional Requirements

### From Architecture Spine v1.1 (implementation baseline)

- Greenfield modular monolith: React+Vite SPA + Django+DRF + PostgreSQL; Docker Compose local baseline with Nginx same-origin (AD-1, AD-15). No cloud starter template pinned — Compose seed is the runtime baseline.
- Session auth + CSRF same-origin; endpoints register/login/logout/me/csrf; no JWT in MVP (AD-2, AD-21).
- RBAC CUSTOMER|ADMIN; Admin APIs check `role==ADMIN` only; seed invariant ADMIN⇒is_staff; FE guards use role only (AD-3, AD-19).
- Domain apps: accounts, packages, recommendations, bookings, custom_tours, payments, notifications, dashboard, audit, common (AD-4).
- Binding exclusive writers: PaymentWindow→PaymentService (AD-16); Notification→NotificationService + closed event catalog (AD-17); Audit→AuditService + closed catalog (AD-22); Dashboard read-model façade (AD-18).
- URL namespaces: `/`, `/app/customer/*`, `/app/admin/*`, `/api/*`, `/media/*`, `/django-admin/*` (AD-5).
- PaymentProvider + MockPaymentProvider only; Stripe deferred (AD-6).
- Status machines: Booking PENDING|APPROVED|REJECTED|CANCELLED; Payment UNPAID|PENDING|SUCCESS|FAILED|CANCELLED; Window NOT_OPEN|OPEN|EXPIRED; Custom tour PENDING|APPROVED|REJECTED (AD-7).
- No seat/capacity inventory; concurrent bookings on same AvailableDate allowed; shared 7-day validator; BUSINESS_TIMEZONE=Asia/Dhaka (AD-8, AD-20).
- UUID PKs; exactly one PaymentWindow per booking; AvailableDate deactivate not hard-delete with FKs (AD-9).
- Payment window deadline from approval timestamp + 24h; reopen preserves deadline; extend mutates deadline_at; audited (AD-10, AD-16, AD-22).
- DRF-standard errors; PageNumberPagination default (AD-11).
- Feature-based React org + shared apiClient (AD-13, AD-21).
- Layered testing + mandatory critical scenarios including AI isolation, search unpublished exclusion, CUSTOMER-only registration (AD-14).
- AI recommendations: recommendations app; ≤5; published-only; failure isolation (AD-23).
- Search/filter server-side on published packages; local media MEDIA_ROOT + /media/ (AD-24).
- Stack pins: Python≥3.12, Django 6.1.3, DRF 3.18.3, Postgres 18.x, psycopg≥3.1.12, Node≥20.19/≥22.12, React 19.3.1, RRDOM 7.18.5, Vite 8.3.8.
- Deferred (do not story as MVP delivery): cloud host, object storage, Stripe, JWT, quotations, email/SMS, seat inventory, microservices, password reset/email verification, AI auto-publish packages.

### From BRD v1.5 (business rules — map to stories; do not invent)

- BR-01…BR-20 as product constraints (especially BR-16* payment/window rules, BR-20 no seats).
- Open items still TBD: currency list (OPEN-01), **max travelers (OPEN-02)**, optional expiry notif (OPEN-04), Admin notif event set (OPEN-05), UI kit beyond shadcn (OPEN-06). **Resolved:** date deactivation (OPEN-03); AD-17 includes `booking.submitted` / `custom_tour.submitted` (Customer recipients).

### UX Design Requirements

_17 UX design requirements extracted from DESIGN.md + EXPERIENCE.md (paired contract)._

UX-DR1: Implement DESIGN.md design tokens (colors including status/payment/window chips, typography Fraunces + Source Sans 3 + IBM Plex Mono, rounded, spacing) as CSS variables / theme layer; light-only MVP.
UX-DR2: Implement shared component patterns per DESIGN/EXPERIENCE join keys: button-primary, button-accent, button-secondary, button-destructive, book-now, pay-now, mock-checkout, card-package, hero-banner, input-field, status-chip, payment-chip, window-chip, modal-dialog, drawer-sheet, dropdown-menu, nav-header, admin-sidebar, notification-bell, empty-state, date-picker, approve-dialog, reject-dialog, reopen-dialog, extend-dialog.
UX-DR3: WCAG 2.2 AA floor: text ≥4.5:1; non-text ≥3:1; two-tone focus on filled CTAs; status never color-only; touch targets ≥24px (prefer 44px primary); skip link + landmarks; prefers-reduced-motion.
UX-DR4: Public/Customer chrome: top nav; Guest vs Customer nav sets; brand hero-level on Landing; hamburger→drawer <md; sticky form CTA must not obscure focused fields.
UX-DR5: Admin chrome: sidebar 240px on lg+; <lg icon rail/sheet; tablet/mobile Admin lists as stacked cards → detail (no horizontal-only tables).
UX-DR6: Always show booking / payment / payment-window as three separate labeled chips/rows when payment applies; enums SUCCESS (not SUCCEEDED); window EXPIRED never as payment status.
UX-DR7: Pay now visible iff APPROVED AND window OPEN AND payment ≠ SUCCESS; mock checkout legend “Mock payment — no real charges”; simulate SUCCESS/FAILED/CANCELLED.
UX-DR8: Dialogs: approve confirm; reject alertdialog with required reason; reopen (deadline unchanged copy); extend (new expires-at); cancel booking confirm; focus trap, Esc, restore focus; modal stack depth ≤1; checkout full page.
UX-DR9: Date picker: next 7 calendar days not selectable; helper explains preparation lead time (Asia/Dhaka calendar).
UX-DR10: Notification bell: accessible name with unread count (cap 9+); open marks read; deep link; empty “You’re all caught up.”
UX-DR11: State patterns: skeletons aria-busy; empty-states with one CTA; AI loading live region + failure isolation; offline banner blocking Pay/submit; session expiry modal + restore non-sensitive draft; permission denied toast+redirect.
UX-DR12: Countdown aria-live polite atomic; announce on mount; tick ~1/min; on EXPIRED announce Pay unavailable once.
UX-DR13: Responsive breakpoints per EXPERIENCE (≥lg / md / <md) for Customer and Admin.
UX-DR14: Price display `{amount} {CODE}` (ISO currency); locale-aware number formatting hooks; no hardcoded `$` concatenation.
UX-DR15: English MVP with externalized strings; localization-ready formatters.
UX-DR16: Implement EXPERIENCE key flows A, 1, 1b, 2, 3, 4, 5, 6, 7, 8 as UX acceptance for corresponding stories.
UX-DR17: UI kit assumption `[ASSUMPTION]`: shadcn/ui + Tailwind as implementation vehicle unless product decides otherwise (open gap #1) — do not treat as undecided blocker if team accepts assumption.

### Open product decisions / ambiguities (do NOT invent in stories)

| ID | Topic | Source | Notes |
|---|---|---|---|
| OPEN-01 | Supported currency list | PRD AQ-03 / UX gap 2 | Package currency display depends on allowed codes |
| OPEN-02 | Max travelers cap | PRD AQ-07 / UX gap 3 | **Unresolved:** do not invent a max; validate positive integer (≥1) only until product decides |
| OPEN-03 | Removing available dates after bookings exist | PRD AQ-06 / UX gap 4 | **Resolved:** deactivate, never hard-delete when booking FKs exist (Story 2.2) |
| OPEN-04 | Optional payment-window expiry notification | FR-PAY-10 / FR-NOTIF-03a `[ASSUMPTION]` | Optional — story only if approved |
| OPEN-05 | Admin notification event set | UX gap 6 | Sparse ops alerts assumed |
| OPEN-06 | UI kit beyond shadcn assumption | UX gap 1 | EXPERIENCE `[ASSUMPTION]` shadcn/ui + Tailwind |
| OPEN-07 | Password policy detail | FR-AUTH-15 `[ASSUMPTION]` | min 8 + letter + number — treat as baseline unless overridden |
| OPEN-08 | Generic invalid credentials message | PRD auth acceptance `[ASSUMPTION]` | Prefer generic message |
| OPEN-09 | Exact `/api/recommendations/` paths | AD-23 | Namespace reserved; path detail at implementation |
| OPEN-10 | Exact pagination page size | AD-11 | Example 20 — confirm in implementation story |

### FR Coverage Map

FR-AUTH-01: Epic 1 - Secure access & shell
FR-AUTH-02: Epic 1 - Secure access & shell
FR-AUTH-03: Epic 1 - Secure access & shell
FR-AUTH-04: Epic 1 - Secure access & shell
FR-AUTH-05: Epic 1 - Secure access & shell
FR-AUTH-06: Epic 1 - Secure access & shell
FR-AUTH-07: Epic 1 - Secure access & shell
FR-AUTH-08: Epic 1 - Secure access & shell
FR-AUTH-09: Epic 1 - Secure access & shell
FR-AUTH-10: Epic 1 - Secure access & shell
FR-AUTH-11: Epic 1 - Secure access & shell
FR-AUTH-12: Epic 1 - Secure access & shell
FR-AUTH-13: Epic 1 - Secure access & shell
FR-AUTH-14: Epic 1 - Secure access & shell
FR-AUTH-15: Epic 1 - Secure access & shell
FR-AUTH-16: Epic 1 - Secure access & shell
FR-AUTH-17: Epic 1 - Secure access & shell
FR-AUTH-18: Epic 1 - Secure access & shell
FR-AUTH-19: Epic 1 - Secure access & shell
FR-AUTH-20: Epic 1 - Secure access & shell
FR-LP-01: Epic 3 - Discover tours
FR-LP-02: Epic 3 - Discover tours
FR-LP-03: Epic 3 - Discover tours
FR-LP-04: Epic 3 - Discover tours
FR-LP-05: Epic 3 - Discover tours
FR-LP-06: Epic 3 - Discover tours
FR-LP-07: Epic 3 - Discover tours
FR-LP-08: Epic 3 - Discover tours
FR-CAT-01: Epic 3 - Discover tours
FR-CAT-02: Epic 3 - Discover tours
FR-CAT-03: Epic 3 - Discover tours
FR-CAT-04: Epic 3 - Discover tours
FR-CAT-05: Epic 3 - Discover tours
FR-CAT-06: Epic 3 - Discover tours
FR-CAT-07: Epic 3 - Discover tours
FR-CAT-08: Epic 3 - Discover tours
FR-CAT-09: Epic 3 - Discover tours
FR-CAT-10: Epic 3 - Discover tours
FR-SEARCH-01: Epic 3 - Discover tours
FR-SEARCH-02: Epic 3 - Discover tours
FR-SEARCH-03: Epic 3 - Discover tours
FR-SEARCH-04: Epic 3 - Discover tours
FR-SEARCH-05: Epic 3 - Discover tours
FR-SEARCH-06: Epic 3 - Discover tours
FR-SEARCH-07: Epic 3 - Discover tours
FR-SEARCH-08: Epic 3 - Discover tours
FR-AI-01: Epic 4 - AI recommendations
FR-AI-02: Epic 4 - AI recommendations
FR-AI-03: Epic 4 - AI recommendations
FR-AI-04: Epic 4 - AI recommendations
FR-AI-05: Epic 4 - AI recommendations
FR-AI-06: Epic 4 - AI recommendations
FR-AI-07: Epic 4 - AI recommendations
FR-AI-08: Epic 4 - AI recommendations
FR-AI-09: Epic 4 - AI recommendations
FR-AI-10: Epic 4 - AI recommendations
FR-BOOK-01: Epic 5 - Customer booking requests
FR-BOOK-02: Epic 5 - Customer booking requests
FR-BOOK-03: Epic 5 - Customer booking requests
FR-BOOK-04: Epic 5 - Customer booking requests
FR-BOOK-04a: Epic 5 - Customer booking requests
FR-BOOK-05: Epic 5 - Customer booking requests
FR-BOOK-06: Epic 5 - Customer booking requests
FR-BOOK-07: Epic 5 - Customer booking requests
FR-BOOK-08: Epic 5 - Customer booking requests
FR-BOOK-09: Epic 5 - Customer booking requests
FR-BOOK-10: Epic 5 - Customer booking requests
FR-BOOK-11: Epic 5 - Customer booking requests
FR-BOOK-12: Epic 5 - Customer booking requests
FR-BOOK-13: Epic 5 - Customer booking requests
FR-BOOK-13a: Epic 5 - Customer booking requests
FR-BOOK-14: Epic 5 - Customer booking requests
FR-BOOK-15: Epic 6 - Admin booking decisions & payment window
FR-BOOK-16: Epic 6 - Admin booking decisions & payment window
FR-BOOK-17: Epic 6 - Admin booking decisions & payment window
FR-BOOK-17a: Epic 6 - Admin booking decisions & payment window
FR-BOOK-18: Epic 5 - Customer booking requests
FR-BOOK-19: Epic 5 - Customer booking requests
FR-BOOK-20: Epic 5 - Customer booking requests
FR-BOOK-21: Epic 6 - Admin booking decisions & payment window
FR-BOOK-21a: Epic 6 - Admin booking decisions & payment window
FR-BOOK-22: Epic 5 - Customer booking requests
FR-BOOK-23: Epic 6 - Admin booking decisions & payment window
FR-BOOK-24: Epic 5 - Customer booking requests
FR-BOOK-25: Epic 6 & 7 - Eligibility after approval (window in 6; checkout in 7)
FR-BOOK-26: Epic 6 - Admin booking decisions & payment window
FR-ADV-01: Epic 5 - Booking advance rule (Asia/Dhaka)
FR-ADV-02: Epic 8 - Custom tours (7-day on CT)
FR-ADV-03: Epic 5 - Booking advance rule (Asia/Dhaka)
FR-ADV-04: Epic 5 - Booking advance rule (Asia/Dhaka)
FR-ADV-05: Epic 6 & 8 - Advance rule at Admin approval (booking + custom tour)
FR-ADV-06: Epic 5 - Booking advance rule (Asia/Dhaka)
FR-PAY-01: Epic 6 - Payment window rules (Admin-side)
FR-PAY-01a: Epic 6 - Payment window rules (Admin-side)
FR-PAY-01b: Epic 6 - Payment window rules (Admin-side)
FR-PAY-01c: Epic 6 - Payment window rules (Admin-side)
FR-PAY-01d: Epic 6 - Payment window rules (Admin-side)
FR-PAY-01e: Epic 6 - Payment window rules (Admin-side)
FR-PAY-01f: Epic 6 - Payment window rules (Admin-side)
FR-PAY-01g: Epic 7 - Mock payment checkout
FR-PAY-02: Epic 7 - Mock payment checkout
FR-PAY-03: Epic 7 - Mock payment checkout
FR-PAY-04: Epic 7 - Mock payment checkout
FR-PAY-05: Epic 7 - Mock payment checkout
FR-PAY-06: Epic 7 - Mock payment checkout
FR-PAY-07: Epic 7 - Mock payment checkout
FR-PAY-08: Epic 7 - Mock payment checkout
FR-PAY-09: Epic 6 - Payment window rules (Admin-side)
FR-PAY-10: Epic 6 - Payment window rules (Admin-side)
FR-PAY-10a: Epic 7 - Mock payment checkout
FR-PAY-10b: Epic 7 - Mock payment checkout
FR-PAY-10c: Epic 7 - Mock payment checkout
FR-PAY-11: Epic 7 - Mock payment checkout
FR-PAY-12: Epic 7 - Mock payment checkout
FR-PAY-13: Epic 7 - Mock payment checkout
FR-CT-01: Epic 8 - Custom tours
FR-CT-02: Epic 8 - Custom tours
FR-CT-03: Epic 8 - Custom tours
FR-CT-04: Epic 8 - Custom tours
FR-CT-04a: Epic 8 - Custom tours
FR-CT-05: Epic 8 - Custom tours
FR-CT-06: Epic 8 - Custom tours
FR-CT-07: Epic 8 - Custom tours
FR-CT-08: Epic 8 - Custom tours
FR-CT-09: Epic 8 - Custom tours
FR-CT-10: Epic 8 - Custom tours
FR-CT-11: Epic 8 - Custom tours
FR-CT-12: Epic 8 - Custom tours
FR-CT-13: Epic 8 - Custom tours
FR-CT-14: Epic 8 - Custom tours
FR-CT-15: Epic 8 - Custom tours
FR-CT-16: Epic 8 - Custom tours
FR-CT-17: Epic 8 - Custom tours
FR-CT-18: Epic 8 - Custom tours
FR-CT-18a: Epic 8 - Custom tours
FR-CT-19: Epic 8 - Custom tours
FR-CT-20: Epic 8 - Custom tours
FR-CT-21: Epic 8 - Custom tours
FR-CT-22: Epic 8 - Custom tours
FR-CT-23: Epic 8 - Custom tours
FR-CT-24: Epic 8 - Custom tours
FR-CT-25: Epic 8 - Custom tours
FR-CT-26: Epic 8 - Custom tours
FR-CT-27: Epic 8 - Custom tours
FR-CT-28: Epic 8 - Custom tours
FR-CT-29: Epic 8 - Custom tours
FR-CT-30: Epic 8 - Custom tours
FR-ADM-01: Epic 2 - Admin catalog
FR-ADM-02: Epic 9 - Admin dashboard stats
FR-ADM-03: Epic 2 - Admin catalog
FR-ADM-04: Epic 9 - Admin dashboard stats
FR-PKG-01: Epic 2 - Admin catalog
FR-PKG-02: Epic 2 - Admin catalog
FR-PKG-03: Epic 2 - Admin catalog
FR-PKG-04: Epic 2 - Admin catalog
FR-PKG-05: Epic 2 - Admin catalog
FR-PKG-06: Epic 2 - Admin catalog
FR-PKG-07: Epic 2 - Admin catalog
FR-PKG-08: Epic 2 - Admin catalog
FR-PKG-09: Epic 2 - Admin catalog
FR-PKG-10: Epic 2 - Admin catalog
FR-PKG-11: Epic 2 - Admin catalog
FR-PKG-12: Epic 2 - Admin catalog
FR-AB-01: Epic 6 - Admin booking decisions & payment window
FR-AB-02: Epic 6 - Admin booking decisions & payment window
FR-AB-03: Epic 6 - Admin booking decisions & payment window
FR-AB-04: Epic 6 - Admin booking decisions & payment window
FR-AB-05: Epic 6 - Admin booking decisions & payment window
FR-AB-05a: Epic 6 - Admin booking decisions & payment window
FR-AB-05b: Epic 6 - Admin booking decisions & payment window
FR-AB-06: Epic 6 - Admin booking decisions & payment window
FR-AB-07: Epic 6 - Admin booking decisions & payment window
FR-AB-08: Epic 6 - Admin booking decisions & payment window
FR-AB-09: Epic 6 - Admin booking decisions & payment window
FR-ACT-01: Epic 8 - Custom tours
FR-ACT-02: Epic 8 - Custom tours
FR-ACT-03: Epic 8 - Custom tours
FR-ACT-04: Epic 8 - Custom tours
FR-ACT-05: Epic 8 - Custom tours
FR-ACT-06: Epic 8 - Custom tours
FR-ACT-07: Epic 8 - Custom tours
FR-ACT-08: Epic 8 - Custom tours
FR-ACT-09: Epic 8 - Custom tours
FR-ACT-10: Epic 8 - Custom tours
FR-ACT-11: Epic 8 - Custom tours
FR-ACT-12: Epic 8 - Custom tours
FR-CUST-01: Epic 5 & 9 - Customer home (history in 5, dashboard polish in 9)
FR-CUST-02: Epic 5 - Customer booking history
FR-CUST-03: Epic 8 - Custom tour history
FR-CUST-04: Epic 5 - Customer booking history
FR-CUST-05: Epic 8 - Custom tour history
FR-CUST-06: Epic 5 - Customer booking history
FR-CUST-07: Epic 5 - Customer booking history
FR-CUST-08: Epic 5 - Customer booking history
FR-CUST-09: Epic 8 - Custom tour history
FR-NOTIF-01: Epic 5 - Booking request notifications
FR-NOTIF-02: Epic 6 - Booking decision notifications
FR-NOTIF-03: Epic 6 - Booking decision notifications
FR-NOTIF-03a: DEFERRED unless OPEN-04 approved - Optional window-expiry notification
FR-NOTIF-04: Epic 5 - Booking request notifications
FR-NOTIF-05: Epic 8 - Custom tour notifications
FR-NOTIF-06: Epic 8 - Custom tour notifications
FR-NOTIF-07: Epic 8 - Custom tour notifications
FR-NOTIF-08: Epic 8 - Custom tour notifications
FR-NOTIF-09: Epic 9 - Notification center
FR-NOTIF-10: Epic 9 - Notification center
FR-NOTIF-11: Epic 9 - Notification center
FR-NOTIF-11a: Epic 9 - Notification center
FR-NOTIF-12: Epic 9 - Notification center

## Epic List

### Epic 1: Secure Access & Experience Shell
Customers and Admins can authenticate; Guests see the public shell. Delivers Compose baseline, design tokens, route groups, shared `apiClient` (session+CSRF), RBAC foundations, Admin seed, and notification/audit service skeletons so later epics emit events safely.
**User outcome:** Sign up (Customer only), Sign in/out, role-aware nav, secure session — no business workflows yet beyond empty authenticated homes.
**FRs covered:** FR-AUTH-01 … FR-AUTH-20
**Also binds:** NFR-01…07, NFR-11…14 (shell); UX-DR1, UX-DR3, UX-DR4, UX-DR5, UX-DR11 (session), UX-DR13, UX-DR15, UX-DR17; AD-1, AD-2, AD-3, AD-4 (accounts/common/notifications/audit stubs), AD-5, AD-13, AD-14 (harness), AD-15, AD-19, AD-21; BR-01, BR-04, BR-18, BR-19
**OPEN note:** OPEN-06 (shadcn assumption), OPEN-07, OPEN-08 — non-blocking if assumptions accepted; OPEN-10 page size — non-blocking default in story.

### Epic 2: Admin Tour Catalog & Availability
Admins create, edit, draft/publish/unpublish, feature packages; manage available travel dates (no seat capacity); upload cover/additional images to local `/media/`.
**User outcome:** Admin can stock the catalog that Guests will browse.
**FRs covered:** FR-PKG-01 … FR-PKG-12; FR-ADM-01, FR-ADM-03 (package navigation)
**Also binds:** UX-DR5, UX-DR8 (as needed), UX-DR14, UX-DR16 Flow 8; AD-4 packages, AD-9, AD-20, AD-22 (package audit actions), AD-24; BR-03, BR-05, BR-06, BR-20
**OPEN note:** OPEN-01 currency list — **blocks** package create validation if product requires a closed list; otherwise allow free ISO code with OPEN-01 flagged. OPEN-03 **resolved:** deactivate AvailableDate when booking FKs exist; never hard-delete (Story 2.2).

### Epic 3: Discover Tours (Landing, Catalog, Search)
Guests and authenticated users browse Landing (hero + featured), Explore catalog, package detail, and server-side search/filter — published packages only.
**User outcome:** Find and inspect bookable tours without auth (Book Now gated later).
**FRs covered:** FR-LP-01 … FR-LP-08; FR-CAT-01 … FR-CAT-10; FR-SEARCH-01 … FR-SEARCH-08
**Also binds:** UX-DR2 (card-package, hero, empty-state), UX-DR4, UX-DR6 (N/A payment), UX-DR9 (display dates), UX-DR11, UX-DR14, UX-DR16; AD-11, AD-24 search; BR-01, BR-05

### Epic 4: AI Tour Recommendations
Users submit a free-text preference prompt and receive ≤5 published-package recommendations, visually distinct from search, with failure isolation.
**User outcome:** Guided discovery from natural-language preferences.
**FRs covered:** FR-AI-01 … FR-AI-10
**Also binds:** NFR-10, NFR-20…22; UX-DR11 (AI states), UX-DR16 Flow 3; AD-23; BR-05; OPEN-09 path detail non-blocking

### Epic 5: Request a Catalog Booking
Authenticated Customers submit booking requests (7 calendar-day advance, Asia/Dhaka), review/confirm, land in `PENDING` with Window `NOT_OPEN`, cancel while pending, and view booking history/detail (statuses separate; Pay hidden).
**User outcome:** Ask to book a published package and track the request before Admin decision.
**FRs covered:** FR-BOOK-01 … FR-BOOK-14, FR-BOOK-13a, FR-BOOK-18 … FR-BOOK-20, FR-BOOK-22, FR-BOOK-24; FR-ADV-01, FR-ADV-03, FR-ADV-04, FR-ADV-06; FR-CUST-01, FR-CUST-02, FR-CUST-04, FR-CUST-06, FR-CUST-07, FR-CUST-08; FR-NOTIF-01, FR-NOTIF-04
**Also binds:** UX-DR6…9, UX-DR11, UX-DR16 Flows A climax / 1 (through PENDING) / 1b / 7; AD-7, AD-8, AD-9, AD-16 (create one `PaymentWindow` as `NOT_OPEN` at booking create), AD-17 events `booking.submitted`, `booking.cancelled`; AD-20; BR-02, BR-06, BR-06a, BR-07, BR-08, BR-16c (no pay yet), BR-20
**OPEN note:** OPEN-02 **unresolved** — validate positive integer (≥1) only; do not invent a maximum. Upper-bound validation blocked.

### Epic 6: Admin Booking Decisions & Payment Window Control
Admins list/filter/review bookings; approve (opens 24h payment window via PaymentService) or reject with mandatory reason; cannot approve if 7-day rule fails at approval time; reopen (deadline unchanged) and extend; audit recorded; Customers notified.
**User outcome:** Ops can decide bookings and manage payment-window access without Customer checkout UI yet (Customer sees APPROVED/UNPAID/OPEN and Pay affordance appears in Epic 7).
**FRs covered:** FR-BOOK-15 … FR-BOOK-17a, FR-BOOK-21, FR-BOOK-21a, FR-BOOK-23, FR-BOOK-25, FR-BOOK-26; FR-ADV-05; FR-AB-01 … FR-AB-09, FR-AB-05a, FR-AB-05b; FR-PAY-01, FR-PAY-01a … FR-PAY-01f, FR-PAY-09, FR-PAY-10; FR-NOTIF-02, FR-NOTIF-03; FR-ADM-04 (pending booking highlight — partial)
**Also binds:** UX-DR6…8, UX-DR16 Flows 2 / 5 matrix rows through OPEN; AD-7, AD-10, AD-16, AD-17, AD-18 (pending counts), AD-22; BR-09, BR-09a, BR-09b, BR-16c…BR-16g
**OPEN note:** OPEN-04 optional expiry notification — **non-MVP unless approved** (do not implement FR-NOTIF-03a by default).

### Epic 7: Mock Payment Checkout
Customers complete mock payment only when APPROVED + window OPEN; PaymentProvider mock; separate payment records; retry after FAILED/CANCELLED; countdown a11y; no real cards; Stripe-ready discriminator only.
**User outcome:** Pay (simulated) for an approved booking within the window.
**FRs covered:** FR-PAY-01g, FR-PAY-02 … FR-PAY-08, FR-PAY-10a … FR-PAY-10c, FR-PAY-11 … FR-PAY-13; FR-BOOK-25 (customer checkout path)
**Also binds:** NFR-15…19 (payment integrity); UX-DR6, UX-DR7, UX-DR12, UX-DR16 Flows 1 climax / 5; AD-6, AD-7, AD-8, AD-10, AD-16, AD-17 (`payment.*` events); BR-16, BR-16a, BR-16b, BR-16d, BR-16f, BR-16h

### Epic 8: Custom Tour Plans
Customers build/submit private custom tours (≥7 days); Admins approve/reject+reason/adjustments/reapply flag; Customers reapply when enabled; never auto-publish to catalog.
**User outcome:** Request a bespoke trip and iterate with Admin privately.
**FRs covered:** FR-CT-01 … FR-CT-30, FR-CT-04a, FR-CT-18a; FR-ACT-01 … FR-ACT-12; FR-ADV-02, FR-ADV-05; FR-CUST-03, FR-CUST-05, FR-CUST-09; FR-NOTIF-05 … FR-NOTIF-08
**Also binds:** UX-DR16 Flow 4; AD-7 custom statuses, AD-17, AD-20, AD-22; BR-10…BR-15

### Epic 9: Notification Center & Dashboards
Users manage in-app notification inbox (list, unread, mark-read-on-open, deep links). Customer home and Admin dashboard show aggregated operational stats via dashboard read-model (no dual FE aggregation).
**User outcome:** Stay informed and see actionable summaries across the portal.
**FRs covered:** FR-NOTIF-09 … FR-NOTIF-12, FR-NOTIF-11a; FR-ADM-02, FR-ADM-04; FR-CUST-01 (home polish)
**Also binds:** UX-DR10, UX-DR11, UX-DR16 Flow 6; AD-12, AD-17, AD-18; BR-17
**OPEN note:** OPEN-05 Admin notification event set — sparse; Customer catalog events already covered in Epics 5–8. Do not invent Admin-only notif types without approval.

---

# Epics and Stories (Detailed)

## Epic 1: Secure Access & Experience Shell

Customers and Admins can authenticate; Guests see the public shell. Delivers Compose baseline, design tokens, route groups, shared `apiClient` (session+CSRF), RBAC foundations, Admin seed, and notification/audit service skeletons so later epics emit events safely.

**Implementation sequence note:** Stories 1.1 → 1.6 must be done in order within this epic.


### Story 1.1: Local Compose Runtime Baseline

As a developer setting up Tour Portal,
I want a Docker Compose stack with frontend, backend, PostgreSQL, Nginx, and env-based secrets,
So that the team can run the MVP locally on a same-origin baseline.

**Description / Scope:**  
Stand up greenfield monorepo folders (`frontend/`, `backend/`, `deploy/`) with Compose services, Postgres volume, Nginx routing for `/`, `/api/*`, `/media/*`, `/django-admin/*`, healthchecks, and `BUSINESS_TIMEZONE=Asia/Dhaka`.

**In scope:** Compose files; Django project skeleton; Vite React app shell; Nginx conf; `.env.example` (no secrets committed); README run steps.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** AD-1, AD-5, AD-15; NFR-06; stack pins §9

**Dependencies:** None (first story).

**Test considerations:** Compose up healthy; backend migrates; Nginx does not SPA-fallback `/api/*`.

**Acceptance Criteria:**

**Given** the repository is checked out on a machine with Docker
**When** I run the documented Compose bring-up
**Then** frontend, backend, Postgres, and Nginx start successfully
**And** Postgres and backend healthchecks pass
**And** `BUSINESS_TIMEZONE` is set to `Asia/Dhaka`
**And** secrets are supplied via environment variables, not committed files

### Story 1.2: Design Tokens and Route-Group Shells

As a Guest or authenticated user,
I want a branded, accessible app shell with Public, Customer, and Admin layouts,
So that navigation and visual identity match the UX contract before features land.

**Description / Scope:**  
Implement DESIGN.md tokens (colors, typography, spacing, radii) and EXPERIENCE layouts: `PublicLayout`, `CustomerLayout`, `AdminLayout` (sidebar 240px lg+), skip link, landmarks, light-only theme, English externalized strings baseline.

**In scope:** Token CSS/theme; layout components; placeholder empty home routes; responsive breakpoints; reduced-motion respect for chrome.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** UX-DR1, UX-DR3, UX-DR4, UX-DR5, UX-DR13, UX-DR15, UX-DR17; AD-5, AD-13; NFR-11, NFR-14

**Dependencies:** Story 1.1

**Test considerations:** Visual token smoke; landmark/skip-link a11y check; Admin sidebar collapses to sheet/rail under lg.

**Acceptance Criteria:**

**Given** I open `/` as a Guest
**When** the page renders
**Then** Tour Portal brand is hero-capable on Landing chrome and tokens match DESIGN.md primary/accent/background
**And** a skip link and header/nav/main landmarks exist
**And** theme is light-only

**Given** I view Admin layout at `< lg`
**When** I open Admin navigation
**Then** lists are prepared for card/detail patterns (no reliance on horizontal-only tables)
**And** sidebar becomes sheet or icon rail per EXPERIENCE

### Story 1.3: User Model, Roles, and Admin Seed

As a Admin operator,
I want a seeded Admin account and Customer/Admin role model enforced on the server,
So that only authorized Admins exist and RBAC has a real data foundation.

**Description / Scope:**  
Create `accounts` User model (UUID, email unique, password hash, role CUSTOMER|ADMIN, is_staff/is_superuser). Seed Admin with `role=ADMIN` and `is_staff=True`. Reject illegal seed matrices. Stub `NotificationService` and `AuditService` interfaces (no domain events yet).

**In scope:** Migrations; seed command; permission helpers `IsCustomer`/`IsAdminRole` (role-based, not is_staff alone).

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-AUTH-05; AD-3, AD-4, AD-9, AD-19; NFR-01…04; BR-04

**Dependencies:** Story 1.1

**Test considerations:** Seed creates valid Admin; permission classes reject Customer on Admin API stubs; passwords never logged.

**Acceptance Criteria:**

**Given** the database is migrated and seed is run
**When** I inspect the seeded Admin
**Then** the user has `role=ADMIN` and `is_staff=True`
**And** password is stored hashed only

**Given** a Customer-authenticated request hits an Admin-only permission class
**When** authorization is evaluated
**Then** access is denied
**And** `is_staff` alone without `role=ADMIN` is insufficient for application Admin APIs

### Story 1.4: Customer Registration

As a Guest,
I want to Sign up with name, email, password, and confirm password,
So that I become a Customer without being able to self-assign Admin.

**Description / Scope:**  
Implement `POST /api/auth/register/` and Sign up UI with validation (email format, password min 8 + letter + number per FR-AUTH-15 assumption, confirm match, unique email). Always create `CUSTOMER`.

**In scope:** Register endpoint + serializer; Sign up page; field errors; no session until explicit login if product prefers — follow PRD: successful auth flows redirect to landing after authentication; registration may auto-login only if PRD implies — PRD FR-AUTH-09 is after Sign in; Sign up Flow A says Customer session → Landing. Implement session after successful Sign up per EXPERIENCE Flow A.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-AUTH-01…06, FR-AUTH-13…18; UX-DR16 Flow A; AD-2; BR-04, BR-18, BR-19; OPEN-07, OPEN-08 assumptions

**Dependencies:** Stories 1.2, 1.3

**Test considerations:** Unit/API: duplicate email, weak password, mismatch, Customer role forced; FE validation messages.

**Acceptance Criteria:**

**Given** I am on Sign up with valid unique data
**When** I submit the form
**Then** a Customer account is created and I receive an authenticated Customer session
**And** I am redirected to the landing page
**And** I could not set role to ADMIN

**Given** I attempt Sign up with a duplicate email or invalid password
**When** I submit
**Then** no account/session is created
**And** I remain on Sign up with a clear error
**And** password fields are cleared as specified

### Story 1.5: Sign In, Sign Out, Session Bootstrap, and Shared apiClient

As a Customer or Admin,
I want to sign in and out securely with CSRF-protected API calls,
So that my session is restored safely and all features share one HTTP client.

**Description / Scope:**  
Implement login/logout/me/csrf endpoints; shared `apiClient` with credentials, CSRF header, 401 session-expired handler; Sign in UI (shared for Customer+Admin); Sign out clears session.

**In scope:** AD-2 endpoints; AD-21 client; session cookie HttpOnly Secure(prod) SameSite=Lax; CSRF cookie readable.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-AUTH-07…12, FR-AUTH-19…20; AD-2, AD-21; NFR-05; UX-DR11 session expiry; BR-18

**Dependencies:** Stories 1.3, 1.4

**Test considerations:** API auth tests; CSRF required on unsafe methods; 401 triggers expiry UX; no tokens in localStorage.

**Acceptance Criteria:**

**Given** I have a valid Customer or Admin account
**When** I Sign in with correct credentials
**Then** I am redirected to landing and `/api/auth/me/` returns `role`, `is_staff`, `is_superuser`
**And** FE route guards use `role` only

**Given** I am signed in
**When** I Sign out
**Then** the session is invalidated and public nav is shown

**Given** my session has expired mid-use
**When** I attempt a protected mutation via apiClient
**Then** I see the session-ended modal and can Sign in again
**And** non-sensitive form drafts can be restored later (hook ready)

### Story 1.6: Role-Aware Navigation and Route Guards

As a Guest, Customer, or Admin,
I want navigation and route guards that match my role,
So that I only see affordances I’m allowed to use (security still server-side).

**Description / Scope:**  
Guest/Customer top nav sets; Admin uses `/app/admin/*` sidebar; FE guards redirect unauthorized; Customer cannot open Admin routes; Guest gated actions redirect to Sign in/up.

**In scope:** Router guards; nav config; permission-denied toast+redirect pattern.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-LP-08; FR-AUTH-10; UX-DR4, UX-DR5; AD-3, AD-5, AD-13; NFR-02

**Dependencies:** Story 1.5

**Test considerations:** Guard tests for Guest/Customer/Admin route matrices.

**Acceptance Criteria:**

**Given** I am a Guest
**When** I view primary nav
**Then** I see Explore, AI, Sign in, Sign up (and not Customer-only items)

**Given** I am a Customer and open `/app/admin/*`
**When** the guard runs
**Then** I am redirected to Customer home with a status toast
**And** Admin APIs still deny me if called directly

## Epic 2: Admin Tour Catalog & Availability

Admins manage packages, available dates (deactivate — never hard-delete when bookings reference them), media, publish/feature.


### Story 2.1: Admin Package Create, Edit, Draft, Publish

As a Admin,
I want to create and publish tour packages with full catalog fields,
So that Guests can later discover accurate package content.

**Description / Scope:**  
Package model + Admin APIs/UI for create/edit, draft, publish/unpublish. No seat fields. Currency: accept ISO code string; **OPEN-01** closed list not invented — document as product follow-up. Audit package create/update/publish_state_change.

**In scope:** packages app models/services/admin UI pages; validation for required PRD fields.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-PKG-01…06, FR-PKG-09…12; FR-ADM-01, FR-ADM-03; AD-4, AD-22; BR-03, BR-05, BR-20; OPEN-01

**Dependencies:** Epic 1 complete

**Test considerations:** API permission Admin-only; publish toggles public visibility flags; audit rows written atomically.

**Acceptance Criteria:**

**Given** I am an Admin on Packages → Create
**When** I save a valid draft then publish
**Then** the package is stored and marked published
**And** an audit record is written
**And** no capacity/seat fields exist

**Given** I unpublish a package that has historical bookings
**When** I confirm unpublish
**Then** new bookings are blocked for that package
**And** historical booking records remain accessible

### Story 2.2: Available Dates Management (Deactivate, Never Hard-Delete with Bookings)

As a Admin,
I want to add, edit, and deactivate available travel dates for a package,
So that Customers can only book Admin-defined calendar options without seat inventory.

**Description / Scope:**  
**OPEN-03 resolved by architecture:** If an `AvailableDate` is referenced by any booking FK, Admin may **deactivate** (`is_active=false` or equivalent) but **must not hard-delete** the row. Dates are calendar options only — no capacity counters. Bookable dates should respect being ≥7 days ahead when offered for new bookings (validator shared later in Epic 5; Admin UI should warn).

**In scope:** AvailableDate model; Admin date CRUD; deactivate endpoint; forbid delete when FK exists.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-PKG-07, FR-PKG-08; AD-8, AD-9, AD-20; BR-06, BR-20; OPEN-03

**Dependencies:** Story 2.1

**Test considerations:** Attempt delete with booking FK → rejected; deactivate succeeds; no seats columns.

**Acceptance Criteria:**

**Given** a package has an available date with no bookings
**When** I remove that date via Admin
**Then** the date is removed or deactivated per safe path and no longer offered

**Given** a package has an available date referenced by a booking
**When** I attempt to hard-delete that date
**Then** the system rejects hard-delete
**And** I can deactivate it so it is not offered for new bookings while history remains intact

**Given** I manage dates
**When** I inspect the data model/API
**Then** there are no seat/capacity/remaining/slots fields

### Story 2.3: Package Media Upload and Serving

As a Admin,
I want to upload cover and additional images stored locally and served at `/media/`,
So that catalog cards and detail pages show real imagery.

**Description / Scope:**  
Admin-only upload to `MEDIA_ROOT` volume; Nginx `/media/`; allow common image types (JPEG/PNG/WebP). Enforce a configured max upload size via settings/env — **do not treat “5 MB” as a finalized product requirement** (illustrative only until product sets the limit). No cloud object storage.

**In scope:** Upload API; media field on package; Compose volume; content-type validation; configurable size limit.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above. Final numeric max file size is a product config decision.

**Traceability:** FR-CAT-02/06 media needs; AD-5, AD-15, AD-24; UX-DR2 card/hero imagery

**Dependencies:** Story 2.1

**Test considerations:** Non-Admin upload 403; disallowed types fail; oversized relative to configured limit fails; published package returns media URLs.

**Acceptance Criteria:**

**Given** I am an Admin editing a package
**When** I upload a valid cover image within the configured size limit
**Then** the file is stored under media storage and reachable via `/media/...`

**Given** I am an Admin
**When** I upload a disallowed type or a file exceeding the configured max size
**Then** the upload is rejected with a clear validation error
**And** no media object is persisted

**Given** I am a Customer
**When** I attempt the upload API
**Then** access is denied

**Given** architecture mentions an example size (e.g. 5 MB)
**When** implementers configure the limit
**Then** they treat that figure as a non-binding example until product finalizes the numeric limit

### Story 2.4: Featured Flag and Admin Packages List UX

As a Admin,
I want to mark packages featured and manage them in a responsive Admin list,
So that Landing can show featured tours and I can operate on tablet without horizontal-only tables.

**Description / Scope:**  
Add featured toggle for published packages and an Admin packages list/detail experience that uses stacked cards on md/sm viewports.

**In scope:** Featured flag API/UI; Admin list filters; responsive card/detail pattern.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-PKG-05; UX-DR5, UX-DR16 Flow 8

**Dependencies:** Stories 2.1–2.3

**Test considerations:** Featured only applies to published packages for public use.

**Acceptance Criteria:**

**Given** I have a published package
**When** I mark it featured
**Then** featured status persists and is available to Landing queries

**Given** I use Admin packages on a narrow viewport
**When** I browse the list
**Then** I get stacked cards / detail drill-in rather than horizontal-only tables

## Epic 3: Discover Tours (Landing, Catalog, Search)


### Story 3.1: Public Catalog Listing

As a Guest,
I want to browse published tour package cards,
So that I can explore what Tour Portal offers.

**Description / Scope:**  
Public list API (published only) + Explore UI with `card-package`, empty state, price `{amount} {CODE}`.

**In scope:** Catalog list endpoint; Explore page; empty state; pagination default.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-CAT-01…05; UX-DR2, UX-DR14; AD-11, AD-24; BR-01, BR-05

**Dependencies:** Epic 2 (published packages exist; seed OK for empty states)

**Test considerations:** Unpublished never listed; empty state CTA present.

**Acceptance Criteria:**

**Given** published packages exist
**When** I open Explore
**Then** I see cards with title, cover, short description, destination, duration, starting price, currency

**Given** no published packages exist
**When** I open Explore
**Then** I see an empty state with one clear CTA

**Given** draft/unpublished packages exist
**When** I call the public catalog API
**Then** they are excluded

### Story 3.2: Package Detail Page

As a Guest or Customer,
I want to view full package details and see Book Now when bookable,
So that I can decide whether to book.

**Description / Scope:**  
Detail API/UI for PRD fields; Book Now accent CTA visible only if published/bookable; unavailable explanation otherwise. Booking submit is Epic 5 — CTA may link/gate.

**In scope:** Package detail endpoint/page; Book Now visibility rules.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-CAT-06…10; UX-DR2 book-now; BR-05

**Dependencies:** Story 3.1

**Test considerations:** Unpublished detail not publicly bookable; images render with aspect ratios.

**Acceptance Criteria:**

**Given** a published bookable package exists
**When** I open its detail page
**Then** I see the required information sections and a Book Now action

**Given** a package is not bookable
**When** I open detail
**Then** Book Now is hidden and an explanation is shown

### Story 3.3: Landing Hero and Featured Packages

As a Guest,
I want a public landing page with hero and featured packages,
So that I understand the product and can jump into discovery.

**Description / Scope:**  
Landing `/` public; hero-banner; featured published only; nav per auth state; empty featured state.

**In scope:** Landing route; featured query; hero component.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-LP-01…08; UX-DR2, UX-DR4; BR-01

**Dependencies:** Stories 2.4, 3.1

**Test considerations:** Unpublished never in featured.

**Acceptance Criteria:**

**Given** I open `/` without auth
**When** the landing loads
**Then** I see hero branding and navigation to Explore, AI, Sign in/up
**And** featured packages are published only

### Story 3.4: Server-Side Search and Filters

As a Guest or Customer,
I want to search and filter published packages,
So that I can narrow the catalog without leaving Explore.

**Description / Scope:**  
Server-side free-text + destination/price/duration filters; combine/clear; empty no-match; unpublished excluded. ORM filters (no search microservice).

**In scope:** Search/filter query params on packages list; Explore controls UI.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-SEARCH-01…08; AD-24; NFR-09

**Dependencies:** Story 3.1

**Test considerations:** API tests for filter combos and unpublished exclusion.

**Acceptance Criteria:**

**Given** published packages exist with distinct destinations/prices
**When** I apply free-text and filters
**Then** results match all active criteria and exclude unpublished

**Given** no packages match
**When** I search
**Then** I see an informative empty state and can clear filters

## Epic 4: AI Tour Recommendations


### Story 4.1: Recommendation Service and API

As a system / Customer or Guest,
I want recommendations grounded only on published packages,
So that AI cannot invent inventory or break the catalog when it fails.

**Description / Scope:**  
`recommendations` app + `RecommendationService` with provider interface (local `mock`/heuristic OK). Endpoint under `/api/recommendations/` (exact path OPEN-09 non-blocking). Max 5; published only; failures return controlled error/empty without affecting other APIs.

**In scope:** FR-AI-03…05, FR-AI-10; NFR-20…22; AD-23; BR-05; OPEN-09

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-AI-03…05, FR-AI-10; NFR-20…22; AD-23; BR-05

**Dependencies:** Epic 3 (packages readable)

**Test considerations:** Force provider failure → catalog still 200; never returns unpublished.

**Acceptance Criteria:**

**Given** published packages exist
**When** I submit a preference prompt to the recommendations API
**Then** I receive at most 5 results referencing real published packages only

**Given** the AI provider fails
**When** I call recommendations
**Then** I get a controlled failure/empty response
**And** catalog and search endpoints still succeed

### Story 4.2: AI Recommendations UI

As a Guest or Customer,
I want to enter a free-text prompt and browse distinct recommendation cards,
So that I can discover tours conversationally and continue to detail/booking gates.

**Description / Scope:**  
Prompt UI; loading live region; why-match; visually distinct from search; fallback; select → detail. Book Now auth return preserved for Epic 5.

**In scope:** FR-AI-01, FR-AI-02, FR-AI-06…09; UX-DR11, UX-DR16 Flow 3; NFR-10

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-AI-01,02,06…09; UX-DR11, UX-DR16 Flow 3; NFR-10

**Dependencies:** Story 4.1

**Test considerations:** UI isolation: kill API → Explore still works.

**Acceptance Criteria:**

**Given** I am on AI recommendations
**When** I submit a prompt and results exist
**Then** I see ≤5 distinct recommendation cards with cover/title/why and can open detail

**Given** no matches or AI fails
**When** I submit a prompt
**Then** I see fallback messaging and can still use Explore/search

## Epic 5: Request a Catalog Booking

**OPEN-02 unresolved:** Do **not** invent a maximum travelers value. Validate **positive integer (≥1)** only. Upper-bound validation remains **blocked / unimplemented** until product decides a max or explicitly approves “no maximum.”


### Story 5.1: Booking Create API with 7-Day Rule (Asia/Dhaka)

As a Customer,
I want to submit a booking request for a published package date at least 7 calendar days ahead,
So that my request is stored as PENDING awaiting Admin review.

**Description / Scope:**  
Booking model + `BookingService.create` inside `transaction.atomic`: status `PENDING`; call `PaymentService` to create **exactly one** `PaymentWindow` with status `NOT_OPEN` (AD-9 / AD-16 — never a second row later). Payment remains `UNPAID` / checkout unavailable. Shared 7-day validator with `BUSINESS_TIMEZONE=Asia/Dhaka`. Concurrent bookings on the same date allowed. Travelers: positive integer (≥1); **OPEN-02 unresolved** — no invented maximum. Emit `booking.submitted` to the submitting Customer via `NotificationService` only (AD-17), same transaction, idempotent on retry.

**In scope:** Create booking API; one `PaymentWindow` `NOT_OPEN`; 7-day validator; NotificationService `booking.submitted`; no checkout.

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above. Traveler upper-bound validation until OPEN-02 is decided. Opening the payment window (Epic 6).

**Traceability:** FR-BOOK-01,04,04a,05,08,09,11,12,14; FR-ADV-01,03,04,06; FR-NOTIF-01; AD-7,8,9,16,17,20; BR-02,06,06a,07,16c,20; OPEN-02 unresolved

**Dependencies:** Epics 1–3

**Test considerations:** Backend rejects <7-day dates; Guest 401/403; unpublished package rejected; unique `booking_id` on PaymentWindow; NotificationService idempotent create on retry.

**Acceptance Criteria:**

**Given** I am an authenticated Customer with a published package and a valid available date ≥7 calendar days ahead (Asia/Dhaka)
**When** I submit a valid booking payload
**Then** a booking is created with status `PENDING` and a reference
**And** exactly one `PaymentWindow` exists for that booking with status `NOT_OPEN`
**And** payment is `UNPAID` (or no successful attempt) and mock checkout is unavailable
**And** a `booking.submitted` notification is created for me via NotificationService only, in the same transaction as the booking

**Given** the same successful booking create is retried with the same idempotency identity
**When** NotificationService records `booking.submitted`
**Then** a duplicate notification is not created for the same `(event_key, entity_type, entity_id, recipient_id)`

**Given** the selected date is within the next 7 calendar days in Asia/Dhaka
**When** I submit
**Then** the backend rejects the booking
**And** no booking row and no PaymentWindow row are created
**And** no `booking.submitted` notification is created

**Given** OPEN-02 is unresolved
**When** I submit travelers=0 versus travelers=1
**Then** 0 is rejected and 1 is accepted as a positive integer
**And** no maximum travelers upper bound is invented or enforced

### Story 5.2: Booking Form, Review, and Auth Return

As a Customer (or Guest gated),
I want to complete a booking form with review before submit,
So that I can request a tour without paying yet.

**Description / Scope:**  
Book Now gate: Guest → Sign in/up → return to booking. Form fields per FR-BOOK-06 (package auto-populated; preferred travel date; number of travelers; customer name; contact email; contact number; optional additional requirements); date picker disables next 7 days; **frontend and backend** validation for required fields; review step before final submit; session draft restore hook for non-sensitive fields.

**In scope:** Booking form UI; review step; auth return; FE+BE required-field and date validation (FR-BOOK-02,03,06,07,09,10; FR-ADV-03,04; UX-DR8,9,11,16).

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above. OPEN-02 traveler maximum.

**Traceability:** FR-BOOK-02,03,06,07,09,10; UX-DR8,9,11,16; FR-ADV-03,04

**Dependencies:** Story 5.1

**Test considerations:** E2E Guest Book Now → auth → form; date disabled states explained; required-field FE blocks submit; BE rejects incomplete payloads even if FE bypassed.

**Acceptance Criteria:**

**Given** I am a Guest on a bookable detail page
**When** I click Book Now and complete Sign in
**Then** I return to the booking form for that package

**Given** I am filling the booking form
**When** I open the date picker
**Then** dates within the next 7 calendar days (Asia/Dhaka) are not selectable and a preparation helper is shown

**Given** I omit a required field (preferred travel date, travelers, name, contact email, or contact number)
**When** I attempt to continue or submit from the frontend
**Then** submission is blocked with field-level validation messages
**And** no booking is created

**Given** a client bypasses frontend validation and posts an incomplete booking payload
**When** the backend receives the request
**Then** the API rejects it with DRF validation errors
**And** no booking row is created

**Given** all required fields are valid and I am on the review step
**When** I confirm submit
**Then** the booking create API is called and I proceed to confirmation (Story 5.3)

**Given** my session expires while drafting a booking
**When** I sign in again
**Then** non-sensitive draft fields can be restored (passwords never restored)

### Story 5.3: Booking Confirmation, History, Detail, and Cancel Pending

As a Customer,
I want to see confirmation/history and cancel only while PENDING,
So that I can track and withdraw requests before Admin acts.

**Description / Scope:**  
Confirmation page; history/detail with booking status; Window shown as NOT_OPEN / Pay hidden; cancel confirm dialog; ownership enforced. Notification on cancel via NotificationService (`booking.cancelled`).

**In scope:** FR-BOOK-13,13a,18…20,22,24; FR-CUST-01,02,04,06…08; FR-NOTIF-04; UX-DR6,8,16 Flow 1b; BR-08

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-BOOK-13,13a,18-20,22,24; FR-CUST-*; FR-NOTIF-04; UX-DR6,8; BR-08

**Dependencies:** Stories 5.1–5.2

**Test considerations:** Cannot cancel APPROVED; cannot view another Customer’s booking; Pay hidden.

**Acceptance Criteria:**

**Given** I just submitted a booking
**When** I view confirmation and history detail
**Then** I see reference and Booking `PENDING`
**And** Pay now is hidden and payment checkout is inaccessible

**Given** my booking is PENDING
**When** I confirm cancel
**Then** status becomes `CANCELLED` and I receive a cancellation notification
**And** I cannot cancel again

## Epic 6: Admin Booking Decisions & Payment Window Control


### Story 6.1: Admin Bookings List, Filter, and Detail

As a Admin,
I want to review all booking requests with payment and window fields visible,
So that I can triage pending work.

**Description / Scope:**  
Admin list/filter by status; detail shows customer, package, date, travelers, requirements, statuses (booking/payment/window separate when applicable).

**In scope:** FR-AB-01…03, FR-AB-09; FR-PAY-09; FR-ADM-04 partial; UX-DR5,6

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-AB-01…03,09; FR-PAY-09; UX-DR5,6

**Dependencies:** Epic 5

**Test considerations:** Customer cannot access Admin booking APIs.

**Acceptance Criteria:**

**Given** PENDING and APPROVED bookings exist
**When** I filter Admin bookings by PENDING
**Then** only pending rows show and I can open detail with required fields

### Story 6.2: Approve Booking and Open Payment Window

As a Admin,
I want to approve a PENDING booking and open a 24-hour payment window,
So that the Customer becomes eligible to pay after approval.

**Description / Scope:**  
`BookingService.approve` inside `transaction.atomic` calls `PaymentService.open_window_for_booking` to **update the existing** `PaymentWindow` (created at booking submit as `NOT_OPEN`) — **no direct PaymentWindow ORM from bookings**, and **no second window row**. Set status `OPEN`, `deadline_at = approval_timestamp + 24 hours`. Payment remains `UNPAID` until checkout (Epic 7). Audit `booking.approve`. Notification `booking.approved` to Customer. Block approve if 7-day rule fails at approval time.

**In scope:** FR-BOOK-15,16,21,21a,25,26; FR-ADV-05; FR-AB-04,06,07; FR-PAY-01,01a,01b; FR-NOTIF-02; AD-9,10,16,17,20,22; BR-09,09a,16c,16d

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above. Creating a new PaymentWindow on approve.

**Traceability:** FR-BOOK-15,16,21,21a,25,26; FR-PAY-01*; FR-NOTIF-02; AD-9,16,22; BR-09*

**Dependencies:** Story 6.1 (requires Story 5.1 window already present)

**Test considerations:** Critical tests: approve updates existing window; row count stays 1; dual window prevented; 7-day block leaves `NOT_OPEN`; Customer notified.

**Acceptance Criteria:**

**Given** a booking is PENDING with a still-valid start date (≥7 days Asia/Dhaka) and exactly one `PaymentWindow` in `NOT_OPEN`
**When** I confirm approve
**Then** booking becomes `APPROVED`, payment remains `UNPAID`, and that same PaymentWindow becomes `OPEN` with `deadline_at = approval_timestamp + 24 hours`
**And** the PaymentWindow row count for the booking remains exactly one (no insert on approve)
**And** audit and Customer `booking.approved` notification are written in the same transaction

**Given** the start date violates the 7-day rule at approval time
**When** I attempt approve
**Then** approval is rejected
**And** the existing PaymentWindow remains `NOT_OPEN` with no approval deadline applied
**And** checkout remains unavailable

### Story 6.3: Reject Booking with Mandatory Reason

As a Admin,
I want to reject a PENDING booking with a reason shown to the Customer,
So that the Customer understands why and cannot pay.

**Description / Scope:**  
Reject alertdialog requires reason; persist; notify `booking.rejected` with reason; audit; existing PaymentWindow stays `NOT_OPEN` (never opened for payment).

**In scope:** FR-BOOK-17,17a,21,23; FR-AB-05,05a,06…08; FR-NOTIF-03; BR-09b; UX-DR8

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-BOOK-17,17a; FR-AB-05*; FR-NOTIF-03; BR-09b; UX-DR8

**Dependencies:** Story 6.1

**Test considerations:** Empty reason rejected; Customer detail shows reason; Pay inaccessible.

**Acceptance Criteria:**

**Given** a booking is PENDING
**When** I reject without a reason
**Then** the action is blocked

**Given** a booking is PENDING
**When** I reject with a reason
**Then** status is `REJECTED`, reason is visible to the Customer, notification includes reason, and checkout remains unavailable

### Story 6.4: Reopen and Extend Payment Window

As a Admin,
I want to reopen access without changing deadline and to extend deadline explicitly,
So that I can restore checkout eligibility correctly after expiry.

**Description / Scope:**  
Reopen on `EXPIRED` restores Admin-managed access to the **same** PaymentWindow row and **preserves** the original `deadline_at` (never grants a new 24 hours). After reopen-only when that deadline is already past: window may be marked operable/`OPEN` for ops visibility, but **payment eligibility remains false** because eligibility requires `deadline_at` in the future — Pay now stays hidden and payment APIs reject until Admin **extends** to a future `deadline_at`. Extend is audited; optional extension history may supplement but not replace audit (FR-PAY-01e/01f, BR-16e).

**In scope:** FR-PAY-01c…01f; FR-AB-05b; AD-10,16,22; UX-DR8 reopen/extend; BR-16e; OPEN-04 omit expiry notif

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-PAY-01c-f; FR-AB-05b; AD-10,16,22; BR-16e

**Dependencies:** Story 6.2

**Test considerations:** Matrix tests from EXPERIENCE Flow 5 reopen/extend rows; assert eligibility uses deadline comparison, not status alone, after reopen-only with past deadline.

**Acceptance Criteria:**

**Given** an APPROVED booking has exactly one PaymentWindow with status `EXPIRED` and `deadline_at` in the past
**When** I reopen only
**Then** `deadline_at` is unchanged (not reset to now+24h)
**And** payment eligibility remains false while `deadline_at` is still in the past
**And** Pay now is hidden and the payment attempt API rejects checkout
**And** payment remains unavailable until I explicitly extend to a future `deadline_at`

**Given** I have reopened and the window is no longer `EXPIRED` but `deadline_at` is still in the past
**When** the Customer calls the payment attempt API without an extend
**Then** the attempt is rejected as ineligible (past deadline)
**And** no SUCCESS payment record is created

**Given** I extend `deadline_at` to a future time on that same PaymentWindow
**When** I confirm extend
**Then** `deadline_at` updates, audit is recorded, and window is eligible/`OPEN` as applicable
**And** the Customer can pay while current time is before the new deadline

## Epic 7: Mock Payment Checkout


### Story 7.1: PaymentProvider Mock and Payment Attempt API

As a Customer,
I want to create mock payment attempts against an open payment window,
So that payment state is recorded separately from booking status.

**Description / Scope:**  
`PaymentProvider` + `MockPaymentProvider`; payment records with provider `MOCK`; eligibility checks APPROVED + window eligible (OPEN and `deadline_at` in the future); **one successful payment per booking** enforced at the **persistence/transaction** layer (e.g. `transaction.atomic` + row locking / unique constraint on successful payment per booking — not only application-level checks). Repeated and concurrent SUCCESS requests cannot create multiple SUCCESS outcomes. No real card fields. Notifications `payment.success` / `payment.failed` via NotificationService.

**In scope:** FR-PAY-02…06,08,11…13,10a,10b; AD-6,8,14,16,17; BR-16,16a,16b,16h; NFR-16…19

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-PAY-02-06,08,11-13; AD-6,8,14,16,17; BR-16*; NFR-16…19

**Dependencies:** Epic 6

**Test considerations:** AD-14 critical scenarios 3,4,5,8,9,10 — include concurrent SUCCESS under DB transaction isolation; assert constraint/lock behavior.

**Acceptance Criteria:**

**Given** my booking is APPROVED with an eligible OPEN window (future deadline) and no SUCCESS payment yet
**When** I submit a mock SUCCESS attempt inside a DB transaction
**Then** a payment record is SUCCESS linked to the booking
**And** booking remains APPROVED

**Given** a SUCCESS payment already exists for the booking
**When** I repeat the same or a new SUCCESS mock payment request
**Then** the persistence layer prevents a second SUCCESS outcome (idempotent reject or unique/lock failure handled cleanly)
**And** the booking still has exactly one successful payment result

**Given** two concurrent SUCCESS mock payment requests for the same eligible booking
**When** both are processed under transactional locking / uniqueness guarantees
**Then** at most one SUCCESS payment outcome is committed
**And** the other request is rejected or resolved idempotently without a second SUCCESS row

**Given** my booking is PENDING, REJECTED, CANCELLED, or payment-ineligible (window `NOT_OPEN` / `EXPIRED` / past `deadline_at`)
**When** I attempt payment
**Then** the API rejects the attempt
**And** no SUCCESS payment record is created

### Story 7.2: Pay Now Gating and Mock Checkout UI

As a Customer,
I want to use Pay now only when eligible and simulate payment outcomes,
So that I can complete mock checkout without real charges.

**Description / Scope:**  
Pay now visible iff APPROVED ∧ OPEN ∧ payment ≠ SUCCESS; full-page mock checkout with legend; simulate SUCCESS/FAILED/CANCELLED; separate chips on detail.

**In scope:** FR-PAY-05,07,10c; UX-DR6,7,16; BR-16f

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-PAY-05,07,10c; UX-DR6,7; BR-16f

**Dependencies:** Story 7.1

**Test considerations:** UI gating unit tests; no card inputs.

**Acceptance Criteria:**

**Given** booking APPROVED, window OPEN, payment UNPAID
**When** I view booking detail
**Then** Pay now is shown and checkout states mock-only

**Given** payment is already SUCCESS
**When** I view booking detail
**Then** Pay now is hidden

### Story 7.3: Retry, Countdown Accessibility, and Offline Pay Guard

As a Customer,
I want to retry after FAILED/CANCELLED while OPEN and understand remaining time accessibly,
So that I won’t miss the deadline or get stuck after a failed simulation.

**Description / Scope:**  
Retry while OPEN; countdown `aria-live` polite; offline blocks Pay; EXPIRED announce once.

**In scope:** FR-PAY-01g,07; UX-DR11,12; NFR-13

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-PAY-01g; UX-DR11,12

**Dependencies:** Story 7.2

**Test considerations:** a11y checks on live region; retry API allowed only while OPEN.

**Acceptance Criteria:**

**Given** my last attempt is FAILED and window still OPEN
**When** I Pay again and simulate SUCCESS
**Then** payment becomes SUCCESS and Pay hides

**Given** window is OPEN with a future deadline
**When** I view the countdown
**Then** an accessible live region announces remaining time on mount and updates approximately every minute

## Epic 8: Custom Tour Plans


### Story 8.1: Custom Tour Submit (Private, 7-Day Rule)

As a Customer,
I want to submit a custom tour plan that stays private,
So that Admin can review my bespoke request without publishing it.

**Description / Scope:**  
Custom tour model/form; validations; start ≥7 days Asia/Dhaka; status PENDING; emit `custom_tour.submitted` to the submitting Customer via `NotificationService` only (AD-17), inside the same `transaction.atomic` as the successful create, with idempotency key preventing duplicates on retry; travelers positive integer (≥1); **OPEN-02 unresolved** — no invented maximum; Guest gated to auth.

**In scope:** FR-CT-01…10,04a; FR-ADV-02,03,04; FR-NOTIF-05; BR-02,10,14; AD-7,17,20

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above. OPEN-02 traveler maximum. Admin notification events.

**Traceability:** FR-CT-01-10,04a; FR-NOTIF-05; AD-17,20

**Dependencies:** Epic 1; Epic 5 validator reuse

**Test considerations:** Privacy: other Customers 404/403; never appears in public catalog APIs; notification idempotency on retry; failed submit creates neither record nor notification.

**Acceptance Criteria:**

**Given** I am a Customer with a valid custom tour form (≥7 days)
**When** I submit successfully
**Then** record is PENDING and private to me
**And** a `custom_tour.submitted` notification is created for me via NotificationService only, in the same transaction as the submission

**Given** the same successful custom-tour create is retried with the same idempotency identity
**When** NotificationService records `custom_tour.submitted`
**Then** a duplicate notification is not created for the same `(event_key, entity_type, entity_id, recipient_id)`

**Given** start date is within 7 days
**When** I submit
**Then** backend rejects the request
**And** no custom tour row and no `custom_tour.submitted` notification are created

### Story 8.2: Customer Custom Tour History and Detail

As a Customer,
I want to view my custom tour submissions and details,
So that I can track status and rejection guidance.

**Description / Scope:**  
History/detail; ownership; show rejection reason/adjustments when present.

**In scope:** FR-CT-11…13,26; FR-CUST-03,05,06,07

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-CT-11-13,26; FR-CUST-03,05-07

**Dependencies:** Story 8.1

**Test considerations:** Cross-customer access denied.

**Acceptance Criteria:**

**Given** I have custom tours in multiple statuses
**When** I open history and a detail
**Then** I only see my records with correct status fields

### Story 8.3: Admin Custom Tour Review (Approve/Reject/Reapply Flag)

As a Admin,
I want to approve or reject custom tours with reason, adjustments, and reapply control,
So that Customers get a clear private decision path.

**Description / Scope:**  
Admin list/filter/detail; approve (no catalog publish); reject reason required; adjustments optional; enable/disable reapply; **7-day advance validation at approval time** (Asia/Dhaka); audit; notifications approved/rejected/reapply-enabled. Disabled reapply must block Customer resubmit (UI + API).

**In scope:** FR-CT-14…23,30; FR-CT-18a; FR-ACT-01…12; FR-ADV-05; FR-NOTIF-06,07; AD-20,22; BR-11…15

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-CT-14-23,30,18a; FR-ACT-*; FR-ADV-05; FR-NOTIF-06,07; AD-20,22; BR-11-15

**Dependencies:** Stories 8.1–8.2

**Test considerations:** Approve does not create TourPackage; privacy preserved; approve blocked when start date <7 days at approval time; reapply disabled blocks POST.

**Acceptance Criteria:**

**Given** a custom tour is PENDING and its start date still satisfies the 7 calendar-day rule (Asia/Dhaka)
**When** I approve it
**Then** status is APPROVED, it remains private, and it is not in the public catalog

**Given** a custom tour is PENDING but its start date violates the 7-day rule at approval time
**When** I attempt to approve
**Then** approval is rejected
**And** status remains PENDING
**And** no catalog publication occurs

**Given** a custom tour is PENDING
**When** I reject with reason, adjustments, and reapply enabled
**Then** Customer can see reason/adjustments and is notified
**And** audit is recorded
**And** reapply is permitted for that submission

**Given** a custom tour is REJECTED with reapply disabled
**When** the Customer attempts to resubmit (UI or API)
**Then** the resubmit CTA is hidden/disabled with an explanation that Admin must enable reapply
**And** the API rejects resubmit
**And** status does not return to PENDING

### Story 8.4: Customer Reapply Flow

As a Customer,
I want to edit and resubmit when Admin enabled reapply,
So that I can start a new PENDING review cycle without losing history.

**Description / Scope:**  
Reapply only if enabled; resubmit → PENDING; retain prior reviews; notify resubmit; hide edit CTA if disabled with explanation.

**In scope:** FR-CT-24…29; FR-CUST-09; FR-NOTIF-08; UX-DR16 Flow 4; BR-12,13

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-CT-24-29; FR-CUST-09; FR-NOTIF-08; BR-12,13

**Dependencies:** Story 8.3

**Test considerations:** Disabled reapply cannot POST resubmit.

**Acceptance Criteria:**

**Given** my custom tour is REJECTED with reapply enabled
**When** I edit and resubmit
**Then** status returns to PENDING, prior rejection history remains, and I get a resubmit notification

**Given** reapply is disabled
**When** I view detail
**Then** resubmit CTA is hidden/disabled with explanation and API rejects resubmit

## Epic 9: Notification Center & Dashboards

Event **creation** for booking/payment/custom-tour already implemented in Epics 5–8. This epic delivers inbox UX + dashboard read-models.


### Story 9.1: Notification Center Inbox

As a Customer (and Admin if sparse alerts exist),
I want to list notifications, see unread state, mark read on open, and deep-link,
So that I stay informed without email/SMS.

**Description / Scope:**  
Bell + list UI; unread badge (9+); mark read on open; deep links; empty caught-up; recipient isolation. No new event types beyond existing catalog (OPEN-05: do not invent Admin events).

**In scope:** FR-NOTIF-09…12,11a; UX-DR10,16 Flow 6; AD-12,17; BR — in-app only

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-NOTIF-09-12,11a; UX-DR10; AD-12,17

**Dependencies:** Epics 5–8 (events exist)

**Test considerations:** Recipient cannot read others’ notifications; mark-read persistence.

**Acceptance Criteria:**

**Given** I have unread notifications
**When** I open the bell and a notification item
**Then** unread count updates, the item is marked read, and I navigate to the linked record

**Given** I have no notifications
**When** I open the inbox
**Then** I see the caught-up empty state

### Story 9.2: Customer Home Dashboard Aggregates

As a Customer,
I want a home dashboard with pending bookings, open payment windows, and unread notifications,
So that I know what needs attention.

**Description / Scope:**  
`dashboard` Customer endpoint via domain query methods (AD-18 predicates); FE consumes dashboard API only for KPI tiles.

**In scope:** FR-CUST-01; FR-ADM-N/A; AD-18; UX customer home

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-CUST-01; AD-18

**Dependencies:** Story 9.1; Epics 5–7 data

**Test considerations:** Counts match predicates; no FE re-aggregation of list endpoints for same tiles.

**Acceptance Criteria:**

**Given** I have a PENDING booking, an OPEN window, and unread notifications
**When** I open Customer home
**Then** dashboard tiles reflect those counts from `/api/dashboard/customer/` (or equivalent)
**And** tiles are not recomputed by stitching unrelated list APIs

### Story 9.3: Admin Operational Dashboard

As a Admin,
I want to see operational statistics and pending highlights,
So that I can prioritize reviews.

**Description / Scope:**  
Admin dashboard via `DashboardQueryService` (AD-18) must display **all** FR-ADM-02 metrics, highlight pending items needing review (FR-ADM-04), and provide navigation to package / booking / custom-tour management (FR-ADM-03 already from Epic 2 nav).

**Required Admin dashboard metrics (explicit list):**
1. Total tour packages  
2. Published packages  
3. Draft/unpublished packages  
4. Pending booking requests  
5. Approved booking requests  
6. Rejected booking requests  
7. Pending custom tour submissions  
8. Approved custom tour submissions  
9. Rejected custom tour submissions  

**In scope:** FR-ADM-02, FR-ADM-04; AD-18; UX-DR5

**Out of scope:** Deferred MVP exclusions (seats, Stripe, JWT, quotations, email/SMS, object storage, microservices) unless explicitly named above.

**Traceability:** FR-ADM-02,04; AD-18

**Dependencies:** Epics 2,6,8

**Test considerations:** Customer denied; each metric uses exact status/publication predicates; FE consumes dashboard API only for these KPI tiles.

**Acceptance Criteria:**

**Given** packages, bookings, and custom tours exist across the statuses above
**When** I open Admin home as an Admin
**Then** the dashboard displays all nine required metrics listed in this story
**And** pending booking and pending custom-tour items are highlighted for review
**And** I can navigate to package, booking, and custom-tour management areas

**Given** I am a Customer
**When** I call the Admin dashboard API
**Then** access is denied

---

## Story Delivery Summary

| Epic | Stories | Count |
|---|---|---|
| 1 Secure Access & Experience Shell | 1.1–1.6 | 6 |
| 2 Admin Tour Catalog & Availability | 2.1–2.4 | 4 |
| 3 Discover Tours | 3.1–3.4 | 4 |
| 4 AI Tour Recommendations | 4.1–4.2 | 2 |
| 5 Request a Catalog Booking | 5.1–5.3 | 3 |
| 6 Admin Booking Decisions & Payment Window | 6.1–6.4 | 4 |
| 7 Mock Payment Checkout | 7.1–7.3 | 3 |
| 8 Custom Tour Plans | 8.1–8.4 | 4 |
| 9 Notification Center & Dashboards | 9.1–9.3 | 3 |
| **Total** | | **33** |

### Open items (non-story-structure)

| ID | Status | Guidance |
|---|---|---|
| **OPEN-02** | **Unresolved** | Positive integer (≥1) only; **do not invent or enforce a maximum**; upper-bound validation blocked |
| **OPEN-01** | Soft open | ISO free-text OK until closed currency list provided |
| **OPEN-04** | Deferred | Window-expiry notification omitted unless approved |
| **OPEN-05** | Open | Do not invent Admin notification events |

### Resolved product / architecture decisions

| ID | Resolution |
|---|---|
| **OPEN-03** | Available dates with booking FKs are **deactivated, never hard-deleted** (Story 2.2) |
| **AD-17** | **Approved:** `booking.submitted` + `custom_tour.submitted` (Customer recipients; NotificationService exclusive writer) |
| **AD-9 / AD-16 window lifecycle** | Create one `PaymentWindow` as `NOT_OPEN` at booking create; open/update same row on approve (Stories 5.1, 6.2) |
| **BUSINESS_TIMEZONE** | `Asia/Dhaka` (Stories 1.1, 5.x, 6.2, 8.x) |

### Explicit MVP exclusions (no stories)

Seat/capacity · Stripe charging · JWT · quotations · email/SMS · object storage · microservices · password reset/email verification · AI auto-publish packages · FR-NOTIF-03a unless OPEN-04 approved

### Traceability notes

- All mapped FRs from the coverage map are addressed by at least one story except **FR-NOTIF-03a** (deferred).
- UX-DR1–17 covered across Epics 1–9 (design system in 1; flows in feature epics; inbox in 9).
- Notification **creation** in Epics 5–8; inbox/dashboards in Epic 9.
- AD-17 **approved** to include `booking.submitted` / `custom_tour.submitted` (Customer recipients; Stories 5.1, 8.1; exclusive NotificationService writer).
- PaymentWindow: create `NOT_OPEN` at booking create; approve updates same row to `OPEN` + deadline (Stories 5.1, 6.2; AD-9/AD-16).

### Final validation (2026-11-16)

| Check | Result |
|---|---|
| FR coverage | **208/209** mapped; `FR-NOTIF-03a` deferred (OPEN-04) |
| UX-DR1…17 | Covered across Epics 1–9 |
| Story count / IDs | **33** stories; IDs 1.1–9.3 stable |
| Starter / runtime | Compose baseline in Story 1.1 (no separate starter-template product; AD-15) |
| DB/entities | Created when first needed per story (not all upfront) |
| Forward dependencies | None within epics (N builds only on prior N stories) |
| Epic independence | Epic N does not require Epic N+1 to function |
| Architecture alignment | Session auth, PaymentWindow lifecycle, AD-17 catalog, no seats/Stripe/JWT/quotations |
| OPEN-02 | Unresolved; ≥1 only; no invented max |

