# STATE.md

**C6.3** | 2026-08-20

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
- Stable list-form dialogs: scroll-header Dialog mode yields one accessible heading/X; cache-seeded My Lists editing, shared compact form primitives, optimistic list hooks, and note-with-X/Eraser action conventions eliminate editor toasts, timers, and form-open/close skeletons.
- Homepage hero: authenticated logo, title, two description rows, and CTA row reuse the login form's five-step initial-mount stagger; lower marketing scroll reveals are unchanged.
- Logout UX: profile menu dismisses immediately; duplicate requests are ref-guarded, a non-blocking status appears only after 1.2s, and server-confirmed sign-out clears cached client state before history-safe replacement.
- C4 mutation UX: visibility updates cache/store in the initiating render; dialog-wide pending locks are removed; primary and suggested visits use browser-owned safe new-tab links.
- C4 reconciliation: collection, archive/restore, reorder, favorite, pin, metadata refresh, health, and duplicate-delete paths now use one owner for optimistic commit/rollback plus one typed impact; Smart Collections refresh uses one server response.
- C4 final reconciliation: URL-click analytics snapshots and rolls back the unified cache/store on failure; background vector indexing and schedule setup remain deliberately cache-neutral because they do not change rendered list data.
- C5: session authorization is persistence-backed per request; request-scoped server QueryClients hydrate Lists, detail, Browse, and Insights keys without a duplicate initial browser request; delete-list uses the typed impact map.

## Human

- HA-0001 Firewall
- Match Sentry org/token before `SENTRY_UPLOAD_SOURCEMAPS=1`

## Remaining (user later)

- More spacing/gaps across pages
- Button consistency: height · one lucide icon · no double icons / missing icons

## Current checkpoint

