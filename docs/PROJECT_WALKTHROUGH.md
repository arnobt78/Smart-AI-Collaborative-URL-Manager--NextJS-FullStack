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
- Spacing: `lib/ui-spacing.ts` PAGE/SECTION/MARKETING/FORM/LIST/HEADING_STACK/PAGE_HEADER/CARD_PAD; heading stacks have zero added title/subtitle gap only.
- Layout main: `py-6 sm:py-10` · `html { scrollbar-gutter: stable }`
- Auth toasts: `lib/auth-toast.ts` + `AuthToastBridge`
- Logout: menu dismisses immediately; server-confirmed sign-out clears React Query and persisted query metadata before `location.replace("/")`; a non-blocking status appears only after 1.2s.
- Logs: `lib/dev-log.ts` — SSE/AI/import quiet in prod
- Deploy: Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed
- Lists: slug-safe placeholder · ListPage `currentList` sync · My Lists title → `/list/[slug]` · SC create stays
- Visit: `ensureAbsoluteHttpUrl` + semantic safe new-tab links; click analytics patches list/KPI caches optimistically.
- Collaborators empty one-row · Card/SC `p-2 sm:p-4`
- Local DB: `.env` / `.env.local` → remote `77.42.71.87:25432` (gitignored)
- Out of scope: densify / JWT-null SSR / Next 16 / Prisma 7
- UI controls: `lib/ui/control-styles.ts` provides shared 48px field/trigger geometry; Auth uses CSS reveal with reduced-motion support
- Home motion: `ui/ScrollReveal.tsx` provides replayable CSS/observer reveal plus subtle parallax; shared controls use `h-10 min-h-10` and text-sm placeholders
- Home wave: hero copy lines and CTAs are individual reveal units, staggered in order rather than animated as a grouped row
- Data sync: request-scoped server QueryClients hydrate Lists/detail/Browse/Insights/API Status into the unified React Query cache; account pages, Browse, and shared detail verify persisted sessions before paint. Snapshot-first optimistic `currentList` patches completed URL mutation summaries into all-list cache before typed invalidation + SSE reconciliation.
- Compact data UI: `DataSurfaceSlot` reserves a friendly local cold-data area; Activity Feed is a default-collapsed accessible disclosure; Insights has aligned icon-label tabs, compact KPIs, and activity only in Overview.
- Mutation UX: visibility, list, URL, collaborator, comment, collection, archive, import, metadata, and health actions retain optimistic cache/store data with one typed impact; collection refresh uses one response; dialogs keep only local submit guards; external visits use safe semantic new-tab links.
- C3/C5 boundaries: `lib/api-validation.ts` owns strict Zod payload/identifier parsing; opaque session cookies persist as SHA-256 digests with legacy rotation and persistence-backed revocation; `invalidateMutationImpact` maps active mutation cache families once, including delete-list.
- Dialogs: `ui/Dialog.tsx` owns accessible capped overlays; list/URL CRUD, confirmations, comments, similarity, and collaborator actions share it. Lists create/edit uses `useListDialogRouteState` for synchronous native-history query state—deep links and browser navigation work without an RSC request. Create/edit/delete remain pending until server completion and their committed cache/UI paint.
- Stable data UI: Browse keeps cached cards visible on background refetch; `ui/PageHeader.tsx` provides the shared glass icon/title/subtitle row.
- Stable data safety: Browse/Lists/Insights/API Status/detail keep static chrome with delayed local cold placeholders; unified list batches comment counts; bulk import reconciles without reload; metadata documents/images/favicons accept public HTTP(S) destinations only after DNS/IP and redirect checks.
- List access: `lib/list-route-access.ts` verifies a persisted session before resolving list slug/ID; public lists are visible to every authenticated account, while private reads require ownership/collaboration; PATCH content is owner/editor, visibility and deletion owner-only, and vector sync/metadata refresh require edit permission. Unified GET normalization is response-only and shared with server hydration, preserving comment and collaborator cache data.
- Comment badges: create increments, delete decrements, edit is count-neutral, and failed mutations restore only their own optimistic delta.
- Manual browser acceptance: REQ-0017 control/Home-motion and REQ-0018 metadata/action-badge flows await user testing; code-level validation is complete.
- Audit: lint/typecheck/Jest/build and mutation/secret scans pass; user accepted the documented Prisma CLI advisory, while Gate 2 still needs EvalGate and human acceptance

## Versions

Next **15.5.23** · React **18** · Prisma **6.19.3** · Jest · Node **24.x** · ESLint audit **0**

## Env

`.env.example` · secrets `.env.local`/Vercel only
