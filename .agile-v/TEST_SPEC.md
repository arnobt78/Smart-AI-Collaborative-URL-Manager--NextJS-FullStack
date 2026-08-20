# TEST_SPEC.md — C2 homepage hero polish

Overview: REQ-0010 through REQ-0014. Tests are derived from approved requirements and must be run independently of implementation rationale.

| TC-ID | REQ-ID | Description | Expected | Type |
|-------|--------|-------------|----------|------|
| TC-0010 | REQ-0010 | Render shared input, select, and button controls | Comparable labeled controls use the shared 48px contract and preserve focus styles | unit |
| TC-0011 | REQ-0010 | Render home CTAs | Exact icon and label combinations are present with accessible links | unit |
| TC-0012 | REQ-0011 | Render auth with reduced motion | Form fields are immediately interactive and visible without animation delay | unit |
| TC-0013 | REQ-0012 | Toggle Smart Collections disclosure | `aria-expanded` and suggestion content change without extra duplicate fetch or data mutation | integration |
| TC-0014 | REQ-0013 | Expand and cancel Add URL | Form is responsive, cancel clears transient state, and no URL mutation is sent | integration |
| TC-0015 | REQ-0013 | Submit Add URL success and failure | Existing optimistic/invalidation behavior remains; failure retains inputs and shows error | integration |
| TC-0016 | REQ-0014 | Run static quality commands | Lint has zero warnings/errors; typecheck, relevant Jest tests, and build pass | system |
| TC-0017 | REQ-0015 | Inspect header/footer at 320px, 768px, and 1440px | Desktop chrome is 56px centered; mobile content grows without clipping or overlap | manual responsive |
| TC-0018 | REQ-0015 | Run static quality commands | Lint, typecheck, Jest, and build preserve layout component contracts | system |
| TC-0019 | REQ-0016 | Open guest-account menu over later Auth rows | Accounts remain visible and clickable; trigger exposes expanded state and menu relationship | manual integration |
| TC-0020 | REQ-0017 | Render shared controls and Home CTAs | Labeled controls retain `h-10 min-h-10`; CTA destinations/icons remain correct | unit/manual |
| TC-0021 | REQ-0017 | Enter/leave marketing sections | Ordered transform/opacity reveal and parallax work; reduced-motion renders stable content | manual integration |
| TC-0026 [C2] | REQ-0024 | Render authenticated homepage hero | Logo, title, two descriptions, and CTA row use `auth-reveal-delay-0` through `auth-reveal-delay-4`; View My Lists remains an internal link | unit |
| TC-0027 [C2] | REQ-0024 | Inspect homepage at 320px, 768px, and 1440px with normal and reduced motion | No clipping, overlap, layout shift, or interaction delay; lower sections retain viewport scroll reveal | manual responsive |
| TC-0038 [C6.4] | REQ-0032 | Click hydrated Home Create List | Control is a button with no Lists href; local dialog opens without writing `?dialog=` | unit |
| TC-0039 [C6.4] | REQ-0032 | Production Home Create List | Dialog opens without an RSC Lists payload; idle close/Escape/back remain immediate | manual production |
| TC-0040 [C6.5] | REQ-0033 | Open/close list create and detail edit | Hydrated transitions keep the same href; deep-link query still initializes; popstate closes | unit |
| TC-0041 [C6.5] | REQ-0034 | Hydrated Create List button | Shared launcher has no implicit `/lists?dialog=create` href | unit |
| TC-0042 [C6.5] | REQ-0035 | Pending mutating overlays | Add-URL and shared Dialog/AlertDialog block close while pending | unit |
| TC-0043 [C6.6] | REQ-0036 | Route skeleton presets | Lists/Browse/Insights/detail shells expose header + local slot copy | unit |
| TC-0044 [C6.6] | REQ-0036 | Production soft-nav | My Lists / Public URL / Analytics / list detail paint destination shell immediately | manual production |
| TC-0045 [C6.7] | REQ-0037 | Cold soft-nav Network | One skeleton; no bootstrap `/api/lists` (etc.) immediately after hydrated RSC | manual production |
| TC-0046 [C6.8] | REQ-0038 | Warm soft-nav | Revisit Lists/Browse/Insights with warm RQ shows no RoutePageSkeleton | manual production |
| TC-0047 [C6.8] | REQ-0038 | Soft-nav cache unit | Warm predicates and consume-once flag | unit |
| TC-0048 [C6.9] | REQ-0039 | Optimistic soft-nav | Warm revisit paints destination UI from RQ; never empty hole; cold one skeleton | manual production |
| TC-0049 [C6.9] | REQ-0039 | SoftNavLoading unit | Warm paints optimistic lists; cold/missing → skeleton | unit |
