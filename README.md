# Smart AI Collaborative URL Bookmark Manager - Next.js, TypeScript, PostgreSQL, Prisma, TanStack Query, Upstash, QStash, Cloudinary, AI Features, SSE Full-Stack Project

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://www.prisma.io/)
[![React Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154)](https://tanstack.com/query)
[![launch with diploi badge](https://diploi.com/launch.svg)](https://diploi.com/launch/arnobt78/Daily-URL-Bookmark-Notes-Dairy--NextJS-FullStack)

A production-ready, full-stack URL bookmarking and sharing platform (**The Daily Urlist**, package `urlist` v0.2.1). Built with **Next.js 16 App Router**, **React 19**, **TypeScript**, **Prisma**, and **PostgreSQL**. Features AI-powered enhancements, real-time collaboration, vector search, Redis caching, portable auth UI (Robohash avatars + profile menu), and intelligent URL organization.

- **Live Demo:** [https://daily-urlist.vercel.app/](https://daily-urlist.vercel.app/)
- **Security:** Private reports → [SECURITY.md](./SECURITY.md) · [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)
- **Author:** [Arnob Mahmud](https://www.arnobmahmud.com) · [GitHub @arnobt78](https://github.com/arnobt78) · [LinkedIn @arnob-mahmud-05839655](https://www.linkedin.com/in/arnob-mahmud-05839655/)

![Screenshot 2025-12-05 at 13 25 33](https://github.com/user-attachments/assets/7369ad36-5a47-4e30-97ed-f6fab885515f)
![Screenshot 2025-12-05 at 13 25 56](https://github.com/user-attachments/assets/7d041189-6bab-41df-9cbb-25c3d16d8c67)
![Screenshot 2025-12-05 at 13 30 16](https://github.com/user-attachments/assets/706ddbb4-3db8-4539-853d-2f2f14d08880)
![Screenshot 2025-12-05 at 13 34 13](https://github.com/user-attachments/assets/efd8b411-1101-439b-87b2-c4c0470ce3b0)
![Screenshot 2025-12-05 at 13 37 33](https://github.com/user-attachments/assets/eeab7fab-f0f5-4e1e-909f-66f4336ef7c6)
![Screenshot 2025-12-05 at 13 37 57](https://github.com/user-attachments/assets/4de03b81-0a5f-4b69-85c4-04abb6ee954a)
![Screenshot 2025-12-05 at 13 38 31](https://github.com/user-attachments/assets/cfe75594-5d32-4cdd-b373-d1f59df4caa4)
![Screenshot 2025-12-05 at 13 38 44](https://github.com/user-attachments/assets/6ed2a934-3282-4f3d-aba7-667f73ce4e77)
![Screenshot 2025-12-05 at 13 39 02](https://github.com/user-attachments/assets/5d040034-ccc3-4c35-8472-7de6dd29900c)
![Screenshot 2025-12-05 at 13 39 17](https://github.com/user-attachments/assets/a4f27ec3-c645-49b5-b4c2-2eb61732d05e)
![Screenshot 2025-12-05 at 13 39 40](https://github.com/user-attachments/assets/e9e43a9f-8387-40c7-855a-6d52e1ca1fae)

## Table of Contents

- [Overview](#overview)
- [Who This README Is For](#who-this-readme-is-for)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Keywords Glossary](#keywords-glossary)
- [Project Structure](#project-structure)
- [How the App Works](#how-the-app-works)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Pages and Routes](#pages-and-routes)
- [API Endpoints](#api-endpoints)
- [Authentication and Auth UI](#authentication-and-auth-ui)
- [Data Model](#data-model)
- [Frontend Components and Reuse](#frontend-components-and-reuse)
- [Hooks, Cache, and Invalidation](#hooks-cache-and-invalidation)
- [Backend Libraries](#backend-libraries)
- [AI, Redis, Vector, and Jobs](#ai-redis-vector-and-jobs)
- [Code Snippets for Learners](#code-snippets-for-learners)
- [Testing, Lint, and Build](#testing-lint-and-build)
- [Deploying](#deploying)
- [Learning Path](#learning-path)
- [Related Docs](#related-docs)
- [Conclusion](#conclusion)
- [License](#license)

---

## Overview

**The Daily Urlist** is a modern bookmark platform: users create **lists**, add **URLs** with rich metadata, collaborate with roles, use **AI** (enhance / collections / smart search), and get **live updates** over SSE when collaborators change a list.

| Layer                               | Role                                         |
| ----------------------------------- | -------------------------------------------- |
| **Next.js App Router**              | Pages + API Route Handlers                   |
| **Prisma + PostgreSQL**             | Users, sessions, lists, comments, activities |
| **TanStack React Query**            | Client cache with long `staleTime`           |
| **Upstash Redis / Vector / QStash** | Optional cache, semantic search, jobs        |
| **Multi-provider AI**               | Gemini → Groq → OpenRouter → Hugging Face    |
| **Cloudinary**                      | Optional image hosting                       |
| **Sentry / PostHog**                | Optional errors & analytics (env-gated)      |
| **Portable Auth UI**                | Guest Select + Robohash + ProfileDropdown    |

---

## Who This README Is For

- Beginners learning Next.js full-stack (App Router, Route Handlers, Prisma)
- Intermediate developers studying React Query cache + mutation invalidation
- Anyone forking a SaaS-style bookmark / collab product

You do **not** need every third-party key to learn the codebase. See [Environment Variables](#environment-variables).

---

## Features

### Core URL and list management

- Create / edit / delete lists and URL items
- Metadata fetch (title, description, image, favicon)
- Drag-and-drop reorder (`@dnd-kit`)
- Favorites, pins, reminders, archive / restore
- Public vs private lists + shareable `slug`
- Bulk import (Chrome / Pocket / Pinboard) and export (JSON / CSV / Markdown)

### AI-powered tools (optional keys)

- URL enhancement (`/api/ai/enhance-url`)
- Smart collections and duplicate hints
- Semantic / smart search (vector + LLM when configured)

### Collaboration and realtime

- Collaborator emails + roles (owner / editor / viewer)
- Comments on URL items
- Activity feed
- Server-Sent Events (SSE) for live list sync

### Auth UI (portable guide)

- Guest / demo credential **Select** with Robohash avatar + name + email
- Navbar **ProfileDropdown**: name/email → API Documentation → API Status → Logout
- `urlist:wasAuthed` localStorage hint to avoid Login flash on refresh
- See [docs/PORTABLE_AUTH_UI_GUIDE.md](./docs/PORTABLE_AUTH_UI_GUIDE.md)

### Insights and ops

- Business insights charts (Recharts)
- In-app API docs and status pages
- QStash jobs: metadata refresh, URL health, session cleanup

### UX and resilience

- `SafeImage` fallback for broken remote previews
- React Query invalidation after mutations
- Security headers + `robots.ts` + `sitemap.ts` + Sentry tunnel `/api/monitoring`

---

## Technology Stack

### Runtime and UI

| Tech                   | Version (approx.) | Why                                |
| ---------------------- | ----------------- | ---------------------------------- |
| **Next.js**            | 16.3.x            | App Router, SSR shells, API routes, `proxy.ts` |
| **React**              | 19.2              | UI + client islands                |
| **TypeScript**         | 5.9.x             | Typed app and API                  |
| **Tailwind CSS**       | 3.4               | Utility styling                    |
| **TanStack Query**     | 5.x               | Server-state cache                 |
| **NanoStores**         | 1.x               | Lightweight list state             |
| **@dnd-kit**           | 6.x / 10.x        | Drag-and-drop                      |
| **Recharts**           | 3.x               | Insights charts                    |
| **Lucide / Heroicons** | —                 | Icons                              |

### Data and infra

| Tech                    | Role                              |
| ----------------------- | --------------------------------- |
| **PostgreSQL**          | Primary database                  |
| **Prisma 6.19**         | ORM + migrations                  |
| **bcryptjs**            | Password hashing                  |
| **Upstash Redis**       | Cache + realtime helpers          |
| **Upstash Vector**      | Embeddings / semantic search      |
| **QStash**              | Scheduled HTTP jobs               |
| **Cloudinary**          | Media                             |
| **Nodemailer / Resend** | Email                             |
| **Cheerio**             | HTML parsing                      |
| **Sentry**              | Errors (tunnel `/api/monitoring`) |
| **PostHog**             | Analytics (no-op without key)     |
| **Jest**                | Tests                             |

> Auth is **custom cookie sessions** in `src/lib/auth.ts` — **not** NextAuth.

---

## Keywords Glossary

| Keyword                  | Meaning here                                            |
| ------------------------ | ------------------------------------------------------- |
| **App Router**           | Next.js `src/app` file-based routing                    |
| **Route Handler**        | `route.ts` under `src/app/api`                          |
| **SSR-first**            | Layouts start on server; interactivity is client        |
| **Client island**        | `"use client"` for hooks / DnD / forms                  |
| **React Query Infinity** | Very long `staleTime` so cached list data feels instant |
| **Invalidation**         | Mark queries stale after mutation so UI refetches       |
| **SSE**                  | Server pushes events over a long-lived HTTP stream      |
| **JSON URLs column**     | `List.urls` stores URL objects as JSON                  |
| **Slug**                 | Public path, e.g. `/list/my-travel-links`               |
| **Env-gated**            | Feature idle until env vars exist                       |
| **Robohash**             | Deterministic avatar from email (`robohash.org`)        |
| **ProfileDropdown**      | Sticky-safe custom menu (no body scroll-lock)           |
| **Model chain**          | AI tries providers/models in order on failure           |

---

## Project Structure

```text
daily-urlist/
├── src/
│   ├── app/                 # App Router pages + api/** + layout SEO
│   ├── components/
│   │   ├── pages/           # Large page clients
│   │   ├── lists/, urls/, ui/, layout/
│   │   ├── Auth.tsx         # Sign-in / sign-up + guest Select
│   │   └── layout/ProfileDropdown.tsx
│   ├── constants/auth.ts    # TEST_ACCOUNTS, UTILITY_NAVIGATION_ITEMS
│   ├── hooks/               # useSession, useListQueries, SSE, …
│   ├── lib/                 # auth, prisma, redis, ai, robohash, …
│   ├── stores/              # NanoStores (current list, drag cache)
│   └── utils/               # queryInvalidation, urlMetadata, …
├── prisma/                  # schema + migrations
├── docs/                    # Guides (auth UI, AI, Sentry, SafeImage, …)
├── .agile-v/                # Agent cycle memory
├── .env.example             # Safe placeholders
├── SECURITY.md              # Private vulnerability reporting
└── package.json
```

**Teaching tip:** `src/app/**/page.tsx` files are often thin; heavy UI lives in `src/components/pages/*`.

---

## How the App Works

```text
Browser (React Query + NanoStores + ProfileDropdown)
    │  fetch / mutate
    ▼
Next.js Route Handlers (src/app/api/**)
    │  getCurrentUser() cookie session
    ▼
Prisma → PostgreSQL
    │
    ├─ optional Redis cache
    ├─ optional Vector index
    ├─ optional AI providers
    └─ optional QStash → /api/jobs/*

Collaborators ←── SSE /api/realtime/list/[listId]/events
```

1. Sign up / in → httpOnly `session_token` cookie + `urlist:wasAuthed` hint for Navbar.
2. List CRUD writes Postgres (`List.urls` JSON).
3. Client mutations call APIs, then invalidate React Query keys.
4. Missing Redis/AI/QStash keys → those paths no-op or degrade gracefully.

---

## Getting Started

### Prerequisites

- **Node.js** **24.x** (`.nvmrc` / `engines`; Vercel target)
- **npm**
- A **PostgreSQL** database

### 1. Clone and install

```bash
git clone https://github.com/arnobt78/Daily-URL-Bookmark-Notes-Dairy--NextJS-FullStack.git
cd Daily-URL-Bookmark-Notes-Dairy--NextJS-FullStack
npm install
```

### 2. Environment file

```bash
cp .env.example .env.local
```

Fill at least the **minimum** variables below. You do **not** need every key for core CRUD.

### 3. Database

```bash
npx prisma migrate dev
# optional:
npm run db:seed
```

### 4. Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Quality checks

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

---

## Environment Variables

Template: **[`.env.example`](./.env.example)**.  
Secrets only in **`.env.local`** (gitignored) or Vercel.

### Do we need a `.env` to run?

| Answer          | Detail                                                                              |
| --------------- | ----------------------------------------------------------------------------------- |
| **Minimum yes** | Postgres URLs + base URL for a working app                                          |
| **Optional**    | Redis, Vector, QStash, Cloudinary, AI, email, Sentry, PostHog — leave blank to skip |

### Minimum (core app)

| Variable               | Purpose                   | How to get it                                         |
| ---------------------- | ------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL` | Absolute app URL          | Local: `http://localhost:3000`                        |
| `DATABASE_URL`         | Prisma pooled URL         | Postgres host (often port `6543` + `?pgbouncer=true`) |
| `DIRECT_URL`           | Direct URL for migrations | Usually port `5432`                                   |

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
```

### Optional — Email

| Variable         | How to get it                    |
| ---------------- | -------------------------------- |
| `SMTP_*`         | Provider SMTP settings           |
| `RESEND_API_KEY` | [resend.com](https://resend.com) |

### Optional — Upstash

| Variable                            | How to get it                                                 |
| ----------------------------------- | ------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL` / `TOKEN`  | [console.upstash.com](https://console.upstash.com) Redis REST |
| `UPSTASH_VECTOR_REST_URL` / `TOKEN` | Upstash Vector                                                |
| `QSTASH_TOKEN`                      | Upstash QStash                                                |

### Optional — Cloudinary

`CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` — [cloudinary.com](https://cloudinary.com)

### Optional — AI

| Variable                         | Provider         |
| -------------------------------- | ---------------- |
| `GOOGLE_GEMINI_API_KEY`          | Google AI Studio |
| `GROQ_LLAMA_API_KEY`             | Groq             |
| `OPENROUTER_API_KEY`             | OpenRouter       |
| `HUGGING_FACE_INFERENCE_API_KEY` | Hugging Face     |

Without these, AI routes skip/fail; list/URL CRUD still works.

### Optional — Observability

| Variable                                              | Purpose          |
| ----------------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`               | Errors           |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Source maps / CI |
| `NEXT_PUBLIC_POSTHOG_KEY` / `HOST`                    | Analytics        |

Sentry browser traffic can use same-origin tunnel **`/api/monitoring`**. PostHog is a **no-op** until the key is set.

### Legacy names

`NEXTAUTH_*` may appear in older notes — this app does **not** use NextAuth. Prefer `src/lib/auth.ts` cookies.

---

## Pages and Routes

| Route                          | Purpose                  |
| ------------------------------ | ------------------------ |
| `/`                            | Home / auth entry        |
| `/lists`                       | Your lists               |
| `/new`                         | Create list              |
| `/browse`                      | Public lists             |
| `/list/[slug]`                 | View list                |
| `/list/[slug]/edit`            | Edit list                |
| `/business-insights`           | Analytics                |
| `/api-docs`                    | In-app API documentation |
| `/api-status`                  | Integration status       |
| `/about`, `/privacy`, `/terms` | Info                     |

Authenticated Navbar: Public URL · Analytics · My Lists · **ProfileDropdown** (API Docs / API Status / Logout).

---

## API Endpoints

Under `src/app/api/**`. Auth sets cookies; most list routes need a session.

### Auth

| Method | Path                |
| ------ | ------------------- |
| POST   | `/api/auth/signup`  |
| POST   | `/api/auth/signin`  |
| POST   | `/api/auth/signout` |
| GET    | `/api/auth/session` |

### Lists and URLs

| Method                | Path                                 |
| --------------------- | ------------------------------------ |
| GET/POST              | `/api/lists`                         |
| GET/PATCH/DELETE      | `/api/lists/[id]`                    |
| GET                   | `/api/lists/public`                  |
| GET/POST/PATCH/DELETE | `/api/lists/[id]/urls`               |
| PATCH                 | `/api/lists/[id]/reorder`            |
| POST                  | `/api/lists/[id]/archive-url`        |
| POST                  | `/api/lists/[id]/bulk-import`        |
| GET/POST              | `/api/lists/[id]/collaborators`      |
| GET/POST/DELETE       | `/api/lists/[id]/comments`           |
| GET                   | `/api/realtime/list/[listId]/events` |

### AI, search, jobs, insights

Examples: `POST /api/ai/enhance-url`, `POST /api/search/smart`, `/api/metadata`, `/api/jobs/*`, `/api/business-insights/*`.

**Learner tip:** Open any `route.ts`, find `getCurrentUser()`, then follow the Prisma call.

---

## Authentication and Auth UI

```text
signUp / signIn → bcrypt → Prisma Session → Cookie session_token
Navbar useSession → ProfileDropdown (Robohash avatar)
Guest Select → TEST_ACCOUNTS fill email/password
```

| File                                        | Role                                                          |
| ------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/auth.ts`                           | Hash, session create/read, sign in/out                        |
| `src/constants/auth.ts`                     | `TEST_ACCOUNTS`, `UTILITY_NAVIGATION_ITEMS`, `WAS_AUTHED_KEY` |
| `src/lib/robohash.ts`                       | `robohashUrl`, `displayNameFromEmail`                         |
| `src/components/ui/UserAvatar.tsx`          | Image → Robohash → initials                                   |
| `src/components/Auth.tsx`                   | Sign-in form + guest Select                                   |
| `src/components/layout/ProfileDropdown.tsx` | Profile menu                                                  |

Demo Select accounts are for **local / staging** only — do not ship weak shared passwords in production.

---

## Data Model

- **User** — email + hashed password
- **Session** — token, expiry, last activity
- **List** — title, slug, `isPublic`, `urls` (JSON), `archivedUrls`, collaborators / roles
- **Comment** — `listId` + `urlId`
- **Activity** — audit trail

URL objects live inside `List.urls` (no separate `Url` table). Display name in UI = email local-part (no `name`/`image` columns).

---

## Frontend Components and Reuse

### UI primitives (`src/components/ui/`)

| Component                               | Use when                      |
| --------------------------------------- | ----------------------------- |
| `Button`, `Input`, `Textarea`, `Select` | Forms                         |
| `Card`, `Badge`, `Tabs`, `Switch`       | Layout                        |
| `Toast` / `Toaster`                     | Feedback                      |
| `SafeImage`                             | Remote URLs that may 404      |
| `OptimizedImage`                        | Trusted / Cloudinary assets   |
| `UserAvatar`                            | Profile / demo Select avatars |

### Domain

| Path                            | Role              |
| ------------------------------- | ----------------- |
| `lists/UrlList.tsx`             | Sortable URL list |
| `lists/UrlCard.tsx`             | Single URL card   |
| `lists/UrlBulkImportExport.tsx` | Import / export   |
| `collaboration/Comments.tsx`    | Comments          |
| `pages/*Page.tsx`               | Full screens      |

**Reuse `UserAvatar` in another app:**

```tsx
import { UserAvatar } from "@/components/ui/UserAvatar";

<UserAvatar seed={user.email} size={40} />;
```

Copy `robohash.ts` + `UserAvatar.tsx`; allow `robohash.org` in image config if using `next/image`.

---

## Hooks, Cache, and Invalidation

| Hook / util            | Responsibility                                          |
| ---------------------- | ------------------------------------------------------- |
| `useSession`           | Cached session (`staleTime: Infinity` until invalidate) |
| `useListQueries`       | List / URL mutations and unified fetch                  |
| `useRealtimeList`      | SSE subscription                                        |
| `queryInvalidation.ts` | After CRUD: invalidate list, URLs, metadata, browse     |

```ts
import { invalidateUrlQueries } from "@/utils/queryInvalidation";

await invalidateUrlQueries(queryClient, listId);
```

Logout clears React Query cache + `urlist:wasAuthed` then hard-redirects home.

---

## Backend Libraries

| Module          | Path                                   |
| --------------- | -------------------------------------- |
| Prisma          | `src/lib/prisma.ts`                    |
| Redis           | `src/lib/redis.ts`                     |
| AI              | `src/lib/ai/*`                         |
| Vector          | `src/lib/vector.ts`                    |
| Import / export | `src/lib/import`, `src/lib/export`     |
| Email           | `src/lib/email`                        |
| Permissions     | `src/lib/collaboration/permissions.ts` |
| Jobs            | `src/lib/jobs`                         |

---

## AI, Redis, Vector, and Jobs

1. **AI** — `providers.ts` `models[]` chains; `client.ts` walks them on rate limits.
2. **Redis** — speeds metadata/list payloads when Upstash REST is set.
3. **Vector** — smarter search when vector env is set.
4. **QStash** — calls `/api/jobs/*` on a schedule.

Deep dives: `docs/LLM_MODEL_SELECTION.md`, `docs/Redis_Sentry_PostHog_INTEGRATION_GUIDE.md`.

---

## Code Snippets for Learners

### Page → client page

```tsx
import ListsPageClient from "@/components/pages/ListsPage";

export default function ListsPage() {
  return <ListsPageClient />;
}
```

### Robohash helper

```ts
export function robohashUrl(emailOrSeed: string, size = 80): string {
  const seed = encodeURIComponent(emailOrSeed.trim().toLowerCase());
  const px = Math.max(40, Math.min(size, 256));
  return `https://robohash.org/${seed}?set=set1&size=${px}x${px}`;
}
```

### Tailwind `cn`

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Testing, Lint, and Build

```bash
npm run lint
npm run lint:fix
npm test
npx tsc --noEmit
npm run build
npm audit
```

---

## Deploying

Typical target: **Vercel**.

1. Import the GitHub repo.
2. Set env vars from `.env.example`.
3. Point `DATABASE_URL` / `DIRECT_URL` at production Postgres.
4. Optional: Sentry + Firewall bot settings.
5. Deploy — `postinstall` runs `prisma generate`.

Also: `docs/VERCEL_PRODUCTION_GUARDRAILS.md`, `vercel.json`.

---

## Learning Path

1. Run with **minimum env** → guest Select → sign in → create a list → add a URL.
2. Read `src/lib/auth.ts` + one lists route.
3. Open ProfileDropdown / UserAvatar / Robohash helpers.
4. Trace a mutation in `useListQueries` → API → `queryInvalidation`.
5. Add Redis or one AI key and watch optional features light up.
6. Read SSE (`useRealtimeList` + realtime route).

---

## Related Docs

| Doc                                                                                                | Topic                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [SECURITY.md](./SECURITY.md)                                                                       | Private vulnerability reports                |
| [docs/PORTABLE_AUTH_UI_GUIDE.md](./docs/PORTABLE_AUTH_UI_GUIDE.md)                                 | Auth UI contracts (Select + ProfileDropdown) |
| [docs/PROJECT_WALKTHROUGH.md](./docs/PROJECT_WALKTHROUGH.md)                                       | Compact map                                  |
| [docs/LLM_MODEL_SELECTION.md](./docs/LLM_MODEL_SELECTION.md)                                       | AI model chains                              |
| [docs/SAFE_IMAGE_REUSABLE_COMPONENT.md](./docs/SAFE_IMAGE_REUSABLE_COMPONENT.md)                   | SafeImage                                    |
| [docs/Redis_Sentry_PostHog_INTEGRATION_GUIDE.md](./docs/Redis_Sentry_PostHog_INTEGRATION_GUIDE.md) | Observability + Redis                        |
| [docs/VERCEL_PRODUCTION_GUARDRAILS.md](./docs/VERCEL_PRODUCTION_GUARDRAILS.md)                     | Production hardening                         |
| [CLAUDE.md](./CLAUDE.md) / [AGENTS.md](./AGENTS.md)                                                | AI agent entrypoints                         |

---

## Conclusion

This repository is a **complete teaching example** of a Next.js full-stack product: cookie auth with portable Robohash UI, JSON-embedded list items, React Query cache discipline, optional Redis/AI/Vector/QStash, and collaboration over SSE.

Fork it, strip features you do not need, or lift modules (`UserAvatar`, `SafeImage`, `auth.ts`, `queryInvalidation`, AI client) into your own apps.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to use, modify, and distribute the code as per the terms of the license.

---

## Happy Coding! 🎉

This is an **open-source project** - feel free to use, enhance, and extend this project further!

If you have any questions or want to share your work, reach out via GitHub or my portfolio at [https://www.arnobmahmud.com](https://www.arnobmahmud.com).

**Security issues:** please report privately per [SECURITY.md](./SECURITY.md) ([contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)).
