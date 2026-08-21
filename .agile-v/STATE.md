# STATE.md

**C7.2** | 2026-08-21

## Done

- **C7.2:** Dark scrollbar (no gray-100 flash) · `prefetch={false}` footer About/Privacy/Terms + Profile api-docs/api-status · Insights overview+activity share one cached Prisma list scan.
- Through C7.1 densify + C7.0 soft-nav chrome.
- Keep Sentry monitoring; main Navbar warm prefetch unchanged.
- Defer: api-docs/api-status/list-detail chrome; lists/browse further API slim (free-tier cold floor).

## Human

- HA-0001 Firewall
- Match Sentry org/token before `SENTRY_UPLOAD_SOURCEMAPS=1`
- TASK-0039 production verify after deploy

## Remaining (user later)

- More spacing/gaps; button consistency
- Further lists/browse cold API trim if still needed after Insights win

## Current checkpoint

- **Stage:** C7.2 complete on `main`. GATE-0028 approved.
- **Validation:** Jest 103/5 · lint 0 · tsc · build pass.
- **Docs:** CLAUDE · `.agile-v/*` synced.

## Next

```text
After deploy: soft-nav no white scrollbar; hover footer ≠ about?_rsc; cold Insights lighter (one list scan).
TASK-0039 prod verify.
```
