# TASKS.md — C2

## C2 approved

### TASK-0026 — Homepage hero mount stagger — DONE

1. Reuse the login form's existing stagger classes for the authenticated homepage logo, title, copy rows, and CTA row.
2. Preserve the lower marketing-section `ScrollReveal` behavior and all session/data contracts.
3. Add focused regression coverage, remove test setup debug output, and record actual validation evidence.

**Dependencies:** REQ-0024; GATE-0015 approved.

## Done
AI · guardrails · SafeImage · observability · deps · SEO · Portable Auth UI · educational README/SECURITY

## Open (human)
HA-0001 Firewall · Sentry org/token

## Pending browser acceptance
REQ-0017 control/Home-motion and REQ-0018 metadata/action-badge flows await user testing; implementation and automated verification are complete.

### TASK-0025 — Production browser verification — PENDING USER

1. Verify shared controls and independent Home reveal/parallax at desktop and mobile widths, including reduced-motion behavior.
2. Verify metadata preview/fallback, external Visit behavior, and comment/action badges after create, edit, and delete flows.
3. Report only reproducible production findings with route, action, expected result, actual result, and screenshot/video when available.

**Dependencies:** REQ-0017, REQ-0018; deployed commit `084aced`.
**Resume condition:** User supplies production-test results; no application implementation is authorized by this task alone.

## Superseded — GATE-0010

### TASK-0010 — Spacing and button/icon consistency

1. Inventory direct and shared button controls across the approved UI surfaces; classify CTA, compact action, and icon-only controls, and record exclusions.
2. Reuse `Button` size variants and glass recipes to remove inconsistent CTA height and duplicate icons without changing handlers, routes, dialogs, or mutation logic.
3. Apply `ui-spacing` tokens to the targeted page/section/form/list roots; add a token only if the existing set cannot express the verified spacing need.
4. Add focused regression coverage where the existing Jest setup can support it; then run typecheck, lint, tests, build, and viewport/keyboard checks. Record actual results only.

**Dependencies:** Superseded by GATE-0011; existing shared UI primitives.
**Out of scope:** redesign, copy changes, new navigation, data/API/schema changes, SSR architecture work, and the deferred items already listed for C1.

## Completed — GATE-0011

### TASK-0011 — Shared control audit and contract (Wave 1) — DONE

1. Inventory input, select, search, labeled button, filter, tab, and import/export trigger geometry; classify icon-only controls separately.
2. Establish one reusable 48px control contract in shared UI primitives/styles and migrate only the approved UI surfaces.
3. Preserve each component's current event handlers, menu ownership, and responsive wrapping.

### TASK-0012 — Auth form composition and safe stagger (Wave 2) — DONE

1. Recompose the right Auth panel into header and field/action rows using shared styles.
2. Add a CSS/browser-platform reveal sequence with a reduced-motion final-state path and no interaction gate.
3. Verify guest dropdown, labels, keyboard focus, submit error, timeout, and 320px/768px/1440px behavior.

### TASK-0013 — Smart Collections disclosure (Wave 2) — DONE

1. Replace the close control with an accessible View Suggestions/View Less disclosure.
2. Rename collection creation to a meaningful label and use `ListPlus` consistently.
3. Test collapsed, loading, empty, populated, permission-denied, create-success, and create-failure states without changing query behavior.

### TASK-0014 — URL toolbar and add-form refinement (Wave 3) — DONE

1. Normalize tabs, filters, import/export triggers, and home CTAs against the shared control contract and icon gap.
2. Replace Add URL's icon with `WandSparkles`; make its expanded form responsive and add a non-mutating cancel action.
3. Test add success, add failure, cancel, archived state, viewer permissions, and warm-cache navigation.

### TASK-0015 — Lint remediation (Wave 4, independent) — DONE

1. Fix the current warnings by category with boundary types and behaviorally correct hook dependencies.
2. Add/adjust targeted tests for changed behavior; do not suppress rules globally.
3. Run lint, typecheck, Jest, and production build and record real outcomes.

**Dependencies:** GATE-0011 approval. Wave 1 is a prerequisite for Waves 2–4; Waves 2 and 3 can proceed independently after Wave 1. TASK-0015 must not be mixed into UI behavior commits.

### TASK-0016 — Responsive chrome centering — DONE

1. Consolidate Navbar's browser coordination shape into the existing global declaration without changing navigation behavior.
2. Apply one responsive 56px row contract to Navbar and Footer; allow the compact footer to grow below `sm`.
3. Remove dead commented Footer code and validate static, type, test, and production-build behavior.

**Dependencies:** GATE-0012 approved; no data/API/cache or authorization changes.

