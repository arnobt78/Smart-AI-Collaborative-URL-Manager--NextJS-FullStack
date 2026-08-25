# STATE.md

**C7.12** | 2026-08-25

## Done

- **C7.12:** List-detail + Insights chart UX — Activity LabelList (non-zero, 7/30); pie slice-colored labels; soft-nav Copy parity; `ListDetailJobsMenu` (Setup/Refresh/Health); Collaborators items-start + avatar ring + email `text-xs sm:text-sm`; UrlCard cover/top + desc typography + `cursor-default` + `openExternalUrl` visits; Cloudinary fill `gravity: auto`; UrlList tabs no `border-b`.
- **C7.10–C7.11:** List-detail polish, soft-nav flash harden, Insights chart skeleton/tooltip/gaps.
- Prior: C7.9 soft-nav seed · C7.8 `/login` · densify.

## Human

- HA-0001 Firewall
- TASK-0039 production verify after deploy (Insights labels; Lists→detail no share/jobs flash; Visit new tab; Collaborators; no tab underline)

## Remaining (user later)

- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; browse densify `"you@local"` actor (pre-C7.1); full metadata/AI rewrite OOS

## Current checkpoint

- **Stage:** C7.12 locally validated; commit-ready.
- **Validation:** tsc · lint 0 · soft-nav Jest 12/12 · build PASS · verify-deep PASS.
- **Docs:** CLAUDE · STATE · walkthrough · VALIDATION · DECISION synced this session.

## Next

```text
Prod: Insights labels; Lists→detail Copy+jobs menu stable; Visit opens absolute URL new tab; Collaborators alignment; no Active URLs border.
TASK-0039.
```
