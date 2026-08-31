# AGENTS.md

This repository supports multiple AI coding agents.

Examples:

- Claude Code
- Cursor
- Codex
- Gemini
- OpenAI Agents
- future AI tools

All agents should follow the same workflow.

---

# Source of Truth

Actual source code is always the source of truth.

Documentation must match code.

When documentation conflicts with code:

verify first

then update documentation.

---

# Workflow

Read first:

AGILE_V_PROTOCOL.md

Then:

CLAUDE.md

Then:

.agile-v/STATE.md

Resume from the latest checkpoint.

---

# Before Coding

Always:

- inspect architecture
- inspect affected files
- inspect related requirements
- identify dependencies
- identify risks
- produce implementation plan

Wait for approval.

---

# During Coding

Implement only approved scope.

Prefer:

- reusable components
- reusable hooks
- reusable libraries
- reusable utilities
- reusable types

Avoid:

- duplicate logic
- duplicate API calls
- duplicate state
- duplicate schemas

---

# Rendering

Prefer SSR.

Keep layouts server-rendered.

Only interactive parts should be client components.

Avoid unnecessary loading pages.

Preserve layout stability.

---

# CRUD

Every successful mutation must:

- persist data
- invalidate affected caches
- update optimistic state
- synchronize UI

Avoid stale data after:

- navigation
- back button
- refresh
- detail pages

---

# Documentation

Update only affected files.

Examples:

.agile-v/STATE.md

REQUIREMENTS.md

DECISION_LOG.md

VALIDATION_SUMMARY.md

TASKS.md

Do not rewrite unrelated documentation.

---

# Validation

Run relevant validation.

Never claim success without verification.

Record results.

---

# End of Session

Update:

STATE.md

Write:

- completed work
- remaining work
- blockers
- next exact task

Future agents should resume without reading chat history.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

