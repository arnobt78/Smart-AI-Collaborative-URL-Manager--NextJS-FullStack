# DECISION_LOG.md

Append-only. Newest entries at bottom.

---

## DEC-0020 — Reuse local dialog and existing mutation flows

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V Build (REQ-0018) |
| Decision | Add a local accessible `Dialog` primitive instead of adding a shadcn/Radix dependency; host legacy form URLs through query-state redirects and reuse current page form mutation logic. |
| Rationale | The application already uses custom portal overlays and verified React Query mutations. A local primitive centralizes accessibility and responsive geometry without changing APIs, auth, or cache ownership. |
| Linked REQs | REQ-0018 |
| Status | Implemented foundation; remaining custom overlay callers are tracked in TASK-0019. |

---

## DEC-0021 — Scope zero-gap styling to direct heading pairs

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V Build |
| Decision | Introduce one `HEADING_STACK` token and apply it only where a title directly owns a subtitle or description. |
| Rationale | This removes inconsistent vertical whitespace without collapsing form, toolbar, menu, card-content, or prose layout rhythm. |
| Linked REQs | REQ-0019 |
| Status | Implemented and validated. |

## DEC-0001 — Bootstrap Agile V Cycle C1 without prior workspace

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Orchestrator |
| Decision | Create `.agile-v/` Cycle **C1** from repository analysis; do not invent a fake prior cycle |
| Rationale | Protocol §1: if `.agile-v/` missing, bootstrap C1; analyze before requirements |
| Linked REQs | TASK-0000 / planning baseline |
| Alternatives | Skip formal memory (rejected — violates AGENTS.md / protocol) |

---

## DEC-0002 — Prefer production guardrails + hygiene as default C1 track

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Orchestrator |
| Decision | Recommend **Track D** (REQ-0001 + REQ-0002 + REQ-0004, optionally REQ-0003) as first implementation package |
| Rationale | Verified gaps: no robots, no security headers, no `.env.example`, unused deps, Vercel cost incident pattern documented in-repo; observability (Sentry/PostHog) is optional and heavier |
| Linked REQs | REQ-0001, REQ-0002, REQ-0003, REQ-0004 |
| Status | **Proposed — awaiting Human Gate 1** |

---

## DEC-0003 — Defer deep RSC shell refactor

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Orchestrator |
| Decision | Keep REQ-0009 out of default C1 implementation |
| Rationale | Pages already use thin server wrappers; deepening SSR data loading is architectural and needs explicit design approval to avoid cache/auth regressions |
| Linked REQs | REQ-0009 |
| Status | Deferred pending separate approval |

---

## DEC-AI-0001 — Free-tier model chains for Daily Urlist AI stack

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-AI-0001) |
| Decision | Centralize free-tier `models[]` in `src/lib/ai/providers.ts` + shared `client.ts`; replace Groq Llama Instant with gpt-oss / qwen3.6; Gemini 2.5 Flash chain; OpenRouter live `:free` IDs only |
| Rationale | Groq Llama Instant shutdown 2026-08-16; OpenRouter llama-3.2:free absent from live free list; avoid duplicated hardcoded fetch per feature file |
| Linked REQs | REQ-AI-0001 |
| Status | Implemented |

---

## DEC-0004 — REQ-0002 guardrails without feature/performance impact

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-0002) |
| Decision | Ship headers + robots + layout attr only; recommend Bot Protection Challenge + AI Bots Deny; Attack Mode OFF; skip SafeImage/ISR/middleware in this pass |
| Rationale | Protect Edge/CPU/image quota from bots without delaying humans or changing app logic |
| Linked REQs | REQ-0002 |
| Status | Code implemented; HA-0001 pending human |

---

## DEC-0005 — REQ-0003 SafeImage with deferred parent onError

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-0003) |
| Decision | Add SafeImage; adopt in UrlCard only; call parent onError only after native `<img>` fails; keep OptimizedImage for public/Cloudinary assets |
| Rationale | UrlCard previously hid the image on first Image error, which would prevent native fallback from showing |
| Linked REQs | REQ-0003 |
| Status | Implemented |

