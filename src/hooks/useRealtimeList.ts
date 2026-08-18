"use client";

import { useEffect, useRef, useState } from "react";
import { currentList, type UrlItem } from "@/stores/urlListStore";
import { devLog } from "@/lib/dev-log";

interface RealtimeEvent {
  type: string;
  listId: string;
  action?: string;
  slug?: string;
  timestamp?: string;
  activity?: {
    id: string;
    action: string;
    details: Record<string, unknown> | null;
    createdAt: string;
    user: {
      id: string;
      email: string;
    };
  };
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
        
        // CRITICAL: Dispatch event to notify setupSSECacheSync that SSE is connected
        // This allows grace period to start from actual SSE connection time, not setup time
        // This prevents invalidations from historical events sent right after connection
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("sse-connected", {
              detail: { listId, timestamp: Date.now() },
            })
          );
        }
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
            devLog(`✅ [SSE] Connected to list updates for listId: ${listId}`);
          } else if (data.type === "list_updated") {
            devLog(`📨 [SSE] Received list_updated event:`, {
              listId,
              action: data.action,
              timestamp: data.timestamp,
            });
            // CRITICAL: Skip all real-time events during bulk import to prevent getList spam
            if (
              typeof window !== "undefined" &&
              window.__bulkImportActive
            ) {
              if (process.env.NODE_ENV === "development") {
                // Skipping list_updated - bulk import in progress
              }
              return; // Don't dispatch any events during bulk import
            }

            // CRITICAL: For collaborator actions, we need to refresh the list to update permissions and UI
            // - collaborator_added: New collaborator needs to see they have access (if already on page)
            // - collaborator_role_updated: Collaborator whose role changed needs to see updated permissions (canEdit, etc.)
            // - collaborator_removed: Handled via 401 check, but allow list refresh to update collaborators list
            // All collaborator actions should trigger unified-update to ensure permissions and UI update correctly
            const isCollaboratorAction = 
              data.action === "collaborator_added" ||
              data.action === "collaborator_role_updated" ||
              data.action === "collaborator_removed";
            
            // For collaborator actions, we MUST refresh to update permissions
            // This ensures:
            // 1. New collaborators see they have access
            // 2. Role changes update permissions (editor/viewer toggle)
            // 3. Collaborator list updates in UI
            // Note: collaborator_removed also handled via 401 redirect in ListPage
            
            // CRITICAL: For collaborator actions, dispatch unified-update immediately with slug
            // This ensures setupSSECacheSync can invalidate the unified query for real-time updates
            if (isCollaboratorAction) {
              // CRITICAL: Get slug from SSE event data first (API now includes it), fallback to store
              // This ensures we have the slug even if currentList store doesn't have it yet
              const slug = data.slug || currentList.get()?.slug;
              
              if (slug) {
                const unifiedUpdateEvent = {
                  listId,
                  slug, // CRITICAL: Include slug for query invalidation
                  timestamp: data.timestamp || new Date().toISOString(),
                  action: data.action || "list_updated",
                };
                
                devLog(`🔔 [REALTIME] Dispatching unified-update for collaborator action:`, unifiedUpdateEvent);
                
                window.dispatchEvent(
                  new CustomEvent("unified-update", {
                    detail: unifiedUpdateEvent,
                  })
                );
                // Return early for collaborator actions - unified-update event is dispatched above
                return;
              } else {
                console.warn(`⚠️ [REALTIME] Cannot dispatch unified-update for collaborator action - no slug found (listId: ${listId}, data:`, data, `)`);
              }
            }

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
            // List updated - dispatching unified-update

            // Get current list slug and dispatch unified event
            const current = currentList.get();
            if (current?.slug) {
              // Dispatch unified event that will trigger the unified endpoint
              // CRITICAL: Include slug in event so setupSSECacheSync can invalidate the unified query
              window.dispatchEvent(
                new CustomEvent("unified-update", {
                  detail: {
                    listId,
                    slug: current.slug, // Include slug for query invalidation
                    timestamp: data.timestamp || new Date().toISOString(),
                    action: data.action || "list_updated",
                  },
                })
              );
            }
          } else if (data.type === "activity_created") {
            // UNIFIED APPROACH: Dispatch unified event that triggers ONE API call for both list + activities
            // This ensures consistency - one API endpoint returns everything needed
            const activityData = data.activity;
            const action = activityData?.action || "unknown";
            // Activity created - dispatching unified-update
            
            // Get current list slug and dispatch unified event
            // CRITICAL: Include slug in event so setupSSECacheSync can invalidate the unified query
            const current = currentList.get();
            const slug = current?.slug;
            
            // Dispatch unified event that will trigger the unified endpoint
            // CRITICAL: Include timestamp for proper deduplication in setupSSECacheSync
            // This prevents duplicate invalidations when both list_updated and activity_created events fire
            window.dispatchEvent(
              new CustomEvent("unified-update", { 
                detail: { 
                  listId,
                  slug, // CRITICAL: Include slug for query invalidation
                  action, // Include action at top level for logging/debugging
                  timestamp: data.timestamp || new Date().toISOString(), // CRITICAL: Include timestamp for deduplication
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
          console.error(`❌ [API] SSE event parsing error:`, error);
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
          console.error(`❌ [API] SSE connection error:`, error);
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
          devLog(`🔄 [API] SSE reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
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
