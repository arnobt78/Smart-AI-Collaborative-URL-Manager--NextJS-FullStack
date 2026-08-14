# CHANGELOG.md

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
- Smart Collections: single pad shell `p-2 sm:p-4` + title `pb-1 sm:pb-4`
