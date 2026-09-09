import { NextRequest, NextResponse } from "next/server";
import { redis, CHANNELS } from "@/lib/realtime/redis";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRoleForListUser } from "@/lib/collaboration/permissions";
import { resolveAuthorizedList } from "@/lib/list-route-access";
import {
  getRealtimeEventKey,
  isRealtimeChannelEvent,
  type RealtimeChannelEvent,
  type RealtimeListSummary,
} from "@/lib/realtime/event-types";

/** Track B Wave 2: slightly slower poll + smaller Redis window under idle tabs. */
const POLL_MS = 1500;
const HEARTBEAT_MS = 20_000;
const REDIS_MESSAGE_WINDOW = 4;

type SlimListAuthRow = {
  id: string;
  slug: string;
  title: string | null;
  isPublic: boolean;
  userId: string;
  collaborators: string[];
  collaboratorRoles: unknown;
  urlCount: number | bigint;
};

/**
 * Single count-only row for SSE enrich — no urls JSON blob, still enough for
 * view-auth (userId / collaborators / roles / isPublic).
 */
async function loadSlimListForEnrich(
  listId: string,
): Promise<SlimListAuthRow | null> {
  const rows = await prisma.$queryRaw<SlimListAuthRow[]>`
    SELECT
      id,
      slug,
      title,
      is_public AS "isPublic",
      user_id AS "userId",
      collaborators,
      collaborator_roles AS "collaboratorRoles",
      COALESCE(jsonb_array_length(urls), 0)::int AS "urlCount"
    FROM lists
    WHERE id = ${listId}
  `;
  return rows[0] ?? null;
}

function leanListSummary(row: SlimListAuthRow): RealtimeListSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    isPublic: row.isPublic,
    urlCount: Number(row.urlCount),
  };
}

/** Tombstone only — never spread Redis backlog (activity / slug / titles). */
function deletedListTombstone(
  event: RealtimeChannelEvent,
  listId: string,
  eventKey: string,
): RealtimeChannelEvent {
  return {
    type: event.type === "unauthorized" ? "list_updated" : event.type,
    listId,
    eventKey,
    action: event.action ?? "list_updated",
    timestamp: event.timestamp ?? new Date().toISOString(),
    deleted: true,
  };
}

async function enrichAuthorizedEvent(
  event: RealtimeChannelEvent,
  listId: string,
): Promise<RealtimeChannelEvent> {
  const eventKey = getRealtimeEventKey(event);

  const user = await getCurrentUser();
  if (!user) {
    return {
      type: "unauthorized",
      listId,
      eventKey,
      action: event.action ?? "list_updated",
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
  }

  // Deleted / missing row: session still required; never re-emit Redis payload
  // (revoked collaborators with a lingering SSE must not see backlog activity).
  if (event.action === "list_deleted") {
    return deletedListTombstone(event, listId, eventKey);
  }

  const row = await loadSlimListForEnrich(listId);
  if (!row) {
    return deletedListTombstone(event, listId, eventKey);
  }

  const role = getRoleForListUser(
    {
      userId: row.userId,
      isPublic: row.isPublic,
      collaborators: row.collaborators,
      collaboratorRoles: row.collaboratorRoles,
    },
    user,
  );
  if (role === "none") {
    return {
      type: "unauthorized",
      listId,
      eventKey,
      action: event.action ?? "list_updated",
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
  }

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

      // Poll for events; heartbeat only every HEARTBEAT_MS when idle
      const interval = setInterval(async () => {
        try {

          if (!redis) {
            return;
          }

          // Check mutation, comment, and activity channels.
          const updateChannel = CHANNELS.listUpdate(authorizedListId);
          const commentChannel = CHANNELS.listComment(authorizedListId);
          const activityChannel = CHANNELS.listActivity(authorizedListId);
          
          // Get messages from both channels (trim window — Wave 2)
          const [updateMessages, commentMessages, activityMessages] = await Promise.all([
            redis.lrange(`${updateChannel}:messages`, 0, REDIS_MESSAGE_WINDOW),
            redis.lrange(`${commentChannel}:messages`, 0, REDIS_MESSAGE_WINDOW),
            redis.lrange(`${activityChannel}:messages`, 0, REDIS_MESSAGE_WINDOW),
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
