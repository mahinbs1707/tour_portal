---
title: '9.3 Admin Operational Dashboard'
type: 'feature'
created: '2026-11-19'
status: 'approved'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

## Decisions

- **1A** — `GET /api/dashboard/admin/` — nine FR-ADM-02 counters; `IsAdminRole`
- **2A** — `AdminDashboardQueryService` in `dashboard` app (AD-18)
- **3A** — Admin home tiles + highlight pending booking/custom tour when count > 0
- **4A** — Tile links pass `statusFilter` via router state to admin list pages

## Tasks

- [x] Backend admin snapshot + API + customer 403 test
- [x] Admin home UI + list filter bootstrap from dashboard links
- [x] Vitest admin home