---

## DEC-0006 — REQ-0006 Sentry tunnel + env-gated PostHog

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-0006 / REQ-0005) |
| Decision | `tunnelRoute: "/api/monitoring"`; low tracesSampleRate in prod; no Replay; PostHog no-op without key; Redis helpers only |
| Rationale | Bypass ad-block on Sentry ingest; avoid slowing app; Redis already existed |
| Linked REQs | REQ-0006, REQ-0005 |
| Status | Implemented — rotate exposed auth token |

---

## DEC-0007 — Auth flash gate via wasAuthed (no densify)

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Cursor Build |
| Decision | Gate HomePage on `urlist:wasAuthed`; static Navbar brand; fixed guest Select slots. Defer densify/Zod/SHA/JWT SSR. |
| Rationale | Marketing skeleton during `sessionLoading` caused homepage flash; typewriter/cursor + Select lead swap caused layout shift |
| Status | Implemented |

---

## DEC-0009 — Quiet Vercel build: Sentry upload opt-in + prisma.config.ts

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Cursor Build |
| Decision | Disable Sentry sourcemap upload unless `SENTRY_UPLOAD_SOURCEMAPS=1`; `silent`+`telemetry:false`; replace `disableLogger`; move seed to `prisma.config.ts` |
| Rationale | Token org ≠ `SENTRY_ORG` caused non-fatal but noisy sentry-cli Errors; package.json#prisma deprecated |
| Status | Implemented |

---

## DEC-0010 — List switch: slug-safe RQ placeholder + currentList sync

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Cursor Build |
| Decision | `useUnifiedListQuery` placeholder only when same slug; ListPage syncs/clears `currentList` from RQ; My Lists title nav; Smart Collections create no auto-nav. Densify still deferred. |
| Rationale | Cache-hit skips queryFn so store stayed on prior list; cross-slug placeholder painted wrong data; create `router.push` remounted ListPage skeleton |
| Status | Implemented |

---

## DEC-0011 — Scope UI polish through existing shared primitives

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V Orchestrator |
| Decision | Propose REQ-0010 as an inventory-led UI consistency pass using `Button`, glass button recipes, and `ui-spacing`; do not redesign or alter behavior. |
| Rationale | The current source already centralizes the intended primitives, while direct controls remain across multiple feature surfaces. A classified, narrow pass limits visual and accessibility regression risk. |
| Linked REQs | REQ-0010 |
| Status | Proposed — awaiting GATE-0010 Human Gate 1 approval |

---

## DEC-0012 — Expand UI remediation into four independently verifiable requirements

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V Requirement Architect / UX Spec Author |
| Decision | Replace the narrower unapproved GATE-0010 scope with REQ-0010 through REQ-0014, separated into control consistency, auth motion, Smart Collections disclosure, URL workspace refinement, and lint remediation. |
| Rationale | Screenshots and source identify distinct UI defects while the lint inventory is repository-wide. Splitting them preserves traceability and keeps cache/auth changes out of presentation work. |
| Linked REQs | REQ-0010, REQ-0011, REQ-0012, REQ-0013, REQ-0014 |
| Status | Proposed — awaiting GATE-0011 Human Gate 1 approval |

---

## DEC-0013 — Use platform motion rather than add a runtime animation dependency

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V UX Spec Author |
| Decision | Implement the requested login reveal with existing CSS/browser capabilities, `prefers-reduced-motion`, and no Framer Motion dependency. |
| Rationale | The repository does not currently depend on Framer Motion and already has CSS reveal animations. The requested effect is limited to a static form entrance, so a dependency would add bundle and hydration cost without necessary capability. |
| Linked REQs | REQ-0011 |
| Status | Proposed — awaiting GATE-0011 Human Gate 1 approval |

---

