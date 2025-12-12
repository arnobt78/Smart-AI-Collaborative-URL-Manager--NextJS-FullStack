"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { currentList } from "@/stores/urlListStore";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { listQueryKeys } from "@/hooks/useListQueries";
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
  const queryClient = useQueryClient();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : null;

  // Track refresh timeout to debounce rapid updates
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  // Track last local operation time to skip fetches after local actions
  const lastLocalOperationRef = React.useRef<number>(0);
  // Track last activity-updated event timestamp to deduplicate rapid events
  const lastActivityUpdateEventRef = React.useRef<number>(0);

  // ActivityFeed now relies ONLY on events from unified endpoint
  // No separate API calls - ListPage's useUnifiedListQuery handles all fetching

  // CRITICAL: Subscribe to unified query data to get activities on mount and when data changes
  // This ensures activities are populated immediately when query completes, even on page refresh
  // Using React Query's subscription mechanism ensures we get data whenever it's available
  useEffect(() => {
    if (!slug) return;

    const cacheKey = listQueryKeys.unified(slug);

    // Function to check and update activities from query data
    const updateActivitiesFromCache = () => {
      const queryState = queryClient.getQueryState<{
        list: { id: string } | null;
        activities: ActivityItem[];
      }>(cacheKey);

      if (queryState?.data?.activities && Array.isArray(queryState.data.activities)) {
        setActivities(queryState.data.activities);
      }
    };

    // Check immediately if data is already in cache
    updateActivitiesFromCache();

    // Subscribe to query cache updates to detect when data becomes available
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Check if this event is for our query and if data is available
      if (event?.query?.queryKey && 
          JSON.stringify(event.query.queryKey) === JSON.stringify(cacheKey) &&
          event.query.state.status === 'success' &&
          event.query.state.data) {
        updateActivitiesFromCache();
      }
    });

    // Also set up a fallback interval to check for data (in case subscription misses it)
    // This ensures we catch the data even if the subscription doesn't fire correctly
    const intervalId = setInterval(() => {
      updateActivitiesFromCache();
    }, 100); // Check every 100ms

    // Clear interval after 5 seconds (query should complete by then)
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [slug, queryClient]);

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

      // Update activities when unified query dispatches event
      setActivities(customEvent.detail.activities || []);
    };

    window.addEventListener(
      "unified-activities-updated",
      handleUnifiedActivitiesUpdate
    );

    // Listen for unified-update events (from SSE)
    // OPTIMIZATION: Don't call fetchUnifiedUpdates here - unified-update events are dispatched AFTER server updates
    // The unified-activities-updated event will be dispatched by ListPage's fetchUnifiedUpdates
    // We just need to listen for that event, not trigger another fetch
    const handleUnifiedUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        listId?: string;
        action?: string;
        timestamp?: string;
        activity?: ActivityItem;
      }>;

      // Only handle if it's for this list
      if (customEvent.detail?.listId && customEvent.detail.listId !== listId) {
        return;
      }

      // Note: We don't call fetchUnifiedUpdates here because:
      // 1. Unified-update events are dispatched AFTER server updates (data is already fresh)
      // 2. ListPage will handle unified fetch on mount or when needed
      // 3. The unified-activities-updated event will be dispatched by ListPage's fetch
      // 4. Calling fetchUnifiedUpdates here causes duplicate API calls
      // We just wait for unified-activities-updated event to update activities
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

      // Activity-updated events trigger ListPage to refetch unified data via SSE
      // ListPage then dispatches unified-activities-updated, which we listen to
      // No separate fetch needed - unified endpoint handles everything
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
      window.removeEventListener(
        "unified-activities-updated",
        handleUnifiedActivitiesUpdate
      );
      window.removeEventListener("activity-updated", handleActivityUpdate);
      window.removeEventListener("activity-added", handleActivityAdded);
      window.removeEventListener("local-operation", handleLocalOperation);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [listId, limit]);

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
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70" />
        <h3 className="text-xs sm:text-sm font-medium text-white/90">
          Activity Feed ({activities.length})
        </h3>
      </div>

      {/* Activities List */}
      <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="text-xs sm:text-sm text-white/50 text-center py-3 sm:py-4">
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-xs sm:text-sm text-white/50 text-center py-3 sm:py-4 px-2">
            No activity yet. Start adding URLs to see activity here!
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-2 sm:gap-3 bg-white/5 rounded-lg p-2.5 sm:p-3 border border-white/10"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActionIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs font-medium text-white/90 truncate">
                    {activity.user.email}
                  </span>
                  <span className="text-xs text-white/60">
                    {getActionLabel(activity)}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-0.5 sm:mt-1">
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
