# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C6.3)
Done: shared compact controls · Auth row reveal · homepage hero mount stagger · accessible Smart Collections disclosure · responsive Add URL cancel · consistent CTA icons · responsive 56px chrome · type-safe cache/SSE/abort paths · zero lint.
Controls: shared Button/glass/input contract is `h-10 min-h-10`; placeholders use `text-sm`. Marketing sections use CSS/observer reveal/parallax, no motion dependency.
Home wave: Authenticated hero logo/title/copy/CTA rows reuse the login form's CSS mount stagger; feature, workflow, and final CTA sections retain `ScrollReveal`/parallax.
Dialogs: `ui/Dialog.tsx` is the sole active accessible 92vw/85dvh overlay; fixed and scroll headers share the compact divider-free `pb-2 sm:pb-4` contract. Lists create/edit state uses `useListDialogRouteState` with native browser history, so open/close is immediate while direct links remain valid; create/edit/delete remain visibly pending until server completion and committed UI paint. `ActionButtons` provides note-with-X Cancel and Eraser Clear conventions.
Stable UI: Browse retains cached cards during refetch; `ui/PageHeader.tsx` standardizes icon/title/subtitle identity rows.
Stable data: delayed cold placeholders only; Browse/Lists/Insights/API Status/detail keep their static shell. Unified list batches comment counts for card badges; bulk import never reloads. Metadata route is Node-only, public HTTP(S)-only, DNS/IP checked for documents/images/favicons, redirect-checked, timeout-bounded, and list-access guarded.
Comment badge rule: create +1, delete -1, edit 0; failed mutations restore only their own optimistic delta.
Auth menu: open guest credentials panel is opaque and stacked above reveal rows; trigger uses expanded/menu ARIA. Logout closes its menu immediately, shows a non-blocking status only after 1.2s, and clears cache only after secure server confirmation.
Data: unified React Query + snapshot-first optimistic store updates + centralized invalidation + SSE; completed URL mutations patch list-card summaries before one reconciliation. Public lists are discoverable and viewable by authenticated Daily Urlist accounts only; protected pages verify persisted sessions before rendering. Server pages hydrate Lists, detail, Browse, Insights, and API Status with request-scoped query clients; `lib/*-query-keys.ts` owns shared keys.
Mutation UX: visibility updates all visible list surfaces optimistically; form/dialog submit controls guard duplicate requests without dialog-wide locks; collection/archive/reorder/metadata/action flows use one store or hook-owned snapshot commit/rollback and typed impact; primary and suggested URL visits are semantic safe new-tab links.
Human: HA-0001; match Sentry org/token before upload.  
Audit: Prisma CLI transitively pins `deepmerge-ts@7.1.5` (3 high findings); user accepted RISK-0016. Retain Prisma 6; do not force-downgrade or upgrade.
Audit rerun: shared Zod mutation parsing · SHA-256 digest sessions with legacy rotation · persistence-backed session verification · server query hydration · typed mutation-impact gateway · lint · strict TS · Jest (82 pass/5 skip) · production build pass. UI-affecting actions commit/rollback through the impact gateway; background-only indexing/scheduling requests intentionally do not invalidate rendered list caches.
Manual browser acceptance: REQ-0017 control/Home-motion and REQ-0018 metadata/action-badge flows await user testing; code-level verification is complete.
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
