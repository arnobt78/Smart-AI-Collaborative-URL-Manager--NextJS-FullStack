# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7.11)
Done: C7.8 `/login` · C7.9 list-detail soft-nav · **C7.10** list-detail UX (absolute share via `NEXT_PUBLIC_BASE_URL`, icons/Back, UrlList during thin seed, collab layout, Search) · **C7.10.1** flash harden (store sync early-return, soft-nav UrlList, warm Back/history `shouldPaintWarmSoftNav`, thin-seed ignore on error) · **C7.11** Insights (chart skeleton soft-nav, single LineChart, YAxis gutter, icon-meta gaps, `InsightsChartTooltip`).
Nav: warm Lists/Browse/Insights; api-status chrome+refresh; api-docs skeleton.
Data: densifyBrowse + dropUnified tombstone + invalidateMutationImpact + SSE. Full densify/JWT-null SSR OOS.
Defer: further list-detail UX; `(auth)` route-group (optional); lists/browse cold API slim; status API speed OOS.
Human: HA-0001; TASK-0039 after deploy.
Validate: Jest soft-nav/Insights · lint 0 · tsc · build.

## Stack
Next 15.5.23 · React 18 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` via `useLayoutEffect` · Smart Collections create stays on page  
C7.9–C7.10.1: thin seed + soft-nav UrlList; `listShareUrl`/`NEXT_PUBLIC_BASE_URL`; Back `warmRouterPush("/lists")`; `shouldPaintWarmSoftNav` for history.  
Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` in `lib/utils.ts`

## Insights
`ActivityChartSkeleton` on soft-nav · single `LineChart` · `InsightsChartTooltip` · Popular/Global icon gaps via `UI_CONTROL_ICON_GAP`

## Auth
`/login` — `Auth.tsx` page (no nav/footer); force-guest cookie+sessionStorage; keepalive signout; clear RQ/`react-query:*`/session cookies.  
Home: `WAS_AUTHED_COOKIE`+`session_token` SSR Marketing; guests redirect `/login`.  
401/list guard → `/login`. `middleware.ts` sets `x-pathname`.

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `HEADING_STACK` / `PAGE_HEADER` / `CARD_PAD`  
`src/lib/ui/control-styles.ts` — `UI_CONTROL_ICON_GAP`

## Glass UI
`src/lib/ui/glass-button-styles.ts` · `glass-badge-styles.ts` · `glass-card-styles.ts`

## Validate
`tsc` · `lint` (0) · Jest · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
