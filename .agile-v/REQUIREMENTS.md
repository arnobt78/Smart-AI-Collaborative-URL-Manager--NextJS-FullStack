# REQUIREMENTS.md — Cycle C1

**Status:** C1 in progress — AI/guardrails/SafeImage/observability done; hygiene open  
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

## Out of scope for default C1

- Schema normalization of `List.urls` JSON → relational tables
- Full rewrite to NextAuth / Auth.js
- Unrelated UI redesign
- Claiming realtime cross-device sync beyond existing SSE/Redis paths
