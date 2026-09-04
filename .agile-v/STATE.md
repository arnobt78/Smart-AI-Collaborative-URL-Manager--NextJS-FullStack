# STATE.md

**C7.23 UrlCard parked bugs + archivedAt merge** | 2026-09-04

## Reconciled (repo = docs)

- **C7.23 shipped (local, pending push/deploy):** Add URL metadata sanitize + Zod nullish (fix 400); archive/restore `toReorderUrlItems` + server `mergeArchivedAtOnWrite` (fix 400 + sibling `archivedAt`); delete/edit clear RQ metadata only if URL unused + batch re-fetch; UrlCard image retry + viewport sticky-error reset.
- **C7.22** still on prior commits (`340df49` + toast clarity).
- **GATE-0040 closed:** C7.23 plan approved → verified PASS (lint/tsc/jest/e2e/build + archivedAt follow-up).
- **Still OOS:** cold PATCH/job latency; Cloudinary destroy/refcount; list virtualization; HA-0001.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall (open)
- **Next:** push/deploy when requested → prod re-smoke Add URL, archive, duplicate delete images, fast scroll

## Backlog

- Activity densify-on-every-visit OOS
- Activity badge in-spinner projection OOS
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** Stage 4 complete / commit-ready C7.23
- **Cycle:** C7
- **Status:** Verified PASS; docs synced; local commit
- **Gate:** GATE-0040 APPROVED (C7.23 parked UrlCard bugs)
- **Trace:** DEC-0061; TASK-0059; GATE-0040; prior DEC-0060 / TASK-0058 / GATE-0039

## Next

```text
1. Push when user requests (do not auto-push).
2. Deploy → prod re-smoke Add URL https, archive, dup-delete image, scroll cards.
3. Latency / virtualization remain OOS.
```
