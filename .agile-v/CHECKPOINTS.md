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

## Durable Human Gate checkpoints

| Timestamp | Gate | Type | Status | resume_token | Scope / resume condition |
|-----------|------|------|--------|--------------|--------------------------|
| 2026-08-18 | GATE-0010 | Human-Decision | PENDING | `C1-HG1-REQ-0010-2026-08-18` | REQ-0010 plan only. Resume implementation only after a matching APPROVALS.md entry and STATE.md update. |
| 2026-08-18 | GATE-0010 | Human-Decision | SUPERSEDED | `C1-HG1-REQ-0010-2026-08-18` | Superseded before approval by the broader, atomic GATE-0011 scope. |
| 2026-08-18 | GATE-0011 | Human-Decision | PENDING | `C1-HG1-UI-REMEDIATION-2026-08-18` | REQ-0010 through REQ-0014. Resume synthesis only after matching APPROVALS.md entry and STATE.md update. |
| 2026-08-18 | GATE-0011 | Human-Decision | APPROVED | `C1-HG1-UI-REMEDIATION-2026-08-18` | User approved REQ-0010 through REQ-0014; Stage 3 synthesis authorized. |
