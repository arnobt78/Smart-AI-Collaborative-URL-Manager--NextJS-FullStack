# CHECKPOINTS.md

| When       | Note                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| 2026-08-14 | C1 + Auth UI + educational README. Resume STATE.md. HA-0001 human.                                              |
| 2026-08-14 | Flash/navbar/Select stable. No densify/Zod/SHA/JWT SSR.                                                         |
| 2026-08-14 | Auth toasts + Sparkles CTA + scrollbar-gutter stable.                                                           |
| 2026-08-14 | Avatar no-squeeze + prod SSE/AI console gated via devLog.                                                       |
| 2026-08-14 | Clean deploy logs: Sentry upload opt-in + prisma.config.ts.                                                     |
| 2026-08-14 | Import-flow logs via devLog (prod silent).                                                                      |
| 2026-08-14 | List-switch slug-safe placeholder + currentList sync; My Lists title nav; silent Smart Collections. No densify. |
| 2026-08-14 | Visit Site/dialog: ensureAbsoluteHttpUrl + openExternalUrl (schemeless → https).                                |
| 2026-08-14 | Collaborators empty one-row; Card/SmartCollections pad p-2 sm:p-4 (no double gutter).                           |
| 2026-08-14 | HomePage: removed NeutralWait; Auth/Marketing branch, no full-page spinner.                                     |
| 2026-08-14 | Smart Collections: single p-2 sm:p-4 shell + title pb-1 sm:pb-4. |
| 2026-08-14 | Home refresh: wasAuthed cookie SSR + static BG + PostHog island; no Auth flash / profile jump. |
| 2026-08-14 | Central ui-spacing tokens; PAGE/SECTION/FORM/LIST stacks restore collapsed pages. |
| 2026-08-14 | MARKETING_STACK + Auth footer hide + navbar avatar/menu unclip z-[100]. |
| 2026-08-14 | Auth split viewport: welcome+about | Sign In together; no 8s gate. |
| 2026-08-14 | Auth UI polish: max-w-7xl, no divider/logo box, gaps, Sign up row. |
| 2026-08-14 | Stock glass shadow-glow port (`src/lib/ui/glass-*`); CTAs + Auth Sparkles; deleted dead `ui-button.ts`. |
| 2026-08-18 | GATE-0011 complete: shared controls/UI polish, cache-safe bulk import, Node 24.x config, zero lint; typecheck, Jest, and production build pass. |
| 2026-08-19 | Security/cache audit: REQ-0022/0023 proposed. Do not code until GATE-0014 approval; resolve list route IDOR/access checks, URL mutation rollback duplication, and broad cold skeleton remounts. |
| 2026-08-19 | REQ-0022/0023 complete: canonical list authorization, store snapshot/commit/rollback, hook-independent query keys, and static cached data surfaces validated locally. Gate 2 remains pending. |
| 2026-08-19 | Final local audit complete: typecheck, zero-warning lint, Jest, build, and diff pass. REQ-0017/0018 browser acceptance awaits user testing. |
| 2026-08-19 | Production browser handoff: TASK-0025 awaits user test results for REQ-0017/0018. No application change is authorized until reproducible feedback is received. |
| 2026-08-19 | C2 Gate 1 approved: implement REQ-0024 homepage hero mount stagger; preserve C1 Gate 2 and production browser acceptance as pending. |
| 2026-08-19 | C5 / REQ-0027 implementation started under explicit user approval; resume with session-revocation, server-hydration, mutation-boundary tests, then validation evidence. |
| 2026-08-19 | C5 / REQ-0027 complete: persisted session checks, core server hydration, delete-list impact reconciliation, focused regressions, and local validation complete. |
| 2026-08-19 | C6 / REQ-0028 complete: guarded dynamic data pages, compact cold slots, summary-cache commits, collapsed Activity Feed, and Insights/list-card polish validated locally. |
| 2026-08-20 | C6.2 / REQ-0030 complete locally: Lists create/edit query state is native-history local; create/edit/delete dialogs stay pending through confirmation and committed paint. Commit/deploy next. |
| 2026-08-20 | C6.3 / REQ-0031 complete locally: shared fixed/scroll headers use compact divider-free spacing; unused InputDialog removed. Commit/deploy next. |
| 2026-08-20 | C6.4 / REQ-0032 planning: production trace confirms Home Create List uses a legacy RSC link; proposed local shared launcher awaits GATE-0020 approval. `resume_token=C6.4-HG1-INSTANT-CREATE-LAUNCHERS-2026-08-20` |
| 2026-08-20 | C6.4 / REQ-0032 approved: implement the shared Home/List local Create List launcher under `C6.4-HG1-INSTANT-CREATE-LAUNCHERS-2026-08-20`. |
| 2026-08-20 | C6.4 / REQ-0032 complete: commit `c675cf6` deployed as Vercel production `dpl_DB8BYHnrXN5LuwL5Yo5FNdtwFvXd` READY. Browser verification is TASK-0039. Proposed C6.5 awaits GATE-0021. `resume_token=C6.5-HG1-LIST-DETAIL-EDIT-2026-08-20` |
| 2026-08-20 | C6.5 / REQ-0033–0035 complete locally: dialog history uses `history.state` without search-param RSC; mutating overlays stay pending until network plus paint. Commit/deploy next. |
| 2026-08-20 | C6.5 Wave 4: deep-link close keeps `?dialog=` href; closed UI is history.state only (DEC-0036). |

