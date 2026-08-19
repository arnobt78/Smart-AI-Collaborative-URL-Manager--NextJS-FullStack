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
