# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C1)
Done: Auth UX · quiet prod console · clean Vercel build (Sentry upload opt-in + prisma.config.ts).  
Human: HA-0001; match Sentry org/token before upload.  
Out of scope: densify/JWT SSR, Zod/SHA, Next 16, Prisma 7.

## Stack
Next 15.5.23 · React 18 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest

## Deploy / Sentry
`next.config.js`: `sourcemaps.disable` unless `SENTRY_UPLOAD_SOURCEMAPS=1`; `silent`+`telemetry:false`; webpack `removeDebugLogging`.  
`prisma.config.ts` for seed (not package.json#prisma).

## Validate
`tsc` · `lint` · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
