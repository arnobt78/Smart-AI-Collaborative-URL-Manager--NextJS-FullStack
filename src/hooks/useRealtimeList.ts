"use client";

import { useEffect, useRef, useState } from "react";
import { currentList } from "@/stores/urlListStore";

interface RealtimeEvent {
  type: string;
  listId: string;
  action?: string;
  timestamp?: string;
  [key: string]: unknown;
}

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

  useEffect(() => {
    if (!listId) return;

    const connect = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Create SSE connection (start with 0 to get all messages)
      const eventSource = new EventSource(
        `/api/realtime/list/${listId}/events?lastEventId=0`
      );

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("✅ [REALTIME] Connected to real-time updates");
        setIsConnected(true);
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
            console.log("✅ [REALTIME] Connected to list updates");
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

            // Check if this is a metadata change (needs immediate update)
            const isMetadataChange = data.action === "list_made_public" || 
                                     data.action === "list_made_private" ||
                                     data.action === "list_updated";
            
            // Use shorter throttle for metadata changes, longer for others
            const throttleWindow = isMetadataChange ? 2000 : 5000;
            const now = Date.now();
            
            if (now - lastListDispatchRef.current < throttleWindow) {
              // For metadata changes, still dispatch but log it
              if (isMetadataChange) {
                console.log(
                  `🔄 [REALTIME] List updated (metadata change) - dispatching despite throttle`
                );
                // Still dispatch for metadata changes, but update throttle time
                lastListDispatchRef.current = now;
              } else {
                console.log(
                  `⏭️ [REALTIME] Skipping list_updated dispatch - too soon (${throttleWindow}ms throttle)`
                );
                return; // Skip if we dispatched recently
              }
            } else {
              lastListDispatchRef.current = now;
            }

            // Refresh the list when it's updated
            console.log(
              "🔄 [REALTIME] List updated event received, dispatching..."
            );

            // Get current list slug and refetch
            const current = currentList.get();
            if (current?.slug) {
              // Trigger a refetch with timestamp and action to help deduplicate
              window.dispatchEvent(
                new CustomEvent("list-updated", {
                  detail: {
                    listId,
                    timestamp: data.timestamp || new Date().toISOString(),
                    action: data.action || "list_updated",
                  },
                })
              );
            }
          } else if (data.type === "activity_created") {
            // For activity_created events from real-time (other windows), update immediately
            // Use a shorter throttle to allow rapid updates from other users
            const now = Date.now();
            if (now - lastActivityDispatchRef.current < 500) {
              // Only throttle if we just dispatched (prevent duplicate rapid events)
              console.log("⏭️ [REALTIME] Skipping activity dispatch - too soon");
              return;
            }
            lastActivityDispatchRef.current = now;

            // Refresh activity feed immediately when new activity is created (from other windows)
            console.log("🔄 [REALTIME] Activity created (from other window), refreshing feed...");
            window.dispatchEvent(
              new CustomEvent("activity-updated", { detail: { listId } })
            );
          }
        } catch (error) {
          console.error("❌ [REALTIME] Error parsing event:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ [REALTIME] SSE error:", error);
        setIsConnected(false);
        
        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;

        // Reconnect with exponential backoff (max 30 seconds)
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
        
        console.log(`🔄 [REALTIME] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect(); // Reconnect
        }, delay);
      };
    };

    // Initial connection
    connect();

    return () => {
      // Clean up connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
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
