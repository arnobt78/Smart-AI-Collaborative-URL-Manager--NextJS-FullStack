# STATE.md

**C7.27 Track B Waves 2–3 — locally committed (GATE-0048)** | 2026-09-09

## Reconciled (repo = docs)

- **Track B Wave 3 (TASK-0064):** lists/browse count-only Prisma (`jsonb_array_length`); slim list owner select (no password); SSE publish hygiene (no SETEX, LTRIM 0..9); EventSource pause when tab hidden (+ pageshow reconnect).
- **Wave 2** shipped: card DTOs on wire, densify-first mutations, SC no-vector first expand, Sentry noise.
- **Commit-ready fixes:** soft-nav `urlCount` chrome; SSE deleted-list minimal tombstone (no Redis backlog spread).
- **Wave 1** still shipped: SSE lean enrich + api-status probes + check-urls maxDuration; HA-0001 DONE.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall — **DONE**
- **Now:** Push when ready; prod re-smoke lists/browse DB bytes + SSE idle when tab backgrounded.

## Current checkpoint

- **Stage:** Track B Waves 2–3 committed locally (no push)
- **Cycle:** C7
- **Status:** GATE-0048 verify + security + auto-checks PASS; local commit
- **Gate:** GATE-0048
- **Trace:** TASK-0064 Wave 2–3; DEC-0070 / DEC-0071

## Next

```text
1. User: push when ready; prod Network re-smoke.
2. Absolute cold `_rsc` ms SLAs / full Redis SUBSCRIBE rewrite remain deferred (RISK-0033).
```
