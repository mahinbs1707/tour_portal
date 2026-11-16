---
title: '2.3 Package Media Upload and Serving'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a7dc60df9f35a07bc1ebef04e5609ece7ed10b20'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Package cover/additional image fields are read-only placeholders with no Admin upload path, so catalog UI cannot show real imagery.

**Approach:** Admin-only multipart uploads validate type/size, store files under `MEDIA_ROOT` on the Compose media volume, persist `/media/...` paths on the package, and reuse existing Nginx `/media/` serving—no object storage.

## Boundaries & Constraints

**Always:**
- Admin-only via `IsAdminRole`; Customer/Guest → 403. FE on Admin package edit via `apiClient` (FormData must not force `Content-Type: application/json`).
- Allow JPEG/PNG/WebP only (MIME + magic sniff). Reject others with clear 400; do not persist file or media fields.
- Max size from `MEDIA_UPLOAD_MAX_BYTES` settings/env. Default may use architecture’s illustrative 5 MB (5242880) until product finalizes—do not treat “5 MB” as product policy in copy.
- Store under `MEDIA_ROOT` (volume already mounted). API returns `/media/...`. Nginx already aliases `/media/` (verify only; no SPA fallback).
- JSON create/update keep `cover_image` / `additional_images` read-only; only media endpoints mutate. Cover replace-on-upload; additional append (max 8); clear cover + remove additional by index. Audit as `package.update` in `transaction.atomic`.
- MVP exclusions unchanged. No S3, public catalog (Epic 3), featured UX (2.4), seats, Stripe, JWT.

**Never:**
- Authorize with `is_staff` alone or FE-only checks.
- Accept disallowed/oversized files; invent object storage; hardcode “5 MB” as finalized policy.
- Mutate media via JSON PATCH; skip audit on successful media changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cover upload | Admin + valid ≤ max | File stored; `cover_image`=`/media/...`; audit `package.update` | N/A |
| Additional | Admin + valid; count < 8 | Appended; audit | Cap → 400; no write |
| Bad type / oversize | GIF/PDF or > max bytes | Rejected; media unchanged; no file kept | 400 clear error |
| Non-Admin | Customer/Guest upload | 403 | N/A |
| Clear/remove | Admin clear cover or remove index | Fields updated; audit; best-effort file delete | Bad index → 400 |
| Published GET | Admin GET with media | Includes `/media/...` URLs | N/A |

</frozen-after-approval>

## Code Map

- `backend/config/settings.py` + `.env.example` -- `MEDIA_UPLOAD_MAX_BYTES` (default 5242880); reuse `MEDIA_ROOT`/`MEDIA_URL`
- `backend/packages/media.py` (new) -- validate; save under `packages/<id>/…`; `/media/` URL helper; optional delete
- `backend/packages/services.py` -- set/clear/append/remove + `package.update` audit; JSON updates still omit media
- `backend/packages/views.py` + `urls.py` -- `…/admin/<pk>/media/cover/` (POST/DELETE), `…/media/additional/` (POST), `…/additional/<index>/` (DELETE); `IsAdminRole`
- `deploy/nginx/default.conf` + `deploy/docker-compose.yml` -- verify `/media/` alias + `media_data` (backend rw, nginx ro)
- `frontend/src/services/apiClient.js` -- skip JSON Content-Type when body is `FormData`; keep CSRF/credentials
- `frontend/src/features/packages/` -- cover/additional UI on `AdminPackageFormPage`; `packagesApi.js`; i18n; Vitest
- Continuity: Story 2.1 CharField/JSONField placeholders; no migration if `/media/...` paths stay ≤512

**Do not change:** planning docs; auth/seed; dates (2.2); featured (2.4); public Explore; Booking/S3.

**Agent decisions:** Separate multipart routes. Default max 5242880 via env. Magic+MIME allowlist. Cover replace; additional max 8; clear/remove OK. Audit `package.update`. Paths `/media/packages/<uuid>/cover-<hash>.jpg`. APITestCase + Vitest. Nginx verify-only.

## Tasks & Acceptance

**Execution:**
- [x] `backend/config/settings.py` + `.env.example` -- configurable max bytes -- AD-24
- [x] `backend/packages` -- media helpers + service mutations + Admin APIs; JSON media read-only; audit -- FR-CAT-02/06, AD-5/15/24
- [x] `frontend` FormData apiClient + Admin media UI/tests -- UX-DR2
- [x] Verify Nginx/Compose media serving -- AD-5/15
- [x] Tests -- happy path; 403; bad type; oversize; no persist on reject; published returns `/media/` URLs -- Story 2.3 AC

