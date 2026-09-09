# STATE.md

**C7.27 Free-tier A–D — commit-ready** | 2026-09-09

## Reconciled (repo = docs)

- **Phase A:** Playwright clears Sentry DSN for e2e; SSE abort `{once:true}` + `ReadableStream.cancel` (MaxListeners e2e spam gone).
- **Phase B:** `e2e/track-b-network-smoke.spec.ts` — lists/browse `urlCount` wire, SSE hide/show, soft-nav badge.
- **Phase C:** `/api/cron/keep-warm` + free GH Actions workflow (optional GH secret); no absolute `_rsc` SLAs.
- **Phase D:** `REALTIME_TRANSPORT=list-poll`; Redis SUBSCRIBE accepted-deferred on free serverless.
- **Track B W1–W3** still shipped (GATE-0046–0048).
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall — **DONE**
- Vercel `INTERNAL_JOB_SECRET` — set by user
- GitHub `INTERNAL_JOB_SECRET` — **optional** (leave unset = keep-warm schedule skips)

## Current checkpoint

- **Stage:** Free-tier A–D commit-ready
- **Cycle:** C7
- **Status:** verify + security PASS; local commit pending
- **Gate:** free-tier A–D (post GATE-0048)
- **Trace:** RISK-0033 accepted for absolute SLAs + SUBSCRIBE

## Docs

- README / ApiDocs / Api Status / `.env.example` synced for Track B + free-tier A–D (urlCount cards, list-poll SSE, keep-warm, in-process status probes).

## Next

```text
1. User: push when ready; optional GH secret for keep-warm schedule; light prod smoke.
2. Absolute cold `_rsc` ms SLAs / Redis SUBSCRIBE remain deferred (free serverless).
```
