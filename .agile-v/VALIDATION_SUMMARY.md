# VALIDATION_SUMMARY.md

## 2026-08-14
| Scope | tsc | lint | Notes |
|-------|-----|------|-------|
| Portable Auth UI | PASS | PASS | ProfileDropdown + Robohash |
| README educational rewrite | — | — | title/screenshots preserved |
| Flash/navbar/Select | PASS | WARN (pre-existing `any`) | HomePage/Navbar/Auth only |
| Auth welcome/goodbye toasts + CTA | PASS | PASS | auth-toast + AuthToastBridge |
| Stable scrollbar gutter | PASS | — | html scrollbar-gutter; Auth inset-0 |
| Avatar no-squeeze + quiet prod console | PASS | — | Navbar min-w-10; devLog for SSE/AI |
| Clean Vercel deploy logs | PASS | — | Sentry upload opt-in; prisma.config.ts |
| Import-flow quiet prod | PASS | — | UrlBulkImportExport + chrome + bulk-import → devLog |
| List switch + collections UX | PASS | PASS | slug-safe placeholder; title nav; silent create; warm-cache skeletons |
| Visit Site open external URL | PASS | PASS | ensureAbsoluteHttpUrl + openExternalUrl; UrlCard card+dialog |
| Collaborators row + Card pad | PASS | PASS | empty one-row; Card p-2 sm:p-4; SmartCollections no stacked pt |

Out of scope: densify/JWT SSR, Zod/SHA, Next 16, Prisma 7.
