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

Current: **Stage 4 verification complete** through REQ-0020; Gate 2 remains required before release acceptance.

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
