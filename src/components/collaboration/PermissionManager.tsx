"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { CancelButton } from "@/components/ui/ActionButtons";
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
  Send,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPermissions } from "@/hooks/useListPermissions";
import {
  useAddCollaborator,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
  listQueryKeys,
} from "@/hooks/useListQueries";
import { glassPrimaryButtonClass } from "@/lib/ui/glass-button-styles";
import { Dialog } from "@/components/ui/Dialog";

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
  listSlug,
  onUpdate,
}: PermissionManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [expandedCollaborator, setExpandedCollaborator] = useState<
    string | null
  >(null);

  // Use React Query mutations
  const addCollaboratorMutation = useAddCollaborator(listId, listSlug);
  const updateRoleMutation = useUpdateCollaboratorRole(listId, listSlug);
  const removeCollaboratorMutation = useRemoveCollaborator(listId, listSlug);

  // Read collaborators directly from React Query cache (populated by unified endpoint)
  // Unified endpoint populates cache automatically, SSE events handle real-time updates
  const collaborators = (() => {
    const cached = queryClient.getQueryData<{
      collaborators: Array<{ email: string; role: string }>;
    }>(listQueryKeys.collaborators(listId));
    return cached?.collaborators || [];
  })();

  const isLoading = false; // No separate loading state needed - unified query handles it

  // Listen for collaborators from unified endpoint (real-time updates via SSE)
  useEffect(() => {
    const handleUnifiedCollaborators = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId: string;
        collaborators: Collaborator[];
      }>;

      const eventListId = customEvent.detail?.listId;
      const eventCollaborators = customEvent.detail?.collaborators;

      if (eventListId === listId && Array.isArray(eventCollaborators)) {
        // Deduplicate collaborators by email (case-insensitive)
        const uniqueCollaborators = eventCollaborators.reduce<Collaborator[]>(
          (acc, collaborator) => {
            const emailLower = collaborator.email.toLowerCase();
            const exists = acc.some(
              (c) => c.email.toLowerCase() === emailLower,
            );
            if (!exists) {
              acc.push(collaborator);
            }
            return acc;
          },
          [],
        );

        queryClient.setQueryData<{ collaborators: Collaborator[] }>(
          listQueryKeys.collaborators(listId),
          { collaborators: uniqueCollaborators },
        );
      }
    };

    window.addEventListener(
      "unified-collaborators-updated",
      handleUnifiedCollaborators,
    );

    return () => {
      window.removeEventListener(
        "unified-collaborators-updated",
        handleUnifiedCollaborators,
      );
    };
  }, [listId, queryClient]);

  // Collaborators are read directly from React Query cache (populated by unified endpoint)

  // CRITICAL: Collaborators cache is automatically updated via unified-collaborators-updated event
  // The unified endpoint populates collaborators cache when it refetches (triggered by setupSSECacheSync)
  // No need for separate invalidation here - unified query invalidation handles everything
  // The unified-collaborators-updated event listener (above) already updates the cache reactively

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

    // Use React Query mutation (handles optimistic updates, rollback, and toasts automatically)
    addCollaboratorMutation.mutate(
      { email: newEmail.trim(), role: newRole },
      {
        onSuccess: () => {
          setNewEmail("");
          requestAnimationFrame(() => setInviteDialogOpen(false));
          onUpdate?.();
        },
      },
    );
  };

  // Update collaborator role
  const handleUpdateRole = async (newRole: "editor" | "viewer") => {
    if (!roleChangeDialog.email) return;

    const emailToUpdate = roleChangeDialog.email;

    // Use React Query mutation (handles optimistic updates, rollback, and toasts automatically)
    updateRoleMutation.mutate(
      { email: emailToUpdate, role: newRole },
      {
        onSuccess: () => {
          requestAnimationFrame(() => {
            setRoleChangeDialog({
              open: false,
              email: "",
              currentRole: "editor",
            });
          });
          onUpdate?.();
        },
      },
    );
  };

  // Remove collaborator
  const handleRemoveCollaborator = async () => {
    if (!deleteDialog.email) return;

    const emailToDelete = deleteDialog.email;

    // Use React Query mutation (handles optimistic updates, rollback, and toasts automatically)
    removeCollaboratorMutation.mutate(emailToDelete, {
        onSuccess: () => {
          requestAnimationFrame(() => {
            setDeleteDialog({ open: false, email: "" });
            setExpandedCollaborator(null);
          });
          onUpdate?.();
        },
    });
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

  const addCollaboratorButton = (
    <Button
      variant="glassEmerald"
      size="sm"
      onClick={() => setInviteDialogOpen(true)}
      disabled={!canInvite}
      className="w-full sm:w-auto shrink-0"
    >
      <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden />
      <span>Add Collaborator</span>
    </Button>
  );

  const isEmpty = !isLoading && collaborators.length === 0;

  return (
    <div className={isEmpty ? undefined : "space-y-2 sm:space-y-3"}>
      {/* Empty: one compact row — title | invite copy | Add. Populated/loading: header + list */}
      {isEmpty ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Shield className="h-4 w-4  text-white" />
            <h3 className="text-base sm:text-lg font-medium text-white">
              Collaborators
            </h3>
          </div>
          <p className="flex-1 min-w-0 text-xs sm:text-sm text-white/60 text-center sm:truncate">
            No collaborators yet · Invite others to collaborate on this list
          </p>
          {addCollaboratorButton}
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4  text-white" />
              <h3 className="text-base sm:text-lg font-medium text-white">
                Collaborators
              </h3>
              {collaborators.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 sm:ml-2 bg-blue-500/30 text-blue-200 border-blue-400/50 text-xs sm:text-sm"
                >
                  {collaborators.length}
                </Badge>
              )}
            </div>
            {addCollaboratorButton}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-white/5 border border-white/10 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Deduplicate collaborators before rendering to prevent duplicate keys */}
              {(collaborators as Collaborator[])
                .reduce<Collaborator[]>((acc, collaborator) => {
                  const emailLower = collaborator.email.toLowerCase();
                  const exists = acc.some(
                    (c) => c.email.toLowerCase() === emailLower,
                  );
                  if (!exists) {
                    acc.push(collaborator);
                  }
                  return acc;
                }, [])
                .map((collaborator, index) => (
                  <div
                    key={`${collaborator.email.toLowerCase()}-${index}`}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-0">
                      <div className="flex items-center gap-2 sm:gap-2 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-400/50 flex items-center justify-center">
                          <Mail className="h-4 w-4  text-purple-200" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base text-white font-medium truncate">
                            {collaborator.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className={`${getRoleBadgeColor(
                                collaborator.role,
                              )} inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border`}
                            >
                              {getRoleIcon(collaborator.role)}
                              <span className="capitalize">
                                {collaborator.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center  flex-shrink-0">
                        {expandedCollaborator === collaborator.email ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedCollaborator(null)}
                            className="text-white/80 hover:text-white hover:bg-white/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
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
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-end gap-2">
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
        </>
      )}

      {/* Add Collaborator Dialog - Custom Implementation with Role Selection */}
      <Dialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !addCollaboratorMutation.isPending) {
            setInviteDialogOpen(false);
            setNewEmail("");
          }
        }}
        title="Add Collaborator"
        description="Invite someone to collaborate on this list. They’ll receive an email invitation."
        pending={addCollaboratorMutation.isPending}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white pb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="collaborator@example.com"
              disabled={addCollaboratorMutation.isPending}
              className="w-full"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  newEmail.trim() &&
                  !addCollaboratorMutation.isPending
                ) {
                  handleAddCollaborator();
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white pb-2">
              Role
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewRole("editor")}
                disabled={addCollaboratorMutation.isPending}
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
                disabled={addCollaboratorMutation.isPending}
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
          <div className="flex justify-end gap-2 pt-2">
            <CancelButton
              onClick={() => {
                if (!addCollaboratorMutation.isPending) {
                  setInviteDialogOpen(false);
                  setNewEmail("");
                }
              }}
              disabled={addCollaboratorMutation.isPending}
            >
              Cancel
            </CancelButton>
            <Button
              type="button"
              onClick={handleAddCollaborator}
              disabled={addCollaboratorMutation.isPending || !newEmail.trim()}
              isLoading={addCollaboratorMutation.isPending}
              variant="glass"
            >
              {!addCollaboratorMutation.isPending ? (
                <Send className="h-4 w-4" aria-hidden />
              ) : null}
              {addCollaboratorMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={roleChangeDialog.open}
        onOpenChange={(open) => {
          if (!open && !updateRoleMutation.isPending) {
            setRoleChangeDialog({ open: false, email: "", currentRole: "editor" });
          }
        }}
        title="Change Collaborator Role"
        description={`Choose a role for ${roleChangeDialog.email}.`}
        pending={updateRoleMutation.isPending}
      >
        <div className="space-y-4 sm:space-y-6">
          <div className="flex gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() =>
                setRoleChangeDialog({
                  ...roleChangeDialog,
                  currentRole: "editor",
                })
              }
              disabled={updateRoleMutation.isPending}
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
              disabled={updateRoleMutation.isPending}
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
          <div className="flex justify-end gap-2 sm:gap-3">
            <CancelButton
              onClick={() =>
                setRoleChangeDialog({
                  open: false,
                  email: "",
                  currentRole: "editor",
                })
              }
              disabled={updateRoleMutation.isPending}
              className="px-4"
            >
              Cancel
            </CancelButton>
            <button
              onClick={() => handleUpdateRole(roleChangeDialog.currentRole)}
              disabled={updateRoleMutation.isPending}
              className={glassPrimaryButtonClass("blue", "px-4 py-2 text-sm")}
            >
              {updateRoleMutation.isPending && (
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
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!removeCollaboratorMutation.isPending) {
            setDeleteDialog({ ...deleteDialog, open });
          }
        }}
        title="Remove Collaborator"
        description={`Are you sure you want to remove ${deleteDialog.email} from this list? They will lose access immediately.`}
        confirmText="Remove"
        pending={removeCollaboratorMutation.isPending}
        pendingText="Removing..."
        closeOnConfirm={false}
        onConfirm={handleRemoveCollaborator}
        variant="destructive"
      />
    </div>
  );
}
