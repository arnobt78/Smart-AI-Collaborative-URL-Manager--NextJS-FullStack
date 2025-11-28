"use client";

import { useState, useEffect, useRef } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListPermissions } from "@/hooks/useListPermissions";
import { 
  useAddCollaborator, 
  useUpdateCollaboratorRole, 
  useRemoveCollaborator,
  listQueryKeys 
} from "@/hooks/useListQueries";

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

  // Track if unified endpoint has provided collaborators (to avoid redundant fetch)
  const unifiedDataReceivedRef = useRef<boolean>(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if we should fetch collaborators separately (fallback if unified endpoint doesn't populate cache)
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // Fetch collaborators with React Query
  // Unified query populates cache automatically - we just read from it
  // Only fetch separately if unified endpoint didn't provide data after delay
  const {
    data: collaboratorsData,
    isLoading,
    refetch: refetchCollaborators,
  } = useQuery({
    queryKey: listQueryKeys.collaborators(listId),
    queryFn: async () => {
      const response = await fetch(`/api/lists/${listSlug}/updates?activityLimit=30`);
      if (!response.ok) return { collaborators: [] };
      const data = await response.json();
      return { collaborators: data.collaborators || [] };
    },
    enabled: shouldFetch && !!listSlug, // Only fetch if needed and slug is available
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  
  // Check cache immediately (runs once per listId)
  useEffect(() => {
    // Reset flag when listId changes
    unifiedDataReceivedRef.current = false;
    
    // Wait for unified endpoint to populate cache
    const cached = queryClient.getQueryData<{ collaborators: Array<{ email: string; role: string }> }>(
      listQueryKeys.collaborators(listId)
    );
    
    if (cached && cached.collaborators) {
      // Cache already populated by unified endpoint
      unifiedDataReceivedRef.current = true;
      return;
    }
    
    // Wait 1500ms to allow unified endpoint to complete, then check again
    fetchTimeoutRef.current = setTimeout(() => {
      const cachedAfterDelay = queryClient.getQueryData<{ collaborators: Array<{ email: string; role: string }> }>(
        listQueryKeys.collaborators(listId)
      );
      
      if (!cachedAfterDelay && !unifiedDataReceivedRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log(`⚠️ [PERMISSIONS] Unified endpoint didn't provide data after 1500ms, enabling separate fetch`);
        }
        setShouldFetch(true);
      } else if (cachedAfterDelay) {
        if (process.env.NODE_ENV === "development") {
          console.log(`✅ [PERMISSIONS] Found cached collaborators after delay: ${cachedAfterDelay.collaborators?.length || 0} collaborators, separate fetch disabled`);
        }
        unifiedDataReceivedRef.current = true;
      }
    }, 1500); // Increased delay to 1500ms to allow unified endpoint to complete
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [listId, queryClient, shouldFetch, listSlug]);

  // Listen for collaborators from unified endpoint (preferred - no separate API call)
  // Set up listener IMMEDIATELY to catch events that fire before component fully mounts
  useEffect(() => {
    const handleUnifiedCollaborators = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId: string;
        collaborators: Collaborator[];
      }>;
      
      // Handle event if it's for this list (even if collaborators is empty array)
      // Empty array is valid data - it means "no collaborators"
      // Use Array.isArray to handle both empty arrays and populated arrays
      const eventListId = customEvent.detail?.listId;
      const eventCollaborators = customEvent.detail?.collaborators;
      
      console.log(`📥 [PERMISSIONS] Received unified-collaborators-updated event - eventListId: ${eventListId}, componentListId: ${listId}, matches: ${eventListId === listId}, isArray: ${Array.isArray(eventCollaborators)}`);
      
      if (eventListId === listId && Array.isArray(eventCollaborators)) {
        console.log(`✅ [PERMISSIONS] Processing unified collaborators: ${eventCollaborators.length} collaborators`);
        
        // Mark that unified endpoint provided data (prevent separate fetch)
        unifiedDataReceivedRef.current = true;
        setShouldFetch(false); // Disable separate fetch since unified endpoint provided data
        
        // Clear the timeout to prevent separate fetch
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
        
        // Update React Query cache with unified collaborators (bypasses separate fetch)
        // Deduplicate collaborators by email (case-insensitive) to prevent duplicate keys
        // Even if empty array, this prevents the separate API call
        const uniqueCollaborators = eventCollaborators.reduce<Collaborator[]>(
          (acc, collaborator) => {
            const emailLower = collaborator.email.toLowerCase();
            // Check if we already have this collaborator (case-insensitive)
            const exists = acc.some((c) => c.email.toLowerCase() === emailLower);
            if (!exists) {
              acc.push(collaborator);
            }
            return acc;
          },
          []
        );
        
        queryClient.setQueryData<{ collaborators: Collaborator[] }>(
          listQueryKeys.collaborators(listId),
          { collaborators: uniqueCollaborators }
        );
        
        if (process.env.NODE_ENV === "development") {
          console.log(`✅ [PERMISSIONS] Cache updated with ${eventCollaborators.length} collaborators, separate fetch disabled`);
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log(`⏭️ [PERMISSIONS] Ignoring event - listId mismatch or invalid collaborators data`);
        }
      }
    };
    
    // Add listener IMMEDIATELY (before delay timeout) to catch events that fire quickly
    window.addEventListener("unified-collaborators-updated", handleUnifiedCollaborators);
    
    return () => {
      window.removeEventListener("unified-collaborators-updated", handleUnifiedCollaborators);
    };
  }, [listId, queryClient]);

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
          queryKey: listQueryKeys.collaborators(listId),
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
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔄 [PERMISSIONS] Role updated (from unified-update) - refreshing collaborators and permissions"
          );
        }
        // Invalidate collaborators query to refetch with new roles
        queryClient.invalidateQueries({
          queryKey: listQueryKeys.collaborators(listId),
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
    
    // Use React Query mutation (handles optimistic updates, rollback, and toasts automatically)
    addCollaboratorMutation.mutate(
      { email: newEmail.trim(), role: newRole },
      {
        onSuccess: () => {
          setNewEmail("");
          setInviteDialogOpen(false);
          onUpdate?.();
        },
      }
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
          setRoleChangeDialog({ open: false, email: "", currentRole: "editor" });
          onUpdate?.();
        },
      }
    );
  };

  // Legacy handler code (kept for reference - React Query mutation handles this now)
  const handleUpdateRoleLegacy = async (newRole: "editor" | "viewer") => {
    if (!roleChangeDialog.email) return;

    const emailToUpdate = roleChangeDialog.email;
    const previousData = queryClient.getQueryData<{ collaborators: Collaborator[] }>(listQueryKeys.collaborators(listId));

    // OPTIMISTIC UPDATE: Update UI IMMEDIATELY before API call for instant feedback
    queryClient.setQueryData<{ collaborators: Collaborator[] }>(
      listQueryKeys.collaborators(listId),
      (old) => {
        const targetEmailLower = emailToUpdate.toLowerCase();
        // Update role (case-insensitive match) and deduplicate result
        const updated = (old?.collaborators || [])
          .map((collab) =>
            collab.email.toLowerCase() === targetEmailLower
              ? { ...collab, role: newRole }
              : collab
          )
          .reduce<Collaborator[]>((acc, collaborator) => {
            const emailLower = collaborator.email.toLowerCase();
            const exists = acc.some((c) => c.email.toLowerCase() === emailLower);
            if (!exists) {
              acc.push(collaborator);
            }
            return acc;
          }, []);
        return { collaborators: updated };
      }
    );

    // Show toast and close dialog immediately (instant feedback)
    toast({
      title: "Role Updated! ✅",
      description: `${emailToUpdate} is now a ${newRole}.`,
      variant: "success",
    });
    setRoleChangeDialog({ open: false, email: "", currentRole: "editor" });

    try {
      // Mark as local operation BEFORE API call to help ActivityFeed debounce real-time events
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("local-operation"));
      }

      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: emailToUpdate,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Rollback optimistic update on error
        if (previousData) {
          queryClient.setQueryData(listQueryKeys.collaborators(listId), previousData);
        }
        throw new Error(data.error || "Failed to update role");
      }

      // Success - optimistic update already applied, UI already updated

      // Success - optimistic update already applied, UI already updated
      // SSE/unified-update event will sync in background, but UI is already instant
      
      // Notify parent component
      onUpdate?.();
    } catch (error) {
      // Handle expected errors silently (no error overlay):
      // - NetworkError/AbortError (page refresh during bulk import)
      // - Request aborted (normal during page transitions)
      const isExpectedError =
        error instanceof Error &&
        (error.name === "NetworkError" ||
         error.name === "AbortError" ||
         error.message.includes("aborted") ||
         error.message.includes("fetch"));
      
      if (!isExpectedError) {
        // Only show toast for unexpected errors
        // Show error toast (optimistic update already rolled back above)
        console.error("Failed to update role:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to update role. Please try again.",
          variant: "error",
        });
        // Re-open dialog on error so user can retry
        setRoleChangeDialog({ open: true, email: emailToUpdate, currentRole: newRole });
      } else if (process.env.NODE_ENV === "development") {
        // Silently handle expected errors (no console spam)
        console.debug("⏭️ [PERMISSIONS] Update role request aborted (expected during page refresh)");
      }
    } finally {
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async () => {
    if (!deleteDialog.email) return;

    const emailToDelete = deleteDialog.email;

    // Use React Query mutation (handles optimistic updates, rollback, and toasts automatically)
    removeCollaboratorMutation.mutate(
      emailToDelete,
      {
        onSuccess: () => {
          setDeleteDialog({ open: false, email: "" });
          setExpandedCollaborator(null);
          onUpdate?.();
        },
      }
    );
  };

  // Legacy handler code (kept for reference - React Query mutation handles this now)
  const handleRemoveCollaboratorLegacy = async () => {
    if (!deleteDialog.email) return;

    const emailToDelete = deleteDialog.email; // Store before async operations
    const targetEmailLower = emailToDelete.toLowerCase();

    // OPTIMISTIC UPDATE: Update UI IMMEDIATELY before API call for instant feedback
    const previousData = queryClient.getQueryData<{ collaborators: Collaborator[] }>(listQueryKeys.collaborators(listId));
    
    // Remove from UI immediately (before API call)
    queryClient.setQueryData<{ collaborators: Collaborator[] }>(
      listQueryKeys.collaborators(listId),
      (old) => {
        // Remove collaborator (case-insensitive match) and deduplicate result
        const filtered = (old?.collaborators || [])
          .filter(
            (collab) => collab.email.toLowerCase() !== targetEmailLower
          )
          .reduce<Collaborator[]>((acc, collaborator) => {
            const emailLower = collaborator.email.toLowerCase();
            const exists = acc.some((c) => c.email.toLowerCase() === emailLower);
            if (!exists) {
              acc.push(collaborator);
            }
            return acc;
          }, []);
        return { collaborators: filtered };
      }
    );

    // Show toast immediately (instant feedback)
    toast({
      title: "Collaborator Removed",
      description: `${emailToDelete} has been removed from this list.`,
      variant: "success",
    });

    // Close dialog immediately
    setDeleteDialog({ open: false, email: "" });
    setExpandedCollaborator(null);

    try {
      // Mark as local operation BEFORE API call to help ActivityFeed debounce real-time events
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("local-operation"));
      }


      const response = await fetch(
        `/api/lists/${listId}/collaborators?email=${encodeURIComponent(emailToDelete)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Rollback optimistic update on error
        if (previousData) {
          queryClient.setQueryData(listQueryKeys.collaborators(listId), previousData);
        }
        throw new Error(data.error || "Failed to remove collaborator");
      }

      // Success - optimistic update already applied, no need to update again
      // The SSE/unified-update event will sync in background, but UI is already updated

      // Success - optimistic update already applied, UI already updated
      // SSE/unified-update event will sync in background, but UI is already instant
      
      // Notify parent component
      onUpdate?.();
    } catch (error) {
      // Handle expected errors silently (no error overlay):
      // - NetworkError/AbortError (page refresh during bulk import)
      // - Request aborted (normal during page transitions)
      const isExpectedError =
        error instanceof Error &&
        (error.name === "NetworkError" ||
         error.name === "AbortError" ||
         error.message.includes("aborted") ||
         error.message.includes("fetch"));
      
      if (!isExpectedError) {
        // Only show toast for unexpected errors
        // Show error toast (optimistic update already rolled back above)
        console.error("Failed to remove collaborator:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to remove collaborator. Please try again.",
          variant: "error",
        });
        // Re-open dialog on error so user can retry
        setDeleteDialog({ open: true, email: emailToDelete });
      } else if (process.env.NODE_ENV === "development") {
        // Silently handle expected errors (no console spam)
        console.debug("⏭️ [PERMISSIONS] Remove collaborator request aborted (expected during page refresh)");
      }
    } finally {
      // Mutation handles loading state
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
          {/* Deduplicate collaborators before rendering to prevent duplicate keys */}
          {(collaborators as Collaborator[])
            .reduce<Collaborator[]>((acc, collaborator) => {
              const emailLower = collaborator.email.toLowerCase();
              const exists = acc.some((c) => c.email.toLowerCase() === emailLower);
              if (!exists) {
                acc.push(collaborator);
              }
              return acc;
            }, [])
            .map((collaborator, index) => (
            <div
              key={`${collaborator.email.toLowerCase()}-${index}`}
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
                if (!addCollaboratorMutation.isPending) {
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
                    if (!addCollaboratorMutation.isPending) {
                      setInviteDialogOpen(false);
                      setNewEmail("");
                    }
                  }}
                  disabled={addCollaboratorMutation.isPending}
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
                      disabled={addCollaboratorMutation.isPending}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newEmail.trim() && !addCollaboratorMutation.isPending) {
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
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!addCollaboratorMutation.isPending) {
                          setInviteDialogOpen(false);
                          setNewEmail("");
                        }
                      }}
                      disabled={addCollaboratorMutation.isPending}
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddCollaborator}
                      disabled={addCollaboratorMutation.isPending || !newEmail.trim()}
                      isLoading={addCollaboratorMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {addCollaboratorMutation.isPending ? "Sending..." : "Send Invite"}
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
                      disabled={updateRoleMutation.isPending}
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
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() =>
                      setRoleChangeDialog({
                        open: false,
                        email: "",
                        currentRole: "editor",
                      })
                    }
                      disabled={updateRoleMutation.isPending}
                    className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleUpdateRole(roleChangeDialog.currentRole)
                    }
                      disabled={updateRoleMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        confirmText={removeCollaboratorMutation.isPending ? "Removing..." : "Remove"}
        onConfirm={handleRemoveCollaborator}
        variant="destructive"
      />
    </div>
  );
}
