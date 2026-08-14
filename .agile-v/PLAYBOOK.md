# PLAYBOOK.md — Daily Urlist agent playbook

## Resume

1. Read `docs/AGILE_V_PROTOCOL.md` (short prompt after init)
2. Read `CLAUDE.md` + `AGENTS.md`
3. Read `.agile-v/STATE.md` then `CHECKPOINTS.md` if PENDING
4. Code is source of truth over stale docs

## Conventions (verified)

- Prefer extending `src/hooks/useListQueries.ts` + `src/utils/queryInvalidation.ts` over new cache systems
- Auth via `src/lib/auth.ts` cookie sessions — not NextAuth
- Redis optional: null-safe when env missing (`src/lib/redis.ts`)
- Thin `page.tsx` → client page components under `src/components/pages/`
- Mutations must invalidate related React Query keys

## Do not

- Read or commit real `.env` / `.env.local` secrets
- Self-verify own Gate 2 release evidence (Red Team Protocol)
- Expand beyond approved REQ IDs
