# The Daily Urlist - Next.js, TanStack React Query, Prisma, PostgreSQL, Upstash, QStash, Cloudinary, Google Gemini, Groq, OpenRouter, Hugging Face FullStack URL Bookmark Manager

> A production-ready, full-stack URL bookmarking and sharing platform built with Next.js 15, React, TypeScript, and PostgreSQL. Features AI-powered enhancements, real-time collaboration, vector search, and intelligent URL organization.

- **Live-Demo:** [https://daily-urlist.vercel.app/](https://daily-urlist.vercel.app/)

![Next.js](https://img.shields.io/badge/Next.js-15.5.7-black)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.19.0-2D3748)
![React Query](https://img.shields.io/badge/React%20Query-5.90.6-FF4154)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Walkthrough](#-project-walkthrough)
- [Components Documentation](#-components-documentation)
- [API Endpoints](#-api-endpoints)
- [Reusable Components Guide](#-reusable-components-guide)
- [Code Examples](#-code-examples)
- [Keywords](#-keywords)
- [Conclusion](#-conclusion)

---

## 🎯 Overview

**The Daily Urlist** is a modern, full-featured URL bookmark manager that goes beyond simple link saving. It combines powerful organization tools, AI-powered enhancements, real-time collaboration, and intelligent features to create a comprehensive solution for managing and sharing web resources.

### What Makes This Project Special?

- **🚀 Production-Ready**: Optimized for performance with React Query caching, Infinity cache strategy, and instant rendering
- **🤖 AI-Powered**: URL enhancement, smart collections, duplicate detection, and semantic search
- **👥 Real-Time Collaboration**: Live updates, comments, activity feeds, and role-based permissions
- **⚡ Lightning Fast**: Zero API calls until database changes, instant navigation with cached data
- **🔍 Intelligent Organization**: Vector-based semantic search, smart collections, and automatic categorization
- **📊 Business Insights**: Analytics, activity tracking, and performance metrics
- **🌐 Import/Export**: Support for Pocket, Pinboard, and Chrome bookmarks

---

## ✨ Features

### Core Features

1. **URL Management**

   - Create, edit, delete, and organize URLs in lists
   - Rich metadata extraction (title, description, images)
   - Drag-and-drop reordering
   - Favorites, pins, and reminders
   - Archive and restore URLs
   - URL health monitoring

2. **List Management**

   - Multiple lists per user
   - Public/private visibility controls
   - Custom slugs for easy sharing
   - List-level descriptions and metadata
   - Bulk import/export (Pocket, Pinboard, Chrome)

3. **AI-Powered Enhancements**

   - Automatic URL enhancement with AI
   - Smart collection suggestions
   - Duplicate URL detection
   - Semantic search across all URLs
   - Automatic categorization and tagging

4. **Collaboration**

   - Role-based permissions (Owner, Editor, Viewer)
   - Real-time activity feeds
   - Comments on URLs
   - Live updates via Server-Sent Events (SSE)
   - Collaborative editing

5. **Search & Discovery**

   - Vector-based semantic search
   - Filter by tags, category, favorites
   - Sort by date, alphabetically, favorites
   - Browse public lists
   - Smart search with AI

6. **Business Insights**

   - Activity timelines
   - Popular content analytics
   - Performance metrics
   - Global statistics
   - API status monitoring

7. **Developer Features**
   - RESTful API with comprehensive endpoints
   - API documentation page
   - Real-time event streaming
   - Scheduled background jobs

---

## 🛠 Technology Stack

### Frontend

- **Next.js 15.5.7** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.7.3** - Type safety
- **TanStack React Query 5.90.6** - Data fetching and caching
- **Tailwind CSS 3.4.1** - Utility-first styling
- **ShadCN UI** - Reusable component library
- **@dnd-kit** - Drag-and-drop functionality
- **NanoStores** - Lightweight state management
- **Recharts** - Data visualization

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **Prisma 6.19.0** - Database ORM
- **PostgreSQL** - Primary database (Neon)
- **Upstash Redis** - Caching and real-time features
- **Upstash Vector** - Vector database for semantic search
- **QStash** - Scheduled jobs and background tasks

### AI & Services

- **Google Gemini** - AI enhancement
- **Groq (Llama 3)** - Fast AI inference
- **OpenRouter** - Multi-model AI access
- **Hugging Face** - AI inference
- **Cloudinary** - Image optimization and CDN

### Email & Communication

- **Resend** - Transactional emails
- **Nodemailer** - SMTP email support
- **Gmail SMTP** - Alternative email provider

### Development Tools

- **Turbopack** - Fast bundler (development)
- **Jest** - Testing framework
- **ESLint** - Code linting
- **TypeScript** - Static type checking

---

## 📁 Project Structure

```bash
daily-urlist/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── lists/        # List management endpoints
│   │   │   ├── ai/           # AI enhancement endpoints
│   │   │   ├── business-insights/  # Analytics endpoints
│   │   │   ├── metadata/     # URL metadata extraction
│   │   │   ├── realtime/     # Server-Sent Events
│   │   │   └── ...
│   │   ├── list/[slug]/      # Individual list pages
│   │   ├── lists/            # Lists overview page
│   │   ├── browse/           # Public lists browser
│   │   ├── business-insights/ # Analytics dashboard
│   │   └── ...
│   ├── components/           # React components
│   │   ├── ui/              # Reusable UI components (ShadCN)
│   │   ├── pages/           # Page-level components
│   │   ├── lists/           # List-related components
│   │   ├── collaboration/   # Collaboration features
│   │   ├── ai/              # AI-powered components
│   │   ├── business-insights/ # Analytics components
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   │   ├── useListQueries.ts        # List data hooks
│   │   ├── useSession.ts            # Session management
│   │   ├── useUrlMetadata.ts        # URL metadata hooks
│   │   ├── useBrowseQueries.ts      # Browse page hooks
│   │   └── ...
│   ├── lib/                 # Utility libraries
│   │   ├── ai/             # AI providers and logic
│   │   ├── auth.ts         # Authentication logic
│   │   ├── db.ts           # Database utilities
│   │   ├── email/          # Email services
│   │   ├── import/         # Bookmark importers
│   │   ├── export/         # Export functionality
│   │   ├── react-query.ts  # React Query configuration
│   │   └── ...
│   ├── stores/             # State management
│   │   ├── urlListStore.ts      # URL list state (NanoStores)
│   │   └── dragOrderCache.ts    # Drag-and-drop cache
│   ├── utils/              # Utility functions
│   │   ├── queryInvalidation.ts  # Cache invalidation
│   │   ├── urlMetadata.ts        # Metadata extraction
│   │   └── ...
│   └── types/              # TypeScript type definitions
├── package.json            # Dependencies and scripts
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **PostgreSQL** database (Neon, Supabase, or self-hosted)
- **npm** or **yarn** package manager
- **Git** for version control

### Installation Steps

1. **Clone the Repository**

```bash
git clone <repository-url>
cd daily-urlist
```

2. **Install Dependencies**

```bash
npm install
```

3. **Set Up Environment Variables**

Create a `.env.local` file in the root directory (see [Environment Variables](#-environment-variables) section below).

4. **Set Up Database**

```bash
# Generate Prisma Client
npm run db:generate

# Run database migrations
npm run db:migrate
```

5. **Start Development Server**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

```bash
# Base URL Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# For production: https://your-domain.com

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Session Secret
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

### Optional but Recommended

```bash
# Email Configuration (Choose one)
# Option 1: SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=The Daily Urlist

# Option 2: Resend
RESEND_API_KEY=re_your_resend_api_key

# Redis & Real-time Features (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Vector Database for Semantic Search (Upstash)
UPSTASH_VECTOR_REST_URL=https://your-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-vector-token

# Scheduled Jobs (QStash)
QSTASH_TOKEN=your-qstash-token

# Image Optimization (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AI Services (At least one recommended)
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
GROQ_LLAMA_API_KEY=your-groq-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
HUGGING_FACE_INFERENCE_API_KEY=your-huggingface-api-key
```

### Environment Variable Details

#### Database (Required)

- **`DATABASE_URL`**: PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database?sslmode=require`
  - Get from: Neon, Supabase, or your PostgreSQL provider

#### Email (Optional but Recommended)

Choose **one** email service:

**SMTP (Gmail):**

- `SMTP_HOST`: Usually `smtp.gmail.com`
- `SMTP_PORT`: `587` for TLS
- `SMTP_USER`: Your Gmail address
- `SMTP_PASS`: Gmail App Password (not your regular password)
- `SMTP_FROM_EMAIL`: Sender email
- `SMTP_FROM_NAME`: Sender display name

**Resend:**

- `RESEND_API_KEY`: Get from [Resend.com](https://resend.com)

#### Redis (Optional - Enables Caching & Real-time)

- `UPSTASH_REDIS_REST_URL`: Get from [Upstash Redis](https://upstash.com)
- `UPSTASH_REDIS_REST_TOKEN`: Get from Upstash dashboard

#### Vector Database (Optional - Enables Semantic Search)

- `UPSTASH_VECTOR_REST_URL`: Get from [Upstash Vector](https://upstash.com)
- `UPSTASH_VECTOR_REST_TOKEN`: Get from Upstash dashboard

#### AI Services (Optional - Enables AI Features)

At least one AI provider recommended:

- **Google Gemini**: `GOOGLE_GEMINI_API_KEY` - [Get API Key](https://makersuite.google.com/app/apikey)
- **Groq**: `GROQ_LLAMA_API_KEY` - [Get API Key](https://console.groq.com)
- **OpenRouter**: `OPENROUTER_API_KEY` - [Get API Key](https://openrouter.ai)
- **Hugging Face**: `HUGGING_FACE_INFERENCE_API_KEY` - [Get API Key](https://huggingface.co)

#### Cloudinary (Optional - Enables Image Optimization)

- `CLOUDINARY_CLOUD_NAME`: Get from [Cloudinary](https://cloudinary.com)
- `CLOUDINARY_API_KEY`: From Cloudinary dashboard
- `CLOUDINARY_API_SECRET`: From Cloudinary dashboard

#### Scheduled Jobs (Optional - Enables Background Tasks)

- `QSTASH_TOKEN`: Get from [Upstash QStash](https://upstash.com)

---

## 📚 Project Walkthrough

### How It Works

#### 1. **Authentication Flow**

- User signs up/signs in through the `Auth` component
- Session token stored in httpOnly cookie
- Session validated on each API request
- React Query caches session data with Infinity cache

```typescript
// Session is cached forever until logout
const { user, isLoading } = useSession();
```

#### 2. **List Creation & Management**

- Users create lists with title, description, and slug
- Lists stored in PostgreSQL with JSON URL arrays
- React Query caches lists data for instant loading
- Real-time updates via SSE for collaborative editing

#### 3. **URL Management**

- URLs added to lists with automatic metadata extraction
- Metadata cached in React Query with Infinity cache
- Drag-and-drop reordering with optimistic updates
- Health monitoring for URL status

#### 4. **Real-Time Collaboration**

- Server-Sent Events (SSE) for live updates
- Redis pub/sub for broadcasting changes
- Activity feed shows all list changes
- Comments system for URL discussions

#### 5. **AI Enhancements**

- AI providers (Gemini, Groq, etc.) enhance URLs
- Smart collections suggest related URLs
- Duplicate detection finds similar URLs
- Semantic search uses vector embeddings

#### 6. **Caching Strategy**

- **Infinity Cache**: Data cached forever until invalidated
- **Centralized Invalidation**: Single source of truth
- **Optimistic Updates**: UI updates immediately
- **Placeholder Data**: Shows cached data while fetching

---

## 🧩 Components Documentation

### Page Components

#### `HomePage.tsx`

Landing page with features showcase and authentication.

**Location:** `src/components/HomePage.tsx`

**Features:**

- Hero section with call-to-action
- Features grid
- How it works section
- Conditional rendering based on auth state

**Usage:**

```typescript
import HomePage from "@/components/HomePage";

export default function Page() {
  return <HomePage />;
}
```

#### `ListsPage.tsx`

Displays all user lists with search, filtering, and management options.

**Location:** `src/components/pages/ListsPage.tsx`

**Features:**

- Lists grid with React Query caching
- Search and filter functionality
- Delete lists with confirmation
- Public/private indicators
- Collaboration indicators

**Hooks Used:**

- `useAllListsQuery()` - Fetches all lists with Infinity cache

#### `ListPage.tsx`

Individual list view with URLs, activities, and collaboration.

**Location:** `src/components/pages/ListPage.tsx`

**Features:**

- Unified list data (list + activities + collaborators)
- Real-time updates via SSE
- Activity feed
- Collaboration management
- Smart collections sidebar

**Hooks Used:**

- `useUnifiedListQuery(slug)` - Fetches complete list data

#### `BrowsePage.tsx`

Browse public lists with pagination and search.

**Location:** `src/components/pages/BrowsePage.tsx`

**Features:**

- Public lists pagination
- Search functionality
- List preview cards

**Hooks Used:**

- `usePublicListsQuery(page, search)` - Fetches public lists

#### `BusinessInsightsPage.tsx`

Analytics dashboard with charts and metrics.

**Location:** `src/components/pages/BusinessInsightsPage.tsx`

**Features:**

- Activity timeline charts
- Popular content analytics
- Performance metrics
- Global statistics

**Hooks Used:**

- `useBusinessOverviewQuery()`
- `useBusinessActivityQuery(days)`
- `useBusinessPopularQuery()`
- `useBusinessPerformanceQuery()`
- `useBusinessGlobalQuery()`

---

### UI Components (ShadCN)

All UI components are located in `src/components/ui/` and follow ShadCN patterns:

#### `Button.tsx`

Reusable button component with variants and link support.

```typescript
import { Button } from "@/components/ui/Button";

// Primary button
<Button>Click Me</Button>

// Link button
<Button href="/lists">Go to Lists</Button>

// Variants
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

#### `Card.tsx`

Card component for content containers.

```typescript
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>;
```

#### `Toast.tsx` / `Toaster.tsx`

Dynamic toast notifications.

```typescript
import { useToast } from "@/components/ui/Toaster";

const { toast } = useToast();

toast({
  title: "Success!",
  description: "Operation completed",
  variant: "success",
});
```

#### Other UI Components

- `Input.tsx` - Text input fields
- `Textarea.tsx` - Multi-line text input
- `Badge.tsx` - Status badges
- `AlertDialog.tsx` - Confirmation dialogs
- `Tabs.tsx` - Tab navigation
- `Skeleton.tsx` - Loading skeletons
- `Tooltip.tsx` - Hover tooltips

---

### Feature Components

#### `UrlList.tsx`

Main component for displaying and managing URLs in a list.

**Location:** `src/components/lists/UrlList.tsx`

**Features:**

- Drag-and-drop reordering
- URL cards with metadata
- Search and filtering
- Bulk operations
- Real-time updates

**Key Props:**

- None (uses `currentList` store)

**Usage:**

```typescript
import { UrlList } from "@/components/lists/UrlList";

<UrlList />;
```

#### `UrlCard.tsx`

Individual URL card component.

**Location:** `src/components/lists/UrlCard.tsx`

**Features:**

- URL preview with metadata
- Actions (edit, delete, favorite, pin)
- Click tracking
- Health indicator

**Props:**

```typescript
interface UrlCardProps {
  url: UrlItem;
  metadata?: UrlMetadata;
  isLoadingMetadata?: boolean;
  onEdit: (url: UrlItem) => void;
  onDelete: (id: string) => void;
  // ... other handlers
}
```

#### `SmartCollections.tsx`

AI-powered collection suggestions and duplicate detection.

**Location:** `src/components/collections/SmartCollections.tsx`

**Features:**

- Smart collection suggestions
- Duplicate URL detection
- Collection creation from suggestions

**Props:**

```typescript
interface SmartCollectionsProps {
  listId: string;
  listSlug: string;
}
```

#### `PermissionManager.tsx`

Role-based collaboration management.

**Location:** `src/components/collaboration/PermissionManager.tsx`

**Features:**

- Add/remove collaborators
- Role management (Owner, Editor, Viewer)
- Permission indicators

**Props:**

```typescript
interface PermissionManagerProps {
  listId: string;
  listTitle: string;
  listSlug: string;
  onUpdate?: () => void;
}
```

#### `ActivityFeed.tsx`

Real-time activity feed for list changes.

**Location:** `src/components/collaboration/ActivityFeed.tsx`

**Features:**

- Real-time activity updates
- Activity icons and labels
- Time-based formatting

**Props:**

```typescript
interface ActivityFeedProps {
  listId: string;
  limit?: number; // Default: 50
}
```

#### `Comments.tsx`

Comment system for URLs.

**Location:** `src/components/collaboration/Comments.tsx`

**Features:**

- Add/edit/delete comments
- Real-time comment updates
- User attribution

**Props:**

```typescript
interface CommentsProps {
  listId: string;
  urlId: string;
  currentUserId?: string;
}
```

---

## 🔌 API Endpoints

### Authentication

#### `POST /api/auth/signup`

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### `POST /api/auth/signin`

Sign in an existing user.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### `GET /api/auth/session`

Get current user session.

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### `POST /api/auth/signout`

Sign out current user.

---

### Lists

#### `GET /api/lists`

Get all lists for current user.

**Response:**

```json
{
  "lists": [
    {
      "id": "uuid",
      "title": "My List",
      "slug": "my-list",
      "description": "Description",
      "isPublic": false,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/lists`

Create a new list.

**Request:**

```json
{
  "title": "New List",
  "description": "Description",
  "slug": "new-list",
  "isPublic": false,
  "urls": []
}
```

#### `GET /api/lists/[id]`

Get a specific list by slug.

**Response:**

```json
{
  "id": "uuid",
  "title": "List Title",
  "slug": "list-slug",
  "urls": [...],
  "userId": "uuid",
  "isPublic": false
}
```

#### `GET /api/lists/[id]/updates`

Unified endpoint for list data, activities, and collaborators.

**Query Parameters:**

- `activityLimit`: Number of activities to fetch (default: 30)

**Response:**

```json
{
  "list": { ... },
  "activities": [ ... ],
  "collaborators": [ ... ]
}
```

#### `PATCH /api/lists/[id]`

Update list metadata.

**Request:**

```json
{
  "title": "Updated Title",
  "description": "Updated Description",
  "isPublic": true
}
```

#### `DELETE /api/lists/[id]`

Delete a list.

---

### URLs

#### `POST /api/lists/[id]/urls`

Add URLs to a list.

**Request:**

```json
{
  "urls": [
    {
      "url": "https://example.com",
      "title": "Example",
      "description": "Description"
    }
  ]
}
```

#### `PATCH /api/lists/[id]/urls`

Update or reorder URLs.

**Request (Reorder):**

```json
{
  "action": "reorder",
  "urls": [ { "id": "...", "position": 0 }, ... ]
}
```

**Request (Update):**

```json
{
  "action": "update",
  "urlId": "uuid",
  "updates": {
    "title": "New Title",
    "tags": ["tag1", "tag2"]
  }
}
```

#### `DELETE /api/lists/[id]/urls/[urlId]`

Delete a URL from a list.

---

### Metadata

#### `GET /api/metadata?url=...`

Fetch metadata for a URL.

**Query Parameters:**

- `url`: The URL to fetch metadata for

**Response:**

```json
{
  "title": "Page Title",
  "description": "Page description",
  "image": "https://example.com/image.jpg",
  "siteName": "Site Name"
}
```

---

### AI Features

#### `POST /api/ai/enhance-url`

Enhance URL with AI (category, tags, summary).

**Request:**

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "description": "Description",
  "provider": "gemini"
}
```

**Response:**

```json
{
  "category": "Technology",
  "tags": ["web", "development"],
  "summary": "AI-generated summary",
  "confidence": 0.95
}
```

---

### Collections & Search

#### `GET /api/lists/[id]/collections`

Get AI-generated collection suggestions.

**Query Parameters:**

- `includeDuplicates`: Include duplicate detection (default: false)
- `minGroupSize`: Minimum URLs per collection (default: 2)
- `maxCollections`: Maximum collections to return (default: 10)

#### `POST /api/search/smart`

Semantic search across URLs.

**Request:**

```json
{
  "query": "search query",
  "listId": "uuid"
}
```

---

### Collaboration

#### `GET /api/lists/[id]/collaborators`

Get list collaborators.

#### `POST /api/lists/[id]/collaborators`

Add a collaborator.

**Request:**

```json
{
  "email": "collaborator@example.com",
  "role": "editor"
}
```

#### `PATCH /api/lists/[id]/collaborators`

Update collaborator role.

#### `DELETE /api/lists/[id]/collaborators`

Remove a collaborator.

---

### Real-Time

#### `GET /api/realtime/list/[listId]/events`

Server-Sent Events stream for real-time updates.

**Usage:**

```typescript
const eventSource = new EventSource(`/api/realtime/list/${listId}/events`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle update
};
```

---

## 🔧 Reusable Components Guide

### How to Use ShadCN UI Components

All UI components in `src/components/ui/` are fully reusable and follow consistent patterns.

#### Example: Using Button Component

```typescript
import { Button } from "@/components/ui/Button";

function MyComponent() {
  return (
    <div>
      {/* Primary button */}
      <Button onClick={() => console.log("Clicked")}>Primary Action</Button>

      {/* Link button */}
      <Button href="/lists" variant="outline">
        View Lists
      </Button>

      {/* Loading state */}
      <Button disabled={isLoading}>
        {isLoading ? "Loading..." : "Submit"}
      </Button>
    </div>
  );
}
```

#### Example: Using Toast Notifications

```typescript
import { useToast } from "@/components/ui/Toaster";

function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Success!",
      description: "Operation completed successfully",
      variant: "success",
    });
  };

  const handleError = () => {
    toast({
      title: "Error",
      description: "Something went wrong",
      variant: "error",
    });
  };

  return <Button onClick={handleSuccess}>Show Toast</Button>;
}
```

#### Example: Using React Query Hooks

```typescript
import { useUnifiedListQuery } from "@/hooks/useListQueries";
import { useUrlMetadata } from "@/hooks/useUrlMetadata";

function MyComponent({ listSlug }: { listSlug: string }) {
  // Fetch list data with Infinity cache
  const { data, isLoading } = useUnifiedListQuery(listSlug);

  // Fetch URL metadata with caching
  const { data: metadata } = useUrlMetadata("https://example.com");

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data?.list?.title}</h1>
      <p>{metadata?.description}</p>
    </div>
  );
}
```

#### Example: Using Centralized Cache Invalidation

```typescript
import { invalidateListQueries } from "@/utils/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";

function MyComponent({ listSlug, listId }: Props) {
  const queryClient = useQueryClient();

  const handleUpdate = async () => {
    // Perform update
    await updateList(listId, { title: "New Title" });

    // Invalidate cache to trigger refetch
    invalidateListQueries(queryClient, listSlug, listId);
  };
}
```

---

## 💻 Code Examples

### Creating a New List

```typescript
import { useRouter } from "next/navigation";
import { useAllListsQuery } from "@/hooks/useListQueries";

function CreateListForm() {
  const router = useRouter();
  const { refetch } = useAllListsQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const response = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        slug: formData.get("slug"),
        description: formData.get("description"),
      }),
    });

    if (response.ok) {
      await refetch(); // Refresh lists
      router.push(`/list/${formData.get("slug")}`);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Adding a URL with Metadata

```typescript
import { useUrlMetadata } from "@/hooks/useUrlMetadata";
import { useToast } from "@/components/ui/Toaster";

function AddUrlForm({ listId }: { listId: string }) {
  const [url, setUrl] = useState("");
  const { data: metadata } = useUrlMetadata(url);
  const { toast } = useToast();

  const handleAdd = async () => {
    const response = await fetch(`/api/lists/${listId}/urls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [
          {
            url,
            title: metadata?.title,
            description: metadata?.description,
          },
        ],
      }),
    });

    if (response.ok) {
      toast({
        title: "Success!",
        description: "URL added successfully",
        variant: "success",
      });
    }
  };

  return (
    <div>
      <input value={url} onChange={(e) => setUrl(e.target.value)} />
      {metadata && <img src={metadata.image} alt={metadata.title} />}
      <button onClick={handleAdd}>Add URL</button>
    </div>
  );
}
```

### Using AI Enhancement

```typescript
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";

