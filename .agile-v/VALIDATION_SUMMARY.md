# VALIDATION_SUMMARY.md

## 2026-08-14

| Scope                                  | tsc  | lint                      | Notes                                                                 |
| -------------------------------------- | ---- | ------------------------- | --------------------------------------------------------------------- |
| Portable Auth UI                       | PASS | PASS                      | ProfileDropdown + Robohash                                            |
| README educational rewrite             | —    | —                         | title/screenshots preserved                                           |
| Flash/navbar/Select                    | PASS | WARN (pre-existing `any`) | HomePage/Navbar/Auth only                                             |
| Auth welcome/goodbye toasts + CTA      | PASS | PASS                      | auth-toast + AuthToastBridge                                          |
| Stable scrollbar gutter                | PASS | —                         | html scrollbar-gutter; Auth inset-0                                   |
| Avatar no-squeeze + quiet prod console | PASS | —                         | Navbar min-w-10; devLog for SSE/AI                                    |
| Clean Vercel deploy logs               | PASS | —                         | Sentry upload opt-in; prisma.config.ts                                |
| Import-flow quiet prod                 | PASS | —                         | UrlBulkImportExport + chrome + bulk-import → devLog                   |
| List switch + collections UX           | PASS | PASS                      | slug-safe placeholder; title nav; silent create; warm-cache skeletons |
| Visit Site open external URL           | PASS | PASS                      | ensureAbsoluteHttpUrl + openExternalUrl; UrlCard card+dialog          |
| Collaborators row + Card pad           | PASS | PASS                      | empty one-row; Card p-2 sm:p-4; SmartCollections no stacked pt        |
| HomePage no spinner                    | PASS | PASS                      | NeutralWait removed; wasAuthed → Auth/Marketing only                  |
| Smart Collections single pad           | PASS | PASS                      | one p-2 sm:p-4 shell; title                                           |
| Home refresh flash / BG / navbar       | PASS | PASS                      | was-authed cookie SSR; static BG; PostHog Suspense island; typed Navbar |
| Central UI spacing                     | PASS | PASS                      | ui-spacing PAGE/SECTION/FORM/LIST; Browse/Lists/Insights/API/Home/Auth |
| Auth/Home/Navbar polish                | PASS | PASS                      | MARKETING_STACK; Sign up footer hidden; nav overflow-visible; menu z-100 |
| Auth split viewport                    | PASS | PASS                      | md:grid-cols-2; no 8s overlay; labeled form; about-process left |
| Auth UI polish                         | PASS | PASS                      | max-w-7xl; no divider/left logo; reserved typewriter; gaps; Sign up row; CTA pt |
| Stock glass shadow-glow                | PASS | PASS (pre-existing WARN)  | glass-* tokens; Button; Auth Sparkles + 0_15px_35px glow verified in browser |

Out of scope: densify/JWT SSR, Zod/SHA, Next 16, Prisma 7.

## 2026-08-18 — GATE-0011 planning audit (no implementation run)

| Scope | Command / evidence | Result | Notes |
|-------|--------------------|--------|-------|
| Type safety baseline | `npx tsc --noEmit` | PASS | Executed against pre-implementation repository state. |
| Lint baseline | `npm run lint` | WARN | Command completed with 235 warnings; REQ-0014 tracks remediation. No claim of a clean lint run. |
| Agile V planning records | `git diff --check -- .agile-v` | PASS | Requirements, tasks, gate, checkpoint, risks, and decision records are whitespace-clean. |

## 2026-08-18 — UI remediation implementation evidence

| Scope | Command | Result | Notes |
|-------|---------|--------|-------|
| REQ-0010 to REQ-0013 | `npx tsc --noEmit` | PASS | Shared controls, Auth motion, Smart Collections disclosure, and URL workspace changes compile. |
| REQ-0010 to REQ-0013 | `npm test -- --runInBand` | PASS | 3 suites passed; 20 tests passed; 1 suite and 5 tests skipped. |
| REQ-0010 to REQ-0013 | `npm run build` | PASS | Production build completed successfully. |
| REQ-0014 | `npm run lint` | OPEN | Warning count reduced from 235 to 232; repository-wide remediation is not complete. |

