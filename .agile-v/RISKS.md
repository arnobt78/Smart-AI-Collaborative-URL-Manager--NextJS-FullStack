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
| RISK-0011 | Broad CSS/CTA normalization can alter compact toolbar density, obscure an icon-only action, or introduce responsive wrapping | Medium | Medium | Classify controls before edits; retain accessible names; validate target widths and keyboard operation | REQ-0010 |
| RISK-0012 | Login animation can delay interaction, induce motion discomfort, or shift the fixed viewport layout | Medium | Medium | CSS-only opacity/transform; small measured timing; `prefers-reduced-motion`; no animation-controlled auth state | REQ-0011 |
| RISK-0013 | A Smart Collections disclosure change can accidentally refetch, clear cached suggestions, or hide permission/error feedback | Medium | Medium | Presentation-only state transition; preserve existing React Query keys, enable conditions, and mutation handlers; test all states | REQ-0012 |
| RISK-0014 | Repository-wide lint remediation can change hook lifecycles or serialization behavior outside the UI scope | High | Medium | Independent final wave; replace types at boundaries; test changed paths; prohibit blanket disables | REQ-0014 |
| RISK-0015 | Fixed chrome height can clip stacked mobile footer content or alter import navigation behavior | Medium | Low | Use desktop-only fixed height with compact intrinsic growth; preserve handlers and validate targeted source plus responsive viewports | REQ-0015 |
| RISK-0016 | `npm audit` reports three high Prisma CLI transitive findings in `deepmerge-ts@7.1.5` | High | Accepted | User accepted the Prisma 6 advisory on 2026-08-18; do not force a downgrade or breaking upgrade. Reassess only with a separately approved Prisma migration. | dependency baseline |
