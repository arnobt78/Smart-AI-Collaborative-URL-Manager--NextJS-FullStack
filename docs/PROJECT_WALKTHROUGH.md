# PROJECT_WALKTHROUGH.md

Compact agent map. Code = source of truth.

## App
Next 15 URL bookmark manager. Demo: https://daily-urlist.vercel.app/

## Layout
- Pages → `src/components/pages/*` · API Route Handlers · SEO in `layout.tsx`
- Auth UI: `Auth.tsx` guest Select · `ProfileDropdown` · `UserAvatar` · `lib/robohash.ts` · `constants/auth.ts`
- Hooks: `useSession` · `useListQueries` + `queryInvalidation` · cookie auth `lib/auth.ts`
- Prisma: `List.urls` JSON · no user name/image columns (display = email local-part)

## Versions
Next **15.5.23** · React **18** · Prisma **6.19.3** · Jest · audit **0**

## Env
`.env.example` · secrets in `.env.local`/Vercel
