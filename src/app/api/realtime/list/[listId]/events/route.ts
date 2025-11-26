import { NextRequest, NextResponse } from "next/server";
import { redis, CHANNELS } from "@/lib/realtime/redis";

/**
 * OPTIONS /api/realtime/list/[listId]/events
 * CORS preflight handler for Firefox and other browsers
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  // Firefox sometimes sends OPTIONS requests for EventSource connections
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control, Last-Event-ID, Accept",
      "Access-Control-Expose-Headers": "Content-Type, Cache-Control",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
}

/**
 * GET /api/realtime/list/[listId]/events
 * Server-Sent Events endpoint for real-time list updates
 * Clients can subscribe to this endpoint to receive updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params;
  const { searchParams } = new URL(request.url);
  const lastEventId = searchParams.get("lastEventId") || "0";

  // Set up SSE headers with CORS support for Firefox and other browsers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable buffering in nginx
    // CORS headers for cross-origin requests (if needed) and Firefox compatibility
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Cache-Control, Last-Event-ID",
    "Access-Control-Expose-Headers": "Content-Type, Cache-Control",
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", listId })}\n\n`)
      );

      let lastCheck = parseInt(lastEventId, 10) || 0;
      const processedMessageIds = new Set<string>(); // Track processed message IDs
      const connectionStartTime = Date.now(); // Track when connection started

      // Poll for new messages every 1 second to catch all events (no throttle)
      // CRITICAL: Fast polling ensures we don't miss rapid events (favorite, pin, etc.)
      const interval = setInterval(async () => {
        try {

          if (!redis) {
            console.warn("⚠️ [REALTIME] Redis not available");
            return;
          }

          // Check both listUpdate and listActivity channels
          const updateChannel = CHANNELS.listUpdate(listId);
          const activityChannel = CHANNELS.listActivity(listId);
          
          // Get messages from both channels (get more messages to ensure we don't miss any)
          const [updateMessages, activityMessages] = await Promise.all([
            redis.lrange(`${updateChannel}:messages`, 0, 9), // Get last 10 messages
            redis.lrange(`${activityChannel}:messages`, 0, 9), // Get last 10 messages
          ]);
          
          // Combine messages from both channels
          const allMessages = [...updateMessages, ...activityMessages];
          
          // Filter messages we haven't processed yet
          // Use timestamp to determine if message is new (only send messages after connection started)
          const newMessages = allMessages
            .map((msg) => {
              try {
                const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
                // Create a unique ID from the message content and timestamp
                // CRITICAL: Each message needs a truly unique ID to prevent deduplication issues
                const messageTimestamp = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
                
                // CRITICAL: Generate truly unique message IDs to prevent deduplication bugs
                // For activity_created events, use activity.id for absolute uniqueness
                // For other events, use type + action + timestamp + content hash
                let uniqueKey: string;
                if (parsed.type === "activity_created") {
                  // Activity ID ensures uniqueness - this is the most reliable way
                  const activityId = (parsed.activity as any)?.id;
                  if (activityId) {
                    uniqueKey = activityId;
                  } else {
                    // Fallback: use action + timestamp + a hash of the full message
                    const contentStr = JSON.stringify(parsed);
                    const contentHash = contentStr.length + (contentStr.charCodeAt(0) || 0);
                    uniqueKey = `${parsed.action || 'unknown'}_${messageTimestamp}_${contentHash}`;
                  }
                } else {
                  // For other events, use type + action + timestamp + content hash
                  const contentStr = JSON.stringify(parsed);
                  const contentHash = contentStr.length + (contentStr.charCodeAt(0) || 0);
                  uniqueKey = `${parsed.action || 'none'}_${messageTimestamp}_${contentHash}`;
                }
                
                const messageId = `${parsed.type}_${uniqueKey}`;
                return {
                  id: messageId,
                  data: parsed,
                  timestamp: messageTimestamp,
                };
              } catch {
                return null;
              }
            })
            .filter((msg): msg is { id: string; data: Record<string, unknown>; timestamp: number } => {
              if (msg === null) return false;
              
              // CRITICAL: Only check if we've already processed this message
              // Remove timestamp filtering - if message is in Redis, it's valid to send
              // The 15-second window was too restrictive and was filtering out valid events
              const isNew = !processedMessageIds.has(msg.id);
              
              // Always send if not processed yet (ignore timestamp - messages in Redis are valid)
              return isNew;
            });

          // Send new messages (only if we have truly new ones)
          // Check if controller is closed before trying to enqueue
          if (request.signal.aborted) {
            clearInterval(interval);
            return;
          }

          if (newMessages.length > 0) {
            for (const message of newMessages) {
              // Check again before each message
              if (request.signal.aborted) {
                clearInterval(interval);
                return;
              }
              
              processedMessageIds.add(message.id);
              // Use a unique event ID based on timestamp
              const eventId = message.timestamp || Date.now();
              try {
                controller.enqueue(
                  encoder.encode(
                    `id: ${eventId}\ndata: ${JSON.stringify(message.data)}\n\n`
                  )
                );
                lastCheck = Date.now();
              } catch (enqueueError) {
                // Controller might be closed, clean up and exit
                if (enqueueError instanceof Error && enqueueError.message.includes("closed")) {
                  clearInterval(interval);
                  return;
                }
                throw enqueueError;
              }
            }
          } else {
            // Send heartbeat to keep connection alive (but don't trigger refresh)
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
              );
            } catch (enqueueError) {
              // Controller might be closed, clean up and exit
              if (enqueueError instanceof Error && enqueueError.message.includes("closed")) {
                clearInterval(interval);
                return;
              }
              // Ignore heartbeat errors, connection might be closing
            }
          }
        } catch (error) {
          // Check if error is due to closed controller
          if (error instanceof Error && error.message.includes("closed")) {
            clearInterval(interval);
            return;
          }
          console.error("❌ [REALTIME] Error in SSE stream:", error);
          // Only try to send error message if controller is still open
          if (!request.signal.aborted) {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", message: "Stream error" })}\n\n`
                )
              );
            } catch {
              // Controller closed, ignore error
              clearInterval(interval);
            }
          }
        }
      }, 1000); // Poll every 1 second to catch ALL events (no throttle)

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}

