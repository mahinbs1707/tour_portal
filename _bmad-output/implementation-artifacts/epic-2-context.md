# Epic 2 Context: Admin Tour Catalog & Availability

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Enable Admins to stock the tour catalog Guests will browse: create and edit packages with full catalog fields, draft/publish/unpublish, mark featured, manage available travel dates (calendar options only—no seat capacity), and upload cover/additional images to local `/media/`. This epic is the inventory foundation for Discover Tours, AI recommendations, and booking.

## Stories

- Story 2.1: Admin Package Create, Edit, Draft, Publish
- Story 2.2: Available Dates Management (Deactivate, Never Hard-Delete with Bookings)
- Story 2.3: Package Media Upload and Serving
- Story 2.4: Featured Flag and Admin Packages List UX

## Requirements & Constraints

- Only authorized Admins may manage catalog packages; Guests/Customers cannot mutate catalog APIs. Admin chrome must navigate to package management.
- Package fields Admins maintain: title; short and full description; destination(s); duration (days and nights); starting location; base price; currency; cover and additional images; included/excluded services; itinerary (day-by-day or highlights); optional difficulty; optional cancellation/other logistical info; publication status; featured status; timestamps.
- Lifecycle: create/edit; save as draft; publish and unpublish. Only published packages appear in the public catalog, search, and AI recommendation pool. Unpublish blocks new bookings; historical booking records remain accessible. Prefer unpublish over hard-delete when bookings exist.
- Featured: Admins can feature or unfeature published packages for Landing.
- Available dates: Admin-defined calendar options—add, edit, remove. No seat/capacity/remaining/slots fields. When a date is referenced by a booking FK, deactivate (`is_active=false` or equivalent)—never hard-delete. Concurrent bookings on the same date are allowed later; do not unique-constrain `(package, date)` across customers.
- Media: Admin-only upload of common image types (JPEG/PNG/WebP); reject disallowed types and oversized files against a configured max size (numeric examples such as “5 MB” are illustrative only until product sets the limit). Local storage only—no cloud object storage in MVP.
- Currency: accept ISO code as free-text for now; do not invent a closed currency list (product follow-up). Consumer price display convention: `{amount} {CODE}` (no hardcoded `$`).
- Package create/update/publish-state changes and available-date create/deactivate must leave an audit trail. Updates must be what public catalog/detail later show.
- Deferred for this epic: public Explore/Landing UI, booking submit, seats, Stripe, JWT, quotations, email/SMS, object storage, microservices.

## Technical Decisions

- Own domain in `packages` app + `PackageService` (package, availability, media metadata; search/filter owned here but public browse ships later). Thin views; services coordinate; UUID PKs; referential integrity with bookings.
- Admin APIs require `role == ADMIN` (not `is_staff` alone). FE under `features/packages` within the Admin route group; all HTTP via shared `apiClient`.
- Media: store under Django `MEDIA_ROOT` on a Compose volume; Nginx serves `/media/*` (must not SPA-fallback `/api/*`, `/media/*`, or `/django-admin/*`).
- Shared 7 calendar-day advance validator lives in `packages` (`BUSINESS_TIMEZONE=Asia/Dhaka`), callable later from bookings/custom tours. Admin date UI should warn when dates fall within the next 7 days; backend remains authoritative when booking starts.
- Audit (same atomic block as the state change; fail the transaction if audit fails): `package.create`, `package.update`, `package.publish_state_change`, `available_date.create`, `available_date.deactivate`. Exclusive writer: `AuditService`.
- List APIs use DRF-standard errors and default page-number pagination where lists apply.
- No seat-shaped model/API/test surface. Do not hard-depend on object storage for MVP media.

## UX & Interaction Patterns

- Admin flow: Packages → Create → fill fields + available dates → save draft → publish → optionally feature. Climax: package eligible for Explore/Featured. Validation errors keep draft; unpublish removes from catalog while historical bookings retain their date reference.
- Admin chrome: sidebar 240px on `lg+`; below `lg`, icon rail/sheet. Packages list on tablet/phone: stacked cards → detail (no horizontal-only tables). Empty Admin lists use empty-state (headline + sentence + one CTA).
- Date guidance: next 7 calendar days not bookable for new requests; helper explains preparation lead time (Asia/Dhaka). Confirm dialogs (e.g. publish/unpublish) follow modal a11y: focus trap, Esc, restore focus; modal stack depth ≤1.
- Price fields/display prep: `{amount} {CODE}` with ISO currency; locale-aware number formatting hooks. English MVP, externalized strings.

## Cross-Story Dependencies

- Requires Epic 1 complete (Compose, Admin auth/RBAC, Admin layout, shared `apiClient`, AuditService stub).
- Story order: 2.1 first; 2.2 and 2.3 depend on 2.1; 2.4 depends on 2.1–2.3.
- Epic 3 (catalog/Landing/search) and later booking/AI epics consume published packages, featured flags, active dates, and `/media/` URLs produced here.
- Critical test focus: Admin-only mutations; publish/unpublish visibility; unpublish with historical bookings; hard-delete of booked AvailableDate rejected + deactivate succeeds; non-Admin media upload denied; disallowed/oversized media rejected; no capacity fields; audit rows written atomically with package/date changes.