function EnhancedUrlForm({ url }: { url: string }) {
  const [enhancementResult, setEnhancementResult] = useState(null);

  return (
    <div>
      <input value={url} readOnly />

      <UrlEnhancer
        url={url}
        onEnhance={(result) => {
          setEnhancementResult(result);
          // Use result.category, result.tags, result.summary
        }}
      />

      {enhancementResult && (
        <div>
          <p>Category: {enhancementResult.category}</p>
          <p>Tags: {enhancementResult.tags.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
```

### Real-Time Updates with SSE

```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

function useRealtimeUpdates(listId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource(`/api/realtime/list/${listId}/events`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Invalidate cache to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ["unified-list", listId],
      });
    };

    return () => eventSource.close();
  }, [listId, queryClient]);
}
```

---

## 🎯 Keywords

- **Next.js 15** - React framework with App Router
- **React Query** - Data fetching and caching
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Relational database
- **Prisma** - Database ORM
- **Redis** - Caching and real-time features
- **Vector Search** - Semantic search with embeddings
- **AI Enhancement** - URL enhancement with AI
- **Real-Time Collaboration** - Live updates and SSE
- **Role-Based Access** - Permission system
- **Drag-and-Drop** - URL reordering
- **Metadata Extraction** - Automatic URL metadata
- **Smart Collections** - AI-powered grouping
- **Business Analytics** - Insights and metrics
- **Server-Sent Events** - Real-time updates
- **Infinity Cache** - Persistent caching strategy
- **Turbopack** - Fast bundler
- **Tailwind CSS** - Utility-first styling
- **ShadCN UI** - Component library

---

## 🎓 Learning Resources

### Key Concepts to Understand

1. **React Query Caching Strategy**

   - Infinity cache until invalidation
   - Centralized invalidation patterns
   - Optimistic updates

2. **Real-Time Updates**

   - Server-Sent Events (SSE)
   - Redis pub/sub
   - Event-driven architecture

3. **State Management**

   - NanoStores for client state
   - React Query for server state
   - Local storage for persistence

4. **AI Integration**

   - Multiple AI provider support
   - Fallback mechanisms
   - Error handling

5. **Performance Optimization**
   - Lazy loading
   - Code splitting
   - Image optimization
   - Metadata caching

---

## 📝 Conclusion

**The Daily Urlist** is a comprehensive, production-ready URL bookmark manager that demonstrates modern web development best practices. It combines powerful features like AI enhancements, real-time collaboration, and intelligent organization with optimized performance and developer-friendly architecture.

### What You Can Learn

- **Full-Stack Development**: Next.js App Router, API routes, database design
- **State Management**: React Query, NanoStores, local storage
- **Real-Time Features**: Server-Sent Events, Redis pub/sub
- **AI Integration**: Multiple AI providers, semantic search
- **Performance Optimization**: Infinity caching, lazy loading, code splitting
- **Type Safety**: Comprehensive TypeScript usage
- **UI/UX**: ShadCN components, responsive design, accessibility

### Project Highlights

✅ **Production-Ready**: Optimized for performance and scalability  
✅ **Fully Typed**: Comprehensive TypeScript coverage  
✅ **Well-Documented**: Clear code comments and structure  
✅ **Modular Architecture**: Reusable components and hooks  
✅ **Real-Time**: Live collaboration and updates  
✅ **AI-Powered**: Smart features and enhancements

---

## Happy Coding! 🎉

Feel free to use this project repository and extend this project further!

If you have any questions or want to share your work, reach out via GitHub or my portfolio at [https://arnob-mahmud.vercel.app/](https://arnob-mahmud.vercel.app/).

**Enjoy building and learning!** 🚀

Thank you! 😊

---
