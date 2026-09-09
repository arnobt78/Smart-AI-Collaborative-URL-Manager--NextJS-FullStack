/**
 * Track B Wave 2: slim list DTOs for card grids and densify-first mutation
 * responses. Detail/unified routes still return full `urls`.
 */

export function urlCountFromUrls(urls: unknown): number {
  return Array.isArray(urls) ? urls.length : 0;
}

/** Prefer explicit urlCount; fall back to urls.length for legacy warm cache. */
export function resolveListUrlCount(list: {
  urlCount?: number | null;
  urls?: unknown;
}): number {
  if (typeof list.urlCount === "number" && Number.isFinite(list.urlCount)) {
    return Math.max(0, list.urlCount);
  }
  return urlCountFromUrls(list.urls);
}

export type ListCardSummary = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  isPublic: boolean;
  urlCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  collaborators: string[];
  user?: { email: string };
};

type ListCardSource = {
  id: string;
  slug: string;
  title: string | null;
  description?: string | null;
  isPublic: boolean;
  urlCount?: number;
  urls?: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
  collaborators?: string[];
  user?: { email: string } | null;
};

/** Strip urls/archived blobs for /lists and /browse dehydrate. */
export function toListCardSummary(list: ListCardSource): ListCardSummary {
  const email = list.user?.email?.trim();
  return {
    id: list.id,
    slug: list.slug,
    title: list.title,
    description: list.description ?? null,
    isPublic: list.isPublic,
    urlCount: resolveListUrlCount(list),
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    collaborators: list.collaborators ?? [],
    ...(email ? { user: { email } } : {}),
  };
}

export type ListMutationSummary = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  isPublic: boolean;
  urlCount: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  collaborators?: string[];
};

type ListMutationSource = {
  id: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  urls?: unknown;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  collaborators?: string[];
};

/** Wire summary after densify-first URL mutations — no urls array. */
export function toListMutationSummary(
  list: ListMutationSource | null | undefined,
): ListMutationSummary {
  if (!list?.id || !list.slug) {
    throw new Error("List mutation summary requires id and slug");
  }
  return {
    id: list.id,
    slug: list.slug,
    title: list.title ?? null,
    description: list.description ?? null,
    isPublic: list.isPublic ?? false,
    urlCount: urlCountFromUrls(list.urls),
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    collaborators: list.collaborators ?? [],
  };
}
