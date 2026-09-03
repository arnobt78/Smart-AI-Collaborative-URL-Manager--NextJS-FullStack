# STATE.md

**Two-tier icon sizes + PageHeader badge** | 2026-09-03

## Reconciled (repo = docs)

- **Git:** commit landing with this `/commit-ready` (icon size standardization).
- **Prior on main:** `c085f69` REQ-AI-0001 LLM refresh.
- **This change:** `UI_ICON_CONTROL` (`h-5 w-5`) + `UI_ICON_DECORATIVE` (`h-6 sm:h-8`) in `control-styles.ts`; full Lucide/Heroicon sweep; Home CTAs both CONTROL; PageHeader tile `h-10 w-10` + DECORATIVE icon.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall (open)
- TASK-0039 production smoke (C7.17 + AI + icon sizes) — open
- Further UrlCard / list-detail polish — awaiting user list

## Backlog (unchanged)

- SC → `ListDetailSectionHeader` migration (optional)
- SC soft-nav skeleton when `urls < 2`
- Skeleton vs live spacing parity
- Toast unit tests; viewer jobs-menu UI gate
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8 OOS
- New AI providers doc-only until new env keys / REQ

## Current checkpoint

- **Stage:** Icon size standardization — committed via `/commit-ready`.
- **Cycle:** C7
- **Status:** Verified (PASS).
- **Validation:** tsc · lint 0 · Jest 135 · build · verify-deep PASS.
- **Trace:** REQ-0010 extension, DEC-UI-0010.

## Next

```text
1. Push when user requests.
2. User continues TASK-0039 / supplies next polish/fix list → plan → implement.
```
