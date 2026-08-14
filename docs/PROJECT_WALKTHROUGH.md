# PROJECT_WALKTHROUGH.md

Compact agent map. Code = source of truth.

## App
Next 15 App Router URL bookmark manager: CRUD lists/URLs, AI, collab SSE, Redis, vector, QStash, Cloudinary. Demo: https://daily-urlist.vercel.app/

## Layout
- `src/app/**/page.tsx` → `src/components/pages/*`
- `src/app/api/**` Route Handlers · `layout.tsx` SEO metadata + JSON-LD
- `sitemap.ts` / `robots.ts` · `SECURITY.md` private vuln reports
- Hooks: `useListQueries` + `queryInvalidation` · Auth: `src/lib/auth.ts` cookies
- Redis helpers · AI `providers`+`client` · `SafeImage` on UrlCard
- Prisma: `List.urls` / `archivedUrls` JSON

## Versions
Next **15.5.23** · React **18** · Prisma **6.19.3** · Jest only · audit **0**

## Env
`.env.example` · secrets in `.env.local`/Vercel only

## Docs
`README.md` · `LLM_MODEL_SELECTION.md` · `VERCEL_PRODUCTION_GUARDRAILS.md` · `SAFE_IMAGE_*` · `Redis_Sentry_PostHog_*` · `.agile-v/`
