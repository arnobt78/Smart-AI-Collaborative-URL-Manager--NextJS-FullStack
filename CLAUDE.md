# CLAUDE.md

## Project
**The Daily Urlist** (`urlist` v0.2.1) — AI collaborative URL lists.  
Live: https://daily-urlist.vercel.app/ · Resume: `.agile-v/STATE.md`

## Status (C1)
Done: shared compact controls · Auth row reveal · accessible Smart Collections disclosure · responsive Add URL cancel · consistent CTA icons · responsive 56px chrome · type-safe cache/SSE/abort paths · zero lint.
Controls: shared Button/glass/input contract is `h-10 min-h-10`; placeholders use `text-sm`. Home uses CSS/observer reveal/parallax, no motion dependency.
Auth menu: open guest credentials panel is opaque and stacked above reveal rows; trigger uses expanded/menu ARIA.
Data: unified React Query + optimistic store updates + centralized invalidation + SSE; bulk import reconciles caches without reload.
Human: HA-0001; match Sentry org/token before upload.  
Audit: Prisma CLI transitively pins `deepmerge-ts@7.1.5` (3 high findings); user accepted RISK-0016. Retain Prisma 6; do not force-downgrade or upgrade.
Audit rerun: lint · strict TS · Jest · production build pass; Gate 2 remains blocked by RISK-0016 and missing human acceptance.
Out of scope: densify/JWT SSR, Zod/SHA, Next 16, Prisma 7.

## Stack
Next 15.5.23 · React 18 · RQ · Prisma 6.19 · cookie auth · Upstash · Sentry tunnel · PostHog · Jest · Node 24.x (Vercel)

## Deploy / logs
Sentry upload only if `SENTRY_UPLOAD_SOURCEMAPS=1` · `prisma.config.ts` seed  
`lib/dev-log.ts` — SSE, AI, bulk import / Chrome parser

## Lists UX
`useUnifiedListQuery` placeholder same-slug only · ListPage syncs `currentList` from RQ · Smart Collections create stays on page  
Visit: `openExternalUrl` / `ensureAbsoluteHttpUrl` in `lib/utils.ts` (schemeless hosts)

## Home refresh
`WAS_AUTHED_COOKIE` + `session_token` SSR → HomePage/Navbar; `useWasAuthedHint`; static `FloatingBackground`; `PostHogPageview` Suspense sibling only

## Spacing
`src/lib/ui-spacing.ts` — `PAGE_STACK` / `SECTION_STACK` / `MARKETING_STACK` / `FORM_STACK` / `LIST_STACK` / `PAGE_HEADER` / `CARD_PAD` on page roots (not per-child mb)

## Auth layout
`Auth.tsx` — `md:grid-cols-2` inside `max-w-7xl`: left Welcome typewriter + about-process (no divider/left logo); right labeled Sign In + Sign up row. No 8s overlay. Sign In uses `glassPrimaryButtonClass("blue")` + Sparkles.

## Glass UI
`src/lib/ui/glass-button-styles.ts` (primary/action/ghost) · `glass-badge-styles.ts` · `glass-card-styles.ts` — ported from stock-inventory; Tailwind content includes `src/lib`.

## Validate
`tsc` · `lint` (0) · Jest (20 pass/5 skip) · `prisma generate` · `build` → `.agile-v/VALIDATION_SUMMARY.md`
