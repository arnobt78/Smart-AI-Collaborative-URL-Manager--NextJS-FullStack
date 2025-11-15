"use client";

import React, { useState, useEffect } from "react";
import { Activity, MessageSquare, Plus, Trash2, Edit, Star, Pin, Link as LinkIcon, UserPlus, Globe, Lock } from "lucide-react";

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
  
  // Track last fetch time to prevent excessive calls
  const lastFetchRef = React.useRef<number>(0);
  // Track refresh timeout to debounce rapid updates
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch activities
  const fetchActivities = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/lists/${listId}/activities?limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        lastFetchRef.current = Date.now();
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setIsLoading(false);
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
    lastFetchRef.current = 0;
    fetchActivities();
  }, [listId, limit, fetchActivities]);

  // Listen for real-time activity updates - INSTANT updates for local operations
  useEffect(() => {
    const handleActivityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ listId?: string }>;
      
      // Only update if it's for this list (or no listId specified, meaning all lists)
      if (customEvent.detail?.listId && customEvent.detail.listId !== listId) {
        return;
      }

      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // INSTANT update - no debouncing for activity feed
      // The API is fast and we want immediate feedback
      fetchActivities();
    };

    // Listen to activity-updated events
    window.addEventListener("activity-updated", handleActivityUpdate);
    return () => {
      window.removeEventListener("activity-updated", handleActivityUpdate);
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
      case "comment_added":
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
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
    const urlTitle = details.urlTitle as string || details.url as string || "a URL";

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
      case "url_reordered":
        return "reordered URLs";
      case "comment_added":
        return `commented on ${urlTitle}`;
      case "comment_updated":
        return `updated a comment on ${urlTitle}`;
      case "comment_deleted":
        return `deleted a comment on ${urlTitle}`;
      case "list_updated":
        return "updated the list";
      case "list_shared":
        return "shared the list";
      case "collaborator_added":
        return `added ${details.collaboratorEmail as string || "a collaborator"} as collaborator`;
      case "health_check_completed": {
        const checked = details.checked as number || 0;
        const healthy = details.healthy as number || 0;
        const warning = details.warning as number || 0;
        const broken = details.broken as number || 0;
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

