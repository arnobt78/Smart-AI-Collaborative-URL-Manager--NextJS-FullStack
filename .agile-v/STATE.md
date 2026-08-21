# STATE.md

**C7.5** | 2026-08-21

## Done

- **C7.5:** api-status chrome loading shell — shared `ApiStatusChrome`; restored `loading.tsx` + SoftNavLoading chrome (not center spinner); page fills live values via RQ.
- Through C7.4 chrome-first · C7.3 shells · C7.2 prefetch · C7.1 densify · C7.0 chrome.

## Human

- HA-0001 Firewall
- TASK-0039 production verify after deploy

## Remaining (user later)

- Spacing/button polish; further lists/browse cold API slim if needed

## Current checkpoint

- **Stage:** C7.5 complete locally. GATE-0031 approved (plan implement).
- **Validation:** Jest 103/5 · lint 0 · tsc · build pass.
- **Docs:** CLAUDE · `.agile-v/*` synced.

## Next

```text
After deploy: soft-nav api-status → leave previous page instantly; chrome + pulses; auth RSC; values fill.
TASK-0039 prod verify.
```
