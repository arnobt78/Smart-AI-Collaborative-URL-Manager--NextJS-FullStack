import type { UrlItem, UrlList } from "@/stores/urlListStore";

export type UnifiedActivity = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; email: string };
};

export type UnifiedCollaborator = { email: string; role: "editor" | "viewer" };

export type UnifiedListResponse = {
  list: UrlList | null;
  activities: UnifiedActivity[];
  collaborators?: UnifiedCollaborator[];
  commentCounts?: Record<string, number>;
};

/**
 * Keeps server-hydrated and browser-fetched unified payloads identical so a
 * cache hit cannot bypass URL comment badges or collaborator cache seeding.
 */
export function normalizeUnifiedListResponse(data: UnifiedListResponse): UnifiedListResponse {
  const commentCounts = data.commentCounts || {};
  const list = data.list
    ? {
        ...data.list,
        urls: data.list.urls.map((url: UrlItem) => ({
          ...url,
          commentCount: commentCounts[url.id] || 0,
        })),
      }
    : null;

  return {
    ...data,
    list,
    activities: data.activities || [],
    collaborators: data.collaborators || [],
    commentCounts,
  };
}
