# STATE.md

**C7.16 skeleton parity + warm cache** | 2026-09-01

## Reconciled (repo = docs)

- **Git:** `main` — skeleton parity + warm cache paint committed; Wave 3 on `main` (`3832c60`).
- **C7.16 Wave 3 (prior):** REQ-0025 manual job auth; loading toasts; Lucide health badge; HoverTooltip span hydration; Activity header hover clip.
- **C7.16 skeleton + warm cache:** `ListDetailBodySkeletons` section-shaped shells; `ListDetailBodySections` shared live PM/SC/Activity; `isUnifiedListHydrated` + `syncUnifiedSubCachesFromUnified`; warm revisit skips body skeletons; Activity overlay scrollbar + full-width section header hover.
- **Stack verified:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3 · audit 0.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (warm revisit no body skeleton flash; Activity hover/scroll at 320/768; jobs menu + loading toasts + health badge)

## Backlog (unchanged)

- SC → `ListDetailSectionHeader` migration (optional follow-up)
- SC soft-nav skeleton when `urls < 2` (accepted minor drift; cold route always shows SC skeleton)
- Skeleton vs live spacing parity (`LIST_STACK` vs `PAGE_STACK` — minor layout shift on hydrate)
- Toast unit tests for `updateToast` / loading lifecycle
- Optional: loading toast for Setup Schedule; UI-gate jobs menu for viewers
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.16 skeleton parity + warm cache — verify-deep PASS WITH WARNINGS; committed.
- **Scope:** Section-shaped body skeletons; hydrated unified cache gate; Activity overlay scroll + header hover.
- **Validation:** tsc · lint 0 · Jest 130 pass · build · verify-deep PASS WITH WARNINGS.

## Next

```text
1. Push → deploy → TASK-0039 (warm revisit, Activity hover/scroll, jobs menu prod).
2. Optional: spacing parity; Toast tests; viewer jobs-menu UI gate.
```
