# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C1)
Done: AI/guardrails/SafeImage/observability/deps/SEO · Portable Auth UI · flash/navbar/Select stability · educational README.  
Human: HA-0001 Firewall; Sentry org/token.  
Out of scope: densify/JWT SSR, Zod/SHA, Next 16.

## Stack
Next 15.5.23 · React 18 · RQ Infinity · Prisma 6.19 · cookie auth · Upstash · multi-AI · Sentry `/api/monitoring` · PostHog · Jest

## Auth UI
`UserAvatar` · `robohashUrl` · `TEST_ACCOUNTS` · `ProfileDropdown` · `urlist:wasAuthed`  
HomePage gates Auth vs marketing on `wasAuthed` (no homepage flash). Navbar brand is static.

## Validate
`tsc` · `lint` · `test` · `build` · `npm audit` → `.agile-v/VALIDATION_SUMMARY.md`
