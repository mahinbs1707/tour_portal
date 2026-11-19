---
name: Reviewer gate remediation
target: ARCHITECTURE-SPINE.md
spine_version: 1.1
date: 2026-11-15
lint: ok
---

# Gate remediation applied

## Prior gate

| Lens | Prior verdict | Remediation |
|---|---|---|
| `lint_spine.py` | 13 high (`Prevents` / `Rule` gaps) | All ADs now have Binds / Prevents / Rules in the lint window; **ok=true** |
| Rubric | Needs revision — AI / search / media / Prevents / capability map | AD-23, AD-24; Prevents; §10 extended; register endpoint |
| Version-reality | PASS + advisories | Pinned React Router DOM 7.18.5, Node ≥20.19/≥22.12, psycopg ≥3.1.12 |
| Adversarial | FAIL — 7 ownership holes | AD-16…AD-22 (+ tightenings on AD-2…AD-12) |

## New / tightened decisions

AD-16 PaymentWindow exclusive writes · AD-17 Notification catalog · AD-18 Dashboard façade · AD-19 role/`is_staff` · AD-20 availability validator · AD-21 single `apiClient` · AD-22 audit catalog · AD-23 AI recommendations · AD-24 search + local media.

## Still deferred (intentional)

Cloud host, object storage, Stripe, JWT, test framework pins, email/SMS, AI-generated package publication, ops break-glass staff matrix.
