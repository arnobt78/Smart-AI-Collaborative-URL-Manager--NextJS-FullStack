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
