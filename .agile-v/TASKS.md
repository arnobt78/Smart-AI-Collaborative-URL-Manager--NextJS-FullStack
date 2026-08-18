# TASKS.md — C1

## Done
AI · guardrails · SafeImage · observability · deps · SEO · Portable Auth UI · educational README/SECURITY

## Open (human)
HA-0001 Firewall · Sentry org/token

## Superseded — GATE-0010

### TASK-0010 — Spacing and button/icon consistency

1. Inventory direct and shared button controls across the approved UI surfaces; classify CTA, compact action, and icon-only controls, and record exclusions.
2. Reuse `Button` size variants and glass recipes to remove inconsistent CTA height and duplicate icons without changing handlers, routes, dialogs, or mutation logic.
3. Apply `ui-spacing` tokens to the targeted page/section/form/list roots; add a token only if the existing set cannot express the verified spacing need.
4. Add focused regression coverage where the existing Jest setup can support it; then run typecheck, lint, tests, build, and viewport/keyboard checks. Record actual results only.

**Dependencies:** Superseded by GATE-0011; existing shared UI primitives.
**Out of scope:** redesign, copy changes, new navigation, data/API/schema changes, SSR architecture work, and the deferred items already listed for C1.

## Completed — GATE-0011

### TASK-0011 — Shared control audit and contract (Wave 1) — DONE

1. Inventory input, select, search, labeled button, filter, tab, and import/export trigger geometry; classify icon-only controls separately.
2. Establish one reusable 48px control contract in shared UI primitives/styles and migrate only the approved UI surfaces.
3. Preserve each component's current event handlers, menu ownership, and responsive wrapping.

### TASK-0012 — Auth form composition and safe stagger (Wave 2) — DONE

1. Recompose the right Auth panel into header and field/action rows using shared styles.
2. Add a CSS/browser-platform reveal sequence with a reduced-motion final-state path and no interaction gate.
3. Verify guest dropdown, labels, keyboard focus, submit error, timeout, and 320px/768px/1440px behavior.

### TASK-0013 — Smart Collections disclosure (Wave 2) — DONE

1. Replace the close control with an accessible View Suggestions/View Less disclosure.
2. Rename collection creation to a meaningful label and use `ListPlus` consistently.
3. Test collapsed, loading, empty, populated, permission-denied, create-success, and create-failure states without changing query behavior.

### TASK-0014 — URL toolbar and add-form refinement (Wave 3) — DONE

1. Normalize tabs, filters, import/export triggers, and home CTAs against the shared control contract and icon gap.
2. Replace Add URL's icon with `WandSparkles`; make its expanded form responsive and add a non-mutating cancel action.
3. Test add success, add failure, cancel, archived state, viewer permissions, and warm-cache navigation.

### TASK-0015 — Lint remediation (Wave 4, independent) — DONE

1. Fix the current warnings by category with boundary types and behaviorally correct hook dependencies.
2. Add/adjust targeted tests for changed behavior; do not suppress rules globally.
3. Run lint, typecheck, Jest, and production build and record real outcomes.

**Dependencies:** GATE-0011 approval. Wave 1 is a prerequisite for Waves 2–4; Waves 2 and 3 can proceed independently after Wave 1. TASK-0015 must not be mixed into UI behavior commits.

### TASK-0016 — Responsive chrome centering — DONE

1. Consolidate Navbar's browser coordination shape into the existing global declaration without changing navigation behavior.
2. Apply one responsive 56px row contract to Navbar and Footer; allow the compact footer to grow below `sm`.
3. Remove dead commented Footer code and validate static, type, test, and production-build behavior.

**Dependencies:** GATE-0012 approved; no data/API/cache or authorization changes.

### TASK-0017 — Guest-account menu stacking fix — DONE

1. Raise the open Auth dropdown parent above transformed reveal-row siblings.
2. Replace the translucent menu surface with an opaque accessible panel and preserve menu handlers.
3. Validate lint, typecheck, Jest, and production build.

### TASK-0018 — Compact controls and Home reveal — DONE

1. Route every shared Button size and glass recipe through the `h-10 min-h-10` control token; remove Home CTA overrides.
2. Add one CSS/IntersectionObserver motion primitive with reduced-motion fallback and use it for marketing hierarchy.
3. Validate controls, routes, motion safety, lint, typecheck, Jest, and build.

## Deferred
RSC shells · densify/Zod/SHA/Next16
