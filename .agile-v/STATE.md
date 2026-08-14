# STATE.md

**C1** | 2026-08-14

## Done

- Auth UX · gutter · avatar · clean Vercel Sentry/Prisma logs
- `devLog`: SSE/AI + bulk import / Chrome parser (prod silent)
- List switch: slug-safe placeholder + `currentList` sync; My Lists title nav; silent Smart Collections create
- Visit Site: `ensureAbsoluteHttpUrl` + `openExternalUrl` (schemeless URLs open in new tab)
- Collaborators empty: one-row title · invite copy · Add; Card pad `p-2 sm:p-4` (no lg:p-8)
- HomePage: no NeutralWait spinner — Auth or Marketing immediately via wasAuthed
- Smart Collections: single `p-2 sm:p-4` shell + title `pb-1 sm:pb-4` (no double pad)
- Local/prod DB: use remote `77.42.71.87:25432` in `.env` / `.env.local` (not localhost tunnel)
- Home refresh: `urlist_was_authed` cookie + session_token SSR hint; static FloatingBackground; PostHog Suspense island; profile skeleton-first
- Central UI spacing: `lib/ui-spacing.ts` PAGE/SECTION/FORM/LIST stacks on Browse/Lists/Insights/API/Home/Auth; main `py-6 sm:py-10`
- Auth/Home/Navbar polish: `MARKETING_STACK`; hide Sign up footer; nav overflow-visible + dropdown `z-[100]`
- Auth split viewport: `md:grid-cols-2` welcome+about | labeled Sign In; removed 8s blocking overlay
- Auth UI polish: max-w-7xl shell; no center divider/left logo; reserved typewriter heights; feature gaps; Sign up row; CTA spacer
- Stock glass shadow-glow port: `src/lib/ui/glass-{button,badge,card}-styles.ts`; Button variants; Auth Sign In Sparkles + primary blue glow; PermissionManager/CTAs aligned; dead `ui-button.ts` removed

## Human

- HA-0001 Firewall
- Match Sentry org/token before `SENTRY_UPLOAD_SOURCEMAPS=1`

## Next

```text
Load .agile-v/STATE.md. C1 glass glow ported (stock recipe). HA-0001. No densify/Zod/Next16/Prisma7 unless REQ.
```
