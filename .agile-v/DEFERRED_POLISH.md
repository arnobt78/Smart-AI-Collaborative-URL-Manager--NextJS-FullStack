# DEFERRED_POLISH.md

Prod smoke polish backlog (2026-09-10). **C7.31 implements remaining Low items.**

| Item | Notes | Status |
|------|--------|--------|
| Add URL auto-scroll | Exists for add + duplicate + pin; extend to **edit**. | **Done (C7.31)** |
| Navbar clip on scroll | Single `scrollTo` with measured `[data-navbar]` offset. | **Done (C7.31)** |
| Toast transparency | Opaque zinc glass + `backdrop-blur-md` like menus. | **Done (C7.31)** |
| Insights KPI flash | Loading while `isFetching && isPlaceholderData`. | **Done (C7.31)** |
| Dup scroll → top twin | Known quirk when two same hrefs. | **Skip** |

**Source:** HA prod smoke. After C7.31: freeze polish unless a real bug.
