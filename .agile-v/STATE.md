# STATE.md

**C7.21 Network-smoke fixes (waves 1–5)** | 2026-09-04

## Reconciled (repo = docs)

- **C7.21 shipped (local, pending push/deploy):** fav/pin/duplicate densify + single-flight + SSE cancel; schema-safe reorder + unified densify + `!ok` rollback; Activity FIFO **20** (slice + DB prune + `scripts/prune-list-activities.ts`); jobs return `{ list, activity }` densify + `skipUnified`; metadata batch single-flight; health omit `healthLastStatus: 0`.
- **GATE-0038 closed:** Network paste classified → C7.21 plan approved → verified PASS (lint/tsc/jest/e2e/build).
- **C7.20 still on prod** until this commit is pushed/deployed (`cff9a3b`).
- **Parked OOS:** Add URL `https://` 400; archive-url 400; UrlCard empty on fast scroll; cold PATCH/job latency.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall (open)
- **Next:** push/deploy when requested → prod Network re-smoke of C7.21 surfaces
- Parked bugs remain for a follow-up slice after deploy acceptance

## Backlog

- Activity densify-on-every-visit OOS
- Activity badge in-spinner projection OOS
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** Stage 4 complete / commit-ready C7.21
- **Cycle:** C7
- **Status:** Verified PASS; docs synced; local commit pending push
- **Gate:** GATE-0038 APPROVED (Network + C7.21 waves)
- **Trace:** DEC-0057; DEC-0058; DEC-0059; CR-0033; TASK-0039; TASK-0041

## Next

```text
1. Push when user requests (do not auto-push).
2. Deploy → prod re-smoke fav/pin, drag reorder, Activity ≤20, jobs updates ≤1, single metadata.
3. Queue parked: Add URL https 400, archive 400, fast-scroll empty card.
```