## 2026-08-18 — continued implementation audit

| Scope | Command | Result | Notes |
|-------|---------|--------|-------|
| URL workspace, import, cache, real-time, metadata, and auth remediation | `npx tsc --noEmit` | PASS | Removed unsafe browser-global and abort-signal casts, no-op debug code, and unused symbols while preserving mutation/invalidation behavior. |
| Focused changed modules | `npx next lint --file …` | PASS | UrlList, UrlBulkImportExport, useRealtimeList, useListQueries, dragOrderCache, urlListStore, urlMetadata, and auth are clean. |
| Regression suite | `npm test -- --runInBand` | PASS | 3 suites passed; 20 tests passed; 1 suite and 5 tests skipped. |
| Production build | `npm run build` | PASS | Prisma generation, compilation, type checking, static generation, and build traces completed. |
| REQ-0014 | `npm run lint` | OPEN | Warning count reduced from 235 to 103; no lint-rule suppression was used. |

## 2026-08-18 — zero-warning completion

| Scope | Command | Result | Notes |
|-------|---------|--------|-------|
| REQ-0014 | `npm run lint` | PASS | Zero ESLint warnings/errors; no lint-rule suppression. |
| Type safety | `npx tsc --noEmit` | PASS | Strict TypeScript check completed. |
| Regression suite | `npm test -- --runInBand` | PASS | 3 suites passed; 20 tests passed; 1 suite and 5 tests skipped. |
| Production build | `npm run build` | PASS | Prisma generation and optimized Next.js build completed. |
| Runtime configuration | `package.json` | PASS | Vercel runtime pinned to Node.js `24.x`; unrelated projects were not modified. |

## 2026-08-18 — responsive chrome completion

| Scope | Command | Result | Notes |
|-------|---------|--------|-------|
| REQ-0015 static analysis | `npm run lint` | PASS | Zero ESLint warnings/errors. |
| REQ-0015 type safety | `npx tsc --noEmit` | PASS | Navbar and shared browser declarations compile without local Window casts. |
| REQ-0015 regression suite | `npm test -- --runInBand` | PASS | 3 suites passed; 20 tests passed; 1 suite and 5 tests skipped. |
| REQ-0015 production build | `npm run build` | PASS | Prisma generation and optimized Next.js build completed. |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | FLAG | 3 high findings from Prisma CLI's `deepmerge-ts@7.1.5`; no compatible Prisma 6 patch is available and npm's forced remediation downgrades Prisma. Recorded as RISK-0016. |

## 2026-08-18 — final committed-tree audit

| Scope | Command / evidence | Result | Notes |
|-------|--------------------|--------|-------|
| Static analysis | `npm run lint` | PASS | Zero ESLint warnings/errors. |
| Type safety | `npx tsc --noEmit` | PASS | Strict TypeScript check completed. |
| Regression suite | `npm test -- --runInBand` | PASS | 3 suites passed; 20 tests passed; 1 suite and 5 tests skipped. |
| Production build | `npm run build` | PASS | Prisma generation, compilation, type checking, static generation, and build traces completed. |
| Data/UI architecture scan | Mutation/invalidation and reload search | PASS | React Query optimistic updates, centralized invalidation, and SSE paths are present; no active hard-reload call was found. |
| Tracked secrets scan | `git ls-files '.env*' ':!*.example'` | PASS | No environment secret files are tracked. |
| Dependency security | `npm audit --omit=dev --audit-level=high` | ACCEPTED | RISK-0016: 3 high Prisma CLI transitive findings accepted by user; no safe compatible remediation was available. |

Gate 2: BLOCKED — RISK-0016 is accepted; `EVAL_RESULTS.md` PASS/WAIVED evidence and Gate 2 human acceptance remain required for a release claim.

## 2026-08-18 — guest-account menu regression fix

| Scope | Command | Result |
|-------|---------|--------|
| REQ-0016 | `npm run lint`; `npx tsc --noEmit`; `npm test -- --runInBand`; `npm run build` | PASS — zero lint warnings; 20 tests pass; production build completes. |
