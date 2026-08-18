# PROJECT_WALKTHROUGH.md

Compact agent map. Code = source of truth.

## App

Next 15 URL bookmark manager. Demo: https://daily-urlist.vercel.app/

## Layout

- Pages → `components/pages/*` · `app/api/**` · SEO `layout.tsx` + sitemap
- Auth: `Auth.tsx` · `ProfileDropdown` · `UserAvatar` · `lib/robohash.ts` · `constants/auth.ts`
- Flash: SSR `WAS_AUTHED_COOKIE` / `session_token` → `useWasAuthedHint` · guests Auth · returning Marketing (no spinner)
- Auth UI: split viewport inside `max-w-7xl` — left Welcome typewriter + about-process (no center divider / left logo); right labeled Sign In + Sign up row; no 8s overlay
- Guest credentials: opaque dropdown is raised above staggered Auth rows; trigger exposes expanded/menu ARIA
- CTAs: `src/lib/ui/glass-*` shadow-glow (stock recipe); Auth Sign In Sparkles
- Chrome: shared `UI_CHROME_ROW`; Navbar stays centered in `h-14`; Footer centers at desktop and uses `min-h-14` when compact content stacks
- BG: static `FloatingBackground` (no `animate-float`) · PostHog `PostHogPageview` Suspense island only
- Spacing: `lib/ui-spacing.ts` PAGE/SECTION/MARKETING/FORM/LIST/PAGE_HEADER/CARD_PAD
- Layout main: `py-6 sm:py-10` · `html { scrollbar-gutter: stable }`
- Auth toasts: `lib/auth-toast.ts` + `AuthToastBridge`
- Logs: `lib/dev-log.ts` — SSE/AI/import quiet in prod
- Deploy: Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed
- Lists: slug-safe placeholder · ListPage `currentList` sync · My Lists title → `/list/[slug]` · SC create stays
- Visit: `ensureAbsoluteHttpUrl` + `openExternalUrl`
- Collaborators empty one-row · Card/SC `p-2 sm:p-4`
- Local DB: `.env` / `.env.local` → remote `77.42.71.87:25432` (gitignored)
- Out of scope: densify / Zod / SHA / JWT-null SSR / Next 16 / Prisma 7
- UI controls: `lib/ui/control-styles.ts` provides shared 48px field/trigger geometry; Auth uses CSS reveal with reduced-motion support
- Home motion: `ui/ScrollReveal.tsx` provides replayable CSS/observer reveal plus subtle parallax; shared controls use `h-10 min-h-10` and text-sm placeholders
- Home wave: hero copy lines and CTAs are individual reveal units, staggered in order rather than animated as a grouped row
- Data sync: unified React Query cache + optimistic `currentList` store + centralized invalidation + SSE; bulk import reconciles without a hard reload
- Audit: lint/typecheck/Jest/build and mutation/secret scans pass; user accepted the documented Prisma CLI advisory, while Gate 2 still needs EvalGate and human acceptance

## Versions

Next **15.5.23** · React **18** · Prisma **6.19.3** · Jest · Node **24.x** · ESLint audit **0**

## Env

`.env.example` · secrets `.env.local`/Vercel only
