# Smart AI Collaborative URL Bookmark Manager - Next.js, TypeScript, PostgreSQL, Prisma, TanStack Query, Upstash, QStash, Cloudinary, AI Features, SSE Full-Stack Project

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://www.prisma.io/)
[![React Query](https://img.shields.io/badge/TanStack%20Query-5-FF4154)](https://tanstack.com/query)
[![launch with diploi badge](https://diploi.com/launch.svg)](https://diploi.com/launch/arnobt78/Daily-URL-Bookmark-Notes-Dairy--NextJS-FullStack)

A production-ready, full-stack URL bookmarking and sharing platform (**The Daily Urlist**, package `urlist` v0.2.1). Built with **Next.js 15 App Router**, **React 18**, **TypeScript**, **Prisma**, and **PostgreSQL**. Features AI-powered enhancements, real-time collaboration, vector search, Redis caching, and intelligent URL organization.

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
- [How the App Works (Architecture)](#how-the-app-works-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Pages & Routes](#pages--routes)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Data Model](#data-model)
- [Frontend: Components & Reuse](#frontend-components--reuse)
- [Hooks, Cache & Invalidation](#hooks-cache--invalidation)
- [Backend Libraries](#backend-libraries)
- [AI, Redis, Vector & Jobs](#ai-redis-vector--jobs)
- [Code Snippets (Learning)](#code-snippets-learning)
- [Testing, Lint & Build](#testing-lint--build)
- [Deploying](#deploying)
- [Learning Path](#learning-path)
- [Related Docs](#related-docs)
- [Conclusion](#conclusion)
- [License](#license)

---

## Overview

**The Daily Urlist** is more than a bookmark list. Users create **lists**, add **URLs** with metadata, collaborate with roles, get **AI** help (enhance / collections / smart search), and see **live updates** over SSE when collaborators change a list.

| Layer                               | Role in this project                                     |
| ----------------------------------- | -------------------------------------------------------- |
| **Next.js App Router**              | Pages + API Route Handlers in one app                    |
| **Prisma + PostgreSQL**             | Users, sessions, lists, comments, activities             |
| **TanStack React Query**            | Client cache with long `staleTime` (“Infinity” strategy) |
| **Upstash Redis / Vector / QStash** | Optional cache, semantic search, background jobs         |
| **Multi-provider AI**               | Gemini → Groq → OpenRouter → Hugging Face fallbacks      |
| **Cloudinary**                      | Optional image hosting / optimization                    |
| **Sentry / PostHog**                | Optional error tracking & analytics (env-gated)          |

---

## Who This README Is For

- **Beginners** learning Next.js full-stack patterns (App Router, Route Handlers, Prisma)
- **Intermediate** developers studying React Query cache + mutation invalidation
- **Anyone** forking the repo to build a similar SaaS-style bookmark/collab product

You do **not** need every third-party key to learn the codebase. See [Environment Variables](#environment-variables).

---

## Features

### Core URL & list management

- Create / edit / delete lists and URL items
- Metadata fetch (title, description, image, favicon)
- Drag-and-drop reorder (`@dnd-kit`)
- Favorites, pins, reminders, archive/restore
- Public vs private lists + shareable `slug`
- Bulk import (Chrome / Pocket / Pinboard) and export (JSON / CSV / Markdown)

### AI-powered tools (optional keys)

- URL enhancement (`/api/ai/enhance-url`)
- Smart collections & duplicate hints
- Semantic / smart search (vector + LLM when configured)

### Collaboration & realtime

- Collaborator emails + roles (owner / editor / viewer)
- Comments on URL items
- Activity feed
- Server-Sent Events (SSE) for live list sync

### Insights & ops

- Business insights charts (Recharts)
- API status / docs pages in the app
- QStash jobs: metadata refresh, URL health, session cleanup

### UX & resilience

- `SafeImage` fallback for broken remote previews
- React Query invalidation so CRUD updates UI without full reload (including back navigation when cache is correct)
- Security headers + `robots.ts` + Sentry tunnel `/api/monitoring`

---

## Technology Stack

### Runtime & UI

| Tech                   | Version (approx.) | Why it’s here                      |
| ---------------------- | ----------------- | ---------------------------------- |
| **Next.js**            | 15.5.x            | App Router, SSR shells, API routes |
| **React**              | 18.3              | UI + client islands                |
| **TypeScript**         | 5.7.x             | Typed app & API                    |
| **Tailwind CSS**       | 3.4               | Utility styling                    |
| **TanStack Query**     | 5.x               | Server-state cache                 |
| **NanoStores**         | 1.x               | Lightweight client list state      |
| **@dnd-kit**           | 6.x / 10.x        | Accessible drag-and-drop           |
| **Recharts**           | 3.x               | Insights charts                    |
| **Lucide / Heroicons** | —                 | Icons                              |

### Data & infra

| Tech                    | Role                              |
| ----------------------- | --------------------------------- |
| **PostgreSQL**          | Primary database                  |
| **Prisma 6.19**         | ORM + migrations                  |
| **bcryptjs**            | Password hashing                  |
| **Upstash Redis**       | Cache + realtime pub/sub helpers  |
| **Upstash Vector**      | Embeddings / semantic search      |
| **QStash**              | Scheduled / queued HTTP jobs      |
| **Cloudinary**          | Media                             |
| **Nodemailer / Resend** | Email                             |
| **Cheerio**             | HTML parsing (imports / metadata) |
| **Sentry**              | Errors (tunnel `/api/monitoring`) |
| **PostHog**             | Analytics (no-op without key)     |
| **Jest**                | Unit / component tests            |

> Auth is **custom cookie sessions** in `src/lib/auth.ts` — **not** NextAuth (removed as unused).

---

## Keywords Glossary

| Keyword                  | Meaning here                                                 |
| ------------------------ | ------------------------------------------------------------ |
| **App Router**           | Next.js `src/app` file-based routing                         |
| **Route Handler**        | `route.ts` API under `src/app/api`                           |
| **SSR-first**            | Layouts/pages start on server; interactivity is client       |
| **Client island**        | `"use client"` component for hooks / DnD / forms             |
| **React Query Infinity** | Very long `staleTime` so cached list data feels instant      |
| **Invalidation**         | Mark queries stale after mutation so UI refetches            |
| **SSE**                  | Server pushes events over a long-lived HTTP stream           |
| **JSON URLs column**     | `List.urls` stores URL objects as JSON, not a separate table |
| **Slug**                 | Public path segment, e.g. `/list/my-travel-links`            |
| **Env-gated**            | Feature idle until env vars exist (Sentry, PostHog, AI)      |
| **Model chain**          | AI tries providers/models in order on failure / rate limit   |

---

## Project Structure

```text
daily-urlist/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Backend Route Handlers
│   │   ├── list/[slug]/        # Public/shared list + edit
│   │   ├── lists/, browse/, new/, business-insights/, …
│   │   ├── layout.tsx          # Root layout (providers)
│   │   ├── robots.ts
│   │   └── global-error.tsx    # Sentry-aware error UI
│   ├── components/
│   │   ├── pages/              # Large page clients
│   │   ├── lists/, urls/, ui/  # Domain + primitives
│   │   ├── collaboration/, ai/, collections/
│   │   ├── business-insights/, layout/, providers/
│   ├── hooks/                  # React Query + session + SSE
│   ├── lib/                    # auth, prisma, redis, ai, email, …
│   ├── stores/                 # NanoStores (current list, drag cache)
│   └── utils/                  # queryInvalidation, urlMetadata, …
├── prisma/                     # schema.prisma + migrations
├── docs/                       # Deep guides (AI, Sentry, SafeImage, …)
├── .agile-v/                   # Agent / cycle memory (optional for humans)
├── .env.example                # Placeholder env template (safe to commit)
├── SECURITY.md                 # Private vulnerability reporting
├── vercel.json                 # Deploy headers / config
└── package.json
```

**Teaching tip:** `src/app/**/page.tsx` files are often thin; heavy UI lives in `src/components/pages/*` so routing stays clean.

---

## How the App Works (Architecture)

```text
Browser (React Query + NanoStores)
    │  fetch / mutate
    ▼
Next.js Route Handlers (src/app/api/**)
    │  getCurrentUser() cookie session
    ▼
Prisma → PostgreSQL
    │
    ├─ optional Redis cache (metadata / list payloads)
    ├─ optional Vector index (semantic search)
    ├─ optional AI providers (enhance / collections / search)
    └─ optional QStash → /api/jobs/* (background work)

Collaborators ←── SSE /api/realtime/list/[listId]/events ←── Redis pub/sub helpers
```

1. User signs up/in → server sets **httpOnly** `session_token` cookie.
2. List CRUD writes Postgres (`List.urls` JSON).
3. Client mutations call APIs, then **`invalidateUrlQueries` / list keys** so every subscribed page updates.
4. If Redis/AI/QStash keys are missing, those paths no-op or degrade gracefully where coded.

---

## Getting Started

### Prerequisites

- **Node.js** 20+ recommended
- **npm**
- A **PostgreSQL** database (local Docker, Neon, Supabase, Hetzner, etc.)

### 1. Clone & install

```bash
git clone https://github.com/arnobt78/Daily-URL-Bookmark-Notes-Dairy--NextJS-FullStack.git
cd Daily-URL-Bookmark-Notes-Dairy--NextJS-FullStack
npm install
```

### 2. Environment file

```bash
cp .env.example .env.local
```

Fill at least the **minimum** variables (next section). You do **not** need every key to run core CRUD.

### 3. Database

```bash
npx prisma migrate dev
# optional sample data:
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

Committed template: **[`.env.example`](./.env.example)**.  
Real secrets go only in **`.env.local`** (gitignored) or your host (Vercel).

### Do we need a `.env` to run?

| Answer                | Detail                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **Minimum yes**       | You need Postgres URLs + base URL for a working app.                                                |
| **Optional services** | Redis, Vector, QStash, Cloudinary, AI, email, Sentry, PostHog — leave blank to skip those features. |

### Minimum (core app)

| Variable               | Purpose                        | How to get it                                                      |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_BASE_URL` | Absolute app URL               | Local: `http://localhost:3000`                                     |
| `DATABASE_URL`         | Prisma pooled URL              | From your Postgres host (often port `6543` with `?pgbouncer=true`) |
| `DIRECT_URL`           | Direct Postgres for migrations | Same host, usually port `5432`                                     |

**Example (placeholders only):**

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
```

### Optional — Email

| Variable         | Purpose      | How to get it                    |
| ---------------- | ------------ | -------------------------------- |
| `SMTP_*`         | Classic SMTP | Gmail / provider SMTP settings   |
| `RESEND_API_KEY` | Resend API   | [resend.com](https://resend.com) |

### Optional — Upstash

| Variable                            | Purpose                  | How to get it                                                   |
| ----------------------------------- | ------------------------ | --------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL` / `TOKEN`  | Cache + realtime helpers | [console.upstash.com](https://console.upstash.com) → Redis REST |
| `UPSTASH_VECTOR_REST_URL` / `TOKEN` | Semantic search          | Upstash Vector index                                            |
| `QSTASH_TOKEN`                      | Job scheduling           | Upstash QStash                                                  |

### Optional — Cloudinary

| Variable                                           | Purpose                   |
| -------------------------------------------------- | ------------------------- |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Upload & transform images |

Create a free cloud at [cloudinary.com](https://cloudinary.com).

### Optional — AI providers

| Variable                         | Provider         |
| -------------------------------- | ---------------- |
| `GOOGLE_GEMINI_API_KEY`          | Google AI Studio |
| `GROQ_LLAMA_API_KEY`             | Groq Console     |
| `OPENROUTER_API_KEY`             | OpenRouter       |
| `HUGGING_FACE_INFERENCE_API_KEY` | Hugging Face     |

Without these, AI routes will fail or skip; list/URL CRUD still works.

### Optional — Observability

| Variable                                              | Purpose                 |
| ----------------------------------------------------- | ----------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`               | Browser + server errors |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Source maps / CI upload |
| `NEXT_PUBLIC_POSTHOG_KEY` / `HOST`                    | Product analytics       |

Sentry browser traffic can use the same-origin tunnel **`/api/monitoring`** (see `next.config.js`) to reduce ad-block drops. PostHog is a **no-op** until the key is set.

### Legacy names

`NEXTAUTH_SECRET` / `NEXTAUTH_URL` may appear in older docs or status checks — **this app does not use NextAuth**. Prefer cookie auth in `src/lib/auth.ts`.

---

## Pages & Routes

| Route                          | Purpose                  |
| ------------------------------ | ------------------------ |
| `/`                            | Home / auth entry        |
| `/lists`                       | Your lists               |
| `/new`                         | Create list              |
| `/browse`                      | Discover public lists    |
| `/list/[slug]`                 | View list + URLs         |
| `/list/[slug]/edit`            | Edit list settings       |
| `/business-insights`           | Analytics dashboards     |
| `/api-docs`                    | In-app API documentation |
| `/api-status`                  | Integration status       |
| `/about`, `/privacy`, `/terms` | Static/info              |

Each `page.tsx` typically renders a client from `src/components/pages/`.

---

## API Endpoints

All under `src/app/api/**`. Auth endpoints set/clear cookies; list routes usually require a session (except public reads).

### Auth

| Method | Path                | Notes                  |
| ------ | ------------------- | ---------------------- |
| POST   | `/api/auth/signup`  | Create user + session  |
| POST   | `/api/auth/signin`  | Login + session cookie |
| POST   | `/api/auth/signout` | Clear session          |
| GET    | `/api/auth/session` | Current user/session   |

### Lists & URLs

| Method                | Path                                 | Notes             |
| --------------------- | ------------------------------------ | ----------------- |
| GET/POST              | `/api/lists`                         | List all / create |
| GET/PATCH/DELETE      | `/api/lists/[id]`                    | One list          |
| GET                   | `/api/lists/public`                  | Public discovery  |
| GET/POST/PATCH/DELETE | `/api/lists/[id]/urls`               | URL items         |
| PATCH                 | `/api/lists/[id]/reorder`            | Order             |
| POST                  | `/api/lists/[id]/archive-url`        | Archive           |
| POST                  | `/api/lists/[id]/bulk-import`        | Bulk import       |
| GET/POST              | `/api/lists/[id]/collaborators`      | Sharing           |
| GET/POST/DELETE       | `/api/lists/[id]/comments`           | Comments          |
| GET                   | `/api/lists/[id]/activities`         | Activity          |
| GET                   | `/api/lists/[id]/collections`        | AI collections    |
| PATCH                 | `/api/lists/[id]/visibility`         | Public flag       |
| GET                   | `/api/lists/[id]/metadata`           | Cached metadata   |
| POST                  | `/api/lists/[id]/sync-vectors`       | Vector sync       |
| GET                   | `/api/realtime/list/[listId]/events` | SSE stream        |

### AI, search, metadata, jobs, insights

| Area     | Examples                                                                                    |
| -------- | ------------------------------------------------------------------------------------------- |
| AI       | `POST /api/ai/enhance-url`                                                                  |
| Search   | `POST /api/search/smart`                                                                    |
| Metadata | `GET/POST /api/metadata`                                                                    |
| Email    | `POST /api/email/send`                                                                      |
| Jobs     | `/api/jobs/refresh-metadata`, `check-urls`, `cleanup-sessions`, …                           |
| Insights | `/api/business-insights/overview`, `activity`, `global`, `popular`, `performance`, `status` |

**Learner tip:** Open any `route.ts`, find `getCurrentUser()`, then follow the Prisma call — that is the backend pattern everywhere.

---

## Authentication

```text
signUp / signIn
  → bcrypt hash/verify
  → Prisma Session row
  → Set-Cookie: session_token (httpOnly)
  → getCurrentUser() reads cookie on later requests
```

Key file: [`src/lib/auth.ts`](./src/lib/auth.ts)

```ts
// Conceptual usage inside a Route Handler
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

**Reuse in another project:** copy `auth.ts` + `User`/`Session` models + the four `/api/auth/*` routes; keep cookies httpOnly and rotate secrets if you add signing later.

---

## Data Model

Simplified Prisma view:

- **User** — email + hashed password
- **Session** — token, expiry, last activity
- **List** — title, slug, `isPublic`, `urls` (JSON array), `archivedUrls` (JSON), collaborators / roles
- **Comment** — tied to `listId` + `urlId`
- **Activity** — audit trail for list actions

URL objects live **inside** `List.urls` (not a separate `Url` table). That keeps reads simple and matches the NanoStores `UrlItem` shape in `src/stores/urlListStore.ts`.

---

## Frontend: Components & Reuse

### UI primitives (`src/components/ui/`)

| Component                               | Use when                                              |
| --------------------------------------- | ----------------------------------------------------- |
| `Button`, `Input`, `Textarea`, `Select` | Forms                                                 |
| `Card`, `Badge`, `Tabs`, `Switch`       | Layout / toggles                                      |
| `Toast` / `Toaster`                     | Feedback (`useToast`)                                 |
| `AlertDialog`, `InputDialog`            | Confirms / prompts                                    |
| `SafeImage`                             | Remote URLs that may 404 (optimizer → native `<img>`) |
| `OptimizedImage`                        | Trusted/Cloudinary assets                             |

**Reuse example — SafeImage:**

```tsx
import { SafeImage } from "@/components/ui/safe-image";

<SafeImage
  src={url.image}
  alt={url.title}
  width={120}
  height={80}
  className="rounded-md object-cover"
/>;
```

Copy `safe-image.tsx` into another Next app that already allows remote image hosts in `next.config`.

### Domain components

| Path                            | Role                        |
| ------------------------------- | --------------------------- |
| `lists/UrlList.tsx`             | Sortable URL list + filters |
| `lists/UrlCard.tsx`             | Single URL card             |
| `lists/UrlBulkImportExport.tsx` | Import/export UI            |
| `collaboration/Comments.tsx`    | Thread UI                   |
| `pages/*Page.tsx`               | Full screens wired to hooks |

**Reuse pattern:** keep presentational UI dumb; pass data/mutations from hooks (`useListQueries`) so the same card works in list view and browse view.

---

## Hooks, Cache & Invalidation

| Hook / util            | Responsibility                                                     |
| ---------------------- | ------------------------------------------------------------------ |
| `useListQueries`       | Query keys, list/URL mutations, unified list fetch                 |
| `useBrowseQueries`     | Public browse data                                                 |
| `useRealtimeList`      | SSE subscription                                                   |
| `useSession`           | Client session helper                                              |
| `queryInvalidation.ts` | After CRUD: invalidate list, URLs, metadata, browse, collaborators |

**Why it matters:** with long `staleTime`, forgetting invalidation causes “stale UI until refresh.” This project centralizes invalidation so create/update/delete stays consistent across pages and back-button navigation.

```ts
// After a successful mutation (conceptual)
import { invalidateUrlQueries } from "@/utils/queryInvalidation";

await invalidateUrlQueries(queryClient, listId);
```

---

## Backend Libraries

| Module        | Path                                   | Teaches                                    |
| ------------- | -------------------------------------- | ------------------------------------------ |
| Prisma client | `src/lib/prisma.ts`                    | Singleton DB client                        |
| Redis helpers | `src/lib/redis.ts`                     | `getCache` / `setCache` / `deleteCache`    |
| AI            | `src/lib/ai/*`                         | Provider registry + shared client fallback |
| Vector        | `src/lib/vector.ts`                    | Upstash Vector                             |
| Import/export | `src/lib/import`, `src/lib/export`     | Chrome/Pocket/Pinboard parsers             |
| Email         | `src/lib/email`                        | SMTP / Resend                              |
| Permissions   | `src/lib/collaboration/permissions.ts` | Role checks                                |
| Jobs          | `src/lib/jobs`                         | QStash wiring                              |

---

## AI, Redis, Vector & Jobs

1. **AI** — `providers.ts` defines `models[]` chains; `client.ts` walks them and skips hard rate limits.
2. **Redis** — speeds metadata/list payloads when Upstash REST env is set.
3. **Vector** — powers smarter search when vector env is set.
4. **QStash** — calls your own `/api/jobs/*` on a schedule (health checks, metadata refresh, session cleanup).

Deep dives: `docs/LLM_MODEL_SELECTION.md`, `docs/Redis_Sentry_PostHog_INTEGRATION_GUIDE.md`.

---

## Code Snippets (Learning)

### App Router page → client page

```tsx
// src/app/lists/page.tsx (pattern)
import ListsPageClient from "@/components/pages/ListsPage";

export default function ListsPage() {
  return <ListsPageClient />;
}
```

### React Query provider

Configured in root layout / providers so every page shares one `QueryClient` (`src/lib/react-query.ts`).

### Tailwind class merge (`src/lib/utils.ts`)

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use `cn("px-2", condition && "bg-white/10")` in UI components the same way as typical shadcn-style apps.

---

## Testing, Lint & Build

```bash
npm run lint          # next lint (eslint-config-next 15)
npm test              # Jest (canonical — Vitest removed)
npx tsc --noEmit      # types
npm run build         # prisma generate && next build
npm audit             # keep at 0 when possible
```

---

## Deploying

Typical target: **Vercel**.

1. Import the GitHub repo.
2. Set the same env vars as `.env.example` (Production + Preview as needed).
3. Ensure `DATABASE_URL` / `DIRECT_URL` point at production Postgres.
4. Optional: Sentry org/project/token; Firewall bot settings (human dashboard).
5. Deploy — `postinstall` runs `prisma generate`.

Also see `docs/VERCEL_PRODUCTION_GUARDRAILS.md` and `vercel.json`.

---

## Learning Path

1. Run with **minimum env** → sign up → create a list → add a URL.
2. Read `src/lib/auth.ts` + one `lists` route.
3. Trace a mutation in `useListQueries` → API → `queryInvalidation`.
4. Open `UrlList` / `UrlCard` / `SafeImage`.
5. Add Redis or one AI key and watch optional features light up.
6. Read SSE (`useRealtimeList` + realtime route).

---

## Related Docs

| Doc                                                                                                | Topic                         |
| -------------------------------------------------------------------------------------------------- | ----------------------------- |
| [SECURITY.md](./SECURITY.md)                                                                       | Private vulnerability reports |
| [docs/PROJECT_WALKTHROUGH.md](./docs/PROJECT_WALKTHROUGH.md)                                       | Compact agent/human map       |
| [docs/LLM_MODEL_SELECTION.md](./docs/LLM_MODEL_SELECTION.md)                                       | AI model chains               |
| [docs/SAFE_IMAGE_REUSABLE_COMPONENT.md](./docs/SAFE_IMAGE_REUSABLE_COMPONENT.md)                   | SafeImage design              |
| [docs/Redis_Sentry_PostHog_INTEGRATION_GUIDE.md](./docs/Redis_Sentry_PostHog_INTEGRATION_GUIDE.md) | Observability + Redis         |
| [docs/VERCEL_PRODUCTION_GUARDRAILS.md](./docs/VERCEL_PRODUCTION_GUARDRAILS.md)                     | Production hardening          |
| [docs/AGILE_V_PROTOCOL.md](./docs/AGILE_V_PROTOCOL.md)                                             | Multi-agent delivery protocol |
| [CLAUDE.md](./CLAUDE.md) / [AGENTS.md](./AGENTS.md)                                                | AI coding agent entrypoints   |

---

## Conclusion

This repository is a **complete teaching example** of a modern Next.js full-stack product: cookie auth, JSON-embedded list items, React Query cache discipline, optional Redis/AI/Vector/QStash, and collaboration over SSE. Start with Postgres + local env, then layer services as you learn each subsystem.

Fork it, strip features you do not need, or lift individual modules (`SafeImage`, `auth.ts`, `queryInvalidation`, AI client) into your own apps.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to use, modify, and distribute the code as per the terms of the license.

---

## Happy Coding! 🎉

This is an **open-source project** — feel free to use, enhance, and extend this project further!

If you have any questions or want to share your work, reach out via GitHub or my portfolio at [https://www.arnobmahmud.com](https://www.arnobmahmud.com).

**Security issues:** please report privately per [SECURITY.md](./SECURITY.md) ([contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)).
