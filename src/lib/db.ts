import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import {
  buildCollaboratorRoleEntry,
  listCollaboratorsFromRoles,
  parseCollaboratorRoleEntry,
  type CollaboratorRolesJson,
} from "@/lib/collaborator-roles";

export interface UrlItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  createdAt: string;
  isFavorite: boolean;
  tags?: string[];
  notes?: string;
  reminder?: string;
  clickCount?: number; // Track how many times this URL has been clicked
  position?: number; // Position in the list (used for ordering) - simpler than array reordering
  // URL Health Monitoring fields
  healthStatus?: "healthy" | "warning" | "broken" | "unknown"; // Health status
  healthCheckedAt?: string; // ISO date string - when health was last checked
  healthLastStatus?: number; // Last HTTP status code received
  healthResponseTime?: number; // Response time in milliseconds
}

/**
 * Get all lists for a user (full rows — SC duplicate detection, etc.)
 */
export async function getUserLists(userId: string) {
  return prisma.list.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

type UserListCardRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  urlCount: number | bigint;
  createdAt: Date;
  updatedAt: Date;
  collaborators: string[];
};

/**
 * My Lists card grid — urlCount via jsonb_array_length; never loads urls JSON.
 */
export async function getUserListCards(userId: string) {
  const rows = await prisma.$queryRaw<UserListCardRow[]>`
    SELECT
      id,
      slug,
      title,
      description,
      is_public AS "isPublic",
      COALESCE(jsonb_array_length(urls), 0)::int AS "urlCount",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      collaborators
    FROM lists
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    isPublic: row.isPublic,
    urlCount: Number(row.urlCount),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    collaborators: row.collaborators ?? [],
  }));
}

type PublicListCardRow = UserListCardRow & { ownerEmail: string | null };

/**
 * Browse public cards — count-only urls + owner email; no urls JSON blob.
 */
export async function getPublicListCards(options: {
  page: number;
  limit: number;
  search?: string;
}) {
  const page = Math.max(1, options.page);
  const limit = Math.min(100, Math.max(1, options.limit));
  const skip = (page - 1) * limit;
  const search = options.search?.trim() ?? "";
  const searchPattern = search.length > 0 ? `%${search}%` : null;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<PublicListCardRow[]>`
      SELECT
        l.id,
        l.slug,
        l.title,
        l.description,
        l.is_public AS "isPublic",
        COALESCE(jsonb_array_length(l.urls), 0)::int AS "urlCount",
        l.created_at AS "createdAt",
        l.updated_at AS "updatedAt",
        l.collaborators,
        u.email AS "ownerEmail"
      FROM lists l
      INNER JOIN users u ON u.id = l.user_id
      WHERE l.is_public = true
        AND (
          ${searchPattern}::text IS NULL
          OR l.title ILIKE ${searchPattern}
          OR l.description ILIKE ${searchPattern}
        )
      ORDER BY l.updated_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*)::int AS count
      FROM lists l
      WHERE l.is_public = true
        AND (
          ${searchPattern}::text IS NULL
          OR l.title ILIKE ${searchPattern}
          OR l.description ILIKE ${searchPattern}
        )
    `,
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const lists = rows.map((row) => {
    const email = row.ownerEmail?.trim();
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      isPublic: row.isPublic,
      urlCount: Number(row.urlCount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      collaborators: row.collaborators ?? [],
      ...(email ? { user: { email } } : {}),
    };
  });

  return {
    lists,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

/** Owner fields safe for API / dehydrate — never include password. */
const listOwnerSelect = {
  id: true,
  email: true,
} as const;

/**
 * Get a list by slug
 */
export async function getListBySlug(slug: string) {
  return prisma.list.findUnique({
    where: { slug },
  });
}

/**
 * Get a list by ID
 */
export async function getListById(id: string) {
  return prisma.list.findUnique({
    where: { id },
    include: { user: { select: listOwnerSelect } },
  });
}

/**
 * Get a list by slug or ID (unified helper)
 * Tries to fetch by slug first, then by ID if not found
 * This allows API routes to accept both slug and UUID identifiers
 */
export async function getListBySlugOrId(identifier: string) {
  // Try slug first (most common case)
  let list = await prisma.list.findUnique({
    where: { slug: identifier },
    include: { user: { select: listOwnerSelect } },
  });

  // If not found by slug, try by ID
  if (!list) {
    list = await prisma.list.findUnique({
      where: { id: identifier },
      include: { user: { select: listOwnerSelect } },
    });
  }

  return list;
}

/**
 * Get a public list by slug
 */
export async function getPublicListBySlug(slug: string) {
  return prisma.list.findFirst({
    where: {
      slug,
      isPublic: true,
    },
  });
}

/**
 * Generate a unique slug by checking if it exists and appending a number if needed
 */
export async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists
  let existingList = await prisma.list.findUnique({
    where: { slug },
  });

  // If slug exists, append a number until we find a unique one
  while (existingList) {
    slug = `${baseSlug}-${counter}`;
    existingList = await prisma.list.findUnique({
      where: { slug },
    });
    counter++;
  }

  return slug;
}

/**
 * Create a new list
 */
export async function createList(data: {
  title: string;
  description?: string;
  slug: string;
  urls?: UrlItem[];
  isPublic?: boolean;
  userId: string;
}) {
  // Generate a unique slug
  const uniqueSlug = await generateUniqueSlug(data.slug);

  return prisma.list.create({
    data: {
      title: data.title,
      description: data.description || null,
      slug: uniqueSlug,
      urls: (data.urls || []) as unknown as Prisma.InputJsonValue,
      isPublic: data.isPublic || false,
      userId: data.userId,
    },
  });
}

/**
 * Update a list
 */
export async function updateList(
  listId: string,
  updates: {
    title?: string;
    description?: string | null;
    urls?: UrlItem[];
    archivedUrls?: UrlItem[];
    isPublic?: boolean;
  }
) {
  const updateData: {
    title?: string;
    description?: string | null;
    urls?: Prisma.InputJsonValue;
    archivedUrls?: Prisma.InputJsonValue;
    isPublic?: boolean;
  } = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined)
    updateData.description = updates.description || null;
  if (updates.urls !== undefined)
    updateData.urls = updates.urls as unknown as Prisma.InputJsonValue;
  if (updates.archivedUrls !== undefined)
    updateData.archivedUrls =
      updates.archivedUrls as unknown as Prisma.InputJsonValue;
  if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;

  // Only update if there's actually data to update
  if (Object.keys(updateData).length === 0) {
    return prisma.list.findUnique({ where: { id: listId } });
  }

  return prisma.list.update({
    where: { id: listId },
    data: updateData,
  });
}

/**
 * Delete a list
 */
export async function deleteList(listId: string) {
  return prisma.list.delete({
    where: { id: listId },
  });
}

/**
 * Add collaborator to a list with a specific role
 * Also maintains legacy collaborators array for backward compatibility
 */
export async function addCollaborator(
  listId: string,
  email: string,
  role: "editor" | "viewer" = "editor",
  invitedByEmail?: string | null,
) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    throw new Error("List not found");
  }

  // Normalize email to lowercase for duplicate checking
  const trimmedEmail = email.trim();
  const normalizedEmail = trimmedEmail.toLowerCase();

  const collaboratorRoles =
    ((list.collaboratorRoles as CollaboratorRolesJson) || {}) as CollaboratorRolesJson;

  // Check for existing collaborator (case-insensitive) - update role if exists
  const existingEmailKey = Object.keys(collaboratorRoles).find(
    (key) => key.toLowerCase() === normalizedEmail
  );

  if (existingEmailKey) {
    const previous = parseCollaboratorRoleEntry(collaboratorRoles[existingEmailKey]);
    collaboratorRoles[existingEmailKey] = buildCollaboratorRoleEntry(role, {
      invitedByEmail: invitedByEmail ?? previous?.invitedByEmail,
      previous,
    });
  } else {
    collaboratorRoles[trimmedEmail] = buildCollaboratorRoleEntry(role, {
      invitedByEmail: invitedByEmail ?? null,
    });
  }

  // Also maintain legacy collaborators array for backward compatibility
  const collaborators = list.collaborators || [];
  // Check for duplicate (case-insensitive) before adding
  const emailExists = collaborators.some(
    (collabEmail) => collabEmail.toLowerCase() === normalizedEmail
  );
  if (!emailExists) {
    collaborators.push(trimmedEmail);
  }

  return prisma.list.update({
    where: { id: listId },
    data: {
      collaboratorRoles: collaboratorRoles as unknown as Prisma.InputJsonValue,
      collaborators,
    },
  });
}

/**
 * Update collaborator role
 */
export async function updateCollaboratorRole(
  listId: string,
  email: string,
  role: "editor" | "viewer"
) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    throw new Error("List not found");
  }

  const collaboratorRoles =
    ((list.collaboratorRoles as CollaboratorRolesJson) || {}) as CollaboratorRolesJson;
  const emailLower = email.toLowerCase();
  const matchingKey =
    Object.keys(collaboratorRoles).find((key) => key.toLowerCase() === emailLower) ||
    email;
  const previous = parseCollaboratorRoleEntry(collaboratorRoles[matchingKey]);
  collaboratorRoles[matchingKey] = buildCollaboratorRoleEntry(role, {
    previous,
    invitedByEmail: previous?.invitedByEmail,
    invitedAt: previous?.invitedAt,
  });

  return prisma.list.update({
    where: { id: listId },
    data: {
      collaboratorRoles: collaboratorRoles as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Remove collaborator from a list
 * Removes from both collaboratorRoles and legacy collaborators array
 */
export async function removeCollaborator(listId: string, email: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    throw new Error("List not found");
  }

  // Remove from collaboratorRoles (case-insensitive key match)
  const collaboratorRoles =
    (list.collaboratorRoles as Record<string, unknown>) || {};
  const emailLower = email.toLowerCase();
  for (const key of Object.keys(collaboratorRoles)) {
    if (key.toLowerCase() === emailLower) {
      delete collaboratorRoles[key];
    }
  }

  // Remove from legacy collaborators array
  const collaborators = (list.collaborators || []).filter(
    (e) => e.toLowerCase() !== emailLower,
  );

  return prisma.list.update({
    where: { id: listId },
    data: {
      collaboratorRoles: collaboratorRoles as unknown as Prisma.InputJsonValue,
      collaborators,
    },
  });
}

/**
 * Get all collaborators with their roles (+ optional invite metadata)
 */
export async function getCollaboratorsWithRoles(listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    throw new Error("List not found");
  }

  return listCollaboratorsFromRoles(
    list.collaboratorRoles as CollaboratorRolesJson | null,
    list.collaborators || [],
  );
}
