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

type AccessibleList = {
  userId: string;
  isPublic: boolean;
  collaboratorRoles?: unknown;
  collaborators?: string[];
};

type SessionUser = { id: string; email: string } | null;

/**
 * Resolve a role from an already-loaded list so route handlers do not repeat a
 * database lookup merely to authorize an operation on that same list.
 */
export function getRoleForListUser(
  list: AccessibleList,
  user: SessionUser,
): UserRole {
  // Public visibility is for authenticated Daily Urlist members, not anonymous
  // internet access. Every list read therefore starts with a cookie session.
  if (!user) return "none";

  if (list.userId === user.id) return "owner";

  if (list.collaboratorRoles && typeof list.collaboratorRoles === "object") {
    const roles = list.collaboratorRoles as Record<string, string>;
    const userEmailLower = user.email.toLowerCase();
    const matchingKey = Object.keys(roles).find(
      (key) => key.toLowerCase() === userEmailLower,
    );

    if (matchingKey) {
      const role = roles[matchingKey];
      if (role === "editor" || role === "viewer") return role;
    }
  }

  if (
    list.collaborators?.some(
      (email) => email.toLowerCase() === user.email.toLowerCase(),
    )
  ) {
    return "editor";
  }

  return list.isPublic ? "viewer" : "none";
}

/**
 * Get user role for a list
 * Priority: Owner > Collaborator (from collaboratorRoles) > Viewer (if public)
 */
export async function getUserRole(
  listId: string,
  userId?: string
): Promise<UserRole> {
  if (!userId) return "none";

  const list = await getListById(listId);
  if (!list) return "none";

  const user = await getCurrentUser();
  if (!user || user.id !== userId) return "none";
  return getRoleForListUser(list, user);
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
    canDelete: role === "owner", // Only owner can delete
    canInvite: role === "owner", // Only owner can invite/manage collaborators
    canComment: role !== "none", // Owner, editor, and viewer can comment
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

/**
 * Check if a user has access to view a list
 * This validates both the new role-based system and legacy collaborators array
 * Returns true if user can access the list, false otherwise
 */
export async function hasListAccess(
  list: AccessibleList,
  user: SessionUser,
): Promise<boolean> {
  return getRoleForListUser(list, user) !== "none";
}