## Durable Human Gate checkpoints

| Timestamp | Gate | Type | Status | resume_token | Scope / resume condition |
|-----------|------|------|--------|--------------|--------------------------|
| 2026-08-18 | GATE-0010 | Human-Decision | PENDING | `C1-HG1-REQ-0010-2026-08-18` | REQ-0010 plan only. Resume implementation only after a matching APPROVALS.md entry and STATE.md update. |
| 2026-08-18 | GATE-0010 | Human-Decision | SUPERSEDED | `C1-HG1-REQ-0010-2026-08-18` | Superseded before approval by the broader, atomic GATE-0011 scope. |
| 2026-08-18 | GATE-0011 | Human-Decision | PENDING | `C1-HG1-UI-REMEDIATION-2026-08-18` | REQ-0010 through REQ-0014. Resume synthesis only after matching APPROVALS.md entry and STATE.md update. |
| 2026-08-18 | GATE-0011 | Human-Decision | APPROVED | `C1-HG1-UI-REMEDIATION-2026-08-18` | User approved REQ-0010 through REQ-0014; Stage 3 synthesis authorized. |
| 2026-08-18 | GATE-0012 | Human-Decision | APPROVED | `C1-HG1-RESPONSIVE-CHROME-2026-08-18` | User approved REQ-0015 responsive chrome alignment and inclusion of remaining local changes. |
| 2026-08-19 | GATE-0014 | Human-Decision | PENDING | `C1-HG1-SECURITY-CACHE-2026-08-19` | REQ-0022/REQ-0023 security authorization and cache-stability remediation. Resume synthesis only after a matching APPROVALS.md entry and STATE.md update. |
| 2026-08-19 | GATE-0014 | Human-Decision | APPROVED | `C1-HG1-SECURITY-CACHE-2026-08-19` | User approved REQ-0022/REQ-0023. Stage 3 synthesis is authorized. |
| 2026-08-19 | GATE-0015 | Human-Decision | APPROVED | `C2-HG1-HOME-HERO-2026-08-19` | User approved REQ-0024 homepage hero mount stagger. |
| 2026-08-19 | GATE-0017 | Human-Decision | APPROVED | `C6-HG1-DATA-SURFACE-POLISH-2026-08-19` | User approved REQ-0028 data-surface and analytics polish. |
| 2026-08-20 | GATE-0021 | Human-Decision | PENDING | `C6.5-HG1-LIST-DETAIL-EDIT-2026-08-20` | REQ-0033/REQ-0034 plan only. Resume synthesis only after a matching APPROVALS.md entry and STATE.md update. |
| 2026-08-20 | GATE-0021 | Human-Decision | APPROVED | `C6.5-HG1-LIST-DETAIL-EDIT-2026-08-20` | User approved the instant-dialog plan including REQ-0035 pending overlays. |
| 2026-08-20 | GATE-0022 | Human-Decision | APPROVED | `C6.6-HG1-INSTANT-SOFT-NAV-2026-08-20` | User approved C6.6 instant soft-nav shells (REQ-0036). |
| 2026-08-20 | GATE-0023 | Human-Decision | APPROVED | `C6.7-HG1-SSR-HYDRATE-SHELL-2026-08-20` | User approved C6.7 SSR hydrate under loading shells (REQ-0037). |
| 2026-08-20 | GATE-0024 | Human-Decision | APPROVED | `C6.8-HG1-WARM-SOFT-NAV-2026-08-20` | User approved C6.8 warm soft-nav + lighter Insights (REQ-0038). |
| 2026-08-20 | GATE-0025 | Human-Decision | APPROVED | `C6.9-HG1-OPTIMISTIC-SOFT-NAV-2026-08-20` | User approved C6.9 optimistic soft-nav no empty hole (REQ-0039). |
| 2026-08-18 | GATE-0012 complete: responsive header/footer chrome alignment; zero lint, typecheck, Jest, and production build pass. Prisma CLI audit remains RISK-0016. |
| 2026-08-18 | User accepted RISK-0016: retain Prisma 6.19.3; no forced downgrade or breaking upgrade. Gate 2 still needs EvalGate and human acceptance. |
