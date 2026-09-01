# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7.16)
Done: C7.8–C7.15 · **C7.16** `GLASS_LIST_CARD` + `GLASS_CARD` split; `ListDetailSection`; PM/Activity/SC section parity; `URL_META_CHIP_*` in `glass-badge-styles`; UrlFilterBar Radix; soft-nav skeleton fragment; UrlFilterBar tests · **C7.16 Wave 0** shared `DescriptionRow`/`ListMetaDates`/`SectionCountBadge`/`CharacterCounter`; MyListsCard unified metadata; list-detail share+dates row; form counters 200/5000; pessimistic list/URL delete; visibility confirm dialog; SC/Activity/tab badges; AI collection naming fallback; PM inline empty state; BrowsePublicListCard `DescriptionRow` · **C7.16 mobile polish** `ListDetailSectionHeader`; mobile list-detail header (action row + full-width title); PM/Activity two-line section headers; share inline copy + blue globe; UrlCard inline title/health + centered placeholder; `UI_CONTROL_ICON_GAP` `gap-1`; `UI_LIST_CARD_META_BADGE`; MyListsCard/Browse mobile metadata wrap · **C7.16 mobile Wave 2** PM blue shield; ActivityFeed overflow/hover/dividers; UrlHealthIndicator `inline` variant; UrlCard skeleton/imageLoading scroll-flicker fix; mobile blur compositing fallback · **C7.16 Wave 3** REQ-0025 manual job auth for jobs menu; loading toasts (`updateToast`) for Refresh Metadata + Health Check; Lucide inline health badge; `HoverTooltip` span hydration fix; Activity header hover inset + `ListDetailSection` overflow clip · **C7.16 skeleton + warm cache** `ListDetailBodySkeletons` section-shaped shells; `ListDetailBodySections` shared live sections; `isUnifiedListHydrated` skips body skeletons on warm revisit; Activity overlay scrollbar + full-width section header hover.
Stack: Next **16.3.3** · React **19.2.8** · Node **24.x** (`.nvmrc` / `engines`; use nvm 24 — shell may still be 22); **`src/proxy.ts`** (Next 16+; not `middleware.ts`); flat ESLint; audit **0**; Prisma **6.19.3**.
Nav: warm Lists/Browse/Insights; api-status chrome+refresh; api-docs skeleton.
Data: densifyBrowse + dropUnified tombstone + invalidateMutationImpact + SSE. Full densify/JWT-null SSR OOS.
Defer: `(auth)` route-group (optional); lists/browse cold API slim; status API speed OOS; full metadata rewrite OOS; Prisma 7/8; conditional SC soft-nav skeleton when urls&lt;2.
Human: HA-0001; TASK-0039 after deploy.
Validate: Jest · lint 0 · tsc · build · audit 0.

## Stack
Next 16.3.3 · React 19.2 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel + `.nvmrc`)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` via `useLayoutEffect` · Smart Collections create stays on page  
C7.9–C7.15: thin seed + soft-nav UrlList/Copy/`ListDetailJobsMenu` + Radix glass menus; `listShareUrl`/`NEXT_PUBLIC_BASE_URL`; Back `warmRouterPush("/lists")`; `shouldPaintWarmSoftNav` for history.  
Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` in `lib/utils.ts` (title, Visit, Similar)  
UrlCard: single `CARD_PAD` column (body + inset `h-px` + italic note); shared `URL_META_CHIP_*` from `glass-badge-styles`.
List detail: `ListDetailSection` wraps PM/SC (urls≥2)/Activity; `GLASS_LIST_CARD` on header/browse/MyLists/skeletons; generic `Card` uses `GLASS_CARD`.
C7.16 Wave 0: `DescriptionRow` (cards + detail); `ListMetaDates` + `ListDetailShareRow`; `SectionCountBadge` (PM/Activity/tabs/SC); char counters `form-limits`; `useDeleteList` `deferOptimistic`; `removeUrlFromList` `{ optimistic: false }`; visibility `AlertDialog`; `collection-naming` heuristic fallback.
C7.16 mobile: `ListDetailSectionHeader` (PM + Activity; SC OOS); mobile header Back/jobs row then title; share URL `break-words` + inline copy; Activity flat rows; UrlCard inline health; list-card `UI_LIST_CARD_META_BADGE` + title/desc wrap.
C7.16 mobile Wave 2: PM `text-blue-400` shield; ActivityFeed `overflow-hidden` + button hover; `UrlHealthIndicator` inline variant; UrlCard placeholder center + skeleton/imageLoading scroll fix.
C7.16 Wave 3: manual job auth (`isAuthorizedManualListJob`); loading toasts for metadata refresh + health check; Lucide inline health badge; HoverTooltip span hydration; Activity header hover inset.
C7.16 skeleton + warm cache: `ListDetailBodySections` / `ListDetailBodySkeletons`; `isUnifiedListHydrated` + `syncUnifiedSubCachesFromUnified` — body skeletons only on thin seed; warm revisit paints live PM/SC/Activity; Activity overlay scrollbar + full-width section header hover.

## Insights
`ActivityChartSkeleton` on soft-nav · single `LineChart` + non-zero `LabelList` (7/30) · pie slice-colored labels · `InsightsChartTooltip` · Popular/Global icon gaps via `UI_CONTROL_ICON_GAP`

## Auth
`/login` — `Auth.tsx` page (no nav/footer); force-guest cookie+sessionStorage; keepalive signout; clear RQ/`react-query:*`/session cookies.  
Home: `WAS_AUTHED_COOKIE`+`session_token` SSR Marketing; guests redirect `/login`.  
401/list guard → `/login`. **`src/proxy.ts`** sets `x-pathname` (Next 16 proxy convention; not `middleware.ts`).

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `HEADING_STACK` / `PAGE_HEADER` / `CARD_STACK` / `CARD_PAD`  
`src/lib/ui/control-styles.ts` — `UI_CONTROL_ICON_GAP` (`gap-1`) · `UI_LIST_CARD_META_BADGE` · `UI_ICON_MENU_TRIGGER` · `UI_SECTION_COUNT_BADGE` · `UI_GLASS_MENU_PANEL` / `ITEM` / `SEPARATOR` / `TRIGGER_FOCUS`  
`src/components/ui/dropdown-menu.tsx` — Radix `@radix-ui/react-dropdown-menu` + glass chrome (`modal={false}`); jobs, collab, profile, Auth guest, bulk import/export

## Glass UI
`src/lib/ui/glass-button-styles.ts` · `glass-badge-styles.ts` (`URL_META_CHIP_*`) · `glass-card-styles.ts` (`GLASS_CARD` generic · `GLASS_LIST_CARD` list/browse/detail)

## Validate
`tsc` · `lint` (`eslint .`, 0) · Jest · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
