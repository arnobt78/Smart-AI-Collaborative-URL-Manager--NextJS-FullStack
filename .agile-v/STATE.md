# STATE.md

**C7.27 follow-up — keep-warm badge + archive snapshot — commit-ready** | 2026-09-09

## Reconciled (repo = docs)

- ApiDocs keep-warm: `authMode: "internal"` → **Internal Secret** badge (not session Auth Required).
- `urlListStore` archive/restore: operation-start `snapshot` + densify-safe `committedList`; no late `currentList.get()` on commit.
- Prior: Free-tier A–D + Track B W1–W3 still shipped.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall — **DONE**
- Vercel `INTERNAL_JOB_SECRET` — set by user
- GitHub `INTERNAL_JOB_SECRET` — **optional** (leave unset = keep-warm schedule skips)

## Current checkpoint

- **Stage:** follow-up badge + snapshot commit-ready
- **Cycle:** C7
- **Status:** verify-deep PASS WITH WARNINGS; security PASS; local commit pending
- **Trace:** RISK-0033 accepted for absolute SLAs + SUBSCRIBE

## Next

```text
1. User: push when ready; optional GH secret for keep-warm; light prod smoke.
2. Absolute cold `_rsc` ms SLAs / Redis SUBSCRIBE remain deferred (free serverless).
```
