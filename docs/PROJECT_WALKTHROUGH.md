# PROJECT_WALKTHROUGH.md

Compact agent map for Daily Urlist. Code is source of truth; details in `.agile-v/` and `docs/`.

## What it is
Next.js 15 App Router URL bookmark app: lists/URLs CRUD, AI enhance/search/collections, collab (roles, comments, SSE), Redis cache, vector search, QStash jobs, Cloudinary, Vercel.

## Layout
- `src/app/**/page.tsx` — thin server shells → `src/components/pages/*` clients
- `src/app/api/**` — Route Handlers
- `src/hooks/useListQueries.ts` + `src/utils/queryInvalidation.ts` — React Query Infinity
- `src/lib/auth.ts` — cookie sessions (not NextAuth)
- `src/lib/redis.ts` — Upstash REST; optional `getCache`/`setCache`/`deleteCache`
- `src/lib/ai/*` — providers `models[]` + shared client fallback
- `src/components/ui/safe-image.tsx` — optimizer → native `<img>` (UrlCard)
- Prisma: `List.urls` / `archivedUrls` JSON arrays

## Observability (2026-08)
- Sentry: `@sentry/nextjs`, `tunnelRoute: "/api/monitoring"`, env-gated DSN
- PostHog: env-gated; idle without `NEXT_PUBLIC_POSTHOG_KEY`
- Guardrails: security headers, robots.ts, vercel.json

## Env
See `.env.example`. Real secrets: `.env.local` / Vercel only.

## Docs of note
`docs/AGILE_V_PROTOCOL.md` · `LLM_MODEL_SELECTION.md` · `VERCEL_PRODUCTION_GUARDRAILS.md` · `SAFE_IMAGE_REUSABLE_COMPONENT.md` · `Redis_Sentry_PostHog_INTEGRATION_GUIDE.md`
