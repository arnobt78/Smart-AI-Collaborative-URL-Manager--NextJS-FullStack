# CHECKLIST.md — C1

## Done

- [x] `.agile-v/` exists and STATE.md is current
- [x] Requirements have stable IDs
- [x] Risks recorded
- [x] REQ-AI-0001 free-tier AI models
- [x] REQ-0002 code: security headers, vercel.json, robots.ts, layout scroll attr
- [x] REQ-0003 SafeImage on UrlCard
- [x] REQ-0005 Redis guide/helpers align
- [x] REQ-0006 Sentry tunnel + PostHog env-gated
- [x] typecheck after REQ-0002 (`tsc --noEmit` PASS)
- [x] typecheck after REQ-0003 (`tsc --noEmit` PASS)
- [x] typecheck after REQ-0005/0006 (`tsc --noEmit` PASS)

## Human actions still required

- [ ] **HA-0001** Vercel Dashboard: Bot Protection = **Challenge**; AI Bots = **Deny**; Attack Mode **OFF**
- [ ] **Rotate `SENTRY_AUTH_TOKEN`** if it was pasted into chat; set correct `SENTRY_ORG` / `SENTRY_PROJECT`
- [ ] After deploy: T+15m / T+1h Observability check (Edge Requests by Bot Name, `/_next/image`, Fluid CPU)
- [ ] Optional: add PostHog `NEXT_PUBLIC_POSTHOG_KEY` when ready
- [ ] Human answered DB host question (or deferred REQ-0007)
- [ ] Human decided `.cursorignore` secret policy

## Remaining / human

- [ ] **TASK-0039** production browser verification of dialogs + C7.0/C7.1 soft-nav + densify after deploy
- [x] **C7.0 / GATE-0026** REQ-0040 instant static chrome parity (local validation pass)
- [x] **C7.1 / GATE-0027** REQ-0041 targeted densify browse + insights (local validation pass)
- [x] **C7.2 / GATE-0028** REQ-0042 rare prefetch + Insights scan dedupe (local validation pass)
- [x] **C7.3 / GATE-0029** REQ-0043 api-docs/status soft-nav + logout (local validation pass)
- [x] **C7.4 / GATE-0030** REQ-0044 api-status chrome-first (local validation pass)
- [x] **C7.5 / GATE-0031** REQ-0045 api-status chrome loading shell (local validation pass)
- [x] REQ-0036 / TASK-0041 C6.6 instant soft-nav shells (local validation pass)
- [x] REQ-0037 / TASK-0042 C6.7 SSR hydrate under loading shells (local validation pass)
- [x] REQ-0038 / TASK-0043 C6.8 warm soft-nav + lighter Insights (local validation pass)
- [x] REQ-0039 / TASK-0044 C6.9 optimistic soft-nav no empty hole (local validation pass)
- [x] REQ-0040 / TASK-0045 C7.0 instant static chrome parity (local validation pass)
- [x] REQ-0041 / TASK-0046 C7.1 targeted densify (local validation pass)
- [x] REQ-0042 / TASK-0047 C7.2 rare prefetch + Insights trim (local validation pass)
- [x] REQ-0043 / TASK-0048 C7.3 api-docs/status soft-nav + logout (local validation pass)
- [x] REQ-0044 / TASK-0049 C7.4 api-status chrome-first (local validation pass)
- [x] REQ-0045 / TASK-0050 C7.5 api-status chrome loading shell (local validation pass)
- [ ] REQ-0001 leftover: human decision on `.cursorignore` secret allowlist
- [ ] GATE-0002 / `EVAL_RESULTS.md` still required for release acceptance