## DEC-0014 — Gatekeeper validation of the UI remediation requirements

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V Logic Gatekeeper |
| Decision | Requirements REQ-0010 through REQ-0014 are measurable and traceable to a planned implementation and verification path. |
| Rationale | Control geometry, icons, motion timing, responsive widths, disclosure semantics, cache-preservation rules, and the lint success criterion are explicitly testable. The fixed desktop Auth shell makes scroll-linked form parallax unsuitable; the approved candidate is an entrance stagger only. |
| Linked REQs | REQ-0010, REQ-0011, REQ-0012, REQ-0013, REQ-0014 |
| Status | Validated for GATE-0011; synthesis remains blocked pending human approval |

---

## DEC-0015 — Reuse the existing chrome and browser-global contracts

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V Requirement Architect / Logic Gatekeeper |
| Decision | Use `h-14`/`min-h-14` responsive layout classes in existing Navbar and Footer components; move Navbar's duplicated browser shape into `browser-globals.d.ts`. |
| Rationale | This preserves the SSR layout shell, routes, session UI, and import guard while making the single visual alignment rule explicit and type-safe. |
| Linked REQs | REQ-0015 |
| Status | Implemented and validated; global declarations retain only supported custom cache shapes because Next.js owns the immutable `__NEXT_DATA__` type. |

---

## DEC-0016 — Accept Prisma CLI transitive advisory without forced migration

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | User decision recorded by Agile V Compliance |
| Decision | Retain Prisma 6.19.3 and accept RISK-0016; do not run npm's forced remediation or a Prisma major upgrade. |
| Rationale | Available automated remediation downgrades Prisma and a supported Prisma 7 migration exceeds the approved scope and risks application stability. |
| Linked REQs | dependency baseline |
| Status | Accepted by user; re-evaluate only under a dedicated migration requirement. |

---

## DEC-0017 — Fix Auth menu at its stacking-context boundary

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V Build |
| Decision | Raise the open reveal-row parent and use an opaque menu panel rather than changing Auth form structure or handlers. |
| Rationale | CSS transforms on staggered siblings create independent stacking contexts; fixing the parent prevents click interception with no data, session, or mutation impact. |
| Linked REQs | REQ-0016 |
| Status | Implemented and validated. |

---

## DEC-0018 — Use shared CSS and observer motion for marketing content

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V UI audit |
| Decision | Make all shared Button sizes use `UI_CONTROL_HEIGHT`; implement Home reveal/parallax with CSS variables and `IntersectionObserver`, not Framer Motion. |
| Rationale | The audit found local Home CTA padding and `lg`/glass heights bypassing the shared token. Browser primitives avoid a new dependency, preserve the server shell, and honor reduced-motion. |
| Linked REQs | REQ-0017 |
| Status | Implemented and validated. |

---

## DEC-0019 — Reveal Home hierarchy as individual wave beats

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V UI refinement |
| Decision | Split hero copy lines and each CTA into separate `ScrollReveal` instances with ascending delays. |
| Rationale | A grouped CTA wrapper made sibling buttons arrive simultaneously; individual semantic units produce the requested harmonic sequence without changing routes or data. |
| Linked REQs | REQ-0017 |
| Status | Implemented; lint and strict TypeScript pass. |

---

## DEC-0020 — Keep page chrome stable and bound metadata egress

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V implementation |
| Decision | Preserve mounted static page chrome and cached query data; delay cold placeholders. Batch comment counts in the unified list response. Remove bulk-import hard reload recovery. Restrict metadata document, image, and favicon requests to public HTTP(S) addresses and validated redirects. |
| Rationale | Full-page skeleton remounts caused visual flashes; a hard reload bypassed cache reconciliation; unvalidated metadata subrequests exposed internal-network access risk. |
| Linked REQs | REQ-0020 |
| Status | Implemented and validated. |

---

## DEC-0021 — Reconcile C1 checkpoint after stable-data delivery

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V orchestration |
| Decision | Advance the recorded verification checkpoint through REQ-0020; retain Gate 2 as pending because no EvalGate evidence exists. |
| Rationale | Local and remote `main` are clean and match at `a69f0a7`; prior state named only earlier requirements and misstated the historical Gate 0001 status. |
| Linked REQs | REQ-0010 to REQ-0020 |
| Status | Reconciled; no application-code change. |

---

