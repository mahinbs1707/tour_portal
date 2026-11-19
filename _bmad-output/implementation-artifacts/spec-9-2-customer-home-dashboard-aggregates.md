---
title: '9.2 Customer Home Dashboard Aggregates'
type: 'feature'
created: '2026-11-19'
status: 'approved'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

## Decisions

- **1A** — `GET /api/dashboard/customer/` with three integer fields
- **2A** — `CustomerDashboardQueryService` mirrors `is_payment_eligible` predicates
- **3A** — Customer home tiles link to bookings / notifications; no list API stitching on FE

## Tasks

- [x] Backend service + API + tests
- [x] Customer home tiles + tests