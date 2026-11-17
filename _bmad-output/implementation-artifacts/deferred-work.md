- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Widen CSRF_TRUSTED_ORIGINS to include http://127.0.0.1:$HOST_PORT when auth forms land
  evidence: Smoke uses 127.0.0.1 while .env.example defaults to localhost; no CSRF forms in Story 1.1 yet

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Set Django USE_X_FORWARDED_HOST / SECURE_PROXY_SSL_HEADER when TLS terminates at the proxy
  evidence: Local HTTP baseline only; absolute URL and secure-cookie correctness matter at deploy/TLS

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Drop container privileges (non-root USER) for backend/frontend images
  evidence: Local skeleton runs as root; harden before shared/prod runtime

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Document or exercise AI_PROVIDER=mock stub behavior
  evidence: Env key is present but unused until recommendations stories

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-local-compose-runtime-baseline.md`
  summary: Assert Django settings.TIME_ZONE == Asia/Dhaka in smoke (not only BUSINESS_TIMEZONE env)
  evidence: Story 1.1 AC is env-facing; settle on first timezone-sensitive story

## Deferred from: code review of spec-1-1-local-compose-runtime-baseline.md (2026-11-16)

- Assert Django `settings.TIME_ZONE == Asia/Dhaka` in smoke (not only `BUSINESS_TIMEZONE` env) — settle on first timezone-sensitive story
- Make `sprint-status.yaml` `story_location` portable (relative path) — tooling cleanup across clones/OSes
- Deepen `/api/health/` to verify Postgres connectivity — Compose already healthchecks Postgres; revisit with readiness SLOs

## Deferred from: build review of spec-1-2-design-tokens-and-route-group-shells.md (2026-11-16)

- Sheet background `aria-hidden` / inert while open — deepen with fuller dialog kit later

## Deferred from: build review of spec-1-3-user-model-roles-and-admin-seed.md (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-user-model-roles-and-admin-seed.md`
  summary: Supply email-aware Django admin `form` / `add_form` for `accounts.UserAdmin`
  evidence: Fieldsets are email-based but default UserAdmin forms still expect username; seed/RBAC ACs do not require django-admin UX

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-user-model-roles-and-admin-seed.md`
  summary: Harden Nginx Host forwarding when client omits Host (`$http_host` empty)
  evidence: Edge case on pre-existing 1.1 proxy change; uncommon clients; revisit with proxy hardening

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-user-model-roles-and-admin-seed.md`
  summary: Smoke redirect assertions should accept request Host (localhost vs 127.0.0.1), not hard-require 127.0.0.1 Location
  evidence: Pre-existing 1.1 smoke hardening bundled in dirty tree; localhost base can false-fail despite correct port-preserving redirects

## Deferred from: build review of spec-1-4-customer-registration.md (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-customer-registration.md`
  summary: Replace Sign up “Already have an account?” `/sign-in` placeholder with real Sign in UI
  evidence: Link is intentional forward reference; Sign in is Story 1.5

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-customer-registration.md`
  summary: Add AbortSignal/timeouts on CSRF and register fetch so submit cannot hang forever
  evidence: Edge-case hang; rejected as non-trivial for this story — revisit if hangs appear in QA

## Deferred from: scope split of spec-1-5-sign-in-sign-out-session-bootstrap-and-shared-apiclient.md (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-sign-in-sign-out-session-bootstrap-and-shared-apiclient.md`
  summary: Login rate-limit / lockout against repeated failed Sign in attempts (AD-2)
  evidence: Split from Story 1.5 to keep the spec under the token guideline; security intent unchanged and still required. Follow-up backlog key `1-5a-login-rate-limit-and-lockout` in `sprint-status.yaml`. Traceability: AD-2 (“Login must apply basic rate limiting / lockout against repeated failed attempts”); Epic 1 Technical Decisions (login rate-limit/lockout). Do not treat Story 1.5 done as satisfying this control.

## Deferred from: build review of spec-1-5-sign-in-sign-out-session-bootstrap-and-shared-apiclient.md (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-sign-in-sign-out-session-bootstrap-and-shared-apiclient.md`
  summary: SessionExpiredModal Escape-to-dismiss, initial focus, and focus trap
  evidence: aria-describedby shipped; full dialog a11y kit deferred with later modal patterns

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-sign-in-sign-out-session-bootstrap-and-shared-apiclient.md`
  summary: Ensure logout API failure cannot leave a usable server session after Guest chrome is shown
  evidence: Current signOut clears local user then best-effort logout; harden with cookie clear / retry if QA sees sticky sessions

## Deferred from: build review of spec-1-6-role-aware-navigation-and-route-guards.md (2026-11-16)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-role-aware-navigation-and-route-guards.md`
  summary: Add Admin Sign out affordance inside Admin sidebar (not only via View site → public Sign out)
  evidence: Sidebar-first Admin UX; Sign out works from public chrome today; deepen Admin chrome later if ops need one-click logout

## Deferred from: build review of spec-2-1-admin-package-create-edit-draft-publish.md (2026-11-16)

