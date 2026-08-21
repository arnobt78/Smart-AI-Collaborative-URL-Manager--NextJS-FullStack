# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7.7)
Done: C7.6 Refresh · **C7.7** optimistic logout (force-guest until login; skip session fetch; keepalive signout; no Auth↔Marketing flicker).
Nav: warm Lists/Browse/Insights; api-status chrome+refresh; api-docs skeleton.
Data: densifyBrowse + invalidateMutationImpact + SSE. Full densify/JWT-null SSR OOS.
Defer: further lists/browse cold API slim; status API speed OOS.
Human: HA-0001; TASK-0039 after deploy.
Validate: Jest 104/5 · lint 0 · tsc.

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
