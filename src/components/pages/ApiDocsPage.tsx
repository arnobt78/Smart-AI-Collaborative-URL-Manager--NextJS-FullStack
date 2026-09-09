"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { BookOpen, Code, Lock, Globe, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_STACK, CARD_PAD, HEADING_STACK, CARD_STACK, LIST_STACK } from "@/lib/ui-spacing";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
import {
  UI_CONTROL_ICON_GAP,
  UI_ICON_CONTROL,
  UI_ICON_INLINE_XS,
  UI_IDENTITY_GAP,
} from "@/lib/ui/control-styles";

interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  authMode?: "session" | "internal";
  params?: Record<string, string>;
  body?: Record<string, string> | string;
  response: Record<string, unknown> | string;
}

const authEndpoints: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/api/auth/signup",
    description: "Create a new user account",
    auth: false,
    body: {
      email: "string",
      password: "string",
    },
    response: {
      user: {
        id: "string",
        email: "string",
      },
    },
  },
  {
    method: "POST",
    path: "/api/auth/signin",
    description: "Sign in to an existing account",
    auth: false,
    body: {
      email: "string",
      password: "string",
    },
    response: {
      user: {
        id: "string",
        email: "string",
      },
    },
  },
  {
    method: "GET",
    path: "/api/auth/session",
    description: "Get current session information",
    auth: false,
    response: {
      user: "object | null (null if not authenticated)",
    },
  },
  {
    method: "POST",
    path: "/api/auth/signout",
    description: "Sign out and invalidate session",
    auth: true,
    response: {
      success: "boolean",
    },
  },
];

const listEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/lists",
    description:
      "Get all user lists as card summaries (urlCount; urls omitted on the wire)",
    auth: true,
    response: {
      lists: [
        {
          id: "string",
          slug: "string",
          title: "string",
          description: "string | null",
          isPublic: "boolean",
          urlCount: "number",
          createdAt: "string",
          updatedAt: "string",
        },
      ],
    },
  },
  {
    method: "POST",
    path: "/api/lists",
    description: "Create a new list",
    auth: true,
    body: {
      title: "string",
      description: "string (optional)",
      slug: "string",
      urls: "array (optional)",
      isPublic: "boolean (optional)",
    },
    response: {
      list: "object",
    },
  },
  {
    method: "GET",
    path: "/api/lists/[id]",
    description: "Get a specific list by slug",
    auth: false, // Public lists can be viewed without auth
    params: {
      id: "string (slug)",
    },
    response: {
      list: "object",
    },
  },
  {
    method: "PATCH",
    path: "/api/lists/[id]",
    description: "Update a list",
    auth: true,
    params: {
      id: "string (slug)",
    },
    body: {
      title: "string (optional)",
      description: "string (optional)",
      urls: "array (optional)",
      isPublic: "boolean (optional)",
    },
    response: {
      list: "object",
    },
  },
  {
    method: "DELETE",
    path: "/api/lists/[id]",
    description: "Delete a list",
    auth: true,
    params: {
      id: "string (slug)",
    },
    response: {
      success: "boolean",
    },
  },

  {
    method: "POST",
    path: "/api/lists/[id]/urls/[urlId]/click",
    description: "Track a URL click",
    auth: true,
    params: {
      id: "string (slug)",
      urlId: "string",
    },
    response: {
      success: "boolean",
    },
  },
  {
    method: "POST",
    path: "/api/lists/[id]/reorder",
    description:
      "Reorder URLs in a list, or update/add/remove URLs (pass full URLs array)",
    auth: true,
    params: {
      id: "string (slug)",
    },
    body: {
      urls: "array (complete array of URL objects with id, url, title, etc.)",
    },
    response: {
      list: "object",
    },
  },
  {
    method: "PATCH",
    path: "/api/lists/[id]/visibility",
    description: "Toggle list public/private visibility",
    auth: true,
    params: {
      id: "string (slug)",
    },
    body: {
      isPublic: "boolean",
    },
    response: {
      list: "object",
    },
  },
  {
    method: "POST",
    path: "/api/lists/[id]/collaborators",
    description: "Add a collaborator to a list",
    auth: true,
    params: {
      id: "string (slug)",
    },
    body: {
      email: "string",
    },
    response: {
      list: "object",
      emailSent: "boolean",
      emailError: "string | null",
    },
  },
  {
    method: "POST",
    path: "/api/lists/[id]/views",
    description: "Track a view for a public list",
    auth: true,
    params: {
      id: "string (slug)",
    },
    response: {
      success: "boolean",
    },
  },
  {
    method: "GET",
    path: "/api/lists/public",
    description:
      "Browse public lists as card summaries (urlCount; urls omitted on the wire)",
    auth: true,
    params: {
      page: "number (optional, default: 1)",
      limit: "number (optional, default: 20)",
      search: "string (optional)",
    },
    response: {
      lists: [
        {
          id: "string",
          slug: "string",
          title: "string",
          urlCount: "number",
          isPublic: "boolean",
        },
      ],
      pagination: {
        page: "number",
        limit: "number",
        total: "number",
        totalPages: "number",
      },
    },
  },
];

const utilityEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/metadata",
    description:
      "Fetch metadata from a URL (title, description, image, favicon)",
    auth: false,
    params: {
      url: "string (required)",
    },
    response: {
      title: "string",
      description: "string | null",
      image: "string | null",
      favicon: "string | null",
      siteName: "string",
    },
  },
  {
    method: "GET",
    path: "/api/realtime/list/[listId]/events",
    description:
      "SSE stream for list updates (Upstash REST list-poll; lean urlCount enrich; pauses when tab hidden on the client)",
    auth: true,
    params: {
      listId: "string (list id)",
    },
    response: {
      type: "connected | heartbeat | list_updated | activity_created | …",
      listId: "string",
      list: "{ id, slug, title, isPublic, urlCount } (on enrich)",
    },
  },
  {
    method: "GET",
    path: "/api/cron/keep-warm",
    description:
      "Free-tier keep-warm ping (Prisma + Redis). Not for browsers — requires header x-internal-job-secret (INTERNAL_JOB_SECRET) or QStash (not a session cookie). Does not guarantee absolute cold _rsc SLAs.",
    auth: true,
    authMode: "internal",
    response: {
      ok: "boolean",
      db: "boolean",
      redis: "boolean",
      at: "string (ISO)",
      note: "string",
    },
  },
  {
    method: "POST",
    path: "/api/cron/keep-warm",
    description:
      "Same as GET keep-warm (internal job / cron callers; header x-internal-job-secret, not session cookie)",
    auth: true,
    authMode: "internal",
    response: {
      ok: "boolean",
      db: "boolean",
      redis: "boolean",
      at: "string (ISO)",
      note: "string",
    },
  },
];

const businessInsightsEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/business-insights/overview",
    description: "Get overview statistics",
    auth: true,
    response: {
      overview: {
        totalLists: "number",
        totalUrls: "number",
        publicLists: "number",
        privateLists: "number",
        totalCollaborators: "number",
        recentLists: "number",
        recentUrls: "number",
      },
    },
  },
  {
    method: "GET",
    path: "/api/business-insights/activity",
    description: "Get activity timeline data",
    auth: true,
    params: {
      days: "number (optional, default: 30)",
    },
    response: {
      activity: [
        {
          date: "string (YYYY-MM-DD)",
          lists: "number",
          urls: "number",
        },
      ],
    },
  },
  {
    method: "GET",
    path: "/api/business-insights/popular",
    description: "Get popular URLs and active lists",
    auth: true,
    response: {
      popularUrls: "array",
      activeLists: "array",
    },
  },
  {
    method: "GET",
    path: "/api/business-insights/performance",
    description: "Get performance metrics",
    auth: true,
    response: {
      performance: {
        totalUrls: "number",
        totalLists: "number",
        avgUrlsPerList: "number",
        publicCount: "number",
        privateCount: "number",
        listsWithCollaborators: "number",
        topLists: "array",
      },
    },
  },
  {
    method: "GET",
    path: "/api/business-insights/global",
    description: "Get global project statistics",
    auth: true,
    response: {
      global: {
        totalUsers: "number",
        totalLists: "number",
        totalUrls: "number",
        liveUsersOnline: "number",
        userGrowthData: "array",
        dailySignups: "array",
      },
    },
  },
  {
    method: "GET",
    path: "/api/business-insights/status",
    description:
      "API status: in-process reachability probes (≤1s), not self-HTTP to each listed path",
    auth: true,
    response: {
      status: {
        overall: "string",
        database: "string",
        uptime: "number",
        timestamp: "string",
      },
      endpoints: "array",
    },
  },
];

const allEndpoints: Record<string, ApiEndpoint[]> = {
  Authentication: authEndpoints,
  Lists: listEndpoints,
  Utility: utilityEndpoints,
  "Business Insights": businessInsightsEndpoints,
};

