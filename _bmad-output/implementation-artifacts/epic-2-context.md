# Epic 2 Context: Admin Tour Catalog & Availability

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Enable Admins to stock the tour catalog Guests will browse: create/edit packages with full catalog fields, draft/publish/unpublish, mark featured, manage available travel dates (no seat capacity), and upload cover/additional images to local `/media/`. This epic is the inventory foundation for Discover Tours (Epic 3), AI recommendations, and booking.

## Stories

- Story 2.1: Admin Package Create, Edit, Draft, Publish
- Story 2.2: Available Dates Management (Deactivate, Never Hard-Delete with Bookings)
- Story 2.3: Package Media Upload and Serving
- Story 2.4: Featured Flag and Admin Packages List UX

## Requirements & Constraints

- Admin-only package management; Guests/Customers cannot mutate catalog APIs. Admin chrome must expose navigation into package management.
- Package fields Admins maintain: title, short/full description, destination(s), duration (days/nights), starting location, base price, currency, cover + additional images, included/excluded services, itinerary (day-by-day or highlights), optional difficulty, cancellation/additional info as needed for public detail.
- Lifecycle: create/edit; save as draft; publish and unpublish. Only published packages appear in public catalog, search, and AI recommendation pool. Unpublish blocks new bookings; historical booking records stay accessible. Prefer unpublish over hard-delete when bookings exist.
- Featured: Admins can feature/unfeature **published** packages for Landing.
- Available dates: Admin-defined calendar options only—add/edit/remove. **No** seat/capacity/remaining/slots fields or “fully booked” UX. When a date is referenced by a booking FK, deactivate (`is_active=false` or equivalent)—never hard-delete. Concurrent bookings on the same date are allowed later; do not unique-constrain `(package, date)` across customers.
- Media: Admin-only upload of common image types (JPEG/PNG/WebP); reject disallowed types and oversized files against a **configured** max size (any example like “5 MB” is illustrative, not a finalized product number). Local storage only—no cloud object storage in MVP.
- Currency: accept ISO code as free-text for now; do **not** invent a closed currency list (product follow-up). Price display convention for consumers: `{amount} {CODE}` (no hardcoded `$`).
- Package create/update/publish-state changes and available-date create/deactivate must leave an audit trail. Updates must be what public catalog/detail later show.
- Deferred for this epic: public Explore/Landing UI (Epic 3), booking submit (Epic 5), seats, Stripe, JWT, quotations, email/SMS, object storage, microservices.

## Technical Decisions

- Own domain in `packages` app + `PackageService` (package, availability, media metadata; search/filter owned here but public browse ships later). Thin views; services coordinate; UUID PKs; referential integrity with bookings.
- Admin APIs require `role == ADMIN` (not `is_staff` alone). FE under `features/packages` within Admin route group; all HTTP via shared `apiClient`.
- Media: store under Django `MEDIA_ROOT` on Compose volume; Nginx serves `/media/*` (must not SPA-fallback `/api/*`, `/media/*`, or `/django-admin/*`).
- Shared 7 calendar-day advance validator lives in `packages` (`BUSINESS_TIMEZONE=Asia/Dhaka`), callable later from bookings/custom tours. Admin date UI should warn when dates are within the next 7 days; backend remains authoritative when booking starts.
- Audit (same atomic block as the state change; fail the transaction if audit fails): `package.create`, `package.update`, `package.publish_state_change`, `available_date.create`, `available_date.deactivate`. Exclusive writer: `AuditService`.
- List APIs use DRF-standard errors and default page-number pagination where lists apply.
- No seat-shaped model/API/test surface. Do not hard-depend on S3 or similar for MVP media.

## UX & Interaction Patterns

- Admin Flow: Packages → Create → fill fields + available dates → save draft → publish → optionally feature. Climax: package eligible for Explore/Featured. Validation errors keep draft; unpublish removes from catalog while historical bookings retain their date reference.
- Admin chrome: sidebar 240px on `lg+`; below `lg`, icon rail/sheet. Packages list on tablet/phone: stacked cards → detail (no horizontal-only tables). Empty Admin lists use empty-state (headline + sentence + one CTA).
- Date picker pattern: next 7 calendar days not selectable; helper explains preparation lead time (Asia/Dhaka). Dialogs (confirm publish/unpublish etc.) follow modal a11y: focus trap, Esc, restore focus; modal stack depth ≤1.
- Price fields/display prep: `{amount} {CODE}` with ISO currency; locale-aware number formatting hooks. English MVP, externalized strings.

## Cross-Story Dependencies

- Requires Epic 1 complete (Compose, Admin auth/RBAC, Admin layout, shared `apiClient`, AuditService stub).
- Story order: 2.1 first; 2.2 and 2.3 depend on 2.1; 2.4 depends on 2.1–2.3.
- Epic 3 (catalog/Landing/search) and later booking/AI epics consume published packages, featured flags, active dates, and `/media/` URLs produced here.
- Critical test focus: Admin-only mutations; publish/unpublish visibility; unpublish with historical bookings; hard-delete of booked AvailableDate rejected + deactivate succeeds; non-Admin media upload 403; disallowed/oversized media rejected; no capacity fields; audit rows written atomically with package/date changes.
