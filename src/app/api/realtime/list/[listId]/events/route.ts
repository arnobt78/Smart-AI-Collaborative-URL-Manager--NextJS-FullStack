import { NextRequest, NextResponse } from "next/server";
import { redis, CHANNELS } from "@/lib/realtime/redis";

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

  // Set up SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable buffering in nginx
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", listId })}\n\n`)
      );

      let lastCheck = parseInt(lastEventId, 10) || 0;
      let lastPollTime = Date.now();
      const processedMessageIds = new Set<string>(); // Track processed message IDs
      const connectionStartTime = Date.now(); // Track when connection started

      // Poll for new messages every 3 seconds (faster for real-time feel)
      const interval = setInterval(async () => {
        try {
          // Throttle polling - only poll if at least 3 seconds have passed
          const now = Date.now();
          if (now - lastPollTime < 3000) {
            // Send heartbeat without checking for messages
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
            );
            return;
          }
          lastPollTime = now;

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
                const messageTimestamp = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
                const messageId = `${parsed.type}_${messageTimestamp}_${JSON.stringify(parsed)}`;
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
              // Only send messages that:
              // 1. We haven't processed yet
              // 2. Were created after the connection started (or within last 5 seconds before connection)
              const isNew = !processedMessageIds.has(msg.id);
              const isRecent = msg.timestamp > (connectionStartTime - 5000);
              return isNew && isRecent;
            });

          // Send new messages (only if we have truly new ones)
          if (newMessages.length > 0) {
            console.log(`📨 [REALTIME] Sending ${newMessages.length} new message(s) to client`);
            for (const message of newMessages) {
              processedMessageIds.add(message.id);
              // Use a unique event ID based on timestamp
              const eventId = message.timestamp || Date.now();
              controller.enqueue(
                encoder.encode(
                  `id: ${eventId}\ndata: ${JSON.stringify(message.data)}\n\n`
                )
              );
              lastCheck = Date.now();
            }
          } else {
            // Send heartbeat to keep connection alive (but don't trigger refresh)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`)
            );
          }
        } catch (error) {
          console.error("❌ [REALTIME] Error in SSE stream:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Stream error" })}\n\n`
            )
          );
        }
      }, 3000); // Poll every 3 seconds for faster real-time updates

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}

