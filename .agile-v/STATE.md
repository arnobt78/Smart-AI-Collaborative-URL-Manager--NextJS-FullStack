# STATE.md

**C7.17 List detail polish** | 2026-09-02

## Reconciled (repo = docs)

- **Git:** commit landing with this `/commit-ready` (C7.17).
- **Prior on main:** `51a3ad0` Activity full-bleed hover + Insights chart labels.
- **C7.17 (REQ-0052 / TASK-0058):** collaborator navbar rings; vertical-only URL drag (`@dnd-kit/modifiers` + `verticalOnlyTransform`); real Visit/Similar anchors + empty-href guards; Dialog `headerMode="scroll"` parity; client-side UrlList search; Comments `knownCount===0` + Similar RQ warm cache; Button `loadingText` contract.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (C7.17 smoke: rings, drag Y-only, Visit, dialogs, search, loaders) — still open
- Further UrlCard action bugs deferred (user will list later)

## Backlog (unchanged)

- SC → `ListDetailSectionHeader` migration (optional)
- SC soft-nav skeleton when `urls < 2`
- Skeleton vs live spacing parity
- Toast unit tests; viewer jobs-menu UI gate
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.17 — committed via `/commit-ready`.
- **Cycle:** C7
- **Status:** Verified (PASS WITH WARNINGS: optional Comments knownCount test + title referrerPolicy parity left intentionally).
- **Validation:** tsc · lint 0 · focused Jest 27 · build · verify-deep PASS WITH WARNINGS.
- **Trace:** REQ-0052, TASK-0058.

## Next

```text
1. Push when user requests; TASK-0039 production browser smoke for C7.17.
2. User supplies next polish/fix list → plan → implement.
```
