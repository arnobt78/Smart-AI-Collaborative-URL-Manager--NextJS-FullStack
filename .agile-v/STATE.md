# STATE.md

**C7.16 Wave 3 — jobs auth + UX polish** | 2026-09-01

## Reconciled (repo = docs)

- **Git:** `main` — Wave 3 commit-ready (jobs auth, loading toasts, health badge, hover/hydration fixes).
- **C7.16 baseline → Wave 2:** on `main` / `origin` (see prior STATE entries).
- **C7.16 Wave 3:** REQ-0025 manual job auth (`isAuthorizedManualListJob` / `isAuthorizedManualScheduleSetup`); loading toasts (`updateToast` + spinner) for Refresh Metadata + Health Check; `UrlHealthIndicator` Lucide inline badge; `HoverTooltip` span hydration fix; UrlCard title flex row; Activity Feed header hover inset + `ListDetailSection` `overflow-hidden`.
- **Stack verified:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3 · audit 0.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (jobs menu + loading toasts + health badge + Activity hover)

## Backlog (unchanged)

- SC → `ListDetailSectionHeader` migration (optional follow-up)
- SC soft-nav skeleton when `urls < 2` (accepted minor drift)
- Toast unit tests for `updateToast` / loading lifecycle
- Optional: loading toast for Setup Schedule; UI-gate jobs menu for viewers
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.16 Wave 3 — verify-deep PASS WITH WARNINGS; commit-ready.
- **Scope:** Job auth routes; loading toasts; health badge; hydration; Activity hover clip.
- **Validation:** tsc · lint 0 · Jest 128 pass · build · verify-deep PASS WITH WARNINGS.

## Next

```text
1. Push → deploy → TASK-0039 (jobs menu prod, loading toasts, health badge, Activity hover mobile).
2. Optional: Toast tests; viewer jobs-menu UI gate.
```
