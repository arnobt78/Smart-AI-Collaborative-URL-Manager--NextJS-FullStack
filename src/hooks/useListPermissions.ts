"use client";

import { useMemo } from "react";
import { useSession } from "./useSession";
import { useStore } from "@nanostores/react";
import { currentList, type UrlList } from "@/stores/urlListStore";
import {
  resolveCollaboratorRole,
  type CollaboratorRolesJson,
} from "@/lib/collaborator-roles";

export type UserRole = "owner" | "editor" | "viewer" | "none";

export interface PermissionCheck {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canComment: boolean;
  role: UserRole;
}

type ListLike = Partial<UrlList> & {
  id?: string;
  userId?: string;
  collaboratorRoles?: CollaboratorRolesJson | unknown;
  collaborators?: string[];
  isPublic?: boolean;
};

/**
 * Client-side hook to check user permissions on a list.
 * Prefer `listOverride` (RQ unified list) so Switch/actions enable before store sync.
 */
export function useListPermissions(listOverride?: ListLike | null): PermissionCheck {
  const { user } = useSession();
  const storeList = useStore(currentList);

  return useMemo(() => {
    const list: ListLike | undefined =
      listOverride?.id
        ? ({ ...storeList, ...listOverride } as ListLike)
        : storeList;

    if (!user || !list?.id) {
      return {
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canComment: false,
        role: "none" as UserRole,
      };
    }

    if (list.userId === user.id) {
      return {
        canEdit: true,
        canDelete: true,
        canInvite: true,
        canComment: true,
        role: "owner" as UserRole,
      };
    }

    const collabRole = resolveCollaboratorRole(
      list.collaboratorRoles as CollaboratorRolesJson | null | undefined,
      user.email,
    );

    if (collabRole === "editor") {
      return {
        canEdit: true,
        canDelete: false,
        canInvite: false,
        canComment: true,
        role: "editor" as UserRole,
      };
    }

    if (collabRole === "viewer") {
      return {
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canComment: true,
        role: "viewer" as UserRole,
      };
    }

    if (list.collaborators && Array.isArray(list.collaborators)) {
      const userEmailLower = user.email.toLowerCase();
      if (
        list.collaborators.some(
          (email) => email.toLowerCase() === userEmailLower,
        )
      ) {
        return {
          canEdit: true,
          canDelete: false,
          canInvite: false,
          canComment: true,
          role: "editor" as UserRole,
        };
      }
    }

    if (list.isPublic) {
      return {
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canComment: true,
        role: "viewer" as UserRole,
      };
    }

    return {
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canComment: false,
      role: "none" as UserRole,
    };
  }, [user, storeList, listOverride]);
}
