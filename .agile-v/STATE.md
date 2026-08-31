# STATE.md

**C7.13** | 2026-08-31

## Done

- **C7.13:** Next **16.3.3** + React **19.2.8** + Node **24.x** (`.nvmrc`, `engines`, `@types/node@24`); migrate `middleware.ts` → **`src/proxy.ts`**; flat `eslint.config.mjs`; remove TW4 `@theme`; `deepmerge-ts@^8.0.2` override → npm audit **0**; Prisma **6.19.3** kept (no DB major).
- **C7.12:** List-detail + Insights chart UX (jobs menu, LabelList, Visit `openExternalUrl`, etc.).
- Prior: C7.9–C7.11 soft-nav/Insights · C7.8 `/login` · densify.

## Human

- HA-0001 Firewall
- TASK-0039 production verify after deploy (Next 16/React 19 smoke; `/login` chrome-skip via proxy `x-pathname`; audit clean on CI)

## Remaining (user later / backlog)

- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; browse densify `"you@local"` actor; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.13 + hygiene (eslint `globalIgnores` lead; walkthrough OOS drop Next 16) commit-ready.
- **Validation:** tsc · lint 0 (Node **24.x** via `.nvmrc`; local shells may still be 22 — engines/Vercel target 24) · Jest 114/5 · build PASS · npm audit 0 · verify-deep PASS.
- **Docs:** CLAUDE · STATE · walkthrough · README · VALIDATION · DECISION · RISKS synced (`proxy.ts`, not middleware).

## Next

```text
Prod smoke after deploy: login chrome-skip, Lists/Insights soft-nav, Visit new tab.
TASK-0039.
```
