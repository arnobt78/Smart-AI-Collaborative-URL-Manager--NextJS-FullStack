# GATES.md — Cycle C1

## Pipeline position

```text
Stage 1 Requirements → Stage 2 Validation → [Human Gate 1] → Stage 3 Synthesis → Stage 4 Verification → [Human Gate 2] → Stage 5 Acceptance
```

Current: **paused before Stage 3** at **Human Gate 1**.

---

## GATE-0001 — Human Gate 1 (plan approval)

| Field | Value |
|-------|-------|
| Type | Human-Decision |
| Status | **PENDING** |
| Checkpoint | See `CHECKPOINTS.md` |
| Evidence | Analysis in `STATE.md`; REQs in `REQUIREMENTS.md`; tasks in `TASKS.md` |
| Required human action | Approve a track (D recommended) or custom REQ subset; answer unresolved questions if possible |
| Resume condition | Matching approval recorded in `APPROVALS.md` + `STATE.md` |

**Must NOT proceed to implementation until approved.**

---

## GATE-0002 — Human Gate 2 (release / acceptance)

| Field | Value |
|-------|-------|
| Status | Not started |
| Prereqs | Implementation + validation evidence in `VALIDATION_SUMMARY.md`; eval gate if applicable |

---

## Human-Action (non-code)

| ID | Action | Status |
|----|--------|--------|
| HA-0001 | Vercel Dashboard: Bot Protection = **Challenge**; AI Bots = **Deny**; Attack Mode **OFF** (no redeploy needed for toggles) | **PENDING human** — REQ-0002 code shipped |
| HA-0002 | Confirm production DB host for README sync | PENDING question |
