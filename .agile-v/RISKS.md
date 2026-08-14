# RISKS.md — Cycle C1

| ID | Risk | Severity | Likelihood | Mitigation | Linked |
|----|------|----------|------------|------------|--------|
| RISK-0001 | `.cursorignore` allowlists `.env` / `.env.local` into AI indexing; secrets may leak into agent context | High | Medium | Stop allowlisting; use `.env.example` only; never paste secrets | REQ-0001 |
| RISK-0002 | Missing bot/crawl/header guardrails can burn Vercel free-tier CPU/transfer/image quota (documented incident pattern in `docs/VERCEL_PRODUCTION_GUARDRAILS.md`) | High | Medium–High (public demo) | Implement REQ-0002 + human dashboard Bot Protection | REQ-0002 |
| RISK-0003 | README / `next-auth` dependency imply NextAuth; actual auth is custom sessions → onboarding & security confusion | Medium | High | REQ-0004 | REQ-0004 |
| RISK-0004 | Remote `next/image` in `UrlCard` can fail hard when Vercel image optimization quota/errors occur | Medium | Medium | REQ-0003 SafeImage | REQ-0003 |
| RISK-0005 | Adding Sentry/PostHog without gating can leak PII or break builds when keys missing | Medium | Medium | Env-gated init; Gate 1 opt-in only | REQ-0006 |
| RISK-0006 | `List.urls` JSON blob may limit queryability/scale vs relational URLs | Medium | Low (current size) | Monitor; normalize only with explicit future REQ | baseline |
| RISK-0007 | `eslint.ignoreDuringBuilds: true` hides lint failures in CI/build | Medium | High (already set) | Re-enable after lint debt triage (future REQ) | — |
| RISK-0008 | Dual Jest + Vitest configs cause false confidence / wrong runner | Low | Medium | REQ-0008 | REQ-0008 |
| RISK-0009 | Integration guide Redis env names differ from code → copy-paste misconfig | Medium | Medium | REQ-0005 | REQ-0005 |
| RISK-0010 | `UserDataPrefetcher` disabled for duplicate API calls — possible cold-nav latency | Low | Known | Investigate only if product priority | — |
