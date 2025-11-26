"use client";

import { useEffect, useRef, useState } from "react";
import { currentList, type UrlItem } from "@/stores/urlListStore";

interface RealtimeEvent {
  type: string;
  listId: string;
  action?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Global connection tracker to prevent duplicate EventSource connections (Firefox compatibility)
const activeConnections = new Map<string, EventSource>();

/**
 * Hook to subscribe to real-time updates for a list
 */
export function useRealtimeList(listId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const processedEventIdRef = useRef<string>("");
  const lastListDispatchRef = useRef<number>(0);
  const lastActivityDispatchRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!listId) return;

    // Check if page is unloading/navigating (Firefox-specific: suppress errors during navigation)
    let isUnloading = false;
    const handleBeforeUnload = () => {
      isUnloading = true;
      // Close connection gracefully before page unloads
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
    const handlePageHide = () => {
      isUnloading = true;
      // Close connection when page is hidden (Firefox navigation)
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    const connect = () => {
      // Don't connect if page is unloading
      if (isUnloading) return;

      // Prevent duplicate connections
      if (isConnectingRef.current) {
        // Connection already in progress, skipping...
        return;
      }

      // Wait for page to be fully loaded before connecting (prevents Firefox interruption errors)
      if (typeof window !== "undefined" && document.readyState !== "complete") {
        const handleLoad = () => {
          window.removeEventListener("load", handleLoad);
          // Small delay after page load to ensure Firefox is ready
          setTimeout(() => {
            if (!isUnloading) {
              connect();
            }
          }, 100);
        };
        window.addEventListener("load", handleLoad);
        return;
      }

      // Check for existing global connection for this listId
      const connectionKey = `list-${listId}`;
      const existingConnection = activeConnections.get(connectionKey);
      if (existingConnection) {
        // Close existing connection if it's closed or in error state
        if (existingConnection.readyState === EventSource.CLOSED) {
          activeConnections.delete(connectionKey);
        } else {
          // Reuse existing connection
          eventSourceRef.current = existingConnection;
          setIsConnected(existingConnection.readyState === EventSource.OPEN);
          return;
        }
      }

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      isConnectingRef.current = true;

      // Create SSE connection (start with 0 to get all messages)
      // Add timestamp to prevent Firefox caching issues
      const url = `/api/realtime/list/${listId}/events?lastEventId=0&_t=${Date.now()}`;
      const eventSource = new EventSource(url);

      eventSourceRef.current = eventSource;
      activeConnections.set(connectionKey, eventSource);

      eventSource.onopen = () => {
        setIsConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          // Skip duplicate events
          if (event.lastEventId === processedEventIdRef.current) {
            return;
          }
          processedEventIdRef.current = event.lastEventId || "";

          const data: RealtimeEvent = JSON.parse(event.data);

          // Ignore heartbeat messages (they're just to keep connection alive)
          if (data.type === "heartbeat") {
            return;
          }

          // Handle different event types
          if (data.type === "connected") {
            // Connected to list updates
          } else if (data.type === "list_updated") {
            // CRITICAL: Skip all real-time events during bulk import to prevent getList spam
            if (
              typeof window !== "undefined" &&
              (window as any).__bulkImportActive
            ) {
              if (process.env.NODE_ENV === "development") {
                console.debug(
                  "⏭️ [REALTIME] Skipping list_updated - bulk import in progress"
                );
              }
              return; // Don't dispatch any events during bulk import
            }

            // Skip collaborator_added and collaborator_removed - these are handled optimistically
            // BUT allow collaborator_role_updated to trigger refresh (affects current user's permissions)
            const isCollaboratorActionToSkip = 
              data.action === "collaborator_added" ||
              data.action === "collaborator_removed";
            
            if (isCollaboratorActionToSkip) {
              // Skip dispatching list-updated event for collaborator add/remove changes
              return;
            }

            // For collaborator_role_updated, we need to refresh the list to update permissions
            // This is critical for the collaborator whose role changed to see updated UI

            // For url_clicked actions, update the store directly with click count
            // This ensures instant UI updates across all screens without full list refresh
            if (data.action === "url_clicked" && data.urlId && typeof data.clickCount === "number") {
              const current = currentList.get();
              if (current?.urls && current.id === listId) {
                const urls = (current.urls as unknown as UrlItem[]) || [];
                const urlIndex = urls.findIndex((u) => u.id === data.urlId);
                if (urlIndex !== -1) {
                  // Update only the clicked URL's clickCount
                  const updatedUrls = urls.map((url, idx) =>
                    idx === urlIndex
                      ? { ...url, clickCount: data.clickCount as number }
                      : url
                  );
                  // Update store with new URLs array
                  currentList.set({
                    ...current,
                    urls: updatedUrls,
                  });
                  // Don't dispatch list-updated event for click count updates (already handled above)
                  return;
                }
              }
            }

            // Check if this is a metadata change (needs immediate update)
            const isMetadataChange = data.action === "list_made_public" || 
                                     data.action === "list_made_private" ||
                                     data.action === "list_updated";
            
            // Use shorter throttle for metadata changes, longer for others
            const throttleWindow = isMetadataChange ? 2000 : 5000;
            const now = Date.now();
            
            if (now - lastListDispatchRef.current < throttleWindow) {
              // For metadata changes, still dispatch
              if (isMetadataChange) {
                // Still dispatch for metadata changes, but update throttle time
                lastListDispatchRef.current = now;
              } else {
                return; // Skip if we dispatched recently
              }
            } else {
              lastListDispatchRef.current = now;
            }

            // UNIFIED APPROACH: Dispatch unified event instead of separate list-updated
            // This will trigger ONE unified API call that returns both list + activities
            console.log(`🔄 [REALTIME] List updated - dispatching unified-update (action: ${data.action || 'list_updated'})`);

            // Get current list slug and dispatch unified event
            const current = currentList.get();
            if (current?.slug) {
              // Dispatch unified event that will trigger the unified endpoint
              window.dispatchEvent(
                new CustomEvent("unified-update", {
                  detail: {
                    listId,
                    timestamp: data.timestamp || new Date().toISOString(),
                    action: data.action || "list_updated",
                  },
                })
              );
            }
          } else if (data.type === "activity_created") {
            // UNIFIED APPROACH: Dispatch unified event that triggers ONE API call for both list + activities
            // This ensures consistency - one API endpoint returns everything needed
            const activityData = data.activity as any;
            const action = activityData?.action || "unknown";
            console.log(`🔄 [REALTIME] Activity created - dispatching unified-update (action: ${action})`);
            
            // Dispatch unified event that will trigger the unified endpoint
            window.dispatchEvent(
              new CustomEvent("unified-update", { 
                detail: { 
                  listId,
                  action, // Include action at top level for logging/debugging
                  activity: activityData ? {
                    id: activityData.id,
                    action: activityData.action,
                    details: activityData.details,
                    createdAt: activityData.createdAt || new Date().toISOString(),
                    user: activityData.user || { id: '', email: 'Unknown' },
                  } : undefined,
                } 
              })
            );
          }
        } catch (error) {
          console.error("❌ [REALTIME] Error parsing event:", error);
        }
      };

      eventSource.onerror = (error) => {
        // Suppress errors during page unload/navigation (Firefox-specific)
        if (isUnloading) {
          return; // Don't log errors or reconnect during page navigation
        }

        // Check if this is a connection interruption (common in Firefox during page load)
        const isConnectionInterrupted = 
          eventSource.readyState === EventSource.CLOSED || 
          eventSource.readyState === EventSource.CONNECTING;

        // Only log error if not a simple connection interruption during page load
        if (!isConnectionInterrupted || process.env.NODE_ENV === "development") {
          console.error("❌ [REALTIME] SSE error:", error);
        }

        setIsConnected(false);
        isConnectingRef.current = false;
        
        // Close the connection and remove from global tracker
        eventSource.close();
        const connectionKey = `list-${listId}`;
        if (activeConnections.get(connectionKey) === eventSource) {
          activeConnections.delete(connectionKey);
        }
        eventSourceRef.current = null;

        // Don't reconnect if page is unloading
        if (isUnloading) {
          return;
        }

        // Reconnect with exponential backoff (max 30 seconds)
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
        
        if (process.env.NODE_ENV === "development") {
          console.log(`🔄 [REALTIME] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnloading) {
            connect(); // Reconnect only if page is still active
          }
        }, delay);
      };
    };

    // Initial connection - wait for page to be ready
    if (typeof window !== "undefined" && document.readyState === "complete") {
      // Page already loaded, connect immediately
      connect();
    } else {
      // Wait for page load before connecting (prevents Firefox interruption)
      const handleLoad = () => {
        window.removeEventListener("load", handleLoad);
        // Small delay after page load to ensure Firefox is ready
        setTimeout(() => {
          if (!isUnloading) {
            connect();
          }
        }, 200);
      };
      window.addEventListener("load", handleLoad);
    }

    return () => {
      // Mark as unloading to prevent reconnection attempts
      isUnloading = true;
      isConnectingRef.current = false;

      // Remove event listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);

      // Clean up connection
      if (eventSourceRef.current) {
        const connectionKey = `list-${listId}`;
        eventSourceRef.current.close();
        if (activeConnections.get(connectionKey) === eventSourceRef.current) {
          activeConnections.delete(connectionKey);
        }
        eventSourceRef.current = null;
      }
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [listId]);

  return { isConnected };
}
