# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C6.8)
Done: C6.5–C6.7 nav/dialogs · C6.8 warm soft-nav + lighter Insights RSC.
Dialogs: `ui/Dialog.tsx` sole overlay; `useListDialogRouteState` = React + `history.state` (no `_rsc`); never strip `?dialog=` on close. Mutating overlays pending until network + paint.
Nav: `WarmSoftNavLink` / `warmRouterPush` + `soft-nav-cache` skip `loading.tsx` skeleton when RQ already has destination data; cold keeps `RoutePageSkeleton`. Pages = `requirePageUser` + SSR prefetch/dehydrate. Insights SSR seeds overview+activity only; other tabs `enabled` on select. `getCurrentUser` reuses `session.user`.
Stable UI/data: delayed cold slots; Browse cached cards; metadata Node-only public HTTP(S)+DNS/IP; comment badges create+1/delete-1/edit0.
Auth menu: opaque guest panel; logout menu-first then server-confirmed cache clear.
Data: RQ Infinity + optimistic store + `invalidateMutationImpact` + SSE. Public lists auth-only. `lib/*-query-keys.ts` owns keys.
Human: HA-0001; match Sentry org/token before upload.  
Audit: RISK-0016 Prisma CLI advisory accepted. Jest 94/5 · lint 0 · tsc · build pass.
Manual: TASK-0039 + warm soft-nav (no skeleton on revisit) after deploy.
Out of scope: densify/JWT SSR, Next 16, Prisma 7.

## Stack
Next 15.5.23 · React 18 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` from RQ · Smart Collections create stays on page  
Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` in `lib/utils.ts` (schemeless hosts)

## Home refresh
`WAS_AUTHED_COOKIE` + `session_token` SSR → HomePage/Navbar; `useWasAuthedHint`; static `FloatingBackground`; `PostHogPageview` Suspense sibling only

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `HEADING_STACK` / `PAGE_HEADER` / `CARD_PAD`; `HEADING_STACK` is title+subtitle only (no control/content spacing changes).

## Auth layout
`Auth.tsx` — `md:grid-cols-2` inside `max-w-7xl`: left Welcome typewriter + about-process (no divider/left logo); right labeled Sign In + Sign up row. No 8s overlay. Sign In uses `glassPrimaryButtonClass("blue")` + Sparkles.

## Glass UI
`src/lib/ui/glass-button-styles.ts` (primary/action/ghost) · `glass-badge-styles.ts` · `glass-card-styles.ts` — ported from stock-inventory; Tailwind content includes `src/lib`.

## Validate
`tsc` · `lint` (0) · Jest · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