**Acceptance Criteria:**
- Given I am an Admin editing a package, when I upload a valid cover within the configured size limit, then it is stored and reachable via `/media/...`
- Given I am an Admin, when I upload a disallowed type or oversized file, then reject with a clear validation error and persist nothing
- Given I am a Customer, when I attempt the upload API, then access is denied
- Given architecture’s example size (e.g. 5 MB), when configuring the limit, treat it as non-binding until product finalizes the number

## Implementation Notes

- `MEDIA_UPLOAD_MAX_BYTES` (default 5242880) in settings + `.env.example`.
- `packages/media.py` MIME+magic validate; store under `MEDIA_ROOT/packages/<id>/…`; best-effort delete.
- `PackageService` set/clear cover, append/remove additional (max 8); audit `package.update`; JSON updates still omit media.
- Admin routes: `POST|DELETE …/media/cover/`, `POST …/media/additional/`, `DELETE …/media/additional/<index>/`.
- `apiClient` skips JSON Content-Type for `FormData`; `AdminPackageMediaPanel` on edit form.
- Nginx/Compose media volume verified present (no config change).

## Spec Change Log

## Review Triage Log

- medium → patch — Blind: no HTTP GET `/media/` in tests — filesystem `is_file` + manual Nginx check cover reachability; still patch clear/replace to assert prior file deleted on disk.
- false — Blind: Vite `/media` proxy missing — `vite.config.js` also has no `/api` proxy; Compose `:8080` Nginx is the runtime path for both.
- medium → patch — Blind/Edge: `delete_media_file` path join can escape `MEDIA_ROOT` via `..` — resolve + contain under root before unlink.
- false — Blind: unsanitized `kind` in filename — only `"cover"`/`"additional"` passed from PackageService; not user-controlled via API.
- false — Blind: empty/octet-stream Content-Type rejects valid images — intentional MIME+magic allowlist match per spec.
- medium → patch — Blind: Guest/unauthenticated media upload untested — add 403 case alongside Customer.
- medium → patch — Blind/VG: clear/remove/replace never assert prior file gone from `MEDIA_ROOT`.
- medium → patch — Blind: clear/remove lack ConfirmDialog — reuse existing dialog like dates deactivate.
- low → patch — Blind: busy label always “Uploading...” during clear/remove — use distinct busy copy.
- low (rejected) — Blind: FE hardcodes additional cap 8 — backend enforces; everyday harm unlikely.
- low (rejected) — Blind: no client-side max-bytes check — server authoritative; oversize already returns 400.
- low → patch — Blind: preview `alt=""` — give meaningful alt from i18n.
- defer — Blind/Edge: additional delete by volatile index / concurrent wrong image — frozen intent is index-based; inherent race.
- false — Blind: post-commit orphan files with swallowed OSError — intentional best-effort delete per agent decision.
- false — Blind: sprint status still `in-progress` — process timing; step-05 moves to review.
- low (rejected) — Blind: redundant mediaSubtitle/mediaHint — cosmetic copy only.
- medium → patch — Edge: `MEDIA_UPLOAD_MAX_BYTES=int(...)` crashes on empty/non-int env — safe default fallback.
- medium → patch — Edge: partial disk write leaves orphan — unlink on write failure.
- medium → patch — Edge: `uploaded.size` understates chunks — enforce max while streaming write.
- false — Edge: concurrent package delete → 500 — packages have no hard-delete API in this epic; path unreachable.
- medium → patch — Edge: FE `packageId` change while load in flight can show stale media — request-id guard.
- medium → patch — VG: audit `package.update` unasserted on clear/append/remove success.
- medium → patch — VG: append audit-failure orphan cleanup untested (cover has parallel).
- medium → patch — VG: `packagesApi` media helpers’ URL/method/FormData field mocked away.
- medium → patch — VG: `AdminPackageFormPage` media panel mount unverified on edit.

## Verification

**Commands:**
- `docker compose -f deploy/docker-compose.yml --env-file .env exec -T -e DJANGO_USE_SQLITE=1 backend python manage.py test packages` -- **33/33 OK**
- `npm test -- src/features/packages` (frontend) -- **19/19 PASS**

**Manual checks:**
- After Admin upload, `http://localhost:8080/media/...` serves the file (not SPA HTML)
