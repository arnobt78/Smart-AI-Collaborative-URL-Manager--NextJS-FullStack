# REQUIREMENTS.md — Cycle C2

<!-- Revision: C2 | Date: 2026-08-19 | Human Gate 1: approved by user implementation request -->

**Status:** C2 locally verified — C1 release acceptance and C2 browser acceptance remain pending
**Created:** 2026-08-14

---

## Product baseline (existing — documented, not new build)

These describe the current product as verified in code. They are **Accepted as baseline** (not implementation work unless a defect is found).

| ID | Statement | Evidence |
|----|-----------|----------|
| REQ-BASE-001 | Users can sign up / sign in / sign out with email+password and cookie sessions | `src/lib/auth.ts`, `src/app/api/auth/*` |
| REQ-BASE-002 | Users can CRUD lists and URL items within lists | `src/app/api/lists/**`, hooks in `useListQueries.ts` |
| REQ-BASE-003 | Lists support public/private visibility and collaborator roles | schema `isPublic`, `collaboratorRoles`; collaborators API |
| REQ-BASE-004 | Client cache uses React Query Infinity staleTime with centralized invalidation | `src/lib/react-query.ts`, `src/utils/queryInvalidation.ts` |
| REQ-BASE-005 | Realtime list updates use Redis pub/sub + SSE | `src/lib/realtime/redis.ts`, `api/realtime/list/[listId]/events` |
| REQ-BASE-006 | Optional Redis caching for URL metadata when env present | `src/lib/redis.ts`, lists URL routes |
| REQ-BASE-007 | AI enhance / smart search / collections when provider keys present | `src/lib/ai/**` |
| REQ-BASE-008 | Import Pocket / Pinboard / Chrome; export helpers | `src/lib/import/**`, `src/lib/export/**` |
| REQ-BASE-009 | Background jobs via QStash for URL health / metadata / session cleanup | `src/app/api/jobs/**` |

---

## C1 proposed requirements (new / remediation)

### REQ-AI-0001 — Free-tier AI model chains (implemented 2026-08-14)

**Priority:** P0  
**Type:** Reliability / free-tier continuity  
**Statement:** AI enhancement, smart collections, and semantic search MUST use current free-tier model IDs with per-provider model chains and silent fallback (Gemini → Groq → OpenRouter → Hugging Face as applicable). Groq MUST NOT use Llama Instant / 70B Versatile after 2026-08-16. OpenRouter IDs MUST use `:free` (or `openrouter/free`).  
**Acceptance:**

- [x] `providers.ts` exposes `models[]` chains for gemini / groq / openrouter / huggingface
- [x] Shared `client.ts` walks model chain; 429 skips remaining models on that provider
- [x] enhancement / collections / search use shared client (no hardcoded deprecated IDs)
- [x] `docs/LLM_MODEL_SELECTION.md` verified date and OpenRouter examples refreshed
- [x] typecheck recorded in VALIDATION_SUMMARY.md (`tsc --noEmit` PASS)

**Trace:** TASK-AI-0001, DEC-AI-0001

---

### REQ-0001 — Environment onboarding without secrets

**Priority:** P0  
**Type:** Hardening / DX  
**Statement:** Repository MUST provide a committed `.env.example` with placeholder keys matching code (`UPSTASH_REDIS_REST_*`, `DATABASE_URL`, `DIRECT_URL`, etc.) and MUST NOT require AI agents to read `.env` / `.env.local`.  
**Acceptance:**

- [x] `.env.example` exists with placeholders only
- [x] README env section references `.env.example`
- [ ] Decision recorded on whether to stop allowlisting secrets in `.cursorignore`
- [x] No real credentials committed

**Trace:** RISK-0001, TASK-0001

---

### REQ-0002 — Vercel production guardrails

**Priority:** P0  
**Type:** Security / cost / ops  
**Statement:** Apply relevant parts of `docs/VERCEL_PRODUCTION_GUARDRAILS.md` to this App Router SSR+API project: security headers, immutable `/_next/static` cache headers, and a single robots source of truth. Dashboard bot settings remain a human action.  
**Acceptance:**

- [x] `next.config.js` (or successor) emits security headers
- [x] `/_next/static` Cache-Control immutable
- [x] `src/app/robots.ts` OR `public/robots.txt` (exactly one) — `src/app/robots.ts` only
- [x] Manual checklist item for Vercel Firewall Bot Protection documented in GATES/CHECKLIST (HA-0001)
- [x] App still builds; no intentional behavior break (`tsc --noEmit` PASS)

**Affected:** `next.config.js`, `vercel.json`, `src/app/robots.ts`, `src/app/layout.tsx`  
**Trace:** RISK-0002, TASK-0002, DEC-0002  
**Status:** Code complete 2026-08-14 — **HA-0001 dashboard still PENDING human**

---

### REQ-0003 — Safe remote image fallback

**Priority:** P1
**Type:** Resilience  
**Statement:** Introduce a reusable `SafeImage` (per `docs/SAFE_IMAGE_REUSABLE_COMPONENT.md`) and use it for remote URL preview images that currently rely solely on `next/image` (notably `UrlCard`), without regressing Cloudinary-optimized public assets that correctly use `OptimizedImage`.  
**Acceptance:**

- [x] `SafeImage` component exists under `src/components/ui/`
- [x] Remote preview usages that need fallback adopt it (`UrlCard`)
- [x] `OptimizedImage` remains for intentional Cloudinary/public-asset paths
- [x] No layout regression on list cards (same dimensions/classes; parent onError after native fail)

**Affected:** `src/components/ui/safe-image.tsx` (new), `src/components/lists/UrlCard.tsx`  
**Trace:** TASK-0003, RISK-0004  
**Status:** Implemented 2026-08-14

---

### REQ-0004 — Dependency and auth documentation hygiene

**Priority:** P1
**Type:** Maintainability  
**Statement:** Remove or justify unused dependencies (`next-auth`, `@hello-pangea/dnd` if still unused) and align README auth env docs with custom session auth.  
**Acceptance:**

- [x] Unused deps removed **or** DEC logged why kept — removed `next-auth`, `@hello-pangea/dnd` (2026-08-14)
- [x] README does not instruct NextAuth setup as the app’s auth system
- [x] `package.json` / lockfile consistent

**Trace:** RISK-0003, TASK-0004  
**Status:** Done 2026-08-14 — README documents custom cookie auth

---

### REQ-0005 — Redis integration guide ↔ code alignment

**Priority:** P2  
**Type:** Documentation  
**Statement:** `docs/Redis_Sentry_PostHog_INTEGRATION_GUIDE.md` Redis section MUST match this repo’s env var names and client API (`src/lib/redis.ts`), or clearly label generic vs project-specific.  
**Acceptance:**

