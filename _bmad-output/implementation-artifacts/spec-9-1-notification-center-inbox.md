---
title: '9.1 Notification Center Inbox'
type: 'feature'
created: '2026-11-19'
status: 'approved'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

## Decisions (Checkpoint 1 — defaults)

- **1A** — `GET /api/notifications/`, `GET /api/notifications/unread-count/`, `POST …/<id>/read/`
- **2A** — Server-side `format_notification_message` from MVP `event_key` + `payload`
- **3A** — Mark read on list item open, then navigate `deeplink`
- **4A** — Customer shell inbox at `/app/customer/notifications`; unread badge on nav link (`9+` cap)
- **5A** — `IsAuthenticated` (Customer primary; Admin can call APIs but no new Admin events per OPEN-05)
- **6A** — Deeplink resolver: `booking`, `custom_tour` (strip `:cycle` suffix), `payment` → booking detail

## Tasks

- [x] Backend list / unread-count / mark-read + catalog + tests
- [x] Frontend inbox page + nav badge + tests