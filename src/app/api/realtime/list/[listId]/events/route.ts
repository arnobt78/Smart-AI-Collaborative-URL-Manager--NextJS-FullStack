import { NextRequest, NextResponse } from "next/server";
import { redis, CHANNELS } from "@/lib/realtime/redis";
import { prisma } from "@/lib/prisma";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import {
  getRealtimeEventKey,
  isRealtimeChannelEvent,
  type RealtimeChannelEvent,
  type RealtimeListSummary,
} from "@/lib/realtime/event-types";

/** Track B Wave 1: poll fast for events; heartbeat only every 20s when idle. */
const POLL_MS = 1000;
const HEARTBEAT_MS = 20_000;

function leanListSummary(row: {
  id: string;
  slug: string;
  title: string | null;
  isPublic: boolean;
  urls: unknown;
}): RealtimeListSummary {
  const urls = Array.isArray(row.urls) ? row.urls : [];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    isPublic: row.isPublic,
    urlCount: urls.length,
  };
}

async function enrichAuthorizedEvent(
  event: RealtimeChannelEvent,
  listId: string,
): Promise<RealtimeChannelEvent> {
  const eventKey = getRealtimeEventKey(event);
  // A deleted list cannot be re-authorized/read, but subscribers that were
  // authorized when their stream opened still need a non-sensitive tombstone.
  if (event.action === "list_deleted") {
    return { ...event, eventKey, deleted: true };
  }

  const access = await resolveAuthorizedList(listId, "view");
  if (!access.ok) {
    return {
      type: "unauthorized",
      listId,
      eventKey,
      action: event.action ?? "list_updated",
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
  }

  // Lean summary only — do not ship full urls/user on the wire (TASK-0064).
  const row = await prisma.list.findUnique({
    where: { id: access.list.id },
    select: { id: true, slug: true, title: true, isPublic: true, urls: true },
  });
  if (!row) return { ...event, eventKey, deleted: true };
  return { ...event, eventKey, list: leanListSummary(row) };
}

/** Same-origin EventSource streams need no permissive CORS policy. */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
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
  // REQ-0053: list events can include cache-ready data, so authorize before
  // establishing a long-lived stream (and re-check after future mutations).
  const initialAccess = await resolveAuthorizedList(listId, "view");
  if (!initialAccess.ok) {
    return NextResponse.json({ error: initialAccess.error }, { status: initialAccess.status });
  }
  const authorizedListId = initialAccess.list.id;

  // Authenticated same-origin EventSource response.
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable buffering in nginx
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const connectionStarted = Date.now();
      let lastHeartbeatAt = connectionStarted;

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", listId })}\n\n`)
      );

      const processedMessageIds = new Set<string>(); // Track processed message IDs

      // Poll every 1s for events; heartbeat only every HEARTBEAT_MS when idle
      const interval = setInterval(async () => {
        try {

          if (!redis) {
            return;
          }

          // Check mutation, comment, and activity channels.
          const updateChannel = CHANNELS.listUpdate(authorizedListId);
          const commentChannel = CHANNELS.listComment(authorizedListId);
          const activityChannel = CHANNELS.listActivity(authorizedListId);
          
          // Get messages from both channels (get more messages to ensure we don't miss any)
          const [updateMessages, commentMessages, activityMessages] = await Promise.all([
            redis.lrange(`${updateChannel}:messages`, 0, 9), // Get last 10 messages
            redis.lrange(`${commentChannel}:messages`, 0, 9),
            redis.lrange(`${activityChannel}:messages`, 0, 9), // Get last 10 messages
          ]);
          
          // Combine messages from both channels
          const allMessages = [...updateMessages, ...commentMessages, ...activityMessages];
          
          // Filter messages we haven't processed yet
          // Use timestamp to determine if message is new (only send messages after connection started)
          const seenMessageIds = new Set(processedMessageIds);
          const newMessages = allMessages
            .map((msg) => {
              try {
                const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
                if (!isRealtimeChannelEvent(parsed)) {
                  return null;
                }
                const messageTimestamp = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
                // Drop pre-connect history flood (client grace already ignores most of it)
                if (messageTimestamp < connectionStarted) {
                  return null;
                }
                const messageId = getRealtimeEventKey(parsed);
                return {
                  id: messageId,
                  data: parsed,
                  timestamp: messageTimestamp,
                };
              } catch {
                return null;
              }
            })
            .filter((msg): msg is { id: string; data: RealtimeChannelEvent; timestamp: number } => {
              if (msg === null) return false;
              const isNew = !seenMessageIds.has(msg.id);
              if (isNew) {
                seenMessageIds.add(msg.id);
              }
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
              try {
                const enriched = await enrichAuthorizedEvent(message.data, authorizedListId);
                controller.enqueue(
                  encoder.encode(
                    `id: ${enriched.eventKey ?? message.id}\ndata: ${JSON.stringify(enriched)}\n\n`
                  )
                );
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
            const now = Date.now();
            if (now - lastHeartbeatAt < HEARTBEAT_MS) {
              return;
            }
            lastHeartbeatAt = now;
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
      }, POLL_MS);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
