# GATES.md — Cycle C2

## GATE-0015 — Human Gate 1 (C2 homepage hero mount stagger)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-19** |
| Checkpoint | `C2-HG1-HOME-HERO-2026-08-19` in `CHECKPOINTS.md` |
| Evidence | CR-0001; REQ-0024; TASK-0026; DEC-0026; TC-0026/TC-0027 |
| Required human action | Completed — user explicitly requested implementation of the presented plan. |
| Scope | Authenticated homepage hero mount stagger, focused regression test, and test setup debug cleanup only. No API, data, cache, authorization, SSR, or schema changes. |

Implementation is locally verified; C2 Gate 2 remains pending release evidence and human acceptance.

## Pipeline position

```text
Stage 1 Requirements → Stage 2 Validation → [Human Gate 1] → Stage 3 Synthesis → Stage 4 Verification → [Human Gate 2] → Stage 5 Acceptance
```

Current: **C6.8 Stage 4 complete locally** for REQ-0038. GATE-0024 approved. GATE-0002 remains pending (`EVAL_RESULTS.md` absent).

Reconciliation note (2026-08-18): commits and prior validation records document C1 implementation activity, but `APPROVALS.md` has no matching approved record for the original GATE-0001 token. This is retained as historical evidence, not retroactively approved. It does not authorize further implementation.

---

## GATE-0001 — Human Gate 1 (plan approval)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | SUPERSEDED / historically unapproved |
| Checkpoint | See `CHECKPOINTS.md` |
| Evidence | Analysis in `STATE.md`; REQs in `REQUIREMENTS.md`; tasks in `TASKS.md` |
| Required human action | None; GATE-0011 superseded its scoped implementation approval. |
| Resume condition | Not applicable. |

**Must NOT proceed to implementation until approved.**

---

## GATE-0010 — Human Gate 1 (superseded before approval)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | SUPERSEDED by GATE-0011 |
| Checkpoint | `C1-HG1-REQ-0010-2026-08-18` in `CHECKPOINTS.md` |
| Evidence | REQ-0010 in `REQUIREMENTS.md`; TASK-0010 in `TASKS.md`; DEC-0011 and RISK-0011 |
| Required human action | None; use GATE-0011 for the expanded scope. |
| Resume condition | Not applicable. |

---

## GATE-0011 — Human Gate 1 (UI remediation plan approval)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-18** |
| Checkpoint | `C1-HG1-UI-REMEDIATION-2026-08-18` in `CHECKPOINTS.md` |
| Evidence | REQ-0010 to REQ-0014; TASK-0011 to TASK-0015; DEC-0012/0013; RISK-0011 to RISK-0014 |
| Required human action | Completed — user approved all scoped requirements. |
| Resume condition | Satisfied by matching `APPROVALS.md` entry. |

Implementation is authorized. Gate 2 remains required before any release decision.

---

## GATE-0012 — Human Gate 1 (responsive chrome alignment)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-18** |
| Evidence | REQ-0015; TASK-0016; DEC-0015; RISK-0015; TC-0017/0018 |
| Required human action | Completed — user authorized implementation and inclusion of the remaining local files. |
| Scope | Responsive Navbar/Footer centering, browser type consolidation, and dead commented Footer-code removal only. |

---

## GATE-0013 — Human Gate 1 (stable list-form dialogs)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-18** |
| Checkpoint | `C1-HG1-REQ-0021-2026-08-18` |
| Evidence | REQ-0021; TASK-0022; DEC-0022 |
| Required human action | Completed — user approved the Stable List Form Dialogs plan. |
| Scope | Shared scrollable dialog header, list-form consolidation, cache-first create/edit mutations, Cancel/Clear icons, and no-flicker regression coverage. |

---

## GATE-0014 — Human Gate 1 (security and cache-stability remediation)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-19** |
| Checkpoint | `C1-HG1-SECURITY-CACHE-2026-08-19` in `CHECKPOINTS.md` |
| Evidence | REQ-0022/REQ-0023; TASK-0023/TASK-0024; DEC-0023; RISK-0017/RISK-0018 |
| Required human action | Completed — user explicitly approved the scoped server authorization boundary, mutation-gateway consolidation, and static-shell/data-slot work. |
| Scope | Existing cookie-session/collaboration authorization, list metadata/vector side-effect guards, one URL mutation commit/rollback path, and removal of identified broad loading remounts. No Prisma migration, auth replacement, JWT, Zod/SHA adoption, schema migration, or unrelated UI redesign. |

Implementation is authorized. Gate 2 remains required before any release decision.

---

## GATE-0017 — Human Gate 1 (C6 data-surface polish)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-19** |
| Checkpoint | `C6-HG1-DATA-SURFACE-POLISH-2026-08-19` in `CHECKPOINTS.md` |
| Evidence | REQ-0028; TASK-0034; DEC-0031; ART-0028.1 |
| Required human action | Completed — user explicitly approved the requested C6 scope. |
| Scope | Protected server data pages, hydration/cold slots, list-summary cache commits, collapsible activity, and compact List/Insights layout only. |