### TASK-0017 — Guest-account menu stacking fix — DONE

1. Raise the open Auth dropdown parent above transformed reveal-row siblings.
2. Replace the translucent menu surface with an opaque accessible panel and preserve menu handlers.
3. Validate lint, typecheck, Jest, and production build.

### TASK-0018 — Compact controls and Home reveal — DONE

1. Route every shared Button size and glass recipe through the `h-10 min-h-10` control token; remove Home CTA overrides.
2. Add one CSS/IntersectionObserver motion primitive with reduced-motion fallback and use it for marketing hierarchy.
3. Validate controls, routes, motion safety, lint, typecheck, Jest, and build.

### TASK-0019 — Unified dialogs and stable surfaces — DONE

1. Replace duplicated URL/list form and confirmation overlay foundations with `Dialog`; retain current API, permission, optimistic-update, and invalidation handlers.
2. Redirect legacy create/edit form routes into URL-driven dialog hosts; preserve direct links.
3. Keep cached data visible during background fetches and centralize page identity rows.
4. Migrated Comments, Similar URLs, and PermissionManager portal surfaces; retained existing query and mutation contracts.

### TASK-0020 — Central zero-gap heading contract — DONE

1. Add a shared direct heading-stack token and consume it in page, dialog, and card headers.
2. Migrate only direct legacy title/description pairs; preserve surrounding layout and control spacing.
3. Validate responsive heading geometry, TypeScript, lint, Jest, production build, and diff hygiene.

### TASK-0021 — Stable data surfaces and safe metadata retrieval — DONE

1. Remove broad loading remounts while retaining cached content and delayed cold placeholders.
2. Add grouped comment counts to the unified list response and update visible card badges optimistically.
3. Harden metadata URL/redirect/image validation; remove import hard-reload recovery; normalize dialog content chrome and scrollbar track.
4. Validate TypeScript, lint, Jest, production build, and diff hygiene.

### TASK-0022 — Stable list-form dialogs — DONE

1. Add a scrollable-header mode to the shared dialog and use it for create/edit list forms so each has one accessible heading row and close control.
2. Consolidate list-form chrome, visibility alignment, and Cancel/Clear icon conventions without changing form API payloads.
3. Move create/update list transitions to cache-aware mutation hooks; seed the editor from known list data and retain cached surfaces on dialog close.
4. Remove opening toast, page-local form skeletons, and timer-delayed navigation; preserve deep links and list-detail behavior.
5. Add focused regression coverage and record actual validation evidence.

### TASK-0023 — Authorize all list metadata and mutation boundaries — DONE

1. Inventory route identifier semantics and add one canonical resolver/guard around existing cookie-session and collaboration permission helpers.
2. Apply view, edit, delete, and owner-only visibility checks before Redis reads/writes, metadata retrieval, vector sync, database mutation, activity creation, and SSE publication.
3. Add focused route tests for unauthenticated, owner, editor, viewer, and unrelated-user requests, including no cache/vector/event side effects on denial.

### TASK-0024 — Consolidate URL mutation commits and remove data-surface flashes — DONE

1. Inventory each URL mutation caller and the legacy hook/store overlap; select one adapter gateway and retire only code proven unreferenced.
2. Implement transaction-style cache/store snapshot, optimistic patch, server-response commit, rollback, and one affected-query invalidation per mutation.
3. Remove the Browse duplicate Suspense shell and replace broad cold page/list/detail skeleton remounts with static shells plus delayed local data slots only when no cache exists.
4. Add regression tests for warm cache, background refetch, rollback, SSE reconciliation, and direct/back navigation; run the required security, type, lint, test, build, and diff validation.

## Deferred
RSC shells · densify/Zod/SHA/Next16

### TASK-0027 — Shared mutation request validation (C3) — DONE

1. Add reusable typed Zod parsers for bounded JSON bodies and route identifiers.
2. Apply them before authorization and side effects at every mutating API route.
3. Add rejection-before-side-effects coverage for representative boundary families.

### TASK-0028 — Session digest transition (C3) — DONE

1. Persist only SHA-256 digests for newly generated opaque session cookies.
2. Look up digests first, rotate valid legacy plaintext records in place, and delete either representation during transition.
3. Cover creation, lookup, rotation, expiry, logout, and cookie-option contracts.

### TASK-0029 — Mutation impact mapping (C3) — DONE

1. Inventory client mutation families against the existing query-key and invalidation gateway.
2. Add isolated optimistic snapshot rollback and one success invalidation per affected family.
3. Add focused rollback/invalidation coverage while retaining SSE reconciliation.

### TASK-0030 — C3 verification and handoff — DONE

