# STATE.md

**C7.16 + Wave 0 complete** | 2026-09-01

## Reconciled (repo = docs)

- **Git:** `main` — C7.16 Wave 0 commit pending push; C7.16 baseline on `origin/main`.
- **C7.16 baseline:** `GLASS_LIST_CARD` + `GLASS_CARD`; `ListDetailSection`; PM/Activity/SC parity; `URL_META_CHIP_*`; UrlFilterBar Radix; skeleton fragment; UrlFilterBar tests (4).
- **C7.16 Wave 0:** `DescriptionRow` / `ListMetaDates` / `SectionCountBadge` / `CharacterCounter` / `form-limits`; MyListsCard unified metadata; `ListDetailShareRow`; form counters 200/5000; pessimistic list+URL delete; visibility confirm; SC/Activity/tab badges; AI `collection-naming` fallback; PM inline empty; BrowsePublicListCard `DescriptionRow`.
- **Stack verified:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3 · audit 0.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (Wave 0 polish + list-detail glass)

## Backlog (unchanged)

- SC soft-nav skeleton when `urls < 2` (accepted minor drift)
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.16 Wave 0 — commit-ready; locally validated.
- **Scope:** REQ-0051 Wave 0 (10 UI polish items + BrowsePublicListCard consistency).
- **Validation:** tsc · lint 0 · Jest 123 pass · build · audit 0 · verify-deep PASS.

## Next

```text
1. Push → deploy → TASK-0039 production verify (Wave 0 surfaces).
2. Optional: conditional SC skeleton block when urls >= 2.
```