## DEC-0022 — Use cache-seeded list forms inside scrollable dialog chrome

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-18 |
| Agent | Agile V synthesis |
| Decision | Add an opt-in scrollable header mode to the shared dialog and move create/edit list forms to centralized mutations seeded from existing React Query list data. |
| Rationale | The fixed dialog header duplicates the form heading. Page-local session/list loading, editor navigation toast, and delayed router navigation cause visible skeleton transitions despite warm caches. |
| Linked REQs | REQ-0021 |
| Status | Implemented and validated. |

---

## DEC-0023 — Reuse existing permission model and establish one mutation commit boundary

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-19 |
| Agent | Agile V Requirement Architect / Threat Modeler |
| Decision | Close list-route authorization with the existing cookie session and collaboration role helpers; introduce a narrow canonical resource resolver and a single client mutation commit/rollback adapter instead of adding JWT, Zod, SHA, a schema migration, or a new cache library. |
| Rationale | The verified defects are missing server-side authorization and diverging client mutation paths, not absent identity technology. Reusing `hasListAccess`/`requirePermission` keeps behavior compatible while ensuring access is checked before Redis/vector/database side effects. A snapshot-first adapter prevents failed optimistic deletes from losing data and avoids redundant refetches. |
| Linked REQs | REQ-0022, REQ-0023 |
| Status | Implemented and locally validated 2026-08-19. |

---

## DEC-0024 — Separate query keys from hook modules

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-19 |
| Agent | Agile V implementation |
| Decision | Move the shared list query-key contract into `lib/query-keys.ts`; keep the hook export as a compatibility re-export. |
| Rationale | Mutation stores and invalidation utilities must not import a client hook only to access key constants. The shared module removes that import cycle without changing any key or cache contract. |
| Linked REQs | REQ-0023 |
| Status | Implemented and locally validated. |

---

| Field | Value |
|---|---|
| Timestamp | 2026-08-19 |
| Agent | Agile V C6.1 implementation |
| Decision | Public lists are visible to authenticated Daily Urlist accounts only; unified GET normalization is response-only and shared server/client payload normalization seeds hydrated collaborators. |
| Rationale | Anonymous public reads could persist legacy URL positions, and direct server dehydration bypassed browser-only transforms. |
| Linked REQs | REQ-0029 |
| Status | Implemented and locally validated. |

---

## DEC-0029 — Prefer persisted authorization and server-hydrated query keys

| Field | Value |
|---|---|
| Timestamp | 2026-08-19 |
| Agent | Agile V C5 implementation |
| Decision | Remove the process-wide session cache; hydrate the existing core-page React Query keys from server-only data loaders. |
| Rationale | A process-global cache can outlive sign-out or expiry. Server hydration removes the initial client fetch while preserving the established cache key and optimistic/SSE contracts. |
| Linked REQs | REQ-0027 |
| Status | Implemented and locally validated. |

---

## DEC-0030 — Preserve public viewer reads at the unified route boundary

| Field | Value |
|---|---|
| Timestamp | 2026-08-19 |
| Agent | Agile V C5 audit correction |
| Decision | Let the existing anonymous public-viewer role read public unified-list and collaborator payloads; keep private reads denied before activity, collaborator, and comment-count work. |
| Rationale | `hasListAccess` already defines public lists as viewer-accessible. The two route-level session checks contradicted that policy and prevented shared public URLs from rendering. |
| Linked REQs | REQ-0027 |
| Status | Implemented and locally validated. |

---

## DEC-0031 — Treat list dialog query state as local history state

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.2 implementation |
| Decision | Use a reusable browser-native history hook for Lists create/edit dialog state; keep Next router navigation only for real route transitions. Let parent-owned confirmation state close list destructive dialogs only after the mutation lifecycle confirms completion. |
| Rationale | Opening or closing a local overlay must not wait on a server-component payload. Parent-owned pending state preserves retryable errors and prevents visual completion from racing the committed optimistic cache. |
| Linked REQs | REQ-0030 |
| Status | Implemented and locally validated 2026-08-20. |

---

