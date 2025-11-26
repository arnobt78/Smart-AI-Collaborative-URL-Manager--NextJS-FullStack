"use client";

import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useToast } from "@/components/ui/Toaster";
import {
  UserPlus,
  Mail,
  Edit3,
  Eye,
  X,
  Shield,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { queryClient } from "@/lib/react-query";
import { useQuery } from "@tanstack/react-query";
import { useListPermissions } from "@/hooks/useListPermissions";

export interface Collaborator {
  email: string;
  role: "editor" | "viewer";
}

export interface PermissionManagerProps {
  listId: string;
  listTitle: string;
  listSlug: string;
  onUpdate?: () => void; // Optional callback when list is updated
}

export function PermissionManager({
  listId,
  listTitle,
  listSlug,
  onUpdate,
}: PermissionManagerProps) {
  const { toast } = useToast();
  const permissions = useListPermissions(); // Get permissions for current list and user
  const canInvite = permissions.canInvite; // Only owners can invite
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    email: string;
    currentRole: "editor" | "viewer";
  }>({ open: false, email: "", currentRole: "editor" });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    email: string;
  }>({ open: false, email: "" });
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "viewer">("editor");
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedCollaborator, setExpandedCollaborator] = useState<
    string | null
  >(null);

  // Fetch collaborators with React Query caching (5 minute stale time)
  const {
    data: collaboratorsData,
    isLoading,
    refetch: refetchCollaborators,
  } = useQuery<{ collaborators: Collaborator[] }>({
    queryKey: [`collaborators:${listId}`],
    queryFn: async () => {
      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch collaborators");
      }

      return response.json();
    },
    enabled: !!listId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache kept for 10 minutes after last use
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent duplicate requests
    refetchOnReconnect: false, // Don't refetch on network reconnect to prevent duplicate requests
    refetchOnMount: false, // Don't refetch on mount if we have cached data (optimistic updates handle UI)
  });

  const collaborators = collaboratorsData?.collaborators || [];

  // Listen for real-time role updates to refresh collaborators list and permissions
  useEffect(() => {
    const handleListUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId: string;
        action?: string;
      }>;

      // Only handle collaborator_role_updated events for this list
      if (
        customEvent.detail?.listId === listId &&
        customEvent.detail?.action === "collaborator_role_updated"
      ) {
        console.log(
          "🔄 [PERMISSIONS] Role updated (from list-updated) - refreshing collaborators and permissions"
        );
        // Invalidate collaborators query to refetch with new roles
        queryClient.invalidateQueries({
          queryKey: [`collaborators:${listId}`],
        });
        // The unified endpoint will update currentList store, which will trigger useListPermissions to recalculate
      }
    };

    const handleUnifiedUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        action?: string;
      }>;

      // Handle collaborator_role_updated from unified-update events
      if (
        customEvent.detail?.listId === listId &&
        customEvent.detail?.action === "collaborator_role_updated"
      ) {
        console.log(
          "🔄 [PERMISSIONS] Role updated (from unified-update) - refreshing collaborators and permissions"
        );
        // Invalidate collaborators query to refetch with new roles
        queryClient.invalidateQueries({
          queryKey: [`collaborators:${listId}`],
        });
        // The unified endpoint will update currentList store, which will trigger useListPermissions to recalculate
      }
    };

    window.addEventListener("list-updated", handleListUpdate);
    window.addEventListener("unified-update", handleUnifiedUpdate);
    return () => {
      window.removeEventListener("list-updated", handleListUpdate);
      window.removeEventListener("unified-update", handleUnifiedUpdate);
    };
  }, [listId, queryClient]);

  // Add collaborator
  const handleAddCollaborator = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "error",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "error",
      });
      return;
    }

    try {
      // Mark as local operation BEFORE API call to help ActivityFeed debounce real-time events
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("local-operation"));
      }

      setIsAdding(true);

      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add collaborator");
      }

      const data = await response.json();

      toast({
        title: "Collaborator Added! ✅",
        description: `${newEmail.trim()} has been added as ${newRole}.${
          data.emailSent
            ? " An invitation email has been sent."
            : data.emailError
            ? ` Note: Email could not be sent (${data.emailError}).`
            : ""
        }`,
        variant: "success",
      });

      // Optimistic update: Update UI immediately with new collaborator
      queryClient.setQueryData<{ collaborators: Collaborator[] }>(
        [`collaborators:${listId}`],
        (old) => ({
          collaborators: [
            ...(old?.collaborators || []),
            { email: newEmail.trim(), role: newRole },
          ],
        })
      );

      // No need to update list state - optimistic update already handled it
      // Updating currentList here could trigger unnecessary getList() calls

      // No need to invalidate - optimistic update already syncs cache

      // Local operation already marked before API call
      // UNIFIED APPROACH: SSE handles ALL activity-updated events (single source of truth)
      // No local dispatch needed - prevents duplicate API calls

      // Notify parent component
      onUpdate?.();

      // Reset form
      setNewEmail("");
      setNewRole("editor");
      setInviteDialogOpen(false);
    } catch (error) {
      console.error("Failed to add collaborator:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to add collaborator. Please try again.",
        variant: "error",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Update collaborator role
  const handleUpdateRole = async (newRole: "editor" | "viewer") => {
    if (!roleChangeDialog.email) return;

    try {
      // Mark as local operation BEFORE API call to help ActivityFeed debounce real-time events
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("local-operation"));
      }

      setIsUpdating(true);

      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: roleChangeDialog.email,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      // Optimistic update: Update role in UI immediately
      // Use `setQueryData` with `skipRefetch: true` to prevent automatic background refetch
      queryClient.setQueryData<{ collaborators: Collaborator[] }>(
        [`collaborators:${listId}`],
        (old) => {
          const updated = (old?.collaborators || []).map((collab) =>
            collab.email === roleChangeDialog.email
              ? { ...collab, role: newRole }
              : collab
          );
          return { collaborators: updated };
        }
      );

      toast({
        title: "Role Updated! ✅",
        description: `${roleChangeDialog.email} is now a ${newRole}.`,
        variant: "success",
      });

      // No need to invalidate - optimistic update already syncs cache
      // The cache will be automatically refetched when it becomes stale (5 min) or on next mount

      // Local operation already marked before API call
      // UNIFIED APPROACH: SSE handles ALL activity-updated events (single source of truth)
      // No local dispatch needed - prevents duplicate API calls

      // Notify parent component
      onUpdate?.();

      setRoleChangeDialog({ open: false, email: "", currentRole: "editor" });
    } catch (error) {
      console.error("Failed to update role:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update role. Please try again.",
        variant: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async () => {
    if (!deleteDialog.email) return;

    try {
      // Mark as local operation BEFORE API call to help ActivityFeed debounce real-time events
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("local-operation"));
      }

      setIsDeleting(true);

      const response = await fetch(
        `/api/lists/${listId}/collaborators?email=${encodeURIComponent(
          deleteDialog.email
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove collaborator");
      }

      // Optimistic update: Remove collaborator from UI immediately
      queryClient.setQueryData<{ collaborators: Collaborator[] }>(
        [`collaborators:${listId}`],
        (old) => ({
          collaborators: (old?.collaborators || []).filter(
            (collab) => collab.email !== deleteDialog.email
          ),
        })
      );

      toast({
        title: "Collaborator Removed",
        description: `${deleteDialog.email} has been removed from this list.`,
        variant: "success",
      });

      // No need to update list state - optimistic update already handled it
      // Updating currentList here could trigger unnecessary getList() calls

      // No need to invalidate - optimistic update already syncs cache

      // Local operation already marked before API call
      // UNIFIED APPROACH: SSE handles ALL activity-updated events (single source of truth)
      // No local dispatch needed - prevents duplicate API calls

      // Notify parent component
      onUpdate?.();

      setDeleteDialog({ open: false, email: "" });
      setExpandedCollaborator(null);
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to remove collaborator. Please try again.",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleIcon = (role: "editor" | "viewer") => {
    return role === "editor" ? (
      <Edit3 className="h-3 w-3" />
    ) : (
      <Eye className="h-3 w-3" />
    );
  };

  const getRoleBadgeColor = (role: "editor" | "viewer") => {
    return role === "editor"
      ? "bg-purple-500/30 text-purple-200 border-purple-400/50"
      : "bg-blue-500/30 text-blue-200 border-blue-400/50";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Collaborators</h3>
          {collaborators.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 bg-blue-500/30 text-blue-200 border-blue-400/50"
            >
              {collaborators.length}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInviteDialogOpen(true)}
          disabled={!canInvite} // Disable for viewers
          className="flex items-center gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserPlus className="h-4 w-4" />
          Add Collaborator
        </Button>
      </div>

      {/* Collaborators List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 bg-white/5 border border-white/10 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-8">
          <UserPlus className="h-12 w-12 mx-auto mb-3 text-white/40" />
          <p className="text-white/70">No collaborators yet</p>
          <p className="text-sm mt-1 text-white/50">
            Invite others to collaborate on this list
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.email}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-400/50 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-purple-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {collaborator.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`${getRoleBadgeColor(
                          collaborator.role
                        )} inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border`}
                      >
                        {getRoleIcon(collaborator.role)}
                        <span className="capitalize">{collaborator.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {expandedCollaborator === collaborator.email ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canInvite}
                        onClick={() => {
                          if (!canInvite) return; // Prevent action if disabled
                          setRoleChangeDialog({
                            open: true,
                            email: collaborator.email,
                            currentRole: collaborator.role,
                          });
                        }}
                        className={`text-xs hover:text-white hover:bg-white/10 ${
                          !canInvite
                            ? "text-white/40 cursor-not-allowed opacity-50"
                            : "text-white/80"
                        }`}
                      >
                        Change Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedCollaborator(null)}
                        className="text-white/80 hover:text-white hover:bg-white/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedCollaborator(collaborator.email)
                        }
                        className="text-white/80 hover:text-white hover:bg-white/10"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {expandedCollaborator === collaborator.email && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canInvite}
                    onClick={() => {
                      if (!canInvite) return; // Prevent action if disabled
                      setRoleChangeDialog({
                        open: true,
                        email: collaborator.email,
                        currentRole: collaborator.role,
                      });
                    }}
                    className={`text-xs hover:text-white hover:bg-white/10 ${
                      !canInvite
                        ? "text-white/40 cursor-not-allowed opacity-50"
                        : "text-white/80"
                    }`}
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Change Role
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canInvite}
                    onClick={() => {
                      if (!canInvite) return; // Prevent action if disabled
                      setDeleteDialog({
                        open: true,
                        email: collaborator.email,
                      });
                    }}
                    className={`text-xs hover:bg-red-500/10 ${
                      !canInvite
                        ? "text-red-400/40 cursor-not-allowed opacity-50"
                        : "text-red-400 hover:text-red-300"
                    }`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Collaborator Dialog - Custom Implementation with Role Selection */}
      {inviteDialogOpen && typeof window !== "undefined" && document.body
        ? ReactDOM.createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => {
                if (!isAdding) {
                  setInviteDialogOpen(false);
                  setNewEmail("");
                }
              }}
            >
              <div
                className="relative w-full max-w-md mx-4 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl border border-white/20 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    if (!isAdding) {
                      setInviteDialogOpen(false);
                      setNewEmail("");
                    }
                  }}
                  disabled={isAdding}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="pr-8 mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Add Collaborator
                  </h3>
                  <p className="text-white/70">
                    Invite someone to collaborate on this list. They'll receive
                    an email invitation.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="collaborator@example.com"
                      disabled={isAdding}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newEmail.trim() && !isAdding) {
                          handleAddCollaborator();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Role
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRole("editor")}
                        disabled={isAdding}
                        className={`flex-1 p-3 rounded-lg border transition-colors disabled:opacity-50 ${
                          newRole === "editor"
                            ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                            : "bg-white/5 border-white/20 text-white/60 hover:border-white/30 hover:text-white/80"
                        }`}
                      >
                        <Edit3 className="h-5 w-5 mx-auto mb-1" />
                        <div className="text-sm font-medium">Editor</div>
                        <div className="text-xs mt-1 opacity-75">
                          Can add, edit, delete URLs
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole("viewer")}
                        disabled={isAdding}
                        className={`flex-1 p-3 rounded-lg border transition-colors disabled:opacity-50 ${
                          newRole === "viewer"
                            ? "bg-blue-500/30 border-blue-400/50 text-blue-200"
                            : "bg-white/5 border-white/20 text-white/60 hover:border-white/30 hover:text-white/80"
                        }`}
                      >
                        <Eye className="h-5 w-5 mx-auto mb-1" />
                        <div className="text-sm font-medium">Viewer</div>
                        <div className="text-xs mt-1 opacity-75">
                          Can view and comment only
                        </div>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!isAdding) {
                          setInviteDialogOpen(false);
                          setNewEmail("");
                        }
                      }}
                      disabled={isAdding}
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddCollaborator}
                      disabled={isAdding || !newEmail.trim()}
                      isLoading={isAdding}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isAdding ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Role Change Dialog */}
      {roleChangeDialog.open && typeof window !== "undefined" && document.body
        ? ReactDOM.createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl border border-white/20 p-6">
                <button
                  onClick={() =>
                    setRoleChangeDialog({
                      open: false,
                      email: "",
                      currentRole: "editor",
                    })
                  }
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                  disabled={isUpdating}
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="pr-8">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Change Collaborator Role
                  </h3>
                  <p className="text-white/70 mb-6">
                    Choose a role for {roleChangeDialog.email}:
                  </p>
                </div>
                <div className="mt-4 flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() =>
                      setRoleChangeDialog({
                        ...roleChangeDialog,
                        currentRole: "editor",
                      })
                    }
                    disabled={isUpdating}
                    className={`flex-1 p-3 rounded-lg border transition-colors ${
                      roleChangeDialog.currentRole === "editor"
                        ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                        : "bg-white/5 border-white/20 text-white/60 hover:border-white/30 hover:text-white/80"
                    } disabled:opacity-50`}
                  >
                    <Edit3 className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Editor</div>
                    <div className="text-xs mt-1 opacity-75">
                      Can add, edit, delete URLs
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRoleChangeDialog({
                        ...roleChangeDialog,
                        currentRole: "viewer",
                      })
                    }
                    disabled={isUpdating}
                    className={`flex-1 p-3 rounded-lg border transition-colors ${
                      roleChangeDialog.currentRole === "viewer"
                        ? "bg-blue-500/30 border-blue-400/50 text-blue-200"
                        : "bg-white/5 border-white/20 text-white/60 hover:border-white/30 hover:text-white/80"
                    } disabled:opacity-50`}
                  >
                    <Eye className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Viewer</div>
                    <div className="text-xs mt-1 opacity-75">
                      Can view and comment only
                    </div>
                  </button>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() =>
                      setRoleChangeDialog({
                        open: false,
                        email: "",
                        currentRole: "editor",
                      })
                    }
                    disabled={isUpdating}
                    className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateRole(roleChangeDialog.currentRole)
                    }
                    disabled={isUpdating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdating && (
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                    Update Role
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Remove Collaborator"
        description={`Are you sure you want to remove ${deleteDialog.email} from this list? They will lose access immediately.`}
        confirmText={isDeleting ? "Removing..." : "Remove"}
        onConfirm={handleRemoveCollaborator}
        variant="destructive"
      />
    </div>
  );
}
