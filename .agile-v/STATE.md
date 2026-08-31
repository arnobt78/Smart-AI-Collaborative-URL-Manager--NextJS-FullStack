# STATE.md

**C7.15** | 2026-08-31

## Done

- **C7.15:** Radix glass **`DropdownMenu`** replaces **`GlassPortalMenu`** (deleted); deps `@radix-ui/react-dropdown-menu` + `tailwindcss-animate`; tokens `UI_GLASS_MENU_*` + trigger focus; menus: jobs / collab / ProfileDropdown / Auth guest / bulk import-export. Menu focus: no global blue ring on `[role=menu|menuitem]`. **`CARD_STACK`** for MyLists/Browse/detail header chrome. UrlCard unified `CARD_PAD` + note separator + `URL_META_CHIP`. `next.config` immutable `/_next/static` **prod-only** (dev HMR).
- **C7.14:** List-detail chrome polish (share in `HEADING_STACK`, UrlCard date align, Insights `gap-1`); former portal menus since superseded by C7.15.
- **C7.13:** Next **16.3.3** + React **19.2.8** + Node **24.x**; **`src/proxy.ts`**; flat ESLint; audit **0**; Prisma **6.19.3**.

## Human

- HA-0001 Firewall
- TASK-0039 production verify after deploy (Next 16 smoke; `/login` via proxy `x-pathname`; Radix menus over Collaborators; list UrlCard note/chips)

## Remaining (user later / backlog)

- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; UrlFilterBar portal OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS

## Current checkpoint

- **Stage:** C7.15 commit-ready.
- **Validation:** tsc · lint 0 · Jest (incl. UrlBulkImportExport userEvent) · build PASS · audit 0.
- **Docs:** CLAUDE · STATE · walkthrough · VALIDATION · DEC-0054 synced.

## Next

```text
Prod smoke after deploy: login chrome-skip, Radix jobs/profile menus, UrlCard note/chips, Visit new tab.
TASK-0039.
```