1. Run strict typecheck, lint, Jest, production build, dependency audit, direct-console scan, and diff hygiene.
2. Record automated evidence; retain C1/C2 browser acceptance and Gate 2 as pending until actual browser evidence exists.

### TASK-0031 — C4 mutation reconciliation — DONE

1. Route remaining collection, archive/restore, reorder, metadata, health, click-analytics, and duplicate-delete flows through the typed impact contract; keep non-rendered vector indexing isolated.
2. Remove caller-level duplicate invalidations and preserve exact initiating snapshots for rollback.
3. Add focused rollback/impact coverage and record strict type, lint, Jest, build, and diff evidence.

### TASK-0032 — C5 secure revocation and server hydration — DONE

1. Remove the process-wide session authorization cache and cover immediate revocation paths.
2. Add server-only shared loaders and React Query hydration for Lists, list detail, Browse, and Business Insights without an initial duplicate request.
3. Route delete-list and all remaining UI-visible writes through one snapshot/impact transaction, then validate and record C5 evidence.

### TASK-0033 — C5 public read-contract audit correction — DONE

1. Reconcile the unified list-detail and collaborator read routes with the existing anonymous public-viewer authorization contract.
2. Retain denial before list-data side effects for private anonymous reads.
3. Add direct route regression coverage and re-run the full validation suite.

### TASK-0034 — C6 stable data-surface & compact analytics polish — DONE

1. Add the shared disclosure, server page-auth, and data-slot primitives; hydrate the remaining requested cold surface.
2. Commit list-summary mutation state synchronously and align list-card controls/badges.
3. Compact Insights KPI/tab layout, remove the duplicate activity tab, add focused regressions, validate, document, and commit.

### TASK-0035 — C6.1 authenticated public discovery & hydration parity — DONE

1. Require a persisted session for public discovery/detail/read APIs through canonical list access.
2. Remove GET position persistence and share unified-response normalization across server/client hydration.
3. Add access and hydration regressions; validate, document, and commit.

### TASK-0036 — C6.2 instant list dialogs & confirmed mutation completion — DONE

1. Replace Lists dialog router query navigation with a reusable local/native-history state hook while retaining direct-link parsing.
2. Make create/edit/delete confirmation lifecycle parent-controlled through network result and one committed paint.
3. Add focused URL-history and pending-dialog tests; run the complete validation/hygiene suite, update records, commit, and deploy.

### TASK-0037 — C6.3 unified dialog visual contract — DONE

1. Apply the compact divider-free Create List header rhythm to every shared-dialog header mode.
2. Remove the verified-unused standalone input-overlay implementation without touching active dialog behavior.
3. Add focused component-contract coverage, validate, document, commit, and deploy.

### TASK-0038 — C6.4 instant create-list launchers — DONE

1. Extract the already-shared create-list dialog content/lifecycle so Home and Lists do not duplicate overlay or mutation behavior.
2. Wire hydrated Home CTA clicks to native local dialog state and preserve page-local direct-link/history behavior without Next RSC navigation.
3. Add focused Home/List open-close/history regressions; run the full validation/hygiene suite, update records, commit, and deploy.

**Completion evidence:** commit `c675cf6`; Vercel production `dpl_DB8BYHnrXN5LuwL5Yo5FNdtwFvXd` READY.

### TASK-0039 — C6.4 production browser verification — PENDING USER

1. On https://daily-urlist.vercel.app/, sign in and click Home Create List, Lists Create, and list edit.
2. Confirm the dialog opens immediately with no `lists?dialog=` / `_rsc` request; close, Escape, backdrop, and browser-back remain immediate while idle.
3. Confirm mutating overlays stay pending until success or error, `/lists?dialog=create` and `/new` still open Create List, and a successful create still reaches the new list detail.
4. Report only reproducible findings with route, action, expected, actual, and screenshot/video when available.

**Dependencies:** REQ-0032; deployed commit `c675cf6`.
**Resume condition:** User supplies production-test results; this task does not authorize application changes.

### TASK-0040 — C6.5 instant dialogs and confirmed overlays — DONE

1. Stop `useListDialogRouteState` from using `useSearchParams` or writing `?dialog=` search params; keep hydrated open/close in React state plus `history.state` on the same href.
2. Localize ListPage edit open/close, wire edit pending, and remove the CreateNewListButton RSC href fallback.
3. Keep URL add/edit/delete/archive, comments, invite/role/remove, and Smart Collections duplicate overlays pending until network result plus committed paint.
4. Add focused regressions; run typecheck, lint, Jest, and production build.

**Dependencies:** REQ-0033, REQ-0034, REQ-0035; GATE-0021 approved by user implementation request.
