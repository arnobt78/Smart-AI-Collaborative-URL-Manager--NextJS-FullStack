/**
 * Shared query-key contract. Keeping keys outside React hooks prevents store and
 * invalidation utilities from importing client-hook modules in a cycle.
 */
export const listQueryKeys = {
  all: ["lists"] as const,
  lists: () => [...listQueryKeys.all, "list"] as const,
  list: (id: string) => [...listQueryKeys.lists(), id] as const,
  listBySlug: (slug: string) => [...listQueryKeys.lists(), "slug", slug] as const,
  unified: (slug: string) => ["unified-list", slug] as const,
  activities: (listId: string, limit?: number) =>
    ["activities", listId, limit || 30] as const,
  collaborators: (listId: string) => ["collaborators", listId] as const,
  collections: (listId: string) => ["collections-suggestions", listId] as const,
  duplicates: (listId: string) => ["collections-duplicates", listId] as const,
  urlMetadata: (url: string) => ["url-metadata", url] as const,
  allLists: () => [...listQueryKeys.all, "all"] as const,
};
