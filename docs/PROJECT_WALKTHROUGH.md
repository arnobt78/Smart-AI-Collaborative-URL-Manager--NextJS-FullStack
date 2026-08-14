# PROJECT_WALKTHROUGH.md

Compact agent map. Code = source of truth.

## App
Next 15 URL bookmark manager. Demo: https://daily-urlist.vercel.app/

## Layout
- Pages → `components/pages/*` · `app/api/**` · SEO `layout.tsx` + sitemap
- Auth UI: `Auth.tsx` · `ProfileDropdown` · `UserAvatar` · `lib/robohash.ts` · `constants/auth.ts`
- Flash gate: `HomePage` + `urlist:wasAuthed` → Auth immediately when logged out (no marketing skeleton)
- Navbar: static `Daily Urlist` · fixed `size-10` profile slot · guest Select fixed `size-7` lead + always Clear
- Auth toasts: `lib/auth-toast.ts` + `AuthToastBridge` (welcome/goodbye after hard redirect); Sparkles CTA
- Layout: `html { scrollbar-gutter: stable }` — no horizontal jump; Auth overlay `inset-0` (no `w-screen`)
- Navbar avatar: padding outside `size-10` + `min-w-10 shrink-0`
- Logs: `lib/dev-log.ts` — SSE/AI/import quiet in production
- Deploy: Sentry sourcemaps only if `SENTRY_UPLOAD_SOURCEMAPS=1`; `prisma.config.ts` seed
- Hooks: `useSession` · `useListQueries` + `queryInvalidation` · cookie `lib/auth.ts`
- Lists UX: unified placeholder same-slug only · ListPage syncs `currentList` from RQ · My Lists title → `/list/[slug]` · Smart Collections create stays on page
- Docs: `README.md` · `SECURITY.md` · `PORTABLE_AUTH_UI_GUIDE.md`
- Out of scope (separate REQ): densify/Zod/SHA/JWT-null SSR

## Versions
Next **15.5.23** · React **18** · Prisma **6.19.3** · Jest · audit **0**

## Env
`.env.example` · secrets `.env.local`/Vercel only
