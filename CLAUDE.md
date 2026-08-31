# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7.14)
Done: C7.8–C7.13 · **C7.14** list-detail chrome polish + **`GlassPortalMenu`** (body portal, flip/clamp, `z-[900]`) for jobs / collaborators / `ProfileDropdown`; `UI_ICON_MENU_TRIGGER` h-10; share row in header stack; UrlCard text-xs dates + note/title align; Insights dense rows `gap-1`.
Stack: Next **16.3.3** · React **19.2.8** · Node **24.x** (`.nvmrc` / `engines`; use nvm 24 — shell may still be 22); **`src/proxy.ts`** (Next 16+; not `middleware.ts`); flat ESLint; audit **0**; Prisma **6.19.3**.
Nav: warm Lists/Browse/Insights; api-status chrome+refresh; api-docs skeleton.
Data: densifyBrowse + dropUnified tombstone + invalidateMutationImpact + SSE. Full densify/JWT-null SSR OOS.
Defer: `(auth)` route-group (optional); lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8; UrlFilterBar portal OOS.
Human: HA-0001; TASK-0039 after deploy.
Validate: Jest · lint 0 · tsc · build · audit 0.

## Stack
Next 16.3.3 · React 19.2 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel + `.nvmrc`)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` via `useLayoutEffect` · Smart Collections create stays on page  
C7.9–C7.14: thin seed + soft-nav UrlList/Copy/`ListDetailJobsMenu` + `GlassPortalMenu`; `listShareUrl`/`NEXT_PUBLIC_BASE_URL`; Back `warmRouterPush("/lists")`; `shouldPaintWarmSoftNav` for history.  
Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` in `lib/utils.ts` (title, Visit, Similar)

## Insights
`ActivityChartSkeleton` on soft-nav · single `LineChart` + non-zero `LabelList` (7/30) · pie slice-colored labels · `InsightsChartTooltip` · Popular/Global icon gaps via `UI_CONTROL_ICON_GAP`

## Auth
`/login` — `Auth.tsx` page (no nav/footer); force-guest cookie+sessionStorage; keepalive signout; clear RQ/`react-query:*`/session cookies.  
Home: `WAS_AUTHED_COOKIE`+`session_token` SSR Marketing; guests redirect `/login`.  
401/list guard → `/login`. **`src/proxy.ts`** sets `x-pathname` (Next 16 proxy convention; not `middleware.ts`).

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `HEADING_STACK` / `PAGE_HEADER` / `CARD_PAD`  
`src/lib/ui/control-styles.ts` — `UI_CONTROL_ICON_GAP` · `UI_ICON_MENU_TRIGGER` · `UI_GLASS_MENU_PANEL`  
`src/components/ui/GlassPortalMenu.tsx` — body-portaled glass … menus (jobs, collab, profile)

## Glass UI
`src/lib/ui/glass-button-styles.ts` · `glass-badge-styles.ts` · `glass-card-styles.ts`

## Validate
`tsc` · `lint` (`eslint .`, 0) · Jest · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
