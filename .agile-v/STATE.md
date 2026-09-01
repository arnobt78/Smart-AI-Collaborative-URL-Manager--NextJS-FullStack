# STATE.md

**C7.16 + Wave 0 + mobile polish complete** | 2026-09-01

## Reconciled (repo = docs)

- **Git:** `main` — C7.16 mobile polish commit pending push; Wave 0 on `origin/main` via prior commit.
- **C7.16 baseline:** `GLASS_LIST_CARD` + `GLASS_CARD`; `ListDetailSection`; PM/Activity/SC parity; `URL_META_CHIP_*`; UrlFilterBar Radix; skeleton fragment; UrlFilterBar tests (4).
- **C7.16 Wave 0:** `DescriptionRow` / `ListMetaDates` / `SectionCountBadge` / `CharacterCounter` / `form-limits`; MyListsCard unified metadata; `ListDetailShareRow`; form counters 200/5000; pessimistic list+URL delete; visibility confirm; SC/Activity/tab badges; AI `collection-naming` fallback; PM inline empty; BrowsePublicListCard `DescriptionRow`.
- **C7.16 mobile polish:** `ListDetailSectionHeader`; mobile list-detail header; PM/Activity two-line headers; share inline copy; UrlCard inline status + centered placeholder; `UI_CONTROL_ICON_GAP` `gap-1`; `UI_LIST_CARD_META_BADGE`; MyListsCard/Browse mobile wrap.
- **Stack verified:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3 · audit 0.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (Wave 0 + mobile polish surfaces)

## Backlog (unchanged)

- SC → `ListDetailSectionHeader` migration (optional follow-up)
- SC soft-nav skeleton when `urls < 2` (accepted minor drift)
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.16 mobile polish — committed locally; push pending.
- **Scope:** List detail mobile layout + list-card metadata wrap (bundled).
- **Validation:** tsc · lint 0 · Jest 123 pass · build · audit 0 · verify-deep PASS WITH WARNINGS (manual 320/390 smoke → TASK-0039).

## Next

```text
1. Push → deploy → TASK-0039 production verify (list detail + list cards at 320/390).
2. Optional: Smart Collections → ListDetailSectionHeader.
```