## DEC-0032 — Unify fixed and scrollable dialog header rhythm

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.3 implementation |
| Decision | Use the shared `Dialog` component as the sole active overlay primitive and give both header modes the compact Create List spacing with no header divider. |
| Rationale | The feature dialogs already share behavior; their visible inconsistency came from the fixed-mode header classes. One component-level correction prevents future drift. |
| Linked REQs | REQ-0031 |
| Status | Implemented and locally validated 2026-08-20. |

---

## DEC-0033 — Localize hydrated create-list launchers

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.4 planning |
| Decision | Proposed: reuse the shared Create List dialog lifecycle on both Home and Lists, with native local history state for hydrated CTA opens. |
| Rationale | Home CTAs still render the legacy `/lists?dialog=create` link, which triggers a slow RSC navigation before a static form can appear. A local overlay needs no server payload. |
| Linked REQs | REQ-0032 |
| Status | Implemented and locally validated 2026-08-20. |

---

## DEC-0034 — Pause implementation after C6.4 production; propose C6.5

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V Orchestrator (resume/reconcile) |
| Decision | Treat C6.4 as committed and production READY. Do not start new implementation until GATE-0021. Recommended next human action is TASK-0039 browser verification. Proposed C6.5 is REQ-0033 plus REQ-0034 only. |
| Rationale | The Home Create List RSC delay is fixed in production. The remaining same-class delay is list-detail edit close/open via Next search params. Gate 2 still lacks `EVAL_RESULTS.md`. |
| Linked REQs | REQ-0032, REQ-0033, REQ-0034 |
| Status | Superseded by GATE-0021 approval and DEC-0035 implementation. |

---

## DEC-0035 — Store overlay history in history.state, not search params

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.5 implementation |
| Decision | Remove `useSearchParams` from list dialog state. Hydrated open/close write `history.state` on the current href. Parse `?dialog=` only on mount for deep links. Keep mutating overlays pending until network result plus one committed paint. |
| Rationale | Next 15 patches History API and refetches `force-dynamic` pages when search params change, which caused 1–3s create/edit open/close and double X clicks. |
| Linked REQs | REQ-0033, REQ-0034, REQ-0035 |
| Status | Implemented and locally validated 2026-08-20. |

---

## DEC-0036 — Never strip deep-link dialog query on close

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.5 Wave 4 |
| Decision | `writeListDialogHistory` always keeps `currentHref()`; remove `hrefWithoutDialogParams`. Closed overlay state is only React + `history.state`. |
| Rationale | Stripping `?dialog=` after a deep-link open still changes the visible URL and can schedule a one-shot Next 15 `_rsc` flight. |
| Linked REQs | REQ-0033 |
| Status | Implemented and locally validated 2026-08-20. |

---

## DEC-0037 — Soft-nav shells over blocking SSR prefetch

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.6 |
| Decision | Standardize segment `loading.tsx` (page-children skeleton only). Protected pages auth-gate then return empty dehydrate; client RQ fills data. Per-request React.cache for session/user. |
| Rationale | Soft-nav waited 2–4s on previous page while force-dynamic RSC awaited Prisma prefetch; skeletons never ran until after transition. |
| Linked REQs | REQ-0036 |
| Status | Implemented 2026-08-20; empty dehydrate superseded by DEC-0038 / REQ-0037. |

---

## DEC-0038 — SSR hydrate under soft-nav loading shells

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.7 |
| Decision | Keep segment `loading.tsx`. Restore awaited RQ prefetch/dehydrate on protected data pages so soft-nav shows one continuous skeleton and no post-RSC cold client fetch. |
| Rationale | Empty dehydrate caused skeleton flash then DataSurfaceSlot + `/api/lists` after `lists?_rsc`. |
| Linked REQs | REQ-0037 |
| Status | Implemented and locally validated 2026-08-20. |

---

## DEC-0039 — Warm soft-nav loading gate

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.8 |
| Decision | Central warm flag + client loading.tsx gates skip RoutePageSkeleton when RQ has destination data. Insights SSR overview+activity only. getCurrentUser returns session.user. |
| Rationale | Soft-nav always showed skeletons even with warm Infinity RQ; Insights five-way SSR was the slowest nav. |
| Linked REQs | REQ-0038 |
| Status | Implemented and locally validated 2026-08-20. Superseded for warm path by DEC-0040 (C6.9 optimistic surface). |

