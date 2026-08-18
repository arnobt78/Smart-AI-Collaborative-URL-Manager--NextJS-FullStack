# TEST_SPEC.md — C1 UI remediation

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
