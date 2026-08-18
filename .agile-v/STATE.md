# STATE.md

**C1** | 2026-08-14

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
- Stable data surfaces: requested pages keep their static chrome, cold placeholders are delayed and local, comment badges use one grouped unified payload, import recovery has no hard reload, and metadata rejects private network targets for documents, images, favicons, and redirects.

## Human

- HA-0001 Firewall
- Match Sentry org/token before `SENTRY_UPLOAD_SOURCEMAPS=1`

## Remaining (user later)

- More spacing/gaps across pages
- Button consistency: height · one lucide icon · no double icons / missing icons

## Current checkpoint

- **Stage:** Stage 4 Verification complete for REQ-0010 through REQ-0015
- **Gate:** **GATE-0011 Human Gate 1 — APPROVED** (`C1-HG1-UI-REMEDIATION-2026-08-18`)
- **Scope:** shared control geometry, login row composition/motion, Smart Collections disclosure, URL toolbar/add-form refinement, and independent lint remediation.
- **Reconciliation:** current C1 code and commit history support the recorded completed UI work. The original GATE-0001 remains historically unapproved; it is not treated as approval for further work.
- **Audit findings resolved:** shared control geometry, Smart Collections disclosure, URL toolbar/add-form semantics, global browser casts, and 235 lint warnings are remediated. Existing mutation/invalidation architecture was retained and bulk import no longer hard-reloads.
- **Implementation:** REQ-0010 through REQ-0013 are implemented with shared control styles, Auth entrance motion, accessible Smart Collections disclosure, and URL toolbar/Add URL refinements. The URL workspace, bulk-import flow, real-time/query synchronization, drag-order cache, metadata helper, and auth helper received type-safe lint remediation without changing their behavior. Typecheck, Jest, and production build pass.
- **Completion:** REQ-0014 is complete. `npm run lint` reports zero warnings/errors after type-safe remediation; no lint-rule suppression was used.
- **Completion:** REQ-0015 is complete. Navbar/Footer use the shared responsive chrome row; their routes, session behavior, and import guard are unchanged. Lint, typecheck, Jest, and production build pass.
- **Completion:** REQ-0016 is complete. The guest-account menu is opaque, above Auth reveal siblings, and exposes its expanded/menu relationship without changing session behavior.
- **Completion:** REQ-0017 is complete. Shared control primitives use compact geometry; Home uses replayable CSS/observer motion with no auth or data-flow changes.
- **Dependency audit:** RISK-0016 (three Prisma CLI transitive findings) is accepted by user. Retain Prisma 6.19.3; do not force a downgrade or breaking upgrade.
- **Final audit:** lint, strict TypeScript, Jest, production build, mutation/invalidation scan, reload scan, and tracked-secret scan pass against committed `main`. Gate 2 still requires EvalGate/human acceptance evidence.
- **Completion:** REQ-0018 / TASK-0019 complete. All approved form, confirmation, comment, similarity, and collaborator overlays use the shared dialog primitive; legacy form routes preserve deep links through dialog state.
- **Completion:** REQ-0019 / TASK-0020 complete. Shared title/description stacks have no added gap; responsive line-height and non-heading spacing are unchanged.
- **Completion:** REQ-0020 / TASK-0021 complete. Broad loading remounts were removed from the requested data pages; dialog comments no longer duplicate their title; comment counts are batched; metadata fetches are public HTTP(S)-only and redirect-checked.
- **Evidence:** planning traces in `REQUIREMENTS.md` (REQ-0010 to REQ-0014), `TASKS.md` (TASK-0011 to TASK-0015), `DECISION_LOG.md` (DEC-0012/0013), `RISKS.md` (RISK-0011 to RISK-0014), and `GATES.md`.

## Next

```text
Run browser-level metadata/action validation and create updated EvalGate evidence before release acceptance. HA-0001 remains human-owned; no densify/Zod changes are implied.
```
