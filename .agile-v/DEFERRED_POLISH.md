# DEFERRED_POLISH.md

Optional UI polish from prod smoke (2026-09-10). **Not blocking.** Do not start unless explicitly prioritized — owner has other projects.

| Item | Notes | Priority |
|------|--------|----------|
| Add URL auto-scroll | Exists for **add + duplicate + pin**. **Not** on edit. Extend to edit only if needed. | Low |
| Navbar clip on scroll | `getStickyNavbarOffsetPx` + `scrollBy` already exist; still imperfect under sticky nav. | Low |
| Toast transparency | Toast bg nearly see-through vs glass/navbar `blur-md`; harder to read. | Low |
| Insights KPI flash | Overview cards can flash stale RQ values (e.g. 0/6→3) on revisit; not densify-covered. Leave unless annoying. | Low |
| Dup scroll → top twin | Known quirk when two same hrefs; leave. | Skip |

**Source:** HA prod smoke after C7.29 (`691758b`).  
**Next smoke:** collaborators.