- **Stage:** Stage 4 implementation and local verification complete for REQ-0031 (C6.3); final validation evidence is recorded in `VALIDATION_SUMMARY.md`.
- **Gate:** **GATE-0014 — APPROVED 2026-08-19** (`C1-HG1-SECURITY-CACHE-2026-08-19`). GATE-0002 remains pending and cannot be accepted while this critical authorization remediation is open; `EVAL_RESULTS.md` does not exist.
- **Scope:** REQ-0031 unifies active dialog presentation through the shared divider-free Create List header contract. Existing cookie sessions, Prisma 6, Redis, SSE, query impact mapping, and dialog behavior remain the baseline.
- **Reconciliation (2026-08-18):** the user-reconciled local baseline is `65d5806`; prior state incorrectly referenced `a69f0a7`. The original GATE-0001 remains historically unapproved/superseded; GATE-0011/0012/0013 supplied the applicable implementation authority.
- **Audit findings resolved:** shared control geometry, Smart Collections disclosure, URL toolbar/add-form semantics, global browser casts, and 235 lint warnings are remediated. Existing mutation/invalidation architecture was retained and bulk import no longer hard-reloads.
- **Implementation:** REQ-0010 through REQ-0013 are implemented with shared control styles, Auth entrance motion, accessible Smart Collections disclosure, and URL toolbar/Add URL refinements. The URL workspace, bulk-import flow, real-time/query synchronization, drag-order cache, metadata helper, and auth helper received type-safe lint remediation without changing their behavior. Typecheck, Jest, and production build pass.
- **Completion:** REQ-0014 is complete. `npm run lint` reports zero warnings/errors after type-safe remediation; no lint-rule suppression was used.
- **Completion:** REQ-0015 is complete. Navbar/Footer use the shared responsive chrome row; their routes, session behavior, and import guard are unchanged. Lint, typecheck, Jest, and production build pass.
- **Completion:** REQ-0016 is complete. The guest-account menu is opaque, above Auth reveal siblings, and exposes its expanded/menu relationship without changing session behavior.
- **Completion:** REQ-0017 is complete. Shared control primitives use compact geometry; Home uses replayable CSS/observer motion with no auth or data-flow changes.
- **Dependency audit:** RISK-0016 (three Prisma CLI transitive findings) is accepted by user. Retain Prisma 6.19.3; do not force a downgrade or breaking upgrade.
- **Final audit:** lint, strict TypeScript, Jest (76 pass/5 skip), production build, mutation/invalidation scan, reload scan, and tracked-secret scan pass against committed `main` (`9088944`). Gate 2 still requires EvalGate/human acceptance evidence.
- **Completion:** REQ-0018 / TASK-0019 complete. All approved form, confirmation, comment, similarity, and collaborator overlays use the shared dialog primitive; legacy form routes preserve deep links through dialog state.
- **Completion:** REQ-0019 / TASK-0020 complete. Shared title/description stacks have no added gap; responsive line-height and non-heading spacing are unchanged.
- **Completion:** REQ-0020 / TASK-0021 complete. Broad loading remounts were removed from the requested data pages; dialog comments no longer duplicate their title; comment counts are batched; metadata fetches are public HTTP(S)-only and redirect-checked.
- **Completion:** REQ-0021 / TASK-0022 complete. Create/edit forms use one scrollable dialog header, cache-first editor fields, centralized optimistic list mutations, no opening toast/timer/router refresh, and delayed cold loading only when list cache data is unavailable.
- **Correction:** Comment action badges now increment only for creates, decrement only for deletes, and restore their optimistic delta on mutation failure; edits leave the count unchanged (`43b663a`).
- **Evidence:** planning traces in `REQUIREMENTS.md` (REQ-0010 to REQ-0014), `TASKS.md` (TASK-0011 to TASK-0015), `DECISION_LOG.md` (DEC-0012/0013), `RISKS.md` (RISK-0011 to RISK-0014), and `GATES.md`.
- **Audit (2026-08-19):** verified critical missing authorization on `PATCH`/`DELETE /api/lists/[id]`; high-risk missing access checks on list metadata and vector-sync routes; duplicate URL mutation paths with incomplete delete rollback; Browse Suspense fallback and Lists/Insights/detail cold-state behavior can remount broad placeholders. These are tracked in REQ-0022/REQ-0023 and RISK-0017/RISK-0018.
- **Completion (2026-08-19):** REQ-0022/REQ-0023 are implemented and locally verified. Canonical route access protects list mutations, metadata, and vector sync; URL mutations use one snapshot/commit/rollback path; query keys are hook-independent; requested data surfaces retain their static shells and cached data.
- **Manual acceptance:** REQ-0017 control/Home-motion and REQ-0018 metadata/action-badge flows await user browser testing; implementation and automated validation are complete.
- **Production test handoff (2026-08-19):** User will test the deployed Vercel application later; no browser action or defect report has been received yet. Resume from TASK-0025 when feedback arrives.
- **C2 completion (2026-08-19):** REQ-0024 / TASK-0026 complete under GATE-0015. The homepage hero now reuses login's mount stagger; focused regression coverage, strict TypeScript, zero-warning lint, full Jest, and production build pass. C1/C2 Gate 2 release acceptance remains pending.
- **C3 completion (2026-08-19):** REQ-0025 / TASK-0027 through TASK-0030 complete under GATE-0016. Shared Zod parsing covers mutation bodies and identifier-only boundaries; signed jobs preserve the raw body for QStash verification; new session persistence is SHA-256 digest-only with safe legacy-rotation conflict recovery; active mutation paths use the typed impact gateway. Strict TypeScript, zero-warning lint, Jest (52 pass/5 skip), production build, direct-console, parser, secret, and diff scans pass.
- **C4 completion (2026-08-19):** REQ-0026 / TASK-0031 complete. Collection refresh/creation, duplicate deletion, archive/restore, reorder, favorite/pin, click analytics, metadata refresh, and health actions use scoped cache/store commits or non-rendered background handling; Jest (57 pass/5 skip), strict TypeScript, lint, production build, and hygiene scans pass.
- **C5 completion (2026-08-19):** REQ-0027 / TASK-0032 and TASK-0033 complete. Session authorization no longer uses a process-wide cache; server-prefetched query hydration covers Lists, list detail, Browse, and Insights; delete-list joins the typed impact contract. The original anonymous public-read policy is superseded by C6.1. Jest (68 pass/5 skip), strict TypeScript, lint, production build, and hygiene scans pass.
- **C6 scope (2026-08-19):** REQ-0028 / TASK-0034 is user-approved. Resume with server page guards/hydration, compact cold slots, synchronous list-summary updates, collapsible Activity Feed, and List/Insights layout polish.
- **C6 completion (2026-08-19):** REQ-0028 / TASK-0034 complete. Protected data pages now render dynamically with persisted-session guards; requested data surfaces hydrate before client paint; list summaries receive completed URL mutation timestamps; Activity Feed is collapsed by default; Insights uses compact KPI cards and no duplicate activity tab. Jest (70 pass/5 skip), strict TypeScript, lint, production build, and hygiene scans pass.
- **C6.1 completion (2026-08-19):** REQ-0029 / TASK-0035 supersedes the anonymous public-list viewer policy. Browse, shared detail, list discovery, collaborator reads, and view tracking require a persisted session; legacy position normalization is read-only; hydrated unified payloads retain URL comment counts and collaborator cache data. Jest (76 pass/5 skip), strict TypeScript, lint, production build, and hygiene scans pass.
- **C6.2 completion (2026-08-20):** REQ-0030 / TASK-0036 localizes Lists create/edit dialog history, keeps deep links and browser back support, and keeps create/edit/delete dialogs pending until confirmed server completion plus committed paint. Jest (82 pass/5 skip), strict TypeScript, lint, production build, hygiene scans, and Vercel production deployment `dpl_DtLWyXz3HvVPi3gjyKS34e5qndPL` for commit `69530ad` pass.
- **C6.3 completion (2026-08-20):** REQ-0031 / TASK-0037 makes fixed and scrollable dialog headers compact and divider-free through one shared component; unused `InputDialog` was removed. Jest (83 pass/5 skip), strict TypeScript, lint, production build, hygiene scans, and Vercel production deployment `dpl_86AUZkR9imabm8AQsfvbB7sPKrS7` for commit `5ea0448` pass.

## Next

```text
Collect user browser verification for the shared fixed-header dialog visual contract.
```
