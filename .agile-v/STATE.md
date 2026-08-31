# STATE.md

**C7.14** | 2026-08-31

## Done

- **C7.14:** List-detail UI polish + shared **`GlassPortalMenu`** (body portal, viewport flip/clamp, `z-[900]` below Dialog); jobs / collaborator / `ProfileDropdown` menus; `UI_ICON_MENU_TRIGGER` h-10 + Back cluster; header badges `text-xs`; share row inside `HEADING_STACK`; UrlCard title/note/dates align; Insights meta `gap-1`. Soft-nav share parity.
- **C7.13:** Next **16.3.3** + React **19.2.8** + Node **24.x**; **`src/proxy.ts`** (not middleware); flat ESLint; `deepmerge-ts` override → audit **0**; Prisma **6.19.3**.
- **C7.12:** List-detail + Insights chart UX prior pass.

## Human

- HA-0001 Firewall
- TASK-0039 production verify after deploy (Next 16 smoke; `/login` via proxy `x-pathname`; jobs menu over Collaborators)

## Remaining (user later / backlog)

- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; UrlFilterBar portal OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.14 commit-ready.
- **Validation:** tsc · lint 0 · Jest UrlList|SoftNav · build PASS · verify-deep PASS WITH WARNINGS (GlassPortalMenu staged this commit).
- **Docs:** CLAUDE · STATE · walkthrough · VALIDATION synced (`proxy.ts`, Node 24.x, GlassPortalMenu).

## Next

```text
Prod smoke after deploy: login chrome-skip, list-detail jobs menu stacking, Visit new tab.
TASK-0039.
```