export default function ApiDocsPage() {
  return (
    <div className={cn("w-full", PAGE_STACK)}>
      {/* Header */}
      <PageHeader icon={BookOpen} title="API Documentation" description="Complete API reference for The Daily Urlist" />

      {/* Authentication Info — C7.3 CARD_PAD */}
      <Card className={cn(CARD_PAD, "border-blue-400/30")}>
        <CardHeader>
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Lock} hue="blue" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <CardTitle>Authentication</CardTitle>
              <p className="text-sm text-white/70">
                Session cookie required for most endpoints
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn(CARD_STACK, "mt-0")}>
          <p className="text-white/80 text-sm">
            Most API endpoints require authentication via session cookie. Make
            sure you&apos;re logged in before making requests.
          </p>
          <code className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded w-fit">
            Cookie: session_token
          </code>
          <p className="text-white/60 text-xs">
            Note: <code className="text-blue-400">/api/metadata</code> is
            publicly accessible; list discovery requires a session.
          </p>
        </CardContent>
      </Card>

      {/* API Endpoints by Category */}
      <Tabs defaultValue="Authentication" className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-4 items-center">
          <TabsTrigger
            value="Authentication"
            className={cn(
              "flex h-full items-center justify-center text-xs sm:text-sm px-2 sm:px-3",
              UI_CONTROL_ICON_GAP,
            )}
          >
            <Lock className={UI_ICON_CONTROL} aria-hidden />
            <span>Auth</span>
          </TabsTrigger>
          <TabsTrigger
            value="Lists"
            className={cn(
              "flex h-full items-center justify-center text-xs sm:text-sm px-2 sm:px-3",
              UI_CONTROL_ICON_GAP,
            )}
          >
            <Link2 className={UI_ICON_CONTROL} aria-hidden />
            Lists
          </TabsTrigger>
          <TabsTrigger
            value="Utility"
            className={cn(
              "flex h-full items-center justify-center text-xs sm:text-sm px-2 sm:px-3",
              UI_CONTROL_ICON_GAP,
            )}
          >
            <Code className={UI_ICON_CONTROL} aria-hidden />
            Utility
          </TabsTrigger>
          <TabsTrigger
            value="Business Insights"
            className={cn(
              "flex h-full items-center justify-center text-xs sm:text-sm px-2 sm:px-3",
              UI_CONTROL_ICON_GAP,
            )}
          >
            <Globe className={UI_ICON_CONTROL} aria-hidden />
            <span>Insights</span>
          </TabsTrigger>
        </TabsList>

        {Object.entries(allEndpoints).map(([category, endpoints]) => (
          <TabsContent key={category} value={category} className={LIST_STACK}>
            {endpoints.map((endpoint, index) => (
              <Card key={index} className={CARD_PAD}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className={cn(HEADING_STACK, "min-w-0 flex-1")}>
                      <div
                        className={cn(
                          "flex flex-wrap items-center",
                          UI_CONTROL_ICON_GAP,
                        )}
                      >
                        <Badge
                          variant={
                            endpoint.method === "GET"
                              ? "success"
                              : endpoint.method === "POST"
                                ? "default"
                                : endpoint.method === "PATCH"
                                  ? "secondary"
                                  : "destructive"
                          }
                          className="font-mono text-xs sm:text-sm"
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-white font-mono text-xs sm:text-sm break-all">
                          {endpoint.path}
                        </code>
                        {endpoint.auth && endpoint.authMode !== "internal" && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "inline-flex items-center text-xs",
                              UI_CONTROL_ICON_GAP,
                            )}
                          >
                            <Lock className={UI_ICON_INLINE_XS} aria-hidden />
                            <span className="hidden sm:inline">
                              Auth Required
                            </span>
                            <span className="sm:hidden">Auth</span>
                          </Badge>
                        )}
                        {endpoint.auth && endpoint.authMode === "internal" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "inline-flex items-center text-xs border-blue-400/40 text-blue-200",
                              UI_CONTROL_ICON_GAP,
                            )}
                          >
                            <Code className={UI_ICON_INLINE_XS} aria-hidden />
                            <span className="hidden sm:inline">
                              Internal Secret
                            </span>
                            <span className="sm:hidden">Internal</span>
                          </Badge>
                        )}
                        {!endpoint.auth && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "inline-flex items-center text-xs",
                              UI_CONTROL_ICON_GAP,
                            )}
                          >
                            <Globe className={UI_ICON_INLINE_XS} aria-hidden />
                            Public
                          </Badge>
                        )}
                      </div>
                      <p className="text-white/70 text-xs sm:text-sm">
                        {endpoint.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="response" className="w-full">
                    <TabsList>
                      {endpoint.params !== undefined && (
                        <TabsTrigger value="params">Parameters</TabsTrigger>
                      )}
                      {endpoint.body !== undefined && (
                        <TabsTrigger value="body">Request Body</TabsTrigger>
                      )}
                      <TabsTrigger value="response">Response</TabsTrigger>
                    </TabsList>

                    {endpoint.params !== undefined && (
                      <TabsContent value="params" className="mt-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                          <pre className="text-sm text-white/80 font-mono overflow-x-auto">
                            {JSON.stringify(endpoint.params, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    )}

                    {endpoint.body !== undefined && (
                      <TabsContent value="body" className="mt-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                          <pre className="text-sm text-white/80 font-mono overflow-x-auto">
                            {JSON.stringify(endpoint.body, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    )}

                    <TabsContent value="response" className="mt-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/20">
                        <pre className="text-sm text-white/80 font-mono overflow-x-auto">
                          {JSON.stringify(endpoint.response, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
