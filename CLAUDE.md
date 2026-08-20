# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C6.6)
Done: C6.5 dialogs · C6.6 instant soft-nav shells (segment `loading.tsx` + auth-only RSC).
Dialogs: `ui/Dialog.tsx` sole overlay; compact divider-free headers. `useListDialogRouteState` = React + `history.state` on same href (no `_rsc`); never strip `?dialog=` on close. Deep-link query is mount-only. Shared `CreateListDialog`. Mutating overlays stay pending until network + paint.
Nav: Lists/Browse/Insights/detail use `RoutePageSkeleton` via segment `loading.tsx` (children only; Navbar stays). Protected `page.tsx` = `requirePageUser` + empty dehydrate; client RQ fills data. Cold slots use `useDelayedPending`. `getCurrentUser`/`getCurrentSession` use per-request `React.cache`.
Stable UI: Browse retains cached cards during refetch; `ui/PageHeader.tsx` standardizes icon/title/subtitle identity rows.
Stable data: delayed cold placeholders only; Browse/Lists/Insights/API Status/detail keep their static shell. Unified list batches comment counts for card badges; bulk import never reloads. Metadata route is Node-only, public HTTP(S)-only, DNS/IP checked for documents/images/favicons, redirect-checked, timeout-bounded, and list-access guarded.
Comment badge rule: create +1, delete -1, edit 0; failed mutations restore only their own optimistic delta.
Auth menu: open guest credentials panel is opaque and stacked above reveal rows; trigger uses expanded/menu ARIA. Logout closes its menu immediately, shows a non-blocking status only after 1.2s, and clears cache only after secure server confirmation.
Data: unified React Query + snapshot-first optimistic store updates + centralized invalidation + SSE; completed URL mutations patch list-card summaries before one reconciliation. Public lists are discoverable and viewable by authenticated Daily Urlist accounts only; protected pages verify persisted sessions before rendering. `lib/*-query-keys.ts` owns shared keys.
Mutation UX: visibility updates all visible list surfaces optimistically; form/dialog submit controls guard duplicate requests without dialog-wide locks; collection/archive/reorder/metadata/action flows use one store or hook-owned snapshot commit/rollback and typed impact; primary and suggested URL visits are semantic safe new-tab links.
Human: HA-0001; match Sentry org/token before upload.  
Audit: Prisma CLI transitively pins `deepmerge-ts@7.1.5` (3 high findings); user accepted RISK-0016. Retain Prisma 6; do not force-downgrade or upgrade.
Audit rerun: Zod · SHA-256 sessions · persistence-backed auth · `invalidateMutationImpact` · lint · tsc · Jest (91 pass/5 skip) · build pass.
Manual: TASK-0039 dialogs + C6.6 soft-nav shell after deploy.
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
