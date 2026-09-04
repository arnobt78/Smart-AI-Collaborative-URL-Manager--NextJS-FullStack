# PROJECT_WALKTHROUGH.md

Compact agent map. Code = source of truth.

## App

Next 16 URL bookmark manager. Demo: https://daily-urlist.vercel.app/

## Layout

- Pages → `components/pages/*` · `app/api/**` · SEO `layout.tsx` + sitemap
- Auth: `/login` → `Auth.tsx` (chrome-free) · `ProfileDropdown` (Radix glass `DropdownMenu`) · `UserAvatar` · `lib/robohash.ts` · `constants/auth.ts` · `proxy.ts` `x-pathname` (Next 16+; not middleware)
- Flash: SSR `WAS_AUTHED_COOKIE` / `session_token` → Marketing on `/`; guests `redirect("/login")`
- Auth UI: split viewport inside `max-w-7xl` — left Welcome typewriter + about-process; right Sign In + Sign up; sticky login when fits
- Guest credentials: opaque dropdown is raised above staggered Auth rows; trigger exposes expanded/menu ARIA
- CTAs: `src/lib/ui/glass-*` shadow-glow (stock recipe); Auth Sign In Sparkles
- Chrome: shared `UI_CHROME_ROW`; Navbar stays centered in `h-14`; Footer centers at desktop and uses `min-h-14` when compact content stacks
- BG: static `FloatingBackground` (no `animate-float`) · PostHog `PostHogPageview` Suspense island only
- Spacing: `lib/ui-spacing.ts` PAGE/SECTION/MARKETING/FORM/LIST/HEADING_STACK/PAGE_HEADER/`CARD_STACK`/`CARD_PAD`; heading stacks have zero added title/subtitle gap only.
- Layout main: `py-6 sm:py-10` · `html { scrollbar-gutter: stable }`
- Auth toasts: `lib/auth-toast.ts` + `AuthToastBridge`; UI stack bottom-right + `toast-slide-in`
- Logout: menu dismisses immediately; force-guest + keepalive `/api/auth/signout`; navigate `/login`.
- Logs: `lib/dev-log.ts` — SSE/AI/import quiet in prod
- Deploy: Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed
- Lists: slug-safe placeholder · ListPage `currentList` sync · My Lists title → `/list/[slug]` · SC create stays
- Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` (UrlCard title, Visit, Similar); click analytics patches list/KPI caches optimistically.
- Collaborators empty one-row · Card/SC `p-2 sm:p-4`
- Local DB: `.env` / `.env.local` → remote `77.42.71.87:25432` (gitignored)
- Out of scope: full densify rewrite / JWT-null SSR / Prisma 7/8
- UI controls: `lib/ui/control-styles.ts` provides shared 48px field/trigger geometry; Auth uses CSS reveal with reduced-motion support
- Home motion: `ui/ScrollReveal.tsx` provides replayable CSS/observer reveal plus subtle parallax; shared controls use `h-10 min-h-10` and text-sm placeholders
- Home wave: hero copy lines and CTAs are individual reveal units, staggered in order rather than animated as a grouped row
- Data sync: SSR prefetch/dehydrate (C6.7) + optimistic `currentList` + `invalidateMutationImpact` + C7.1 `densifyBrowsePublicLists` / `dropUnifiedListCache` (C7.9 `{ list: null }` tombstone) + SSE densify/drop + C7.21 densify-before-await / `skipUnified` / Activity FIFO 20 / jobs densify / metadata batch Map / schema-safe reorder + C7.22 lite metadata timeouts / click mark / analytics skipUnified / pin SSE window.
- Soft-nav: warm full-parity chrome (C7.0); list-detail seeds thin unified from Lists (C7.9–C7.15 UrlList + Copy parity + `ListDetailJobsMenu` + Radix glass menus + share row in header stack + warm history); cold one continuous detail skeleton; browse densify (C7.1); rare Links `prefetch={false}` (C7.2); api-docs spinner shell; api-status `ApiStatusChrome` + header Refresh/refreshing… (C7.5–C7.6).
- Menus: `ui/dropdown-menu.tsx` (Radix + `UI_GLASS_MENU_*`, `modal={false}`, `z-[900]`) for list jobs, collaborator …, profile, Auth guest, bulk import/export; `UI_ICON_MENU_TRIGGER` h-10; no blue focus ring on menu panel/items.
- Cards/UrlCard: `CARD_STACK` on MyLists/Browse/detail headers; UrlCard single `CARD_PAD` + note separator + local `URL_META_CHIP` tones.
- Insights: overview+activity share one cached list scan; C7.11–C7.12 soft-nav chart skeleton + single LineChart + LabelList + pie slice-colored labels + shared tooltip; status route slim (no external metadata probe); status page client-fetches.
- Logout: C7.8 — forceGuest cookie+SS; keepalive signout; clear RQ/`react-query:*`/session cookies; `replace("/login")` (no nav/footer; one html scrollbar). No Auth overlay on `/`.
- Open later: optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; parked Add URL https / archive / fast-scroll.
- Compact data UI: `DataSurfaceSlot` + `useDelayedPending`; Activity Feed default-collapsed (FIFO 20); Insights aligned tabs.
- Mutation UX: visibility, list, URL, collaborator, comment, collection, archive, import, metadata, and health actions retain optimistic cache/store data with one typed impact; collection refresh uses one response; dialogs keep only local submit guards; external visits use safe semantic new-tab links.
- C3/C5 boundaries: `lib/api-validation.ts` owns strict Zod payload/identifier parsing; opaque session cookies persist as SHA-256 digests with legacy rotation and persistence-backed revocation; `invalidateMutationImpact` maps active mutation cache families once, including delete-list. Per-request `React.cache` on session/user lookup.
- Dialogs: `ui/Dialog.tsx` sole overlay; compact headers. Create/edit = `history.state` on same href (no `_rsc`); never strip `?dialog=` on close; deep-link mount-only. Mutating overlays pending until network + paint.
- Stable data UI: Browse keeps cached cards visible on background refetch; `ui/PageHeader.tsx` provides the shared glass icon/title/subtitle row.
- Stable data safety: Browse/Lists/Insights/API Status/detail keep static chrome with delayed local cold placeholders; unified list batches comment counts; bulk import reconciles without reload; metadata documents/images/favicons accept public HTTP(S) destinations only after DNS/IP and redirect checks.
- List access: `lib/list-route-access.ts` verifies a persisted session before resolving list slug/ID; public lists are visible to every authenticated account, while private reads require ownership/collaboration; PATCH content is owner/editor, visibility and deletion owner-only, and vector sync/metadata refresh require edit permission. Unified GET normalization is response-only and shared with server hydration, preserving comment and collaborator cache data.
- Comment badges: create increments, delete decrements, edit is count-neutral, and failed mutations restore only their own optimistic delta.
- Manual: TASK-0039 Network intake DONE; C7.21–C7.22 local verified — prod re-smoke after deploy (user tomorrow).
- Audit: lint/tsc/Jest/build/e2e C7.22 pass; RISK-0016 closed (deepmerge override); Gate 2 needs EvalGate.

## Versions

Next **16.3.3** · React **19.2** · Prisma **6.19.3** · Jest · Node **24.x** · ESLint audit **0**

## Env

`.env.example` · secrets `.env.local`/Vercel only
