"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { BookOpen, Code, Lock, Globe, Link2 } from "lucide-react";

interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
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
    description: "Get all user lists",
    auth: true,
    response: {
      lists: "array",
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
    auth: false,
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
    description: "Browse public lists",
    auth: false,
    params: {
      page: "number (optional, default: 1)",
      limit: "number (optional, default: 20)",
      search: "string (optional)",
    },
    response: {
      lists: "array",
      total: "number",
      page: "number",
      limit: "number",
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
    description: "Get API status and health",
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
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-400" />
          API Documentation
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Complete API reference for The Daily Urlist
        </p>
      </div>

      {/* Authentication Info */}
      <Card className="mb-6 border-blue-400/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-400" />
            <CardTitle>Authentication</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-white/80 text-sm mb-2">
            Most API endpoints require authentication via session cookie. Make
            sure you&apos;re logged in before making requests.
          </p>
          <code className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded">
            Cookie: session_token
          </code>
          <p className="text-white/60 text-xs mt-2">
            Note: Some endpoints like{" "}
            <code className="text-blue-400">/api/lists/public</code> and{" "}
            <code className="text-blue-400">/api/metadata</code> are publicly
            accessible.
          </p>
        </CardContent>
      </Card>

      {/* API Endpoints by Category */}
      <Tabs defaultValue="Authentication" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger
            value="Authentication"
            className="flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            Auth
          </TabsTrigger>
          <TabsTrigger value="Lists" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="Utility" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Utility
          </TabsTrigger>
          <TabsTrigger
            value="Business Insights"
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {Object.entries(allEndpoints).map(([category, endpoints]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                          className="font-mono"
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-white font-mono text-sm">
                          {endpoint.path}
                        </code>
                        {endpoint.auth && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Auth Required
                          </Badge>
                        )}
                        {!endpoint.auth && (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                      <p className="text-white/70 text-sm">
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
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <pre className="text-sm text-white/80 font-mono overflow-x-auto">
                            {JSON.stringify(endpoint.params, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    )}

                    {endpoint.body !== undefined && (
                      <TabsContent value="body" className="mt-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <pre className="text-sm text-white/80 font-mono overflow-x-auto">
                            {JSON.stringify(endpoint.body, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    )}

                    <TabsContent value="response" className="mt-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
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
