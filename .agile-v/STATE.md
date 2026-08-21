# STATE.md

**C7.1** | 2026-08-21

## Done

- Through **C7.0** soft-nav chrome parity (local; push with C7.1).
- **C7.1 targeted densify:** browse public caches upsert/remove on list create/update/visibility/delete; drop unified on delete (no warm ghost detail); insights invalidation covers activity+popular; URL/import impact marks all business-insights stale.
- Retained: `invalidateMutationImpact` gateway + optimistic store + SSE. Full densify rewrite / JWT-null SSR still OOS.
- Defer: api-docs, api-status, list-detail chrome.

## Human

- HA-0001 Firewall
- Match Sentry org/token before `SENTRY_UPLOAD_SOURCEMAPS=1`
- TASK-0039 production verify after deploy

## Remaining (user later)

- More spacing/gaps across pages
- Button consistency
- C7.2 api-docs / api-status / list-detail late chrome if needed
- SSR hydrate overwrite guard only if soft-nav delete flicker still reproduces

## Current checkpoint

- **Stage:** C7.1 complete locally. GATE-0027 via densify fix request.
- **Scope:** Real densify gaps only (browse soft-nav, deleted unified, insights Infinity-stale).
- **Validation:** Jest 101/5 · lint 0 · tsc · build pass.
- **Docs:** CLAUDE · `.agile-v/*` synced.

## Next

```text
Commit + push C7.0+C7.1; after deploy verify: toggle visibility → Browse warm has no stale row;
delete list → soft-nav detail not warm-ghost; Insights Popular/Activity refresh after URL CRUD.
```
