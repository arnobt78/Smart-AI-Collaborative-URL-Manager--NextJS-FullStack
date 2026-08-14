# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C1)
Done: Auth UX (flash/navbar/Select/toasts/CTA/gutter/avatar) · `devLog` silences SSE/AI in prod.  
Human: HA-0001; Sentry. Out of scope: densify/JWT SSR, Zod/SHA, Next 16.

## Stack
Next 15.5.23 · React 18 · RQ Infinity · Prisma 6.19 · cookie auth · Upstash · multi-AI · Sentry tunnel · PostHog · Jest

## Auth / layout / logs
`wasAuthed` · static Navbar · `auth-toast` · `scrollbar-gutter: stable` · avatar `min-w-10`  
`lib/dev-log.ts` — use instead of `console.log` for SSE/AI diagnostics (prod no-op)

## Validate
`tsc` · `lint` · `test` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