---

## DEC-0040 — Optimistic soft-nav surface (never null)

| Field | Value |
|---|---|
| Timestamp | 2026-08-20 |
| Agent | Agile V C6.9 |
| Decision | Warm soft-nav paints OptimisticSoftNavSurface from RQ in loading.tsx instead of returning null. Cold keeps one RoutePageSkeleton. Remove page-level delayed null. List detail paints on unified cache hit. Keep invalidateMutationImpact; no densify rewrite. |
| Rationale | Warm→null left an empty content hole; Lists waitingForColdData and ListPage !mounted caused empty/double-skeleton flashes. |
| Linked REQs | REQ-0039 |
| Status | Implemented and locally validated 2026-08-20. |

---

## DEC-0041 — C7.0 instant static chrome (full soft-nav parity)

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.0 |
| Decision | Root cause of late static chrome was thin OptimisticSoftNavSurface. Extract shared presentational Lists/Browse/Insights chrome+cards; warm surface paints full parity. Browse client filter; Insights tabs centered; Card header/content p-0 with outer CARD_PAD; drop page min-h-screen. Densify still OOS. |
| Rationale | Screenshots showed Create/search/tabs/actions catching up after warm soft-nav partial paint. |
| Linked REQs | REQ-0040 |
| Status | Implemented and locally validated 2026-08-21. |

---

## DEC-0042 — C7.1 targeted densify (browse + insights)

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.1 |
| Decision | Extend impact helpers with densifyBrowsePublicLists + dropUnifiedListCache; widen business-insights invalidation. Keep invalidateMutationImpact; no full densify rewrite / JWT-null SSR. |
| Rationale | Audit: browse warm soft-nav showed stale public rows after visibility/delete; deleted unified kept ghost detail warm; activity/popular stayed Infinity-stale after list/URL CRUD. |
| Linked REQs | REQ-0041 |
| Status | Implemented and locally validated 2026-08-21. |

---

## DEC-0043 — C7.2 rare prefetch + Insights scan dedupe

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.2 |
| Decision | prefetch={false} on rare Links only; React.cache shared list scan for overview+activity; ship dark scrollbar. Keep main warm soft-nav + Sentry. No private API Cache-Control. |
| Rationale | Quota noise from footer _rsc; cold Insights double Prisma; CSS track flash confirmed. |
| Linked REQs | REQ-0042 |
| Status | Implemented and locally validated 2026-08-21. |

---

## DEC-0044 — C7.3 api-docs/status soft-nav + optimistic logout

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.3 |
| Decision | Add loading.tsx + skeletons; CARD_PAD; slim status probes; logout to `/` (no `/login`). Keepalive timing later superseded by DEC-0048. |
| Rationale | Screenshots: stuck previous page; status 2.8s; logout 600–800ms on protected UI. |
| Linked REQs | REQ-0043 |
| Status | Implemented and locally validated 2026-08-21. |

---

## DEC-0045 — C7.4 api-status chrome-first

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.4 |
| Decision | Auth-only RSC + no loading.tsx; client status query; inline value skeletons for live fields only. |
| Rationale | Layout never changes; blocking SSR + full-page spinner was unnecessary wait. |
| Linked REQs | REQ-0044 |
| Status | Implemented and locally validated 2026-08-21. Partially superseded by DEC-0046 (chrome loading restored). |

---

## DEC-0046 — C7.5 api-status chrome loading shell

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.5 |
| Decision | Restore thin chrome-matching loading.tsx via shared ApiStatusChrome; SoftNavLoading uses same shell. |
| Rationale | Without segment loading, soft-nav stuck on previous page until auth RSC; center spinner was worse UX than chrome+pulse. |
| Linked REQs | REQ-0045 |
| Status | Implemented and locally validated 2026-08-21. |

---

