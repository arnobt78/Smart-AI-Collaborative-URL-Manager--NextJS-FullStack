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
 * Add collaborator to a list
 */
export async function addCollaborator(listId: string, email: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    throw new Error("List not found");
  }

  const collaborators = list.collaborators || [];
  if (!collaborators.includes(email)) {
    collaborators.push(email);
  }

  return prisma.list.update({
    where: { id: listId },
    data: { collaborators },
  });
}
