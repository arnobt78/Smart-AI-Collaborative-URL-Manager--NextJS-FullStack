import { getCurrentUser } from "@/lib/auth";
import { getListBySlugOrId } from "@/lib/db";
import { getRoleForListUser, type UserRole } from "@/lib/collaboration/permissions";

export type ListRoutePermission = "view" | "edit" | "visibility" | "delete";

export type ListRouteAccessResult =
  | {
      ok: true;
      list: NonNullable<Awaited<ReturnType<typeof getListBySlugOrId>>>;
      user: Awaited<ReturnType<typeof getCurrentUser>>;
      role: UserRole;
    }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Canonically resolve a slug or id and authorize it before a route reads private
 * data or performs side effects. This avoids IDORs and avoids a second DB read
 * for permission resolution.
 */
export async function resolveAuthorizedList(
  identifier: string,
  permission: ListRoutePermission,
): Promise<ListRouteAccessResult> {
  const list = await getListBySlugOrId(identifier);
  if (!list) return { ok: false, status: 404, error: "List not found" };

  const user = await getCurrentUser();
  const role = getRoleForListUser(list, user);

  if (permission === "view") {
    if (role === "none") {
      return { ok: false, status: user ? 403 : 401, error: "Unauthorized" };
    }
  } else {
    if (!user) return { ok: false, status: 401, error: "Unauthorized" };
    if (permission === "edit" && role !== "owner" && role !== "editor") {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    if ((permission === "visibility" || permission === "delete") && role !== "owner") {
      return { ok: false, status: 403, error: "Forbidden" };
    }
  }

  return { ok: true, list, user, role };
}
