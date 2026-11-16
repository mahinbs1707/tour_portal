# Epic 3 Context: Discover Tours (Landing, Catalog, Search)

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let Guests and authenticated users discover Tour Portal without signing in: public Landing (hero + featured), Explore catalog, package detail with Book Now visibility rules, and server-side search/filter—always restricted to published packages. Book Now may gate or deep-link; actual booking submit is later.

## Stories

- Story 3.1: Public Catalog Listing
- Story 3.2: Package Detail Page
- Story 3.3: Landing Hero and Featured Packages
- Story 3.4: Server-Side Search and Filters

## Requirements & Constraints

- Landing `/` is public: hero introducing the platform; navigation to Explore, search, custom tour, Sign in, and Sign up; nav adapts by auth state and role (Guest vs Customer vs Admin public chrome).
- Featured section shows only published packages marked featured; each card links to detail; empty featured uses a clear empty state. Unpublished packages never appear in any public Landing section.
- Explore catalogs published packages for Guests and authenticated users. Cards show title, cover, short description, destination, duration, starting price, and currency. Selecting a card opens detail. Empty catalog shows an empty state with one clear CTA. Unpublished packages are never listed.
- Package detail shows Admin-maintained fields: basic info (title, cover + additional images, short/full description); travel (destination, days/nights, starting location, available travel dates, optional difficulty); pricing (base price, currency, included/excluded); itinerary (day-by-day or highlights); additional logistical info (e.g. cancellation) when provided. Detail reflects latest Admin updates.
- Book Now (accent CTA) appears only for published and bookable packages; otherwise hide it and show why booking is unavailable. Unpublished packages must not accept new booking requests. Booking form/submit is out of scope here.
- Search: free-text against title, destination, short and full description. Filters: destination, min/max price, tour duration—combinable; clear restores default catalog. Results must satisfy all active criteria and exclude unpublished. No AI required for search. Informative empty state when nothing matches.
- Public catalog should feel responsive under normal load; search/filter should return without unnecessary delay. Loading uses skeletons; empty/error states follow shared patterns.
- Out of MVP for this epic: seats, Stripe, JWT, quotations, email/SMS, object storage, search microservice, booking submit, AI recommendations UI.

## Technical Decisions

- Own discovery in `packages` + `PackageService` (list/detail/search/filter/media metadata). Frontend under public routes / `features/packages`. Public catalog endpoints need no auth; FE route guards are never the sole authorization.
- Search and filter are **server-side** on published packages only (Django ORM filters; Postgres full-text optional). Client-only filtering is not authoritative. Do not invent a search microservice.
- List APIs: DRF-standard JSON (no mandatory custom error envelope); page-number pagination with a documented shared default page size (example 20—confirm in implementation). Filtering/sorting conventions live with packages.
- Package images served from local `MEDIA_ROOT` at `/media/` (Nginx must not SPA-fallback `/media/*`). Cover/additional imagery already uploaded in prior work.
- Featured listing is a published + featured query for Landing—not a separate inventory domain.

## UX & Interaction Patterns

- Surfaces: Landing (brand hero + Featured), Explore (catalog), search/filter on Explore, package detail (Book Now when bookable). Guest nav: Explore · AI · Sign in · Sign up; Customer adds bookings/custom tours/notifications/Sign out. Brand **Tour Portal** is hero-level on Landing (not nav-only). Hamburger → drawer below `md`.
- Components: `hero-banner` (21/9 desktop, 4/5 mobile; no overlay stickers; decorative alt empty or short place name); `card-package` (4/3 cover, object-fit cover); `book-now` accent CTA; `empty-state` (headline + sentence + one CTA) for empty featured, catalog, and no-match search.
- Price display: `{amount} {CODE}` (ISO currency); locale-aware number hooks; no hardcoded `$` concatenation. Available travel dates shown on detail; booking date-picker lead-time rules apply when booking UI ships later.
- States: cold-load skeletons with `aria-busy`; empty featured/catalog/search as above; package not bookable → Book Now hidden + explanation. Light-only premium coastal look; real destination photography; prevent CLS with aspect boxes. Payment/window chips N/A on these surfaces.
- Key discovery path: browse Explore/Featured → detail → Book Now (auth gate later). Publishing/featuring in Admin is what makes packages appear here.

## Cross-Story Dependencies

- Requires Epic 2: published packages, featured flag, active available dates, and `/media/` URLs (seed OK for empty states). Story 3.3 also depends on Story 2.4; Stories 3.2 and 3.4 depend on 3.1.
- Story order: 3.1 first; 3.2 and 3.4 on 3.1; 3.3 on 2.4 + 3.1.
- Epic 4 (AI) and Epic 5 (booking) consume readable published packages and detail/Book Now affordances from this epic; AI failures must not break catalog browse/search (implemented in Epic 4).
- Critical test focus: unpublished never in Landing featured, catalog, or search; empty states + clear-filters; Book Now only when published/bookable; filter combinations; pagination default.
