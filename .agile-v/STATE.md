# STATE.md

**C7.34 — HA smoke polish (Browse public + chrome)** | 2026-09-10

## Reconciled

- Revoked collab on **public** → viewer (Browse works); **private** → none until re-invite.
- Add Collaborator always visible; disabled for non-owners.
- `removeCollaborator` no stranger/already-revoked invent; DELETE skips activity/SSE on no-op.
- SessionListCacheGuard clears My Lists on account switch; allLists remount always revalidates.
- List not found empty uses shared glass chrome (`text-white` / `text-white/60`).

## Current checkpoint

- **Stage:** C7.34 commit-ready
- **Cycle:** C7
- **Status:** ready to commit; HA re-smoke after deploy
- **Trace:** REQ-0058, TASK-0065, DEC-0077 (policy refine C7.34)

## Next

```text
1. Human: remove on public → Browse open; private old invite kicks; disabled Add Collaborator as non-owner.
2. Push + deploy when ready.
```
