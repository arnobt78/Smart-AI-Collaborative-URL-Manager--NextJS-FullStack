# CHANGELOG.md

## CR-0010 — C6.3 unified dialog visual contract

- **Cycle:** C6.3
- **Affected requirement:** REQ-0031 (new)
- **Change:** Apply the Create List compact divider-free header to all shared dialogs and remove the unreferenced standalone input overlay.
- **Rationale:** Fixed-header dialogs retained older border/padding classes despite already using the shared primitive.
- **Impact:** Shared dialog presentation, focused component tests, and C6.3 traceability only; no data, API, auth, cache, or mutation changes.
- **Requested by / approval:** User explicitly approved implementation on 2026-08-20.

## CR-0009 — C6.2 instant list dialogs & confirmed mutation completion

- **Cycle:** C6.2
- **Affected requirement:** REQ-0030 (new)
- **Change:** Keep list dialog state local with native history and retain create/edit/delete confirmation UI until confirmed cache commit or server failure.
- **Rationale:** Query-only dialog transitions currently trigger slow RSC requests; destructive confirmation closes before server completion.
- **Impact:** Lists page, shared list CTA/confirmation dialog, create/edit list forms, focused UI tests, and C6.2 traceability; no API/schema/session/Redis/SSE contract change.
- **Requested by / approval:** User explicitly approved implementation on 2026-08-20.

## CR-0008 — C6.1 authenticated public discovery & hydration parity

- **Cycle:** C6.1
- **Affected requirement:** REQ-0029 (new)
- **Change:** Require persisted sessions for public-list discovery/detail/read APIs, remove GET position persistence, and normalize unified hydration on server and client.
- **Rationale:** Eliminate anonymous data access/writes and ensure hydrated list caches preserve comment and collaborator state.
- **Impact:** List access/read routes, Browse/detail server pages, shared hydration response, regression tests, and C6.1 traceability; no schema, session-cookie, Redis, or SSE contract changes.
- **Requested by / approval:** User explicitly requested implementation on 2026-08-19.

## CR-0001 — C2 Homepage hero mount stagger

- **Cycle:** C2
- **Affected requirement:** REQ-0024 (new)
- **Change:** Reuse the login form's existing five-step `auth-reveal` mount stagger for the authenticated homepage hero only.
- **Rationale:** User-requested visual consistency; the current hero uses viewport-driven `ScrollReveal`, which differs from login's initial mount sequence.
- **Impact:** `HomePage`, focused homepage test, Jest setup debug cleanup, and C2 traceability; no API, data, cache, auth, SSR, or schema impact.
- **Requested by:** User
- **Approval:** Approved by explicit implementation request on 2026-08-19 (GATE-0015).

## CR-0002 — C3 Validation, session hardening, and cache integrity

- **Cycle:** C3
- **Affected requirement:** REQ-0025 (new)
- **Change:** Add shared Zod mutation parsing, digest-only persistence for new opaque session tokens with transparent legacy rotation, and complete mutation impact coverage through the existing React Query gateway.
- **Rationale:** User-approved remediation of incomplete input validation, plaintext session-token storage, and uncovered mutation cache effects.
- **Impact:** Mutating route handlers, `lib/auth.ts`, validation and query-invalidation utilities, focused tests, and C3 traceability. Prisma 6, cookie-session semantics, SSR, Redis/SSE, and pending C1/C2 Gate 2 evidence remain unchanged.
- **Requested by:** User
- **Approval:** Approved by explicit implementation request on 2026-08-19 (GATE-0016).

## CR-0003 — Immediate logout menu dismissal

- **Cycle:** C3
- **Affected requirement:** REQ-BASE-001
- **Change:** Close the profile menu immediately, guard duplicate requests without menu loading UI, show a delayed non-blocking sign-out status, and clear client cache only after server confirmation.
- **Rationale:** Preserve secure cookie-session confirmation without leaving the user in a visibly blocked dropdown state.
- **Impact:** Profile dropdown, focused regression coverage, and existing project evidence only; no session-cookie or server route contract change.
- **Requested by:** User

