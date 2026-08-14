# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — URL lists, AI enhance, collab SSE, vector search.  
Live: https://daily-urlist.vercel.app/  
Resume: `.agile-v/STATE.md`

## Status (C1)
Done: REQ-AI-0001 (AI models), REQ-0002 (guardrails), REQ-0003 (SafeImage), REQ-0005 (Redis align), REQ-0006 (Sentry tunnel `/api/monitoring` + PostHog env-gated).  
Human: HA-0001 Firewall Challenge+AI Deny; verify `SENTRY_ORG`/`PROJECT`; rotate auth token if exposed.

## Stack
Next 15.5 App Router · React 18 · RQ Infinity · Prisma/Postgres · cookie auth (`src/lib/auth.ts`, not NextAuth) · Upstash Redis/Vector/QStash · Cloudinary · multi-AI · Vercel · Jest

## Rules
SSR-first layouts; client only for interactivity. Reuse hooks/`queryInvalidation`. No parallel architectures. Mutations: persist + invalidate. Prefer comments in code over new summary MDs. Secrets only in `.env.local`/Vercel — never commit.

## Key paths
`src/app` · `src/components` · `src/hooks` · `src/lib` (ai, redis, auth, posthog) · `src/utils/queryInvalidation.ts` · `docs/` · `.agile-v/`

## Validate
typecheck · lint · test · build → `.agile-v/VALIDATION_SUMMARY.md`
