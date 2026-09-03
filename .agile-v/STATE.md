# STATE.md

**C7.20 visibility densify + UrlCard fav/pin/duplicate** | 2026-09-04

## Reconciled (repo = docs)

- **Visibility / Browse:** densify preserves `existing.user` (no `you@local`); visibility API returns `user` + `activity`; optimistic mutate uses session email; skip unified invalidate for `"visibility"`; prepend activity + `markUnifiedEventProcessed`.
- **Create Collection:** API returns `activity` / `sourceActivity`; client seeds unified so new list Activity opens at 1.
- **UrlCard fav/pin:** flag-only `updateUrlInList` densifies + prepends activity + marks SSE; skips `invalidateMutationImpact("url")` and global `isLoading`; toasts in UrlList; overlay star fill when favorite + `canEdit`.
- **Duplicate:** AlertDialog + `Duplicating…`; `handleDuplicate` rethrows so dialog stays open on error.
- **Shared:** `src/lib/sse-unified-dedup.ts` (store ↔ hooks safe); re-exported from `useListQueries`.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall (open)
- TASK-0039 production Network smoke (list detail collab / Activity / collections / UrlCard) — user testing 2026-09-04+
- **Reported prod bugs (fix next):** Add URL fails for `https://…` (400 / “Failed to add URL” despite AI enhance); archive-url 400; UrlCard empty body on fast scroll

## Backlog

- Optional Jest for flag-only `skipInvalidate`
- Activity densify-on-every-visit OOS (cold load still uses `updates`)
- Activity badge in-spinner projection OOS
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.20 commit-ready
- **Cycle:** C7
- **Status:** Verified PASS WITH WARNINGS (optional flag-only unit test).
- **Validation:** tsc · eslint · Jest related 33 · build PASS.
- **Trace:** DEC-0057; VALIDATION_SUMMARY 2026-09-04 C7.20; CR-0033.

## Next

```text
1. Push when user requests.
2. Prod Network smoke → paste timings (collab / Activity / collections / UrlCard).
3. Fix reported UrlCard bugs: https Add URL, archive 400, fast-scroll empty card.
```
