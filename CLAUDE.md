# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7 — densify + UrlCard actions)
Done: C7.8–C7.25 · **LLM** `c085f69` REQ-AI-0001 · **Icons** CONTROL/DECORATIVE/INLINE_XS · **C7.18** SSE `eventKey` dedup.
**C7.19** Empty/browse polish + SC create/cold-path (known-empty thin paint; SC expand gate; Create Collection mount lock).
**C7.20** Visibility/browse densify (preserve owner `user`; skip unified invalidate; activity prepend + SSE mark); Create Collection seeds Activity; UrlCard fav/pin skipInvalidate densify; duplicate AlertDialog; `lib/sse-unified-dedup.ts`.
**C7.21** Network-smoke fixes: fav/pin densify-before-await + single-flight + SSE cancel; reorder strip/`!ok` rollback + unified densify; Activity FIFO **20** + prune; jobs densify + `skipUnified`; metadata batch Map; e2e on demo DB (`E2E_ALLOW_SHARED_DB`).
**C7.22** Refresh hang + polish: metadata `lite=1` + job/client timeouts; toast always clears (`finally` only if `!toastSettled`); drag activity guard; click mark + analytics `skipUnified`; pin SSE window; Saving toasts; Activity “Latest 20” subtitle.
**C7.23** UrlCard parked: metadata sanitize/Zod nullish (Add URL 400); archive strip + `mergeArchivedAtOnWrite`; dup-delete RQ guard; UrlCard image retry + viewport reset.
**C7.24** UI polish: toast enter soften; Dialog `titleAccessory` + Comments/Similar badges; Navbar active glow; Comments email/avatar/times; Edit densify-all + title precedence; Add `ReminderDateField`; Insights soft-nav warm chart; Popular badges; Restore pending dialog; scroll-to-card.
**C7.25** Smoke polish: Reminder Lucide→`showPicker`; `ArchivedUrlCard`+`ArchiveRestore`; `UI_ICON_INLINE_XS`+font-medium meta; ApiDocs gaps; archive single toast; Comments knownCount loading; Browse `SectionCountBadge`; archive/comment `skipUnified` (comment options forward).
**C7.26** Improve polish: pin scroll navbar offset; archive AlertDialog pending; comments Edited/`UI_ICON_INLINE_XS`; collab densify+avatar; invite `/login?next=` + Auth hard-nav; delete/collab `skipUnified`.
**C7.26.1** Auth hard-nav; list urlCount/badge hydration (`resolveListDetailPaintList`, `urlsBadgeSignature`, `ListDetailHydrationBoundary`); `safeInternalNextPath` URL-normalize; proxy `x-search` + `requirePageUser` pathname+search.
**C7.27 / Track B W1** SSE lean list summary + 20s heartbeat + connect-time filter; api-status in-process probes (`staleTime` 20s); check-urls `maxDuration=60`. HA-0001 DONE.
**C7.27 / Track B W2** lists/browse `urlCount` DTOs; SSE count-only + POLL 1.5s; defer idle sync-vectors (Similar on-demand); SC first expand no vectors; densify-first mutation strip; Sentry noise filters.
**C7.27 / Track B W3** card DB `jsonb_array_length` (no urls into Node); owner select id+email; SSE SETEX drop + LTRIM 0..9; EventSource pause when tab hidden.
**C7.27 / Free-tier A–D** Playwright Sentry-off e2e + SSE cancel/once; Track B network smoke e2e; `/api/cron/keep-warm` + GH Actions (optional); `REALTIME_TRANSPORT=list-poll` (SUBSCRIBE deferred).
**C7.27 follow-up** ApiDocs keep-warm `authMode: "internal"` badge; archive/restore commit uses operation-start snapshot (no late `currentList.get()`).
**C7.28** Known-zero empty paint: shared MyLists/Browse empties on soft-nav+pages; UrlList `urlCount` empty gate + thin pending; Activity thin non-pulse (`knownActivityCount` left undefined on thin seed).
**C7.29** Deps audit + Node 24: next/eslint-config-next **16.3.4**; sharp override **0.35.4**; nodemailer **9.1.1**; csv-parse **7.0.2**; overrides; `npm audit` **0**.
**C7.30** Collab smoke: densify My Lists `updatedAt` on add/role/remove; Viewer jobs `canRunJobs`; clear `authRedirect` on logout (invite `?next=` only).
**C7.31** Deferred polish closed: edit `scrollToUrlCard`; single navbar-offset `scrollTo`; opaque glass toasts; Insights loading while `isFetching && isPlaceholderData`; dup-scroll twin **Skip**.
**C7.32** Honest collab chrome: Add Collaborator only when `canInvite`; thin Activity/collab subtitles; Lists empty soft-nav skeleton; Insights overview+activity pair-load.
**C7.33** Collaborator revoke denylist (`role: revoked`) before public→viewer; SSR/client `accessDenied`; skeleton kick + toast + home; soft-nav cold; unified `refetchOnMount: "always"`; re-invite overwrites.
Stack: Next **16.3.4** · React **19.2.8** · Node **24.x** · **`src/proxy.ts`** · Prisma **6.19.3**.
Defer: `(auth)` route-group; absolute cold PATCH/`_rsc` SLAs; Redis SUBSCRIBE rewrite; virtualization; Cloudinary destroy; Prisma urlCount column.
Human: HA-0001 DONE; Vercel Node **24.x**; next: HA revoke smoke (remove → old invite) + push.
Validate: Jest · lint 0 · tsc · build · audit 0. · Resume: `.agile-v/STATE.md`.



