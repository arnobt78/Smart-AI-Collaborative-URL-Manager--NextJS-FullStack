import { getCurrentUser } from "@/lib/auth";
import { getListById } from "@/lib/db";

export type UserRole = "owner" | "editor" | "viewer" | "none";

export interface PermissionCheck {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canComment: boolean;
  role: UserRole;
}

/**
 * Get user role for a list
 */
export async function getUserRole(
  listId: string,
  userId?: string
): Promise<UserRole> {
  if (!userId) return "none";

  const list = await getListById(listId);
  if (!list) return "none";

  // Owner
  if (list.userId === userId) return "owner";

  // Check if user is a collaborator
  const user = await getCurrentUser();
  if (!user || user.id !== userId) return "none";

  if (list.collaborators && list.collaborators.includes(user.email)) {
    // For now, all collaborators are editors
    // Later we can add role field to collaborators
    return "editor";
  }

  // Public list - viewer access
  if (list.isPublic) return "viewer";

  return "none";
}

/**
 * Check permissions for a user on a list
 */
export async function checkPermissions(
  listId: string,
  userId?: string
): Promise<PermissionCheck> {
  const role = await getUserRole(listId, userId);

  return {
    canEdit: role === "owner" || role === "editor",
    canDelete: role === "owner",
    canInvite: role === "owner",
    canComment: role !== "none",
    role,
  };
}

/**
 * Require permission - throws error if user doesn't have permission
 */
export async function requirePermission(
  listId: string,
  userId: string,
  permission: "edit" | "delete" | "invite" | "comment"
): Promise<void> {
  const perms = await checkPermissions(listId, userId);

  if (permission === "edit" && !perms.canEdit) {
    throw new Error("You don't have permission to edit this list");
  }
  if (permission === "delete" && !perms.canDelete) {
    throw new Error("You don't have permission to delete this list");
  }
  if (permission === "invite" && !perms.canInvite) {
    throw new Error("You don't have permission to invite collaborators");
  }
  if (permission === "comment" && !perms.canComment) {
    throw new Error("You don't have permission to comment on this list");
  }
}