- source_spec: _bmad-output/implementation-artifacts/spec-2-1-admin-package-create-edit-draft-publish.md
  summary: Assert unpublish clears is_featured when featured Admin UX lands
  evidence: Service already sets is_featured=False on unpublish; dedicated test deferred to Story 2.4 featured flag work

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-package-media-upload-and-serving.md`
  summary: Additional image remove-by-index can race across concurrent Admin tabs
  evidence: Frozen intent uses index-based DELETE; select_for_update keeps each request consistent but concurrent removals can delete a different image than the one shown

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-featured-flag-and-admin-packages-list-ux.md`
  summary: Filter-active empty-state title/body copy is untested
  evidence: Verification-gap review; Clear filters control and API filter shapes were patched; copy-only empty branch left without a dedicated Vitest case

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-package-detail-page.md`
  summary: Guest Book Now post-auth returns to detail rather than booking stub; booking stub route smoke optional until Epic 5
  evidence: Story 3.2 intentionally gates/links only; Epic 5 owns booking form and auth-return-to-booking

- source_spec: `_bmad-output/implementation-artifacts/spec-3-3-landing-hero-and-featured-packages.md`
  summary: Landing featured section shows only the first page (page size 20) with no pagination or truncation notice
  evidence: Agent decision for Story 3.3; revisit if featured inventory routinely exceeds one page

- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-server-side-search-and-filters.md`
  summary: Replace `QuerySet.extra` LIKE helper with Django expression APIs while keeping parameterized ESCAPE semantics
  evidence: Walkthrough security elicitation � current `_icontains_escaped` is parameterized and intentional; refactor is maintenance, not Story 3.4 correctness
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-server-side-search-and-filters.md`
  summary: Public catalog rate limiting / abuse controls for `GET /api/packages/` search
  evidence: Walkthrough security elicitation � separately tracked hardening unless an approved NFR requires it in-story
- source_spec: `_bmad-output/implementation-artifacts/spec-3-4-server-side-search-and-filters.md`
  summary: Optional FE numeric pre-validation for price/duration before submit
  evidence: UX improvement only; backend remains authoritative for filter validation

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-recommendation-service-and-api.md`
  summary: Bound/sanitize provider `why` strings (length/charset/HTML) when a real LLM provider is added
  evidence: Mock emits short deterministic text; unbounded `why` risk is for future non-mock providers
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-recommendation-service-and-api.md`
  summary: Bound or paginate `list(published())` inventory load for recommendations under large catalogs
  evidence: MVP catalog size is fine; full published load per request is a scalability concern for later
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-recommendation-service-and-api.md`
  summary: Add a deadline/timeout around provider.recommend for real upstream providers
  evidence: Current mock is local/sync; hangs are not a realistic MVP failure mode until a network LLM lands

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-ai-recommendations-ui.md`
  summary: Clamp/sanitize long recommendation `why` text in the UI when real LLM providers land
  evidence: Mock why is short; unbounded rationale can dominate card layout with future providers
- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-ai-recommendations-ui.md`
  summary: Add client AbortController timeout for hung `POST /api/recommendations/`
  evidence: Loading can stick if the network never returns; revisit with provider SLO / real LLM

- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md`
  summary: Clarify whether Payment.amount should be package base_price or base_price times travelers before checkout
  evidence: Story 5.1 stores package.base_price on the initial UNPAID row; product pricing rule not declared in AC
- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md`
  summary: Harden booking create with select_for_update on package/available date to close TOCTOU unpublish/deactivate races
  evidence: Checks run before insert; concurrent Admin unpublish could theoretically race
- source_spec: `_bmad-output/implementation-artifacts/spec-5-1-booking-create-api-with-7-day-rule-asia-dhaka.md`
  summary: Prefer latest payment attempt status in booking responses once Epic 7 multi-attempt payments exist
  evidence: Response currently uses oldest payment by created_at; fine for single UNPAID row in 5.1

- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-booking-form-review-and-auth-return.md`
  summary: Replace confirmation My bookings CTA with real history once Story 5.3 lands
  evidence: Thin confirmation currently links to Placeholder /app/customer/bookings by design
- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-booking-form-review-and-auth-return.md`
  summary: Align FE min-bookable calendar day with Asia/Dhaka business timezone (not browser local Date)
  evidence: FE reuses packagesApi.minBookableDateIso local arithmetic; BE Asia/Dhaka remains authoritative
- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-booking-form-review-and-auth-return.md`
  summary: Extract formatTourDate / mapUnavailableReason into a shared packages helper module
  evidence: BookingFormPage imports from PackageDetailPage; coupling is acceptable short-term

- source_spec: `_bmad-output/implementation-artifacts/spec-5-3-booking-confirmation-history-detail-and-cancel-pending.md`
  summary: Treat definitive create ApiErrors (401/403/429) as hard failures instead of outcome-unknown
  evidence: Branching comes from 5.2 elicitation recovery; 5.3 history/cancel did not introduce it
- source_spec: `_bmad-output/implementation-artifacts/spec-5-3-booking-confirmation-history-detail-and-cancel-pending.md`
  summary: Add POST /api/bookings/ idempotency key to prevent duplicate creates after client timeout
  evidence: Outcome-unknown copy reduces harm but does not prevent double submit; API hardening follow-up
- source_spec: `_bmad-output/implementation-artifacts/spec-5-3-booking-confirmation-history-detail-and-cancel-pending.md`
  summary: Paginate or limit customer booking history list when volumes grow
  evidence: MVP returns full own list ordered -created_at/-id; fine for early traffic
