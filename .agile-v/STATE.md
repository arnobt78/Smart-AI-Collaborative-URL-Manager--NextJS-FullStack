# STATE.md

**C7.22 refresh-metadata hang + Network polish** | 2026-09-04

## Reconciled (repo = docs)

- **C7.22 shipped (local, pending push/deploy):** refresh-metadata/all `lite=1` + per-URL 12s abort + `maxDuration=60`; metadata early-return skip Cloudinary; ListPage 55s abort + toast always clears; drag activity guard (`id`+email+slug); click `markUnifiedEventProcessed` + analytics `skipUnified`; pin SSE window (no early `endLocalFlagMutation`); Saving/Reordering toasts; Activity subtitle FIFO-20.
- **Follow-up:** ListPage refresh/health `finally` only settles toast when `!toastSettled` (Agent Review FP — runtime already guarded inside `settleToast`).
- **GATE-0039 closed:** C7.22 plan approved → verified PASS (lint/tsc/jest/e2e/build).
- **Parked OOS (user confirms tomorrow):** Add URL `https://` 400; archive-url 400; UrlCard empty on fast scroll; cold latency.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall (open)
- **Next:** push/deploy when requested → prod Network re-smoke (list detail / collab / Activity / collections / UrlCard) + timings paste
- Parked UrlCard bugs + polish after prod evidence

## Backlog

- Activity densify-on-every-visit OOS
- Activity badge in-spinner projection OOS
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** Stage 4 complete / commit-ready C7.22 + toast finally clarity
- **Cycle:** C7
- **Status:** Verified PASS; docs synced; local commits
- **Gate:** GATE-0039 APPROVED (C7.22 waves)
- **Trace:** DEC-0060; TASK-0058; GATE-0039; prior DEC-0059 / TASK-0041 / GATE-0038

## Next

```text
1. Push when user requests (do not auto-push).
2. Deploy → prod Network re-smoke refresh-metadata toast, Saving, Activity “Latest 20”, click/pin updates ≤1.
3. Queue parked: Add URL https 400, archive 400, fast-scroll empty card (+ other bugs user reports).
```
