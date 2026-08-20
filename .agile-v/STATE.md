# STATE.md

**C6.9** | 2026-08-20

## Done

- Auth UX · gutter · avatar · clean Vercel Sentry/Prisma logs
- `devLog`: SSE/AI + bulk import / Chrome parser (prod silent)
- List switch: slug-safe placeholder + `currentList` sync; My Lists title nav; silent Smart Collections create
- Visit Site: `ensureAbsoluteHttpUrl` + `openExternalUrl` (schemeless URLs open in new tab)
- Collaborators empty: one-row title · invite copy · Add; Card pad `p-2 sm:p-4` (no lg:p-8)
- HomePage: no NeutralWait spinner — Auth or Marketing immediately via wasAuthed
- Smart Collections: single `p-2 sm:p-4` shell + title `pb-1 sm:pb-4` (no double pad)
- Local/prod DB: use remote `77.42.71.87:25432` in `.env` / `.env.local` (not localhost tunnel)
- Home refresh: `urlist_was_authed` cookie + session_token SSR hint; static FloatingBackground; PostHog Suspense island; profile skeleton-first
- Central UI spacing: `lib/ui-spacing.ts` PAGE/SECTION/FORM/LIST stacks on Browse/Lists/Insights/API/Home/Auth; main `py-6 sm:py-10`
- Auth/Home/Navbar polish: `MARKETING_STACK`; hide Sign up footer; nav overflow-visible + dropdown `z-[100]`
- Auth split viewport: `md:grid-cols-2` welcome+about | labeled Sign In; removed 8s blocking overlay
- Auth UI polish: max-w-7xl shell; no center divider/left logo; reserved typewriter heights; feature gaps; Sign up row; CTA spacer
- Stock glass shadow-glow port: `src/lib/ui/glass-{button,badge,card}-styles.ts`; Button variants; Auth Sign In Sparkles + primary blue glow; PermissionManager/CTAs aligned; dead `ui-button.ts` removed
- Responsive chrome: shared `UI_CHROME_ROW`; Navbar remains centered at 56px; Footer centers at desktop and grows safely when stacked on mobile; dead footer icon code removed
- Auth guest menu: opaque panel and parent stacking-layer correction prevent animated field rows from obscuring or intercepting account actions
- Compact controls and Home motion: shared Button/glass sizes use `h-10 min-h-10`; Home CTAs avoid local vertical padding and marketing sections use reduced-motion-safe scroll reveal/parallax
- Home wave refinement: Hero copy lines and CTAs reveal as independent timed units rather than grouped rows
- Unified dialog foundation: responsive accessible local `Dialog`; URL add/edit and confirmations use it; `/new` and list edit deep links redirect to dialog-state hosts; Browse keeps cached cards through background refetch; shared page header adopted by Browse/Insights/API pages
- Zero-gap heading contract: `HEADING_STACK` is used by PageHeader, Dialog, CardHeader, Auth, Smart Collections, feature cards, and legacy empty states; surrounding form, action, menu, and card-content spacing is retained.
- Stable data surfaces: requested pages keep their static chrome; C6.9 removes delayed-null empty holes on Lists/Browse/Insights tabs.
- Stable list-form dialogs: scroll-header Dialog mode; cache-seeded My Lists editing; optimistic list hooks.
- Homepage hero: authenticated logo, title, two description rows, and CTA row reuse the login form's five-step initial-mount stagger.
- Logout UX: profile menu dismisses immediately; server-confirmed sign-out clears cached client state.
- C4–C6.8: mutation UX, session auth, SSR hydrate, dialogs without RSC, soft-nav shells, warm soft-nav flag, Insights overview+activity SSR.
- **C6.9:** Optimistic soft-nav — warm `loading.tsx` paints `OptimisticSoftNavSurface` from RQ (never null); cold one `RoutePageSkeleton`; Lists/Browse/Insights no delayed empty; ListPage paints on unified cache hit; browse page/search warm; slug intent prefetch; create→detail `warmRouterReplace`.
- Toast: bottom-right stack + `toast-slide-in` (reduced-motion → fade).

## Human

- HA-0001 Firewall
- Match Sentry org/token before `SENTRY_UPLOAD_SOURCEMAPS=1`

## Remaining (user later)

- More spacing/gaps across pages
- Button consistency: height · one lucide icon · no double icons / missing icons

## Current checkpoint

- **Stage:** C6.9 complete locally + post-impl audit OK. Browser check after deploy: warm revisit paints destination UI; cold one skeleton; no empty hole.
- **Gate:** GATE-0025 APPROVED (user implementation request). GATE-0002 pending (`EVAL_RESULTS.md` absent).
- **Scope:** Optimistic RQ soft-nav surface + empty-flash fixes; hydrate/invalidation unchanged (no densify rewrite).
- **Audit (2026-08-20):** C6.9 wired end-to-end; SoftNavLoading never null; Lists/Browse/Insights/List gaps closed; densify/JWT SSR still OOS; `invalidateMutationImpact` retained. Toast bottom-right OK. Jest 97/5 · tsc · lint 0 · build pass.
- **Completion:** REQ-0039 / TASK-0044 complete.
- **Docs:** CLAUDE.md · `.agile-v/*` synced for agent resume.

## Next

```text
After deploy: warm Navbar revisit Lists/Browse/Insights/detail = destination UI from RQ immediately (no empty, no skeleton); cold = one continuous skeleton. Also TASK-0039 dialogs.
```