## CR-0004 — C4 instant mutation UI and external visits

- **Cycle:** C4
- **Affected requirement:** REQ-0023 / REQ-0025 carry-forward
- **Change:** Make visibility cache-first, remove dialog-wide mutation locks, and convert primary/suggested visits to semantic safe external links.
- **Rationale:** Avoid stale toggles, blocked dialogs, and synthetic-click failures while retaining established optimistic rollback and SSE reconciliation.

## CR-0005 — C4 mutation reconciliation completion

- **Cycle:** C4
- **Affected requirement:** REQ-0026 (new)
- **Change:** Complete store-owned rollback and typed impacts for collections, archive/restore, reorder, metadata refresh, health, click analytics, favorites, pins, and duplicate deletion; remove duplicate caller invalidations and collection refresh duplication.
- **Rationale:** Guarantee immediate local state, exact failure recovery, and one reconciliation path per mutation family.

## CR-0006 — C5 secure revocation and server hydration

- **Cycle:** C5
- **Affected requirement:** REQ-0027
- **Change:** Remove process-wide session authorization caching, dehydrate core data-page query keys on the server, and reconcile delete-list through the typed impact gateway.
- **Rationale:** Eliminate the revocation window and initial client data fetch while preserving existing route authorization, cache keys, and SSE reconciliation.

## CR-0007 — C6 stable data-surface & compact analytics polish

- **Cycle:** C6
- **Affected requirement:** REQ-0028 (new)
- **Change:** Add compact collapsible activity, server page guards/hydration, immediate list-summary commits, and responsive List/Insights UI polish.
- **Rationale:** Remove cold-load flashes, stale list-card timestamps, post-cookie-clear protected shells, duplicate analytics content, and unstable expanding detail chrome.
- **Impact:** Server pages/loaders, React Query/store reconciliation, List/Insights/Activity UI, focused tests, and C6 traceability; no schema, session-cookie, API payload, Redis, or SSE contract changes.
- **Requested by / approval:** User explicitly requested implementation on 2026-08-19.

## 2026-08-14 C1

- AI free-tier model chains + shared client
- Vercel guardrails (headers, robots, vercel.json)
- SafeImage on UrlCard
- Sentry tunnel `/api/monitoring` + PostHog env-gated
- Redis helpers; `.env.example`; docs walkthrough
- Safe dep upgrade: Next 15.5.23, Prisma 6.19.3, nodemailer 9; removed unused next-auth/dnd/vitest; audit 0
- Educational README + SECURITY.md; SEO metadata + sitemap.xml
- Portable Auth UI: Robohash guest Select + ProfileDropdown (API Docs/Status/Logout)
- Educational README rewrite (preserve title/screenshots); SECURITY.md linked
- Auth flash/navbar/Select: wasAuthed HomePage gate; static Navbar brand; fixed Select lead + Clear
- Auth welcome/goodbye toasts via sessionStorage + AuthToastBridge; Sparkles/Loader2 CTA; no inline message
- Stable scrollbar gutter on html; Auth drop w-screen
- Navbar avatar no-squeeze (padding outside size-10)
- Prod console: SSE/AI via `devLog`/`devWarn` only in development
- Clean Vercel logs: Sentry sourcemaps opt-in; prisma.config.ts seed
- Import-flow console → `devLog` (UrlBulkImportExport, chrome parser, bulk-import API)
- List UX: slug-safe unified placeholder + `currentList` sync; My Lists clickable title; silent Smart Collections create (no auto-nav)
- Visit Site: schemeless URLs open via `ensureAbsoluteHttpUrl` + `openExternalUrl` (card + Similar URLs dialog)
- Collaborators empty one-row; Card chrome `p-2 sm:p-4` (no lg:p-8 double gutter)
- HomePage: no NeutralWait spinner (Auth or Marketing via wasAuthed)
- Smart Collections: single pad shell `p-2 sm:p-4` + title ``