- [x] Guide uses `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for this project
- [x] No contradictory “create lib/redis.ts from scratch” instructions without noting existing implementation
- [x] Thin `getCache` / `setCache` / `deleteCache` helpers on existing `src/lib/redis.ts`

**Trace:** TASK-0005  
**Status:** Done 2026-08-14

---

### REQ-0006 — Sentry and PostHog (optional track)

**Priority:** P2 (opt-in)  
**Type:** Observability  
**Statement:** IF approved for C1, integrate Sentry error tracking and PostHog analytics per project guide, with env-gated initialization (no-op when keys absent).  
**Acceptance:**

- [x] Dependencies added only after approval (`@sentry/nextjs`, `posthog-js`)
- [x] Client/server init env-gated
- [x] `.env.example` updated
- [x] No PII sent beyond approved events (PostHog: no identify; Sentry: no replay)
- [x] Sentry tunnelRoute `/api/monitoring` for ad-block bypass

**Trace:** TASK-0006, RISK-0005  
**Status:** Implemented 2026-08-14 — rotate `SENTRY_AUTH_TOKEN` if exposed in chat; verify `SENTRY_ORG`/`SENTRY_PROJECT` match dashboard

---

### REQ-0007 — Database host documentation sync

**Priority:** P3  
**Type:** Documentation  
**Statement:** README / onboarding MUST state the actual production PostgreSQL host strategy (Hetzner / Supabase / other) without contradictory “primary = Supabase only” claims unless verified.  
**Acceptance:** Human confirms current host; README updated accordingly.

**Trace:** TASK-0007 — blocked on question in STATE.md

---

### REQ-0008 — Test runner clarity

**Priority:** P3  
**Type:** DX  
**Statement:** Document which runner is canonical (`npm test` → Jest) and either remove unused Vitest config or wire a clear `test:vitest` script to avoid dual-runner confusion.  
**Acceptance:** Single documented path for CI/local; scripts match docs.

**Trace:** TASK-0008  
**Status:** Done 2026-08-14 — removed Vitest stack; Jest only

---

### REQ-0009 — Deeper server-first page shells (deferred design)

**Priority:** P3 / deferred  
**Type:** Architecture  
**Statement:** Evaluate moving initial list/browse data fetch into server components while keeping interactive islands client-only.  
**Acceptance:** Requires dedicated design approval; **out of default C1 implementation scope**.

**Trace:** DEC-0003 (pending)

---

### REQ-0010 — Shared UI control contract (revised 2026-08-18)

**Priority:** P2
**Type:** UI consistency / accessibility
**Statement:** The existing Daily Urlist UI MUST use one reusable control-size and spacing contract without changing product behavior. Input, select, search, labeled button, filter, and import/export trigger controls in the approved inventory MUST align at the same 48 CSS-pixel height on the same breakpoint. Labeled primary/action CTAs MUST use one meaningful Lucide icon at most (or no icon when the label is sufficient); icon-only controls remain icon-only with an accessible name.

**Acceptance:**

- [ ] Reuse or extend `src/components/ui/{Button,Input,Select}.tsx`, `src/lib/ui-spacing.ts`, and the glass recipes; centralize any new control classes in one existing/new shared UI style module rather than duplicate Tailwind strings in pages.
- [ ] Audit the approved interactive surfaces and classify controls as labeled CTA, compact action, or icon-only control before changing classes.
- [ ] Apply the existing spacing tokens or a documented extension only where it restores intentional page/section/form/list rhythm; preserve responsive layout and prevent layout shift.
- [ ] A labeled CTA has no duplicate/decorative icon; icon-only controls retain an `aria-label` or equivalent accessible name.
- [ ] Controls sharing a row align vertically at mobile and desktop widths; a narrow viewport may wrap controls but MUST NOT clip labels or overlap the menu/dialog layer.
- [ ] Home CTAs use `ListPlus` for "Create New List", `LayoutList` for "View My Lists", and `Bubbles` for "Get Started Now With Your Daily URL List"; each icon appears to the left of its label with the shared gap.
- [ ] Preserve all existing mutation, navigation, dialog, authorization, and cache-invalidation behavior.
- [ ] Record executed typecheck, lint, build, and viewport/manual accessibility evidence in `VALIDATION_SUMMARY.md`; do not treat historical entries as reruns.

**Initial affected inventory:** `src/components/ui/Button.tsx`, `src/lib/ui-spacing.ts`, `src/components/{Auth,HomePage}.tsx`, `src/components/layout/{Navbar,ProfileDropdown}.tsx`, `src/components/{lists,collections,collaboration,pages}/**/*.tsx`, and any direct CTA styling found during the approved audit.
**Trace:** TASK-0011, DEC-0012, RISK-0011, GATE-0011
**Status:** Completed 2026-08-18 — implemented and validated under GATE-0011.

---

### REQ-0011 — Auth form composition and motion (proposed 2026-08-18)

**Priority:** P2
**Type:** UX / accessibility / performance
**Statement:** The login panel MUST display logo, heading, explanatory text, guest selector, labels, inputs, and submit action as distinct, aligned rows. On initial guest render and each re-mount, these rows MUST reveal in a short ordered sequence without delaying form interactivity; motion MUST honor `prefers-reduced-motion` and MUST NOT drive authentication state or cause cumulative layout shift.

**Acceptance:**

- [ ] The form retains visible labels, native form semantics, keyboard access, focus indication, and immediate submit/dropdown interaction while motion is running.
- [ ] Logo and form header are grouped separately from fields; field rows use the shared control contract from REQ-0010.
- [ ] The reveal uses opacity and transform only, within 12–24px, 350–550ms per row, and 40–100ms stagger; reduced motion renders final state immediately.
- [ ] No Framer Motion dependency is added unless separately approved; use the established CSS/browser platform capabilities.
- [ ] At 320px, 768px, and 1440px, no row overlaps, clips, or changes the fixed auth shell's scroll behavior.

**Affected:** `src/components/Auth.tsx`, `src/app/globals.css`, shared UI motion/style utility only if necessary.
**Trace:** TASK-0012, DEC-0013, RISK-0012, GATE-0011
**Status:** Completed 2026-08-18 — implemented and validated under GATE-0011.

---

### REQ-0012 — Smart Collections explicit disclosure (proposed 2026-08-18)

**Priority:** P2
**Type:** UX / accessibility
**Statement:** Smart Collections MUST use an explicit "View Suggestions" / "View Less" disclosure control in place of the non-descriptive close icon. The collapsed state MUST preserve the title and summary; the expanded state MUST expose suggestions, duplicate checks, and refresh actions without fetching duplicate checks until that action is requested.

**Acceptance:**

- [ ] The disclosure is a labeled button with `aria-expanded` and an `aria-controls` relationship to the revealed content.
- [ ] Its icon is `ListPlus`; collection creation uses a descriptive action label and `ListPlus`, not generic "Create" alone.
- [ ] Collapse/expand changes presentation only: it does not clear suggestions, trigger redundant collection requests, mutate data, or change permission checks.
- [ ] Collection creation retains its existing optimistic suggestion removal and list/all-list invalidation; errors remain recoverable and visible to the user.

**Affected:** `src/components/collections/SmartCollections.tsx`, shared control styles only as needed.
**Trace:** TASK-0013, DEC-0012, RISK-0013, GATE-0011
**Status:** Completed 2026-08-18 — implemented and validated under GATE-0011.

---

### REQ-0013 — URL workspace toolbar and add-form refinement (proposed 2026-08-18)

**Priority:** P2
**Type:** UX / responsive behavior
**Statement:** The URL workspace MUST provide clear icon/label spacing and meaningful icons for Active URLs, Archived URLs, import/export triggers, filters, and Add URL. The Add URL disclosure MUST use `WandSparkles`, expand into a responsive full-width form, and provide a clear labeled cancel/close action; it MUST preserve all existing URL add, metadata-prefetch, AI-enhancement, permission, optimistic-update, and invalidation behavior.

**Acceptance:**

- [ ] Active URLs uses `Link2`, Archived uses `Archive`, filter uses `Filter`, export uses `Download`, and import uses `Upload`; every labeled control has an 8px icon-to-label gap and preserves its existing menu/tooltip.
- [ ] Add URL uses `WandSparkles`; its form is full width inside the list content container, constrained only by the page layout, and is usable at 320px, 768px, and 1440px.
- [ ] When expanded, the form exposes a labeled cancel/close action with a meaningful icon; cancel clears only transient form state and does not submit or mutate URLs.
- [ ] On successful add, the existing immediate optimistic/cache update, centralized query invalidation, SSE synchronization, and form collapse remain intact. On failure, entered values and an actionable error remain visible.
- [ ] No change is made to API contracts, database schema, authorization rules, Redis, local storage persistence, or server rendering boundaries.

**Affected:** `src/components/lists/{UrlList,UrlAddForm,UrlFilterBar,UrlBulkImportExport}.tsx`, `src/components/ui/{Button,Input}.tsx`, shared control styles only as needed.
**Trace:** TASK-0014, DEC-0012, RISK-0011, GATE-0011
**Status:** Completed 2026-08-18 — implemented and validated under GATE-0011.

---

### REQ-0014 — Repository lint remediation (proposed 2026-08-18)

**Priority:** P3
**Type:** Type safety / maintainability
**Statement:** The canonical `npm run lint` command MUST complete with zero errors and zero warnings. Remediation MUST preserve runtime behavior, API contracts, and cache/mutation semantics; `any` values must be replaced with precise, validated types or `unknown` plus narrowing.

**Acceptance:**

- [ ] The current lint warning inventory is triaged by category: unused code, unsafe `any`, and hook dependency correctness.
- [ ] Each hook-dependency change is behaviorally reviewed; dependencies are not silenced or omitted merely to satisfy lint.
- [ ] Each unsafe value is narrowed at its boundary; no global eslint disable or blanket `any` substitution is introduced.
- [ ] `npm run lint`, `npx tsc --noEmit`, relevant Jest tests, and `npm run build` pass after the changes.

**Affected:** Repository-wide; planned as an independent final wave because the current command reports warnings across application, hooks, stores, tests, and import tooling.
**Trace:** TASK-0015, DEC-0012, RISK-0014, GATE-0011
**Status:** Completed 2026-08-18 — zero-warning lint, typecheck, Jest, and production build pass under GATE-0011.

---

### REQ-0015 — Responsive application chrome alignment (approved 2026-08-18)

**Priority:** P2
**Type:** UI consistency / responsive layout
**Statement:** Navbar and footer content MUST be horizontally and vertically centered within the shared 56px desktop chrome rhythm. At narrow widths, the expanded navigation and stacked footer MUST grow without clipping, overlap, or fixed-height overflow.

**Acceptance:**

- [ ] The navbar's brand, desktop navigation, profile control, and mobile controls remain vertically centered in its 56px row.
- [ ] The footer's copyright and navigation row remain vertically centered at `sm` and above; below `sm`, the footer has enough intrinsic height for its stacked content.
- [ ] Header/footer controls preserve current routes, session behavior, import-navigation guard, keyboard focus, and responsive menu semantics.
- [ ] Browser-internal import/navigation cache typing is defined once in the existing global browser declarations; no local `Window` cast or unsafe `any` is introduced.
- [ ] Remove only dead commented footer code associated with the revised chrome; retain user-facing content and existing visual style.
- [ ] `npm run lint`, `npx tsc --noEmit`, Jest, and `npm run build` pass; manually inspect 320px, 768px, and 1440px layouts.

**Affected:** `src/components/layout/{Navbar,Footer}.tsx`, `src/types/browser-globals.d.ts`, and validation/traceability records only.
**Trace:** TASK-0016, DEC-0015, RISK-0015, GATE-0012
**Status:** Completed 2026-08-18 — shared chrome alignment and browser typing validated under GATE-0012.

---

### REQ-0016 — Opaque, reachable guest-account menu (completed 2026-08-18)

**Priority:** P1
**Type:** Auth UX / accessibility
**Statement:** The test-credential menu MUST render above neighboring animated form rows with an opaque surface, preserving pointer and keyboard access to every account action.

**Acceptance:**

- [x] Opening the menu raises its parent stacking context above sibling reveal rows.
- [x] The menu uses an opaque dark surface with visible border and focusable account actions.
- [x] The trigger exposes `aria-expanded` and `aria-controls`; account selection, clear, and sign-in behavior are unchanged.
- [x] Lint, strict TypeScript, Jest, and production build pass.

**Affected:** `src/components/Auth.tsx` and traceability records only.
**Trace:** TASK-0017, DEC-0017
**Status:** Completed 2026-08-18 — user-reported regression fixed and validated.

---

### REQ-0017 — Unified compact controls and marketing scroll reveal (approved 2026-08-18)

**Priority:** P2
**Type:** UI consistency / motion accessibility
**Statement:** Shared labeled buttons, inputs, and dropdowns MUST use `h-10 min-h-10` with `text-sm` placeholder text. Home CTAs MUST consume that shared control contract without local height/padding overrides. Authenticated marketing content MUST reveal in a short ordered sequence on enter/leave with subtle scroll parallax, without adding a runtime animation dependency.

**Acceptance:**

- [ ] `Button` sizes and glass recipes defer height to `UI_CONTROL_HEIGHT`; the only size variation is typography/horizontal padding.
- [ ] Shared form control placeholder typography remains `text-sm` across breakpoints.
- [ ] Home hero CTAs use the same `Button` geometry with no local vertical padding; their intended variants and destinations remain unchanged.
- [ ] A reusable browser-platform reveal wrapper supports ordered opacity/transform reveal, enter/leave replay, small scroll parallax, and `prefers-reduced-motion`.
- [ ] No auth, query, mutation, API, or session behavior changes.
- [ ] Lint, strict TypeScript, Jest, and production build pass.

**Affected:** `src/lib/ui/{control-styles,glass-button-styles}.ts`, `src/components/{ui/Button,ui/ScrollReveal,HomePage}.tsx`, `src/app/globals.css`, and traceability records.
**Trace:** TASK-0018, DEC-0018
**Status:** Implementation and automated validation complete; final browser acceptance awaits user testing.

---

### REQ-0018 — Unified dialog and stable data surfaces (approved 2026-08-18)

**Priority:** P2
**Type:** UX / accessibility / rendering stability
**Statement:** CRUD and collaboration overlays MUST share one accessible dialog primitive; legacy list form links MUST preserve deep-link behavior through dialog-state redirects. Cached query results MUST remain rendered during background refreshes.

**Acceptance:**

- [x] Shared dialog uses responsive capped geometry, focus, Escape/backdrop close, contained scrolling, and pending-state close protection.
- [x] URL add/edit and confirmation flows use the shared dialog; list create/edit legacy routes redirect to dialog-state hosts while reusing existing mutation handlers.
- [x] Browse preserves cached cards during background refetch instead of replacing them with a full skeleton.
- [x] Browse, Insights, API Docs, and API Status use the shared icon/title/subtitle page-header component.
- [x] PermissionManager invite and role-change dialogs use the shared primitive without changing their data contracts.
- [ ] Validate metadata preview fallback and action-count badges with browser integration coverage.

**Trace:** TASK-0019, DEC-0020, RISK-0017
**Status:** Implementation and automated validation complete; metadata-preview and action-badge browser acceptance awaits user testing.
**Status:** Approved — user authorized implementation in the 2026-08-18 control and Home-motion request.

---

### REQ-0019 — Central zero-gap heading contract (approved 2026-08-18)

**Priority:** P2
**Type:** UI consistency / layout stability
**Statement:** Direct title/subtitle or title/description pairs MUST use one shared zero-gap heading stack. Natural line-height, surrounding content spacing, responsive typography, card padding, dialog focus, and scrolling MUST remain unchanged.

**Acceptance:**

- [x] `PageHeader`, `Dialog`, and `CardHeader` consume the shared heading stack.
- [x] Legacy page, empty-state, and feature-card title/description pairs have no local margin, padding, gap, or `space-y` separation.
- [x] Form fields, action rows, controls, menus, card content, and unrelated prose keep their existing spacing.
- [x] TypeScript, zero-warning lint, Jest, production build, and diff checks pass.

**Affected:** `src/lib/ui-spacing.ts`, shared UI headers, targeted title/description call sites, and traceability records only.
**Trace:** TASK-0020, DEC-0021
**Status:** Completed 2026-08-18 — central contract and targeted legacy pairs validated.

---

### REQ-0020 — Stable data surfaces and safe metadata retrieval (approved 2026-08-18)

**Priority:** P1
**Type:** UX stability / security
**Statement:** Requested data pages MUST retain static chrome and cached content during refreshes. Metadata retrieval MUST reject private-network destinations and validate redirects. URL comment badges MUST use the unified payload rather than per-card requests.

**Acceptance:** delayed, local-only cold placeholders; grouped comment counts; no import-triggered hard reload; public HTTP(S) metadata, preview-image, and favicon fetching with DNS/IP and redirect checks; zero-warning lint, TypeScript, Jest, build, and diff checks.

**Trace:** TASK-0021, DEC-0020
**Status:** Completed 2026-08-18.

---

### REQ-0021 — Stable list-form dialogs (approved 2026-08-18)

**Priority:** P1
**Type:** UX stability / accessibility / cache consistency
**Statement:** List create and edit dialogs MUST render one scrollable, accessible heading row, preserve cached list content while dialogs open or close, and use centralized cache-aware mutations without route-delay or full-page skeleton transitions.

**Acceptance:**

- [x] Create and edit display one title/subtitle/X row, with contained scrolling and no artificial blank form height.
- [x] Public visibility controls are vertically aligned; rendered Cancel and Clear actions use the requested note-with-X convention and `Eraser` respectively.
- [x] Edit opens from cached list data without the "Opening Editor" toast or a page/form skeleton; cancelling a dialog does not remount the list surface.
- [x] Create and update mutations optimistically reconcile relevant React Query caches, roll back failures, invalidate once after success, and do not use timer-delayed navigation or router refresh.
- [x] Direct create/edit links remain compatible; existing API, cookie-auth, Prisma, Redis, and SSE contracts remain unchanged.
- [x] Focused Jest coverage plus TypeScript, zero-warning lint, production build, and diff checks pass.

**Trace:** TASK-0022, DEC-0022, GATE-0013
**Status:** Completed and validated 2026-08-18.

---

## Out of scope for default C1

- Schema normalization of `List.urls` JSON → relational tables
- Full rewrite to NextAuth / Auth.js
- Unrelated UI redesign
- Claiming realtime cross-device sync beyond existing SSE/Redis paths

---

### REQ-0022 — List resource authorization boundary (proposed 2026-08-19)

**Priority:** P0 / Critical
**Type:** Security / authorization
**Statement:** Every list-scoped route MUST resolve the addressed list before performing reads or side effects and MUST enforce the existing cookie-session role model on the resolved canonical list ID. Private list metadata must never be readable or refreshable by an unauthorized caller, and vector synchronization must never be triggerable without edit permission.

**Acceptance:**

- [x] `PATCH /api/lists/[id]` requires authenticated owner/editor edit permission for title/description updates and requires owner permission for visibility changes; rejected callers receive a non-disclosing authorization response and no activity or SSE event is emitted.
- [x] `DELETE /api/lists/[id]` requires owner delete permission before deletion; collaborator/viewer/unknown identifiers cannot delete another user's list.
- [x] `GET /api/lists/[id]/metadata` checks existing list access before reading Redis or returning URL metadata; `POST` refresh/invalidation and `POST /sync-vectors` require edit permission before side effects.
- [x] Identifier resolution preserves existing slug/ID compatibility but authorization, database writes, activities, SSE messages, Redis keys, and vector operations use the resolved canonical UUID.
- [x] Focused authorization tests cover unauthenticated, owner, editor, viewer, and unrelated-user outcomes before protected route side effects.

**Affected:** `src/app/api/lists/[id]/{route,metadata/route,sync-vectors/route}.ts`, existing collaboration permission/db helpers, and focused route tests.
**Trace:** TASK-0023, DEC-0023, RISK-0017, GATE-0014
**Status:** Completed and locally validated 2026-08-19.

---

## C2 requirements

### REQ-0024 — Homepage hero mount stagger (approved 2026-08-19)

**Priority:** P2
**Type:** UI consistency / accessibility / rendering stability
**Statement:** The authenticated homepage hero MUST reveal its logo, title, two description rows, and CTA row with the same initial-mount CSS stagger used by the login form. The hero MUST keep its current copy, logo asset, internal destinations, responsive control geometry, and session/SSR behavior.

**Acceptance:**

- [x] The five ordered hero rows use the existing `auth-reveal` CSS contract with delays 0 through 4; the CTA buttons share the final row.
- [x] The feature, workflow, and final CTA sections retain their existing `ScrollReveal` behavior.
- [x] Reduced motion renders all hero rows immediately; normal motion uses only existing opacity/transform CSS and does not delay interaction or cause layout shift.
- [x] No query, cache, mutation, API, database, authorization, or session contract changes are introduced.
- [x] Focused homepage coverage verifies ordered reveal classes and CTA destinations; TypeScript, zero-warning lint, Jest, production build, and diff checks pass.

**Affected:** `src/components/HomePage.tsx`, `src/components/__tests__/HomePage.test.tsx`, test setup debug output, and C2 traceability records only.
**Trace:** CR-0001, TASK-0026, DEC-0026, GATE-0015
**Status:** Completed and locally validated [C2] on 2026-08-19.

---

### REQ-0023 — Single list mutation gateway and stable data surfaces (proposed 2026-08-19)

**Priority:** P1
**Type:** Cache consistency / rendering stability
**Statement:** List and URL CRUD MUST use one cache-commit and rollback contract across the existing React Query and `currentList` store surfaces. Page shells and cached data MUST remain mounted during background work, dialog transitions, navigation, and SSE synchronization; a delayed local placeholder may appear only when the requested data has never been cached.

**Acceptance:**

- [x] The unused legacy URL mutation hooks are removed after verified-zero consumers; no second optimistic implementation remains in parallel with the store flow.
- [x] Add, update, and delete snapshot the matching `currentList` value before any optimistic patch; failures restore that exact snapshot and successes commit the server list before one centralized affected-query invalidation.
- [x] Existing list/detail, all-lists, public browse, metadata, collaborator/activity, and relevant insight cache surfaces are patched or invalidated once according to the mutation impact; no `router.refresh`, cache clearing, timer reload, or duplicate mutation fetch is introduced.
- [x] Browse removes its duplicate Suspense page fallback; Browse, Lists, Business Insights, API Status, and list detail keep their static shell mounted and never render an empty/zero-value state before the real data or delayed local cold state.
- [x] Broad list/detail/page skeleton remounts are replaced by dimension-matched local data slots only where a first uncached request needs feedback; background refetch, SSE, dialog close/open, and warm back-navigation retain the last confirmed data.
- [x] Focused tests cover authorization outcomes and failed delete rollback; full regression, type, lint, build, and diff checks pass.

**Affected:** `src/hooks/useListQueries.ts`, `src/stores/urlListStore.ts`, `src/utils/queryInvalidation.ts`, URL/list page and query components, and focused tests only.
**Trace:** TASK-0024, DEC-0023, RISK-0018, GATE-0014
**Status:** Completed and locally validated 2026-08-19.

---

## C3 requirements

### REQ-0025 — Validated mutation boundaries, digest-backed sessions, and cache integrity (approved 2026-08-19)

**Priority:** P0
**Type:** Security / data integrity / cache consistency
**Statement:** Every mutating API boundary MUST parse route identifiers and payloads through shared Zod schemas before authorization or side effects. New opaque cookie-session tokens MUST be persisted only as SHA-256 digests while valid legacy plaintext records rotate transparently on access. Client CRUD mutations MUST use the existing query-key and invalidation gateway with isolated optimistic rollback and one successful-impact invalidation.

**Acceptance:**

- [x] Shared typed request parsing rejects malformed JSON and invalid route identifiers/payloads with a non-disclosing 400 before database, Redis, vector, email, SSE, or authorization side effects.
- [x] Auth, lists, URLs/actions, comments, collaborators, visibility, collections, metadata, imports, AI, email, and internal job mutations use the shared schemas.
- [x] New sessions use cryptographically random opaque tokens and SHA-256 database digests; valid legacy plaintext tokens rotate in place without logout; lookup, expiry, and sign-out support both representations during transition.
- [x] `session_token` remains HttpOnly, production-Secure, SameSite=Lax, and unavailable to client JavaScript; passwords remain bcrypt hashes and Prisma 6 remains unchanged.
- [x] Mutation families retain optimistic snapshots, roll back only their own failed operation, and invalidate their mapped cache families once after success while SSE continues cross-client synchronization.
- [x] Focused rejection, session transition, mutation rollback/invalidation, and invite-pending tests pass with strict TypeScript, zero-warning lint, Jest, production build, dependency audit, and direct-console scan.

**Affected:** `src/lib/auth.ts`, shared server validation utilities, mutating route handlers, mutation/query helpers and focused tests.
**Trace:** CR-0002, TASK-0027 through TASK-0030, DEC-0027, GATE-0016.
**Status:** Completed and locally validated [C3] on 2026-08-19.

---

### REQ-0026 — C4 mutation reconciliation and cache-first refresh (approved 2026-08-19)

**Priority:** P1
**Type:** UX stability / cache consistency
**Statement:** Remaining collection, URL archive/reorder/metadata, and list action mutations MUST commit the initiating cache/store state immediately, restore only their initiating snapshot on failure, and reconcile affected cache families once without duplicate requests or page refreshes.

**Acceptance:**

- [x] Collection creation and duplicate deletion optimistically patch the source list and local result cache, then roll back their own snapshots on failure.
- [x] Archive, restore, reorder, favorite, and pin mutations are store-owned transactions with exact rollback and one typed impact invalidation.
- [x] Metadata, health, and click-analytics actions use typed scoped impacts; vector indexing remains explicitly non-rendered; collection refresh commits its single refreshed response without a second cache-clear fetch.
- [x] Focused rollback/impact tests plus TypeScript, zero-warning lint, Jest, production build, and diff checks pass.

**Trace:** CR-0004, TASK-0031, DEC-0028.
**Status:** Completed and locally validated [C4] on 2026-08-19.

---

### REQ-0027 — C5 secure revocation and server-hydrated data surfaces (approved 2026-08-19)

**Priority:** P1
**Type:** Security / performance / cache consistency
**Statement:** Authenticated requests MUST not reuse process-wide session authorization after revocation, and the Lists, list-detail, Browse, and Business Insights routes MUST hydrate their existing React Query keys from server-resolved data without duplicate initial client requests. Every UI-visible mutation MUST retain one scoped optimistic transaction and one typed impact reconciliation path.

**Acceptance:**

- [x] Session lookup verifies persisted state on every request; sign-out, expiry, legacy rotation, and logout-all cannot reuse a stale in-memory authorization result.
- [x] Core data pages hydrate matching query keys from server-only loaders while preserving private-data authorization and cache-first navigation.
- [x] Delete-list and remaining UI-visible actions use the typed mutation-impact gateway with exact rollback and no duplicate success invalidation.
- [x] Focused security, hydration, request-count, mutation-boundary, public-view authorization, type, lint, Jest, production-build, and hygiene evidence is recorded.

**Trace:** TASK-0032, TASK-0033, DEC-0029, DEC-0030, ART-0027.1, C5 checkpoint.
**Status:** Completed and locally validated [C5] on 2026-08-19.

---

### REQ-0028 — C6 stable data-surface & compact analytics polish (approved 2026-08-19)

**Priority:** P1
**Type:** UX / performance / access consistency

**Acceptance criteria:**

- [x] Activity Feed is an accessible, default-collapsed disclosure that keeps list detail height stable while preserving its live cached content.
- [x] Protected application pages redirect server-side to the sign-in home after session-cookie removal; public Browse and public shared lists remain accessible.
- [x] Lists, Browse, Insights, and API Status hydrate data on the server and render stable, compact data-shaped cold slots only when data is genuinely unavailable.
- [x] Every URL/list write immediately commits the affected list summary (including `updatedAt`) to current detail and all-lists cache before one typed reconciliation.
- [x] List cards use compact responsive title, view/edit/delete controls, and independently sized visibility/count badges.
- [x] Insights uses aligned icon-label tabs, compact KPI cards, and one Overview activity visualization with no duplicate Activity tab.

**Trace:** TASK-0034, ART-0028.1, C6 checkpoint.
**Status:** Completed and locally validated [C6] on 2026-08-19.

---

### REQ-0029 — C6.1 authenticated public discovery & hydration parity (approved 2026-08-19)

**Priority:** P1
**Type:** Security / data consistency

**Acceptance criteria:**

- [x] Browse and public shared-list pages require a persisted Daily Urlist session before rendering data.
- [x] Public-list discovery, shared detail, collaborators, and view tracking reject anonymous requests before reads or writes.
- [x] Legacy URL position normalization never writes from a GET request.
- [x] Server-hydrated unified payloads retain comment counts and seed collaborator cache state identically to browser-fetched payloads.

**Trace:** TASK-0035, ART-0029.1, C6.1 checkpoint.
**Status:** Completed and locally validated [C6.1] on 2026-08-19.

---

### REQ-0030 — C6.2 instant list dialogs & confirmed mutation completion (approved 2026-08-20)

**Priority:** P1
**Type:** UX / performance / cache integrity

**Acceptance criteria:**

- [x] List create/edit dialog open, close, Escape, backdrop, and browser history transitions update local state and the deep-link URL without Next router navigation or an RSC request.
- [x] Create, edit, and delete keep their dialog visibly pending and non-dismissible through server success/error; failures retain usable forms or retryable confirmation state.
- [x] Delete closes only after its optimistic cache removal is committed and painted; create retains its confirmed state until the detail transition owns the screen; edit closes after the returned cache state paints.
- [x] Existing cache-first navigation, typed mutation impact, SSE, Zod/API/session behavior, and direct list-dialog deep links remain compatible.

**Trace:** TASK-0036, DEC-0031, ART-0030.1, C6.2 checkpoint.
**Status:** Completed and locally validated [C6.2] on 2026-08-20.

---

### REQ-0031 — C6.3 unified dialog visual contract (approved 2026-08-20)

**Priority:** P2
**Type:** UX / component consistency

**Acceptance criteria:**

- [x] Fixed and scrollable shared-dialog headers use the Create List compact `pb-2 sm:pb-4` rhythm with no header divider, `mb-6`, or `pb-6` treatment.
- [x] Active confirmation and feature dialogs inherit the contract through `Dialog` or `AlertDialog` without altering their behavior.
- [x] The verified-unused standalone `InputDialog` overlay is removed; no active duplicate dialog implementation remains.

**Trace:** TASK-0037, DEC-0032, ART-0031.1, C6.3 checkpoint.
**Status:** Completed and locally validated [C6.3] on 2026-08-20.

---

### REQ-0032 — C6.4 instant create-list launchers (approved 2026-08-20)

**Priority:** P1
**Type:** UX / client-navigation performance

**Acceptance criteria:**

- [x] Every already-hydrated Create List CTA opens the shared Create List dialog synchronously on its current page without `router.push`, `router.replace`, or an RSC request.
- [x] Home and Lists reuse one Create List dialog launcher/content contract; direct `?dialog=create` deep links remain supported on their respective pages.
- [x] Close, Escape, backdrop, and browser-back transitions remain immediate when no mutation is pending.
- [x] Create retains the existing confirmed pending lifecycle, cache seeding, detail transition, API/session behavior, and typed cache reconciliation.
- [x] Focused regressions prove the Home CTA is a local button, no router navigation is used for hydrated opens, and deep-link behavior is preserved.

**Trace:** TASK-0038, DEC-0033, CR-0011, GATE-0020.
**Status:** Completed, locally validated, and production-deployed [C6.4] on 2026-08-20 (`c675cf6` / `dpl_DB8BYHnrXN5LuwL5Yo5FNdtwFvXd`). Browser acceptance remains TASK-0039.

---

### REQ-0033 — C6.5 localize list-detail edit dialog (approved 2026-08-20)

**Priority:** P1
**Type:** UX / client-navigation performance

**Statement:** Hydrated list create/edit overlays MUST keep React state plus `history.state` on the same href. They MUST NOT subscribe to Next `useSearchParams` or write `?dialog=` search params, because Next 15 treats those writes as App Router RSC navigations.

**Acceptance criteria:**

- [x] Opening, closing, Escape, backdrop, and browser-back on Lists and `/list/[slug]` do not write Next-visible search params or call `router.push`/`replace` for the overlay.
- [x] Direct `/lists?dialog=create`, `/new`, `/list/[slug]/edit`, and `?dialog=edit` still open the shared dialog from a one-time mount parse.
- [x] Edit retains the existing confirmed pending lifecycle, cache seeding, API/session behavior, and typed cache reconciliation.
- [x] Focused regressions cover hydrated open/close without search-param writes, mount-from-query, and popstate.

**Affected:** `src/hooks/useListDialogRouteState.ts`; `src/components/pages/ListPage.tsx`; focused tests.
**Trace:** TASK-0040, DEC-0035, CR-0012, GATE-0021.
**Status:** Completed and locally validated [C6.5] on 2026-08-20.

---

### REQ-0034 — Remove unused Create List RSC fallback (approved 2026-08-20)

**Priority:** P2
**Type:** Regression prevention

**Statement:** `CreateNewListButton` MUST NOT fall back to `href="/lists?dialog=create"`. Hydrated callers supply a local `onClick`.

**Acceptance criteria:**

- [x] The shared button has no implicit Lists RSC navigation.
- [x] Current Home and Lists callers continue to open the local Create List dialog.
- [x] Home coverage asserts the hydrated Create List control is a button without a Lists deep-link href.

**Affected:** `src/components/ui/CreateNewListButton.tsx`; Home tests.
**Trace:** TASK-0040, DEC-0035, CR-0012, GATE-0021.
**Status:** Completed and locally validated [C6.5] on 2026-08-20.

---

### REQ-0035 — Confirmed pending mutating overlays (approved 2026-08-20)

**Priority:** P1
**Type:** UX / mutation integrity

**Statement:** Mutating create/edit/delete overlays MUST stay visible with a loading spinner until the server result is known and one committed paint can occur. Idle close remains immediate. Failures remain retryable in the open dialog.

**Acceptance criteria:**

- [x] URL add/edit dialogs use `Dialog pending` while the mutation is in flight.
- [x] URL delete/archive, comment delete, collaborator remove, and Smart Collections duplicate-remove use `AlertDialog closeOnConfirm={false}` plus pending.
- [x] Invite and role-change dialogs cannot be dismissed while their mutations are pending.
- [x] Focused coverage blocks close while add-URL and shared Dialog pending flags are set.

**Affected:** UrlAddForm, UrlEditModal, UrlCard, Comments, PermissionManager, SmartCollections, Dialog tests.
**Trace:** TASK-0040, DEC-0035, CR-0012, GATE-0021.
**Status:** Completed and locally validated [C6.5] on 2026-08-20.

---

### REQ-0036 — Instant soft-nav destination shells (approved 2026-08-20)

**Priority:** P1
**Type:** UX / App Router navigation

**Statement:** Soft-nav from Home/Navbar to Lists, Browse, Insights, and list detail MUST paint the destination page shell immediately. Protected RSC MAY await session auth only; heavy SSR prefetch MUST NOT block the soft-nav critical path. Cold data uses delayed local `DataSurfaceSlot`; warm client RQ paints immediately.

**Acceptance criteria:**

- [x] Segment `loading.tsx` for lists/browse/business-insights/list/[slug] uses shared `RoutePageSkeleton` (children only; layout chrome stays).
- [x] Protected pages call `requirePageUser` then return empty dehydrate + client page without awaiting list/insights/unified prefetch.
- [x] Lists/Browse/Insights use `useDelayedPending` for cold slots; List detail uses `ListDetailRouteSkeleton` when cold for the matched slug.
- [x] Per-request `React.cache` dedupes session/user lookup; Jest-safe fallback when `cache` is absent.
- [x] tsc, lint 0, Jest, and production build pass.

**Affected:** `RoutePageSkeleton`, app loading/page files, Lists/Browse/Insights/ListPage clients, `lib/auth.ts`.
**Trace:** TASK-0041, DEC-0037, CR-0013, GATE-0022.
**Status:** Completed and locally validated [C6.6] on 2026-08-20. Empty-dehydrate criterion superseded by REQ-0037.

---

### REQ-0037 — Single soft-nav skeleton via SSR hydrate (approved 2026-08-20)

**Priority:** P1
**Type:** UX / App Router hydration

**Statement:** Soft-nav destination shells MUST remain instant via segment `loading.tsx`, and protected pages MUST await SSR React Query prefetch/dehydrate so the client does not cold-fetch or show a second DataSurfaceSlot after RSC.

**Acceptance criteria:**

- [x] Lists/Browse/Insights/detail pages prefetch via `server-data` loaders and dehydrate real query data after `requirePageUser`.
- [x] Segment `loading.tsx` / `RoutePageSkeleton` retained (one continuous skeleton covering auth + prefetch).
- [x] Page cold slots remain for hard refresh / invalidated cold only.
- [x] tsc, lint 0, Jest, and production build pass.

**Affected:** `src/app/{lists,browse,business-insights,list/[slug]}/page.tsx`.
**Trace:** TASK-0042, DEC-0038, CR-0014, GATE-0023.
**Status:** Completed and locally validated [C6.7] on 2026-08-20.

---

### REQ-0038 — Warm soft-nav + lighter Insights RSC (approved 2026-08-20)

**Priority:** P1
**Type:** UX / performance

**Statement:** When React Query already holds destination page data, soft-nav MUST NOT flash RoutePageSkeleton. Cold soft-nav keeps one skeleton. Insights SSR MUST seed overview+activity only; other tabs fetch when selected. `getCurrentUser` MUST reuse session.user from the persistence join.

**Acceptance criteria:**

- [x] Central `soft-nav-cache` + `WarmSoftNavLink` / `warmRouterPush` mark warm navigations; loading gates return null when warm.
- [x] Navbar, Home View My Lists, Lists cards, Browse cards, PopularContent, SmartCollections wired.
- [x] Insights page seeds overview+activity; popular/performance/global use `enabled` by tab.
- [x] `getCurrentUser` returns `session.user` without a second Prisma user query.
- [x] tsc, lint 0, Jest, and production build pass.

**Affected:** soft-nav helpers, loading gates, Navbar/Home/Lists/Browse/Popular/SC, auth, Insights page/hooks.
**Trace:** TASK-0043, DEC-0039, CR-0015, GATE-0024.
**Status:** Completed and locally validated [C6.8] on 2026-08-20.

---

### REQ-0039 — Optimistic soft-nav surface (no empty hole) (approved 2026-08-20)

**Priority:** P1
**Type:** UX / performance

**Statement:** Warm soft-nav MUST paint destination chrome/cards from React Query inside segment `loading.tsx` (never `null` empty content). Cold soft-nav keeps one continuous `RoutePageSkeleton`. Page clients MUST NOT render delayed `null` while waiting for cold data. List detail MUST paint immediately when unified cache matches the slug. Densify rewrite remains out of scope.

**Acceptance criteria:**

- [x] `OptimisticSoftNavSurface` for lists/browse/insights/list-detail; SoftNavLoading never returns null.
- [x] Browse warm check includes page/search keys; slug intent prefetch; create→detail `warmRouterReplace`.
- [x] Lists/Browse immediate cold slot; Insights tabs never blank; ListPage skeleton only when cold for slug.
- [x] tsc, lint 0, Jest, and production build pass.

**Affected:** soft-nav-cache, SoftNavLoading, OptimisticSoftNavSurface, Lists/Browse/Insights/List/NewList pages, useWarmSoftNav, WarmSoftNavLink.
**Trace:** TASK-0044, DEC-0040, CR-0016, GATE-0025.
**Status:** Completed and locally validated [C6.9] on 2026-08-20.

---

### REQ-0040 — Instant static chrome + one cold paint (C7.0) (approved 2026-08-21)

**Priority:** P1
**Type:** UX / performance

**Statement:** Page static chrome (title, subtitle, primary actions, tabs chrome, list cards) MUST paint immediately on warm soft-nav with full parity to the hydrated page. Cold soft-nav MUST show at most one continuous loading surface for the data region. Browse search MUST be instant client filter without a Search button. Densify rewrite and JWT-null SSR remain out of scope.

**Acceptance criteria:**

- [x] Per-page late-static map from human screenshots (Lists, Browse, Insights).
- [x] Shared Lists/Browse/Insights chrome+cards used by page + OptimisticSoftNavSurface.
- [x] Browse instant filter; title click; no View List row; PageHeader matches My Lists typography.
- [x] Insights tabs always present and vertically centered; single outer CARD_PAD on insight cards.
- [x] Remove page-level min-h-screen under layout main.
- [x] tsc, lint 0, Jest, and production build pass.

**Affected:** ListsPageChrome, MyListsCard, BrowsePublicListCard, BrowseSearchField, InsightsTabsList, OptimisticSoftNavSurface, PageHeader, Card, Tabs, Lists/Browse/Insights pages.
**Trace:** TASK-0045, DEC-0041, CR-0017, GATE-0026.
**Status:** Completed and locally validated [C7.0] on 2026-08-21.

---

### REQ-0041 — Targeted densify for browse + insights stale soft-nav (C7.1) (approved 2026-08-21)

**Priority:** P1
**Type:** Data / cache consistency

**Statement:** After list create/update/visibility/delete, browse public caches MUST densify immediately (upsert public / remove private-deleted). Deleted list unified keys MUST be dropped so warm soft-nav cannot paint a ghost detail. Insights invalidation MUST include activity and popular tabs; URL/import mutations MUST mark all business-insights stale. Full densify rewrite and JWT-null SSR remain out of scope; `invalidateMutationImpact` stays the single impact gateway.

**Acceptance criteria:**

- [x] `densifyBrowsePublicLists` / `dropUnifiedListCache` wired on list CRUD + visibility.
- [x] `invalidateBrowseQueries` + URL impact invalidate all `business-insights` keys.
- [x] Optimistic browse rollback on visibility/delete failure.
- [x] Unit coverage for densify + insights invalidation; tsc, lint 0, Jest pass.

**Affected:** queryInvalidation.ts, useListQueries.ts.
**Trace:** TASK-0046, DEC-0042, GATE-0027.
**Status:** Completed and locally validated [C7.1] on 2026-08-21.

---

### REQ-0042 — Rare prefetch drop + cold Insights list-scan dedupe (C7.2) (approved 2026-08-21)

**Priority:** P1
**Type:** Performance / quota

**Statement:** Footer About/Privacy/Terms and Profile api-docs/api-status Links MUST use `prefetch={false}` (no unused `_rsc`). Cold Insights overview+activity MUST share one request-cached Prisma list scan with slim select. Dark scrollbar (`color-scheme: dark`, no light track) MUST ship. Main Navbar warm soft-nav and Sentry monitoring MUST remain unchanged. Full densify rewrite remains OOS.

**Acceptance criteria:**

- [x] Footer + ProfileDropdown utility Links `prefetch={false}`.
- [x] `loadUserInsightLists` + builders; overview/activity routes wired; response shapes unchanged.
- [x] Dark scrollbar CSS; unit tests for builders; tsc/lint/Jest pass.

**Affected:** Footer, ProfileDropdown, business-insights-lists, overview/activity routes, globals.css.
**Trace:** TASK-0047, DEC-0043, GATE-0028.
**Status:** Completed and locally validated [C7.2] on 2026-08-21.

---

### REQ-0043 — api-docs/status soft-nav + slim status + optimistic logout (C7.3) (approved 2026-08-21)

**Priority:** P1
**Type:** UX / performance

**Statement:** `/api-docs` and `/api-status` MUST paint segment `loading.tsx` skeletons immediately on soft-nav. Cards MUST use `CARD_PAD`. Status probe MUST NOT fetch external metadata URLs. Logout MUST navigate to `/` (Auth; no `/login`). Logout timing superseded by REQ-0047.

**Acceptance criteria:**

- [x] ApiDocs/ApiStatus RouteSkeleton + SoftNav + loading.tsx; CARD_PAD.
- [x] Slim status route; ProfileDropdown logout to `/`; tests; tsc/lint/Jest/build.

**Affected:** ApiDocsPage, ApiStatusPage, RoutePageSkeleton, SoftNavLoading, status/route, ProfileDropdown.
**Trace:** TASK-0048, DEC-0044, GATE-0029.
**Status:** Completed [C7.3]; logout timing superseded by REQ-0047.

---

### REQ-0044 — api-status chrome-first + inline value skeletons (C7.4) (approved 2026-08-21)

**Priority:** P1
**Type:** UX / performance

**Statement:** `/api-status` MUST NOT use full-page `loading.tsx` or await status SSR prefetch. After auth RSC, PageHeader + cards + static labels/endpoint names MUST paint immediately. Only live values (badges, DB/uptime/time, response times) MAY pulse with size-matched placeholders until the client status query resolves.

**Acceptance criteria:**

- [x] Auth-only `api-status/page.tsx`; `loading.tsx` removed.
- [x] ApiStatusPage chrome-first inline pulses; tsc/lint/Jest/build pass.

**Affected:** api-status/page.tsx, ApiStatusPage.tsx.
**Trace:** TASK-0049, DEC-0045, GATE-0030.
**Status:** Completed and locally validated [C7.4] on 2026-08-21. Superseded in part by REQ-0045 (chrome loading restored).

---

### REQ-0045 — api-status chrome-matching loading shell (C7.5) (approved 2026-08-21)

**Priority:** P1
**Type:** UX / performance

**Statement:** Soft-nav to `/api-status` MUST leave the previous page immediately via segment `loading.tsx` that paints the same chrome as `ApiStatusPage` (PageHeader + System Status + API Endpoints rows with size-matched value pulses). MUST NOT use `ApiStatusRouteSkeleton` / center `DataSurfaceSlot` spinner. Auth-only RSC and client status probe from REQ-0044 remain.

**Acceptance criteria:**

- [x] Shared `ApiStatusChrome` used by page, `loading.tsx`, and `ApiStatusSoftNavLoading`.
- [x] Soft-nav paints chrome+pulses instantly; tsc/lint/Jest/build pass.

**Affected:** ApiStatusChrome.tsx, ApiStatusPage.tsx, api-status/loading.tsx, SoftNavLoading.tsx.
**Trace:** TASK-0050, DEC-0046, GATE-0031.
**Status:** Completed and locally validated [C7.5] on 2026-08-21.

---

### REQ-0046 — api-status header refresh control (C7.6) (approved 2026-08-21)

**Priority:** P1
**Type:** UX

**Statement:** `/api-status` PageHeader MUST be justify-between with a Refresh control. While status `isFetching` (cold, poll, or click), the control MUST show spinner + “refreshing…”. Cold/no data MAY keep value pulses; warm refetch MUST keep last values. Soft-nav loading MUST show a static busy affordance matching the busy button.

**Acceptance criteria:**

- [x] PageHeader optional `action`; ApiStatusRefreshControl + refetch wiring.
- [x] SoftNavLoading static busy; tsc/lint/Jest pass.

**Affected:** PageHeader, ApiStatusChrome, ApiStatusPage, SoftNavLoading.
**Trace:** TASK-0051, DEC-0047, GATE-0032.
**Status:** Completed and locally validated [C7.6] on 2026-08-21.

---

### REQ-0047 — logout await signout before home Auth (approved 2026-08-21)

**Priority:** P1
**Type:** Auth / UX

**Statement:** Logout MUST await `POST /api/auth/signout` (clear httpOnly `session_token` + wasAuthed) before `location.replace("/")`. Destination MUST be `/` Auth UI — no `/login`. MUST NOT use keepalive+immediate navigate (races SSR into Marketing+avatar).

**Acceptance criteria:**

- [x] ProfileDropdown awaits signout with credentials then replace `/`.
- [x] Unit test; tsc/lint/Jest pass.

**Affected:** ProfileDropdown.tsx, ProfileDropdown.test.tsx.
**Trace:** TASK-0052, DEC-0048.
**Status:** Completed and locally validated on 2026-08-21.
