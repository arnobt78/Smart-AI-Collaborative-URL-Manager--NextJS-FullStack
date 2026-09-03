# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7 — icon size tokens)
Done: C7.8–C7.17 · **LLM** `c085f69` REQ-AI-0001 · **Icons** `UI_ICON_CONTROL` (`h-5 w-5`) / `UI_ICON_DECORATIVE` (`h-6 sm:h-8`); PageHeader badge `h-10 w-10`; Home Create/View CTAs both CONTROL.
**C7.17** list-detail polish: collaborator avatars = navbar `border border-white/20`; URL drag Y-only (`restrictToVerticalAxis` + `verticalOnlyTransform` + `overflow-x-hidden`); Visit/Similar Visit real `<a target="_blank">` via `ensureAbsoluteHttpUrl` (empty href disabled); Dialog `headerMode="scroll"` parity (Similar/Comments/Edit/Add/Collab); UrlList Lucide Search + instant client filter (no AI smart-search bar); Comments `knownCount===0` skip fetch; Similar RQ `["similar", listId, urlId]` warm cache; Button `isLoading` = spinner + `loadingText` only.
Stack: Next **16.3.3** · React **19.2.8** · Node **24.x** (`.nvmrc` / `engines`; use nvm 24 — shell may still be 22); **`src/proxy.ts`** (Next 16+; not `middleware.ts`); flat ESLint; audit **0**; Prisma **6.19.3**.
Nav: warm Lists/Browse/Insights; api-status chrome+refresh; api-docs skeleton.
Data: densifyBrowse + dropUnified tombstone + invalidateMutationImpact + SSE. Full densify/JWT-null SSR OOS.
Defer: `(auth)` route-group (optional); lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8; conditional SC soft-nav skeleton when urls&lt;2; further UrlCard action bugs (user list later).
Human: HA-0001; TASK-0039 smoke; next polish after user list.
Validate: Jest · lint 0 · tsc · build · audit 0. · Resume: `.agile-v/STATE.md`.

## Stack
Next 16.3.3 · React 19.2 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel + `.nvmrc`)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` via `useLayoutEffect` · Smart Collections create stays on page  
C7.9–C7.15: thin seed + soft-nav UrlList/Copy/`ListDetailJobsMenu` + Radix glass menus; `listShareUrl`/`NEXT_PUBLIC_BASE_URL`; Back `warmRouterPush("/lists")`; `shouldPaintWarmSoftNav` for history.  
Visit: real `<a target="_blank">` via `ensureAbsoluteHttpUrl` (title/Visit/Similar); empty href → disabled `IconButton` / span; `openExternalUrl` kept for programmatic cases.  
UrlCard: single `CARD_PAD` column (body + inset `h-px` + italic note); shared `URL_META_CHIP_*` from `glass-badge-styles`.
List detail: `ListDetailSection` wraps PM/SC (urls≥2)/Activity; `GLASS_LIST_CARD` on header/browse/MyLists/skeletons; generic `Card` uses `GLASS_CARD`.
C7.16 Wave 0–Insights polish: DescriptionRow/ListMetaDates/SectionCountBadge; skeleton + warm cache; Activity full-bleed hover; chart labels (see prior commits).
C7.17: PM avatar = navbar ring; dnd `restrictToVerticalAxis` + `verticalOnlyTransform` (`lib/dnd-vertical.ts`) + list `overflow-x-hidden`; Dialog `headerMode="scroll"` (Similar/Comments/Edit/Add/Collab); UrlList Lucide Search + client filter (no AI bar); Comments `knownCount===0` skip fetch; Similar RQ warm cache; Button `loadingText` hides children while loading.

## Insights
`ActivityChartSkeleton` on soft-nav · single `LineChart` + non-zero `LabelList` (7/30) · pie slice-colored labels · `InsightsChartTooltip` · Popular/Global icon gaps via `UI_CONTROL_ICON_GAP`

## Auth
`/login` — `Auth.tsx` page (no nav/footer); force-guest cookie+sessionStorage; keepalive signout; clear RQ/`react-query:*`/session cookies.  
Home: `WAS_AUTHED_COOKIE`+`session_token` SSR Marketing; guests redirect `/login`.  
401/list guard → `/login`. **`src/proxy.ts`** sets `x-pathname` (Next 16 proxy convention; not `middleware.ts`).

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `HEADING_STACK` / `PAGE_HEADER` / `CARD_STACK` / `CARD_PAD`  
`src/lib/ui/control-styles.ts` — `UI_CONTROL_ICON_GAP` (`gap-1`) · `UI_ICON_CONTROL` (`h-5 w-5`) · `UI_ICON_DECORATIVE` (`h-6 sm:h-8`) · `UI_LIST_CARD_META_BADGE` · `UI_ICON_MENU_TRIGGER` · `UI_SECTION_COUNT_BADGE` · `UI_GLASS_MENU_PANEL` / `ITEM` / `SEPARATOR` / `TRIGGER_FOCUS`  
`src/components/ui/dropdown-menu.tsx` — Radix `@radix-ui/react-dropdown-menu` + glass chrome (`modal={false}`); jobs, collab, profile, Auth guest, bulk import/export

## Glass UI
`src/lib/ui/glass-button-styles.ts` · `glass-badge-styles.ts` (`URL_META_CHIP_*`) · `glass-card-styles.ts` (`GLASS_CARD` generic · `GLASS_LIST_CARD` list/browse/detail)

## Validate
`tsc` · `lint` (`eslint .`, 0) · Jest · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