## DEC-0047 — C7.6 api-status header refresh control

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.6 |
| Decision | Header Refresh with spinner + refreshing… on isFetching; cold pulses kept; warm refetch keeps values. |
| Rationale | Users need explicit update feedback while chrome shell stays visible. |
| Linked REQs | REQ-0046 |
| Status | Implemented and locally validated 2026-08-21. |

---

## DEC-0048 — Logout await signout before `/` Auth

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V |
| Decision | Await signout then replace `/`; drop keepalive+immediate navigate. |
| Rationale | httpOnly session_token race painted Marketing+avatar after logout. |
| Linked REQs | REQ-0047 |
| Status | Superseded by DEC-0049 (optimistic forceGuest). |

---

## DEC-0049 — C7.7 optimistic logout instant Auth

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Agile V C7.7 |
| Decision | forceGuest until login; skip session fetch while forceGuest; keepalive signout; goodbye toast at click. |
| Rationale | Instant Auth without SSR Marketing race; clearing forceGuest on empty session caused Auth↔Marketing flicker. |
| Linked REQs | REQ-0048 |
| Status | Implemented and locally validated 2026-08-21 (incl. flicker fix). |

---

## DEC-0025 — Defer interactive acceptance to user browser testing

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-19 |
| Agent | Agile V audit reconciliation |
| Decision | Keep REQ-0017 control/Home-motion and REQ-0018 metadata/action-badge browser acceptance pending user testing while recording completed automated verification. |
| Rationale | Type, lint, unit, build, and diff checks verify the code path but cannot prove the final interactive visual and action behavior in a real browser. |
| Linked REQs | REQ-0017, REQ-0018 |
| Status | Pending user feedback; no code change. |

---

## DEC-0026 — Reuse login mount stagger for the homepage hero

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-19 |
| Agent | Agile V C2 implementation |
| Decision | Replace only the authenticated homepage hero's viewport-reveal wrappers with the existing `auth-reveal` CSS classes and delays 0–4. |
| Rationale | The approved requirement explicitly calls for the login form's initial mount sequence. Reuse avoids new runtime state, CSS contracts, dependencies, hydration risk, or duplicate animation logic. |
| Linked REQs | REQ-0024 |
| Status | Approved for implementation. |

---

## DEC-0027 — Centralize validated mutation and cache impact boundaries

| Field | Value |
|---|---|
| Timestamp | 2026-08-19 |
| Agent | Agile V C3 implementation |
| Decision | Use shared Zod parser contracts for mutating payloads and identifiers, digest opaque session tokens with transparent legacy rotation, and route active client mutations through one typed cache-impact gateway. |
| Rationale | Central contracts prevent validation, session-storage, and cache-family behavior from diverging while retaining existing cookie-session, SSR, optimistic-update, and SSE behavior. |
| Linked REQs | REQ-0025, REQ-BASE-001 |
| Status | Implemented and locally validated. |

---

## DEC-0028 — Keep mutation ownership at the cache/store boundary

| Field | Value |
|---|---|
| Timestamp | 2026-08-19 |
| Agent | Agile V C4 implementation |
| Decision | Let the store or typed mutation hook perform the optimistic commit, rollback, and single impact invalidation; UI callers only trigger it and present feedback. Keep vector indexing isolated because it has no rendered cache impact. |
| Rationale | Caller-side optimistic patches and invalidations were duplicating requests and could snapshot already-mutated state. One owner preserves immediate UI while preventing stale cache flashes. |
| Linked REQs | REQ-0026 |
| Status | Implemented and locally validated. |

---

## DEC-0029 — Chrome-free `/login` route (C7.8)

| Field | Value |
|---|---|
| Timestamp | 2026-08-21 |
| Agent | Cursor |
| Decision | Move Auth to `/login` with root layout skipping Navbar/Footer via middleware `x-pathname`; guests redirect from `/`; logout/401 → `/login`. Drop Auth fixed-overlay scrollport. |
| Rationale | Overlay + `scrollbar-gutter: stable` caused double tracks and L↔R shift; a dedicated route gives one document scrollbar and no shell chrome. |
| Linked REQs | C7.8 auth UX |
| Status | Implemented and locally validated. |
