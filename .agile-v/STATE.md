# STATE.md

**C7.33 — Collaborator revoke until re-invite** | 2026-09-10

## Reconciled

- Collaborator remove marks `revoked` in collaboratorRoles; authz blocks before public→viewer.
- Old invite / cold open: unified 403 → skeleton + toast + home (no List not found / login flash).
- Soft-nav cold when `accessDenied`; unified remount always revalidates (offline revoke).
- C7.32 polish included: honest Add Collaborator chrome, Lists/Insights empty polish.

## Current checkpoint

- **Stage:** C7.33 commit-ready DONE — await HA smoke / deploy
- **Cycle:** C7
- **Status:** committed; human re-smoke pending
- **Trace:** REQ-0058, TASK-0065, DEC-0077

## Next

```text
1. Human: remove on public + private; old invite link kicks with toast; re-invite restores; Browse stranger OK.
2. Push + deploy when ready.
```
