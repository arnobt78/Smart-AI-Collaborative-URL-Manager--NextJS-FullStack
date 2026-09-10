# STATE.md

**C7.30 — Collaborator smoke consistency** | 2026-09-10

## Done

- Densify My Lists `updatedAt` on collab add/role/remove (+ unified rollback on error).
- Viewer jobs: `canRunJobs={canEdit}`; Cancel active.
- Logout clears `authRedirect`; skip write while force-guest; invite `?next=` unchanged.
- Deferred polish backlog: [DEFERRED_POLISH.md](./DEFERRED_POLISH.md).

## Validation

| Check | Result |
|-------|--------|
| Jest full | 43 suites / 204 passed / 2 skipped |
| logout-client + mutations | PASS |
| eslint / tsc / build | PASS |
| Verifier / Security | PASS WITH WARNINGS / PASS |
| Playwright e2e | Not run (needs `E2E_DATABASE_URL`; do not use prod DB without allow) |

## Checkpoint

- **Stage:** commit-ready
- **Trace:** REQ-0055, TASK-0061, DEC-0074

## Next

```text
1. Push when directed.
2. Human collab re-smoke on prod (Updated Back; Viewer jobs; logout→home).
```