## Stack
Next 16.3.4 · React 19.2 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel + `.nvmrc`)

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
C7.23: `sanitizeUrlMetadataForApi` + Zod nullish; archive `toReorderUrlItems` + `mergeArchivedAtOnWrite`; `shouldClearUrlMetadataCache`; UrlCard image retry + IO reset.
C7.24: Toast soften; Dialog `titleAccessory`; Navbar `usePathname` glow; Comments session email + UserAvatar + clock/edited; densify-all edits + `url.title || metadata?.title`; `ReminderDateField`; soft-nav warm `ActivityChart`; Popular `SectionCountBadge`; Restore AlertDialog+pending; `data-url-id` scroll.
C7.25: Reminder Lucide→`showPicker`; `ArchivedUrlCard`; `UI_ICON_INLINE_XS`; ApiDocs Insights-parity tabs; archive toast ownership; Comments knownCount loading; Browse title `SectionCountBadge`; archive/comment densify `skipUnified`.

## Insights
Soft-nav warm `ActivityChart` when activity cached · single `LineChart` + non-zero `LabelList` (7/30) · pie slice-colored labels · `InsightsChartTooltip` · Popular/Global icon gaps via `UI_CONTROL_ICON_GAP` · Popular `SectionCountBadge`

## Auth
`/login` — `Auth.tsx` page (no nav/footer); force-guest cookie+sessionStorage; keepalive signout; clear RQ/`react-query:*`/session cookies.  
Home: `WAS_AUTHED_COOKIE`+`session_token` SSR Marketing; guests redirect `/login`.  
401/list guard → `/login`. **`src/proxy.ts`** sets `x-pathname` (Next 16 proxy convention; not `middleware.ts`).

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `HEADING_STACK` / `PAGE_HEADER` / `CARD_STACK` / `CARD_PAD`  
`src/lib/ui/control-styles.ts` — `UI_CONTROL_ICON_GAP` (`gap-1`) · `UI_ICON_CONTROL` (`h-5 w-5`) · `UI_ICON_INLINE_XS` (`h-3.5 w-3.5`) · `UI_ICON_DECORATIVE` (`h-6 sm:h-8`) · `UI_LIST_CARD_META_BADGE` · `UI_ICON_MENU_TRIGGER` · `UI_SECTION_COUNT_BADGE` · `UI_GLASS_MENU_PANEL` / `ITEM` / `SEPARATOR` / `TRIGGER_FOCUS`  
`src/components/ui/dropdown-menu.tsx` — Radix `@radix-ui/react-dropdown-menu` + glass chrome (`modal={false}`); jobs, collab, profile, Auth guest, bulk import/export

## Glass UI
`src/lib/ui/glass-button-styles.ts` · `glass-badge-styles.ts` (`URL_META_CHIP_*`) · `glass-card-styles.ts` (`GLASS_CARD` generic · `GLASS_LIST_CARD` list/browse/detail)

## Validate
`tsc` · `lint` (`eslint .`, 0) · Jest · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
