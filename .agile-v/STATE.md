# STATE.md

**REQ-AI-0001 free-tier LLM refresh** | 2026-09-02

## Reconciled (repo = docs)

- **Git:** commit landing with this `/commit-ready` (LLM model chain refresh).
- **Prior on main:** `b0ca7a9` C7.17 list-detail polish.
- **This change (REQ-AI-0001 / DEC-AI-0002):** Groq `qwen/qwen3.8-27b`; Gemini drop `2.0-flash`, add `3.5-flash`/`3.5-flash-lite`; OpenRouter gpt-oss `:free` first + gemma/nemotron/north/glm + `openrouter/free`; HF `Qwen/Qwen3-8B`; `client.ts` 404/410 retriable; `docs/LLM_MODEL_SELECTION.md` verified 2026-09-02.
- **Stack:** Next 16.3.3 · React 19.2.8 · Node 24.x · Prisma 6.19.3.

## Human

- HA-0001 Firewall
- TASK-0039 production verify (C7.17 smoke still open after prior commit)
- Further UrlCard action bugs deferred (user will list later)

## Backlog (unchanged)

- SC → `ListDetailSectionHeader` migration (optional)
- SC soft-nav skeleton when `urls < 2`
- Skeleton vs live spacing parity
- Toast unit tests; viewer jobs-menu UI gate
- Optional `(auth)` route-group; lists/browse cold API slim; status API speed OOS; full metadata/AI rewrite OOS; Prisma 7/8 OOS
- New providers (Cerebras/NIM/etc.) stay doc-only until new env keys / REQ

## Current checkpoint

- **Stage:** REQ-AI-0001 refresh — committed via `/commit-ready`.
- **Cycle:** C7
- **Status:** Verified (PASS).
- **Validation:** tsc · lint · Jest · build (see VALIDATION_SUMMARY).
- **Trace:** REQ-AI-0001, DEC-AI-0002.

## Next

```text
1. Push when user requests.
2. TASK-0039 production smoke (C7.17) still open.
3. User supplies next polish/fix list → plan → implement.
```
