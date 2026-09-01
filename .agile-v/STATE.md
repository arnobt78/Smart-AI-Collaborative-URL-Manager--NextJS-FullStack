# STATE.md

**C7.16 Activity hover + Insights chart labels** | 2026-09-01

## Reconciled (repo = docs)

- **Git:** `main` — Activity full-bleed hover + Insights chart labels pending commit; prior: share row align (`0c25d96`), skeleton parity (`f8a5e32`), Wave 3 (`3832c60`).
- **C7.16 Activity + Insights:** ActivityFeed full-bleed header/row hover (`CARD_PAD` on button; no collapsed `pb-2`; body `border-t`; expand flash fix); ActivityChart peak label margin + clamp; PerformanceMetrics bar `LabelList`.
- **C7.16 skeleton + warm cache (prior):** `ListDetailBodySections`; `isUnifiedListHydrated`; overlay scrollbar.
- **Stack verified:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3 · audit 0.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (Activity full-bleed hover; Insights chart labels; warm revisit; jobs menu prod)

## Backlog (unchanged)

- SC → `ListDetailSectionHeader` migration (optional follow-up)
- SC soft-nav skeleton when `urls < 2` (accepted minor drift)
- Skeleton vs live spacing parity (`LIST_STACK` vs `PAGE_STACK`)
- 90-day line chart peak labels OOS (`showDots` false — intentional)
- Toast unit tests; viewer jobs-menu UI gate
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.16 Activity hover + Insights labels — commit-ready.
- **Scope:** ActivityFeed full-bleed hover; chart label clipping; share row align on `main`.
- **Validation:** tsc · lint 0 · Jest 130 pass · build · verify-deep PASS WITH WARNINGS.

## Next

```text
1. Push → deploy → TASK-0039 (Activity hover, Insights labels, warm revisit).
2. Optional: spacing parity; Toast tests; viewer jobs-menu UI gate.
```
