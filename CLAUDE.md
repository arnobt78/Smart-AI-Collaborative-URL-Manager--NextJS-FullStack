# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C7.8)
Done: C7.7 force-guest · **C7.8** `/login` chrome-free Auth (middleware `x-pathname`; root layout skips nav/footer); guests `/`→`/login`; logout→`/login`; one document scrollbar (no overlay double-track).
Nav: warm Lists/Browse/Insights; api-status chrome+refresh; api-docs skeleton.
Data: densifyBrowse + invalidateMutationImpact + SSE. Full densify/JWT-null SSR OOS.
Defer: `(auth)` route-group (optional); lists/browse cold API slim; status API speed OOS.
Human: HA-0001; TASK-0039 after deploy.
Validate: Jest 105/5 · lint 0 · tsc.

## Stack
Next 15.5.23 · React 18 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` from RQ · Smart Collections create stays on page  
Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` in `lib/utils.ts` (schemeless hosts)

## Auth
`/login` — `Auth.tsx` page (no nav/footer); force-guest cookie+sessionStorage; keepalive signout; clear RQ/`react-query:*`/session cookies.  
Home: `WAS_AUTHED_COOKIE`+`session_token` SSR Marketing; guests redirect `/login`.  
401/list guard → `/login`. `middleware.ts` sets `x-pathname`.

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `HEADING_STACK` / `PAGE_HEADER` / `CARD_PAD`

## Glass UI
`src/lib/ui/glass-button-styles.ts` · `glass-badge-styles.ts` · `glass-card-styles.ts`

## Validate
`tsc` · `lint` (0) · Jest · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