---

## GATE-0018 — Human Gate 1 (C6.2 instant list dialogs)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-20** |
| Evidence | REQ-0030; TASK-0036; DEC-0031; ART-0030.1 |
| Required human action | Completed — user explicitly approved the C6.2 implementation plan. |
| Scope | Native-history Lists create/edit dialogs and confirmed create/edit/delete dialog lifecycle only. |

---

## GATE-0019 — Human Gate 1 (C6.3 unified dialog visual contract)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-20** |
| Evidence | REQ-0031; TASK-0037; DEC-0032; ART-0031.1 |
| Required human action | Completed — user explicitly approved the shared-dialog visual contract. |
| Scope | Shared fixed/scroll header presentation and verified-unused overlay removal only. |

---

## GATE-0020 — Human Gate 1 (C6.4 instant create-list launchers)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-20** |
| Evidence | REQ-0032; TASK-0038; DEC-0033; CR-0011 |
| Required human action | Completed — user explicitly approved the C6.4 implementation plan. |
| Scope | Hydrated Home/List Create List launchers, shared dialog lifecycle extraction, and focused tests only. |

Implementation is complete in production (`c675cf6` / `dpl_DB8BYHnrXN5LuwL5Yo5FNdtwFvXd`). Browser acceptance is TASK-0039. Gate 2 remains required before any release decision.

---

## GATE-0021 — Human Gate 1 (C6.5 instant dialogs and confirmed overlays)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-20** |
| Checkpoint | `C6.5-HG1-LIST-DETAIL-EDIT-2026-08-20` in `CHECKPOINTS.md` |
| Evidence | REQ-0033; REQ-0034; REQ-0035; TASK-0040; DEC-0035; CR-0012 |
| Required human action | Completed — user explicitly requested implementation of the attached instant-dialog plan. |
| Scope | History-state dialog open/close without Next search-param RSC, CreateNewListButton local onClick only, and mutating overlays pending until network plus paint. No API, schema, session, Redis, SSE, or mutation-contract change. |

Implementation is locally verified. Browser acceptance of create/edit open-close remains TASK-0039. Gate 2 remains required before any release decision.

---

## GATE-0022 — Human Gate 1 (C6.6 instant soft-nav shells)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-20** |
| Checkpoint | `C6.6-HG1-INSTANT-SOFT-NAV-2026-08-20` in `CHECKPOINTS.md` |
| Evidence | REQ-0036; TASK-0041; DEC-0037; CR-0013 |
| Required human action | Completed — user explicitly requested implementation of the attached instant soft-nav plan. |
| Scope | Segment loading shells + auth-only protected RSC + delayed cold slots + per-request session cache. No densify/JWT/Next16/Prisma7. Mutation impact contract unchanged. |

Implementation is locally verified. Production soft-nav browser check remains with TASK-0039. Gate 2 remains required before any release decision.

---

## GATE-0023 — Human Gate 1 (C6.7 single soft-nav skeleton)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-20** |
| Checkpoint | `C6.7-HG1-SSR-HYDRATE-SHELL-2026-08-20` in `CHECKPOINTS.md` |
| Evidence | REQ-0037; TASK-0042; DEC-0038; CR-0014 |
| Required human action | Completed — user explicitly requested implementation of the attached C6.7 plan. |
| Scope | Restore SSR prefetch/dehydrate under existing loading.tsx; no densify/JWT/Next16; mutation impact unchanged. |

Implementation is locally verified. Production Network check remains with TASK-0039. Gate 2 remains required before any release decision.

---

## GATE-0024 — Human Gate 1 (C6.8 warm soft-nav + lighter Insights)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **APPROVED 2026-08-20** |
| Checkpoint | `C6.8-HG1-WARM-SOFT-NAV-2026-08-20` in `CHECKPOINTS.md` |
| Evidence | REQ-0038; TASK-0043; DEC-0039; CR-0015 |
| Required human action | Completed — user explicitly requested implementation of the attached C6.8 plan. |
| Scope | Warm soft-nav skeleton skip, Insights overview+activity SSR, session.user auth reuse. Mutation impact unchanged. |

Implementation is locally verified. Production warm-nav check remains with TASK-0039. Gate 2 remains required before any release decision.

---

## GATE-0002 — Human Gate 2 (release / acceptance)

| Field | Value |
|-------|-------|
| Status | PENDING |
| Prereqs | Implementation + validation evidence in `VALIDATION_SUMMARY.md`; `EVAL_RESULTS.md` with `eval_gate_status: PASS` or an approved waiver; Human Gate 2 acceptance. |

---

## Human-Action (non-code)

| ID | Action | Status |
|----|--------|--------|
| HA-0001 | Vercel Dashboard: Bot Protection = **Challenge**; AI Bots = **Deny**; Attack Mode **OFF** (no redeploy needed for toggles) | **PENDING human** — REQ-0002 code shipped |
| HA-0002 | Confirm production DB host for README sync | PENDING question |
