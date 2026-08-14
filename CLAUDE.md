# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C1)
Done: AI models, guardrails, SafeImage, Redis/Sentry/PostHog, dep upgrade (Next **15.5.23**, audit **0**), README/SECURITY, SEO metadata+sitemap.  
Human: HA-0001 Firewall; verify Sentry org/project; rotate token if exposed.  
Out of scope: densify/JWT SSR gateway, Zod/SHA rewrite, Next 16/React 19.

## Stack
Next 15.5.23 · React 18 · RQ Infinity · Prisma 6.19 · cookie auth (not NextAuth) · Upstash · multi-AI · Sentry `/api/monitoring` · PostHog env-gated · Jest · Vercel

## Rules
SSR-first; reuse hooks/`queryInvalidation`; mutations persist+invalidate; secrets only `.env.local`/Vercel.

## Validate
`tsc` · `lint` · `test` · `build` · `npm audit` → `.agile-v/VALIDATION_SUMMARY.md`
