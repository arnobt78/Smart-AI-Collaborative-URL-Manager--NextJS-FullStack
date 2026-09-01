# STATE.md

**C7.16 complete (baseline)** | 2026-09-01

## Reconciled (repo = docs)

- **Git:** `main` @ `bc8748e` — C7.16 baseline committed; C7.15 @ `b9bdfdc`.
- **C7.16 shipped (baseline):** `GLASS_LIST_CARD` + `GLASS_CARD` token split; `ListDetailSection`; PM/Activity/SC section parity; `URL_META_CHIP_*` shared; UrlFilterBar → Radix; skeleton `PAGE_STACK` fragment; UrlFilterBar tests (4).
- **C7.15:** Radix glass `DropdownMenu`; `CARD_STACK`; UrlCard polish; prod-only immutable `/_next/static`.
- **Stack verified:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3 · audit 0.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (list-detail glass, Radix menus, UrlFilterBar, soft-nav)

## Backlog (unchanged)

- C7.16 Wave 0 user defect list (deferred)
- SC soft-nav skeleton when `urls < 2` (accepted minor drift — revisit if flicker reported)
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.16 baseline committed @ `bc8748e` — locally validated.
- **Scope:** REQ-0051 baseline (Waves 1–3 + remaining fixes A–D). Wave 0 / Wave 4 user defects deferred.
- **Validation:** tsc · lint 0 · Jest 118 pass · build · audit 0 · verify-deep PASS WITH WARNINGS.

## Next

```text
1. Deploy → TASK-0039 production verify.
2. User supplies Wave 0 defect list when ready → GATE-0036 Wave 4 sub-waves.
3. Optional: conditional SC skeleton block when urls >= 2.
```
