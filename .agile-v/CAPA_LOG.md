# CAPA_LOG.md

| ID | Date | Finding | Correction | Verification | Status |
|---|---|---|---|---|---|
| CAPA-0001 | 2026-08-19 | RISK-0017: list-scoped mutation/metadata/vector routes bypassed consistent authorization. | Added canonical list resolution and existing cookie-session role checks before protected reads or side effects. | Role-focused Jest coverage, strict TypeScript, zero-warning lint, production build. | Closed locally; Gate 2 remains pending. |
| CAPA-0002 | 2026-08-19 | RISK-0018: duplicate URL mutation path and post-mutation delete snapshot could lose optimistic state. | Removed unused hooks; added snapshot-first store commit/rollback and hook-independent query keys. | Failed-delete rollback test, regression suite, strict TypeScript, zero-warning lint, production build. | Closed locally; Gate 2 remains pending. |
