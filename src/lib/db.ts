import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

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
 * Get all lists for a user
 */
export async function getUserLists(userId: string) {
  return prisma.list.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

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
    include: { user: true },
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
    include: { user: true },
  });

  // If not found by slug, try by ID
  if (!list) {
    list = await prisma.list.findUnique({
      where: { id: identifier },
      include: { user: true },
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
    description?: string;
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
  role: "editor" | "viewer" = "editor"
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

  // Update collaboratorRoles (new role-based system)
  const collaboratorRoles =
    (list.collaboratorRoles as Record<string, string>) || {};

  // Check for existing collaborator (case-insensitive) - update role if exists
  const existingEmailKey = Object.keys(collaboratorRoles).find(
    (key) => key.toLowerCase() === normalizedEmail
  );

  if (existingEmailKey) {
    // Update existing collaborator's role (keep original email casing from database)
    collaboratorRoles[existingEmailKey] = role;
  } else {
    // Add new collaborator with trimmed email
    collaboratorRoles[trimmedEmail] = role;
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
    (list.collaboratorRoles as Record<string, string>) || {};
  collaboratorRoles[email] = role;

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

  // Remove from collaboratorRoles
  const collaboratorRoles =
    (list.collaboratorRoles as Record<string, string>) || {};
  delete collaboratorRoles[email];

  // Remove from legacy collaborators array
  const collaborators = (list.collaborators || []).filter((e) => e !== email);

  return prisma.list.update({
    where: { id: listId },
    data: {
      collaboratorRoles: collaboratorRoles as unknown as Prisma.InputJsonValue,
      collaborators,
    },
  });
}

/**
 * Get all collaborators with their roles
 */
export async function getCollaboratorsWithRoles(listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    throw new Error("List not found");
  }

  const roles = (list.collaboratorRoles as Record<string, string>) || {};
  const collaborators: Array<{ email: string; role: "editor" | "viewer" }> = [];

  // Get from collaboratorRoles first
  for (const [email, role] of Object.entries(roles)) {
    if (role === "editor" || role === "viewer") {
      collaborators.push({ email, role });
    }
  }

  // Also check legacy collaborators array for any missing (backward compatibility)
  const legacyCollaborators = list.collaborators || [];
  for (const email of legacyCollaborators) {
    if (!roles[email]) {
      // Legacy collaborator without role - default to editor
      collaborators.push({ email, role: "editor" as const });
    }
  }

  return collaborators;
}
