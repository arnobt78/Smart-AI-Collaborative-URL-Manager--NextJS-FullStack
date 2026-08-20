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

- [ ] **TASK-0039** production browser verification of dialogs + C6.7 one soft-nav skeleton after deploy
- [x] REQ-0036 / TASK-0041 C6.6 instant soft-nav shells (local validation pass)
- [x] REQ-0037 / TASK-0042 C6.7 SSR hydrate under loading shells (local validation pass)
- [ ] REQ-0001 leftover: human decision on `.cursorignore` secret allowlist
- [ ] GATE-0002 / `EVAL_RESULTS.md` still required for release acceptance
