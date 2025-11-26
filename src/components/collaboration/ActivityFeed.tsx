"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { useUnifiedListUpdates } from "@/hooks/useUnifiedListUpdates";
import {
  Activity,
  MessageSquare,
  Plus,
  Trash2,
  Edit,
  Star,
  Pin,
  Copy,
  Archive,
  Link as LinkIcon,
  UserPlus,
  Globe,
  Lock,
} from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
}

interface ActivityFeedProps {
  listId: string;
  limit?: number;
}

export function ActivityFeed({ listId, limit = 50 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const list = useStore(currentList);
  const { fetchUnifiedUpdates } = useUnifiedListUpdates(listId);

  // Track last fetch start time to prevent excessive calls
  const lastFetchStartRef = React.useRef<number>(0);
  // Track if a fetch is currently in progress
  const isFetchingRef = React.useRef<boolean>(false);
  // Track refresh timeout to debounce rapid updates
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  // Track last local operation time to skip fetches after local actions
  const lastLocalOperationRef = React.useRef<number>(0);
  // Track pending activity-updated events to coalesce duplicates (local + SSE)
  const pendingActivityUpdateRef = React.useRef<boolean>(false);
  // Track last activity-updated event timestamp to deduplicate rapid events
  const lastActivityUpdateEventRef = React.useRef<number>(0);

  // Fetch activities
  const fetchActivities = React.useCallback(async () => {
    const now = Date.now();

    // Atomic check: Prevent duplicate fetches if one is already in progress
    // CRITICAL: Only prevent if actively fetching, not based on time (event handler already debounces)
    if (isFetchingRef.current) {
      // Fetch already in progress, skipping...
      return;
    }

    // Note: Removed time-based debounce here - event handler already handles debouncing
    // This ensures queued events from handleActivityUpdate always execute

    // Mark as fetching and update last fetch start time BEFORE starting (atomic operation)
    isFetchingRef.current = true;
    lastFetchStartRef.current = now;

      setIsLoading(true);
    try {
      const response = await fetch(
        `/api/lists/${listId}/activities?limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setIsLoading(false);
      // Clear fetching flag and pending flag after completion
      setTimeout(() => {
        isFetchingRef.current = false;
        pendingActivityUpdateRef.current = false; // Clear pending flag after fetch completes
      }, 100); // 100ms delay to prevent immediate re-trigger
    }
  }, [listId, limit]);

  const hasInitialFetchedRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Only fetch once per listId/limit combination on mount
    const fetchKey = `${listId}-${limit}`;
    if (hasInitialFetchedRef.current === fetchKey) {
      return; // Already fetched
    }
    hasInitialFetchedRef.current = fetchKey;

    // Initial fetch - use unified endpoint for consistency
    // Get slug from currentList store
    const current = currentList.get();
    if (current?.slug && current.id === listId) {
      fetchUnifiedUpdates(current.slug, limit);
    } else {
      // Fallback to old endpoint if slug not available yet
      lastFetchStartRef.current = 0;
      fetchActivities();
    }
  }, [listId, limit, fetchActivities, fetchUnifiedUpdates]);

  // Listen for unified-update events (UNIFIED APPROACH: One event, one API call)
  useEffect(() => {
    // Listen for unified-activities-updated events (dispatched by unified hook after fetch)
    const handleUnifiedActivitiesUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId: string;
        activities: ActivityItem[];
      }>;
      
      if (customEvent.detail?.listId !== listId) {
        return;
      }
      
      console.log(`📨 [ACTIVITIES] Received unified activities update: ${customEvent.detail.activities.length} activities`);
      setActivities(customEvent.detail.activities || []);
    };
    
    window.addEventListener("unified-activities-updated", handleUnifiedActivitiesUpdate);
    
    // Listen for unified-update events (from SSE) - triggers unified endpoint call
    const handleUnifiedUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        action?: string;
        timestamp?: string;
        activity?: ActivityItem;
      }>;
      
      // Only handle if it's for this list
      if (customEvent.detail?.listId && customEvent.detail.listId !== listId) {
        console.log(`⏭️ [ACTIVITIES] Skipping unified-update - wrong listId (${customEvent.detail.listId} vs ${listId})`);
        return;
      }
      
      // Get slug from currentList store
      const current = currentList.get();
      if (!current?.slug) {
        console.log("⏭️ [ACTIVITIES] No slug available yet, skipping unified update");
        return;
      }
      
      console.log(`🔄 [ACTIVITIES] Received unified-update event, calling unified endpoint (action: ${customEvent.detail?.action || 'unknown'})...`);
      // Call unified endpoint (global lock ensures only one call at a time)
      // Wrap in try-catch to silently handle ALL errors to prevent React error overlay
      // 401 errors are expected when collaborator is removed - they're handled gracefully
      try {
        await fetchUnifiedUpdates(current.slug, limit);
      } catch (error) {
        // Silently ignore all errors here - fetchUnifiedUpdates already handles 401 gracefully
        // This catch prevents any errors from bubbling up and triggering React error overlay
        // No logging needed - errors are already handled in fetchUnifiedUpdates
      }
      
      // Activities will be updated via unified-activities-updated event
    };
    
    window.addEventListener("unified-update", handleUnifiedUpdate);
    
    // Keep old activity-updated listener for backward compatibility during transition
    const handleActivityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ 
        listId?: string;
        isRemote?: boolean; // Flag to indicate if this is from another screen
        activity?: ActivityItem; // Optional activity object for optimistic updates
      }>;

      // Only update if it's for this list (or no listId specified, meaning all lists)
      if (customEvent.detail?.listId && customEvent.detail.listId !== listId) {
        // Skipping event - wrong listId
        return;
      }

      const now = Date.now();
      const activityData = customEvent.detail?.activity;
      
      // UNIFIED APPROACH: All activity-updated events come from SSE
      // isRemote flag is no longer needed since we use single source of truth
      
      // UNIFIED APPROACH: All activity-updated events come from SSE (single source of truth)
      // If we have activity data, optimistically add it immediately for instant feedback
      if (activityData) {
        setActivities((prev) => {
          // Check if activity already exists (prevent duplicates)
          if (prev.some((a) => a.id === activityData.id)) {
            return prev;
          }
          
          // Add to beginning (newest first)
          return [activityData, ...prev].slice(0, limit); // Keep within limit
        });
      }

      // Skip if fetch is already in progress (queue it instead)
      if (isFetchingRef.current) {
        // Clear any existing timeout and set a new one
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        // CRITICAL: Always queue - ensure fetch happens after current one completes
        refreshTimeoutRef.current = setTimeout(() => {
          if (!isFetchingRef.current) {
            fetchActivities();
          }
        }, 200); // Shorter delay to ensure quick refresh
        return;
      }

      // CRITICAL: Reduced debounce window and always ensure fetch happens
      // Only debounce if we literally just fetched (within 200ms) to prevent true duplicates
      const timeSinceLastFetch = now - lastFetchStartRef.current;
      const debounceWindow = 200; // Reduced from 400ms - only prevent immediate duplicates
      
      if (timeSinceLastFetch < debounceWindow) {
        // Clear any existing timeout and set a new one (coalesce multiple rapid events)
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        
        // CRITICAL: Always queue the fetch - ensure it happens even after very recent fetch
        const queueDelay = Math.max(50, debounceWindow - timeSinceLastFetch + 100); // Minimum 50ms, buffer 100ms
        refreshTimeoutRef.current = setTimeout(() => {
          // Always fetch if ready
          if (!isFetchingRef.current) {
            fetchActivities();
          }
        }, queueDelay);
        return;
      }

      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Fetch immediately - enough time has passed since last fetch
      fetchActivities();
    };

    // Listen to activity-updated events (for real-time updates)
    window.addEventListener("activity-updated", handleActivityUpdate);
    
    // Listen for activity-added events (for optimistic updates from POST/PATCH/DELETE responses)
    const handleActivityAdded = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId: string;
        activity: ActivityItem;
      }>;
      
      // Only add if it's for this list
      if (customEvent.detail?.listId !== listId) {
        return;
      }

      const newActivity = customEvent.detail.activity;
      
      // Optimistically add activity to feed immediately
      setActivities((prev) => {
        // Check if activity already exists (prevent duplicates)
        if (prev.some((a) => a.id === newActivity.id)) {
          return prev;
        }
        
        // Add to beginning (newest first)
        // Optimistically added activity
        return [newActivity, ...prev].slice(0, limit); // Keep within limit
      });
    };
    window.addEventListener("activity-added", handleActivityAdded);
    
    // Listen for local-operation events to track when we perform actions
    const handleLocalOperation = () => {
      lastLocalOperationRef.current = Date.now();
    };
    window.addEventListener("local-operation", handleLocalOperation);
    
    return () => {
      window.removeEventListener("unified-update", handleUnifiedUpdate);
      window.removeEventListener("unified-activities-updated", handleUnifiedActivitiesUpdate);
      window.removeEventListener("activity-updated", handleActivityUpdate);
      window.removeEventListener("activity-added", handleActivityAdded);
      window.removeEventListener("local-operation", handleLocalOperation);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [listId, limit, fetchActivities, fetchUnifiedUpdates]);

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "url_added":
        return <Plus className="w-4 h-4 text-green-400" />;
      case "url_deleted":
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case "url_updated":
        return <Edit className="w-4 h-4 text-blue-400" />;
      case "url_favorited":
      case "url_unfavorited":
        return <Star className="w-4 h-4 text-yellow-400" />;
      case "url_pinned":
      case "url_unpinned":
        return <Pin className="w-4 h-4 text-purple-400" />;
      case "url_duplicated":
        return <Copy className="w-4 h-4 text-orange-400" />;
      case "url_archived":
        return <Archive className="w-4 h-4 text-gray-400" />;
      case "url_restored":
        return <Archive className="w-4 h-4 text-green-400" />;
      case "comment_added":
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case "comment_updated":
        return <Edit className="w-4 h-4 text-blue-400" />;
      case "comment_deleted":
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case "collaborator_added":
        return <UserPlus className="w-4 h-4 text-green-400" />;
      case "health_check_completed":
        return <Activity className="w-4 h-4 text-blue-400" />;
      case "list_made_public":
        return <Globe className="w-4 h-4 text-purple-400" />;
      case "list_made_private":
        return <Lock className="w-4 h-4 text-orange-400" />;
      default:
        return <Activity className="w-4 h-4 text-white/60" />;
    }
  };

  // Get action label
  const getActionLabel = (activity: ActivityItem) => {
    const action = activity.action;
    const details = activity.details || {};
    const urlTitle =
      (details.urlTitle as string) || (details.url as string) || "a URL";

    switch (action) {
      case "url_added":
        return `added ${urlTitle}`;
      case "url_deleted":
        return `deleted ${urlTitle}`;
      case "url_updated":
        return `updated ${urlTitle}`;
      case "url_favorited":
        return `favorited ${urlTitle}`;
      case "url_unfavorited":
        return `unfavorited ${urlTitle}`;
      case "url_pinned":
        return `pinned ${urlTitle}`;
      case "url_unpinned":
        return `unpinned ${urlTitle}`;
      case "url_duplicated":
        return `duplicated ${urlTitle}`;
      case "url_archived":
        return `archived ${urlTitle}`;
      case "url_restored":
        return `restored ${urlTitle}`;
      case "url_reordered":
        return "reordered URLs";
      case "comment_added":
        return `commented on ${urlTitle}`;
      case "comment_updated":
        return `updated comment on ${urlTitle}`;
      case "comment_deleted":
        return `deleted comment on ${urlTitle}`;
      case "list_updated":
        return "updated the list";
      case "list_shared":
        return "shared the list";
      case "collaborator_added":
        return `added ${
          (details.collaboratorEmail as string) || "a collaborator"
        } as collaborator`;
      case "health_check_completed": {
        const checked = (details.checked as number) || 0;
        const healthy = (details.healthy as number) || 0;
        const warning = (details.warning as number) || 0;
        const broken = (details.broken as number) || 0;
        return `completed health check (${checked} URLs: ${healthy} healthy, ${warning} warnings, ${broken} broken)`;
      }
      case "list_made_public":
        return "made the list public";
      case "list_made_private":
        return "made the list private";
      default:
        return action.replace(/_/g, " ");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-white/70" />
        <h3 className="text-sm font-medium text-white/90">
          Activity Feed ({activities.length})
        </h3>
      </div>

      {/* Activities List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="text-sm text-white/50 text-center py-4">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-white/50 text-center py-4">
            No activity yet. Start adding URLs to see activity here!
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 bg-white/5 rounded-lg p-3 border border-white/10"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActionIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-white/90 truncate">
                    {activity.user.email}
                  </span>
                  <span className="text-xs text-white/60">
                    {getActionLabel(activity)}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {formatDate(activity.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
