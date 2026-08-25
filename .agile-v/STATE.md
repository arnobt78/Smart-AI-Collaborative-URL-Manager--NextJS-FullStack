# STATE.md

**C7.11** | 2026-08-25

## Done

- **C7.10:** List-detail UX polish — absolute share (`NEXT_PUBLIC_BASE_URL` / `listShareUrl`); Blocks/Globe2/GlobeLock/Back; UrlList during thin seed; PermissionManager two-col + calendar meta; Search icon; badge typography; LIST_STACK rhythm.
- **C7.10.1:** Flash harden — `syncCurrentListFromSeedRow` (incl. seed early-return); soft-nav paints UrlList; `shouldPaintWarmSoftNav` for Back/Forward; warm Back; ignore stuck thin-seed on unified `isError`.
- **C7.11:** Insights — soft-nav `ActivityChartSkeleton`; single Activity `LineChart`; YAxis `width={36}`; Popular/Global icon-meta gaps; shared `InsightsChartTooltip`; pie `label={false}`.
- Prior: C7.9 soft-nav seed · C7.8 `/login` · densify.

## Human

- HA-0001 Firewall
- TASK-0039 production verify after deploy (Lists→detail soft-nav + Insights revisit chart)

## Remaining (user later)

- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; browse densify `"you@local"` actor (pre-C7.1); further list-detail UX one-by-one

## Current checkpoint

- **Stage:** C7.10 + C7.10.1 + C7.11 locally validated; commit-ready.
- **Validation:** tsc · lint 0 · soft-nav/Insights Jest · build PASS.
- **Docs:** CLAUDE · STATE · walkthrough · `.agile-v` synced this session.

## Next

```text
Prod: Lists→detail (absolute share, UrlList soft-nav, warm Back).
Insights revisit (no double chart; tooltip; icon gaps).
TASK-0039.
```
