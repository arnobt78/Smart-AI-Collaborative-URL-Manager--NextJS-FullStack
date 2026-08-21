# STATE.md

**C7.8** | 2026-08-21

## Done

- **C7.8:** `/login` chrome-free Auth; middleware `x-pathname`; layout skips nav/footer; `/` guests→`/login`; logout/401→`/login`; force-guest cookie; one html scrollbar (no Auth overlay).
- C7.7 force-guest until login · C7.6 Refresh · densify.

## Human

- HA-0001 Firewall
- TASK-0039 production verify after deploy

## Remaining (user later)

- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS

## Current checkpoint

- **Stage:** C7.8 `/login` on `main` (pending push).
- **Validation:** Jest 105/5 · lint 0 · tsc.
- **Docs:** CLAUDE · walkthrough · `.agile-v` synced this session.

## Next

```text
Prod: Logout → /login (no nav/footer; one scrollbar). Sign-in → home.
TASK-0039.
```
