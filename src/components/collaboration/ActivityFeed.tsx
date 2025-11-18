"use client";

import React, { useState, useEffect } from "react";
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

  // Track last fetch start time to prevent excessive calls
  const lastFetchStartRef = React.useRef<number>(0);
  // Track if a fetch is currently in progress
  const isFetchingRef = React.useRef<boolean>(false);
  // Track refresh timeout to debounce rapid updates
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  // Track last local operation time to skip fetches after local actions
  const lastLocalOperationRef = React.useRef<number>(0);

  // Fetch activities
  const fetchActivities = React.useCallback(async () => {
    const now = Date.now();

    // Atomic check: Prevent duplicate fetches if one is already in progress
    // OR if we just started a fetch very recently (within 500ms)
    if (isFetchingRef.current) {
      console.log("⏭️ [ACTIVITIES] Fetch already in progress, skipping...");
      return;
    }

    if (now - lastFetchStartRef.current < 500) {
      console.log(
        `⏭️ [ACTIVITIES] Fetch started too recently (${
          now - lastFetchStartRef.current
        }ms ago), skipping...`
      );
      return;
    }

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
        console.log("✅ [ACTIVITIES] Activities fetched successfully");
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setIsLoading(false);
      // Clear fetching flag after completion (with small delay to prevent rapid re-triggers)
      setTimeout(() => {
        isFetchingRef.current = false;
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

    // Initial fetch - reset throttling
    lastFetchStartRef.current = 0;
    fetchActivities();
  }, [listId, limit, fetchActivities]);

  // Listen for real-time activity updates - debounced to prevent duplicate fetches
  useEffect(() => {
    // Track pending events to coalesce multiple rapid events
    const pendingEventsRef = { count: 0 };

    const handleActivityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ listId?: string }>;

      // Only update if it's for this list (or no listId specified, meaning all lists)
      if (customEvent.detail?.listId && customEvent.detail.listId !== listId) {
        return;
      }

      const now = Date.now();
      
      // Queue fetch if we just performed a local operation (add/edit/delete)
      // This prevents flicker when activity feed refreshes after local actions
      // But we still want to update eventually, so queue it for later
      if (now - lastLocalOperationRef.current < 2000) {
        console.log(
          `⏭️ [ACTIVITIES] Queuing fetch - local operation just completed (${now - lastLocalOperationRef.current}ms ago), will fetch after 2s`
        );
        // Clear any existing queued fetch
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        // Queue fetch to happen after 2 seconds (when local operation window expires)
        const timeSinceLocalOp = now - lastLocalOperationRef.current;
        refreshTimeoutRef.current = setTimeout(() => {
          const now = Date.now();
          // Only fetch if enough time has passed and no fetch in progress
          if (!isFetchingRef.current && now - lastFetchStartRef.current >= 500) {
            console.log("🔄 [ACTIVITIES] Executing queued fetch after local operation");
            fetchActivities();
          }
        }, 2000 - timeSinceLocalOp + 100); // Add 100ms buffer
        return;
      }

      // Skip if fetch is already in progress
      if (isFetchingRef.current) {
        console.log("⏭️ [ACTIVITIES] Fetch in progress, skipping event...");
        // Increment pending events counter (will be processed after current fetch)
        pendingEventsRef.count++;
        return;
      }

      // Debounce rapid events (e.g., local dispatch + real-time event firing almost simultaneously)
      // If we just started a fetch within the last 500ms, queue the next one
      const timeSinceLastStart = now - lastFetchStartRef.current;
      if (timeSinceLastStart < 500) {
        console.log(
          `⏭️ [ACTIVITIES] Debouncing fetch (${timeSinceLastStart}ms since last start)...`
        );
        // Increment pending events counter
        pendingEventsRef.count++;

        // Clear any pending refresh
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }

        // Queue a single fetch after debounce window expires (coalesce all pending events)
        refreshTimeoutRef.current = setTimeout(() => {
          const now = Date.now();
          // Double-check we're not fetching and enough time has passed
          if (
            !isFetchingRef.current &&
            now - lastFetchStartRef.current >= 500
          ) {
            console.log(
              `🔄 [ACTIVITIES] Processing ${pendingEventsRef.count} pending event(s)...`
            );
            pendingEventsRef.count = 0; // Reset counter
            fetchActivities();
          }
        }, 500 - timeSinceLastStart + 100); // Add 100ms buffer
        return;
      }

      // Clear any pending refresh and reset counter
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      pendingEventsRef.count = 0;

      // Fetch immediately if enough time has passed since last fetch start
      console.log("🔄 [ACTIVITIES] Fetching activities immediately...");
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
        console.log(`✨ [ACTIVITIES] Optimistically added activity: ${newActivity.action}`);
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
      window.removeEventListener("activity-updated", handleActivityUpdate);
      window.removeEventListener("activity-added", handleActivityAdded);
      window.removeEventListener("local-operation", handleLocalOperation);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [listId, limit, fetchActivities]);

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
