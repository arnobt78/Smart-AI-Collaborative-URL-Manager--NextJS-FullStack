# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7 — densify + UrlCard actions)
Done: C7.8–C7.22 · **LLM** `c085f69` REQ-AI-0001 · **Icons** CONTROL/DECORATIVE · **C7.18** SSE `eventKey` dedup.
**C7.19** Empty/browse polish + SC create/cold-path (known-empty thin paint; SC expand gate; Create Collection mount lock).
**C7.20** Visibility/browse densify (preserve owner `user`; skip unified invalidate; activity prepend + SSE mark); Create Collection seeds Activity; UrlCard fav/pin skipInvalidate densify; duplicate AlertDialog; `lib/sse-unified-dedup.ts`.
**C7.21** Network-smoke fixes: fav/pin densify-before-await + single-flight + SSE cancel; reorder strip/`!ok` rollback + unified densify; Activity FIFO **20** + prune; jobs densify + `skipUnified`; metadata batch Map; e2e on demo DB (`E2E_ALLOW_SHARED_DB`).
**C7.22** Refresh hang + polish: metadata `lite=1` + job/client timeouts; toast always clears (`finally` only if `!toastSettled`); drag activity guard; click mark + analytics `skipUnified`; pin SSE window; Saving toasts; Activity “Latest 20” subtitle.
Stack: Next **16.3.3** · React **19.2.8** · Node **24.x** · **`src/proxy.ts`** · Prisma **6.19.3**.
Defer: `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8; Activity badge spinner; PATCH/job latency.
Human: HA-0001; GATE-0039 closed; parked next: Add URL `https://` 400, archive-url 400, UrlCard empty on fast scroll (after prod re-smoke).
Validate: Jest · lint 0 · tsc · build · e2e C7.21–C7.22 · audit 0. · Resume: `.agile-v/STATE.md`.

## Stack
Next 16.3.3 · React 19.2 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel + `.nvmrc`)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` via `useLayoutEffect` · Smart Collections create stays on page; SC AI fetch on expand; Create Collection mount lock until POST success  
C7.9–C7.15: thin seed + soft-nav UrlList/Copy/`ListDetailJobsMenu` + Radix glass menus; `listShareUrl`/`NEXT_PUBLIC_BASE_URL`; Back `warmRouterPush("/lists")`; `shouldPaintWarmSoftNav` for history.  
Visit: real `<a target="_blank">` via `ensureAbsoluteHttpUrl` (title/Visit/Similar); empty href → disabled `IconButton` / span; `openExternalUrl` kept for programmatic cases.  
UrlCard: single `CARD_PAD` column (body + inset `h-px` + italic note); shared `URL_META_CHIP_*` from `glass-badge-styles`.
List detail: `ListDetailSection` wraps PM/SC (urls≥2)/Activity; `GLASS_LIST_CARD` on header/browse/MyLists/skeletons; generic `Card` uses `GLASS_CARD`.
C7.16 Wave 0–Insights polish: DescriptionRow/ListMetaDates/SectionCountBadge; skeleton + warm cache; Activity full-bleed hover; chart labels (see prior commits).
C7.17: PM avatar = navbar ring; dnd `restrictToVerticalAxis` + `verticalOnlyTransform` (`lib/dnd-vertical.ts`) + list `overflow-x-hidden`; Dialog `headerMode="scroll"` (Similar/Comments/Edit/Add/Collab); UrlList Lucide Search + client filter (no AI bar); Comments `knownCount===0` skip fetch; Similar RQ warm cache; Button `loadingText` hides children while loading.
C7.19: thin known-empty collab/SC chrome; UrlList search empty; Browse Robohash owner + slug guard; tombstone soft-nav not-found.
C7.20: visibility densify no You-flash; Create Collection Activity seed; fav/pin densify without unified refetch; duplicate confirm dialog.
C7.21: fav/pin pre-await densify + SSE invalidate cancel; `toReorderUrlItems` + drag unified densify; `ACTIVITY_FEED_LIMIT=20` + DB prune; jobs `{ list, activity }` densify; `metadataBatchInFlight`.
C7.22: refresh-metadata `lite=1` + AbortSignal timeouts; ListPage settleToast; drag activity `id`+email+slug guard; click densify mark; analytics `skipUnified`; Saving/Reordering toasts; Activity FIFO subtitle.

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
