# PROJECT_WALKTHROUGH.md

Compact agent map. Code = source of truth.

## App
Next 15 URL bookmark manager. Demo: https://daily-urlist.vercel.app/

## Layout
- Pages → `components/pages/*` · `app/api/**` · SEO `layout.tsx` + sitemap
- Auth UI: `Auth.tsx` · `ProfileDropdown` · `UserAvatar` · `lib/robohash.ts` · `constants/auth.ts`
- Flash gate: `HomePage` + `urlist:wasAuthed` → Auth immediately when logged out (no marketing skeleton)
- Navbar: static `Daily Urlist` · fixed `size-10` profile slot · guest Select fixed `size-7` lead + always Clear
- Hooks: `useSession` · `useListQueries` + `queryInvalidation` · cookie `lib/auth.ts`
- Docs: `README.md` · `SECURITY.md` · `PORTABLE_AUTH_UI_GUIDE.md`
- Out of scope (separate REQ): densify/Zod/SHA/JWT-null SSR

## Versions
Next **15.5.23** · React **18** · Prisma **6.19.3** · Jest · audit **0**

## Env
`.env.example` · secrets `.env.local`/Vercel only
