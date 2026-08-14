# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C1)
Done: Auth UX · quiet prod logs · list-switch/cache sync · My Lists title nav · silent Smart Collections · Visit absolute URLs · Collaborators one-row + Card pad.  
Human: HA-0001; match Sentry org/token before upload.  
Out of scope: densify/JWT SSR, Zod/SHA, Next 16, Prisma 7.

## Stack
Next 15.5.23 · React 18 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` from RQ · Smart Collections create stays on page  
Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` in `lib/utils.ts` (schemeless hosts)

## Validate
`tsc` · `lint` · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
