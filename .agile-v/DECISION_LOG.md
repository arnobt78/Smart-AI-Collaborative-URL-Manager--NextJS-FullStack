# DECISION_LOG.md

Append-only. Newest entries at bottom.

---

## DEC-0001 — Bootstrap Agile V Cycle C1 without prior workspace

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Orchestrator |
| Decision | Create `.agile-v/` Cycle **C1** from repository analysis; do not invent a fake prior cycle |
| Rationale | Protocol §1: if `.agile-v/` missing, bootstrap C1; analyze before requirements |
| Linked REQs | TASK-0000 / planning baseline |
| Alternatives | Skip formal memory (rejected — violates AGENTS.md / protocol) |

---

## DEC-0002 — Prefer production guardrails + hygiene as default C1 track

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Orchestrator |
| Decision | Recommend **Track D** (REQ-0001 + REQ-0002 + REQ-0004, optionally REQ-0003) as first implementation package |
| Rationale | Verified gaps: no robots, no security headers, no `.env.example`, unused deps, Vercel cost incident pattern documented in-repo; observability (Sentry/PostHog) is optional and heavier |
| Linked REQs | REQ-0001, REQ-0002, REQ-0003, REQ-0004 |
| Status | **Proposed — awaiting Human Gate 1** |

---

## DEC-0003 — Defer deep RSC shell refactor

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Orchestrator |
| Decision | Keep REQ-0009 out of default C1 implementation |
| Rationale | Pages already use thin server wrappers; deepening SSR data loading is architectural and needs explicit design approval to avoid cache/auth regressions |
| Linked REQs | REQ-0009 |
| Status | Deferred pending separate approval |

---

## DEC-AI-0001 — Free-tier model chains for Daily Urlist AI stack

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-AI-0001) |
| Decision | Centralize free-tier `models[]` in `src/lib/ai/providers.ts` + shared `client.ts`; replace Groq Llama Instant with gpt-oss / qwen3.6; Gemini 2.5 Flash chain; OpenRouter live `:free` IDs only |
| Rationale | Groq Llama Instant shutdown 2026-08-16; OpenRouter llama-3.2:free absent from live free list; avoid duplicated hardcoded fetch per feature file |
| Linked REQs | REQ-AI-0001 |
| Status | Implemented |

---

## DEC-0004 — REQ-0002 guardrails without feature/performance impact

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-0002) |
| Decision | Ship headers + robots + layout attr only; recommend Bot Protection Challenge + AI Bots Deny; Attack Mode OFF; skip SafeImage/ISR/middleware in this pass |
| Rationale | Protect Edge/CPU/image quota from bots without delaying humans or changing app logic |
| Linked REQs | REQ-0002 |
| Status | Code implemented; HA-0001 pending human |

---

## DEC-0005 — REQ-0003 SafeImage with deferred parent onError

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-0003) |
| Decision | Add SafeImage; adopt in UrlCard only; call parent onError only after native `<img>` fails; keep OptimizedImage for public/Cloudinary assets |
| Rationale | UrlCard previously hid the image on first Image error, which would prevent native fallback from showing |
| Linked REQs | REQ-0003 |
| Status | Implemented |

---

## DEC-0006 — REQ-0006 Sentry tunnel + env-gated PostHog

| Field | Value |
|-------|-------|
| Timestamp | 2026-08-14 |
| Agent | Agile V Build (REQ-0006 / REQ-0005) |
| Decision | `tunnelRoute: "/api/monitoring"`; low tracesSampleRate in prod; no Replay; PostHog no-op without key; Redis helpers only |
| Rationale | Bypass ad-block on Sentry ingest; avoid slowing app; Redis already existed |
| Linked REQs | REQ-0006, REQ-0005 |
| Status | Implemented — rotate exposed auth token |
