# STATE.md

**C7.19 empty states / SC cold-path** | 2026-09-03

## Reconciled (repo = docs)

- **Known-empty thin soft-nav:** `ListDetailBodySkeletons` + densified `list.collaborators`; SC collapsed shell; Activity header-only pulse; tombstone not-found (no skeleton backdrop).
- **UrlList:** search zero-match empty copy.
- **Browse:** Robohash `UserAvatar` owner; malformed slug guard; orphan `slug="/plan"` deleted via `scripts/delete-orphan-list.ts`.
- **SC cold-path / create:** collections fetch on expand; Create Collection mount lock (`collectionCreateInFlight`); defer source URL drop until POST success; seed unified for new collection; `sync-vectors` via idleCallback ~5s.
- **Git:** commit landing with this `/commit-ready`.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall (open)
- TASK-0039 production Network smoke (soft-nav 0-collab, Browse, Create Collection, idle)
- Further UrlCard / list-detail polish — awaiting user list

## Backlog

- Unit tests for known-empty / search-empty / slug guard (optional)
- Activity badge in-spinner projection OOS
- SC → `ListDetailSectionHeader` migration (optional)
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.19 commit-ready
- **Cycle:** C7
- **Status:** Verified PASS WITH WARNINGS (optional tests / one-off script).
- **Validation:** tsc · eslint affected · Jest UrlList/SoftNav/soft-nav-cache · build PASS.
- **Trace:** DEC-0056; VALIDATION_SUMMARY 2026-09-03 C7.19.

## Next

```text
1. Push when user requests.
2. Prod Network smoke → paste timings if dup/redundant APIs found.
3. User supplies next polish list.
```
