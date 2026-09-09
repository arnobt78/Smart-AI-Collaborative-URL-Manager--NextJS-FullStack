import { Redis } from "@upstash/redis";
import type { RealtimeChannelEvent } from "@/lib/realtime/event-types";

let redis: Redis | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export { redis };

/**
 * Channel names for pub/sub
 */
export const CHANNELS = {
  listUpdate: (listId: string) => `list:${listId}:update`,
  listUrlChange: (listId: string) => `list:${listId}:url:change`,
  listComment: (listId: string) => `list:${listId}:comment`,
  listActivity: (listId: string) => `list:${listId}:activity`,
};

/**
 * Publish a message to a Redis channel
 */
export async function publishMessage(
  channel: string,
  message: RealtimeChannelEvent
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    // List-poll transport (Upstash REST): LPUSH + LTRIM only — no dead SETEX keys.
    const channelList = `${channel}:messages`;
    await redis.lpush(channelList, JSON.stringify(message));
    await redis.ltrim(channelList, 0, 9); // Match SSE consumer window (+ small buffer)
    await redis.expire(channelList, 3600); // 1 hour expiration

  } catch (_error) {
  }
}

/**
 * Get recent messages from a channel
 */
export async function getRecentMessages(
  channel: string,
  limit: number = 10
): Promise<Array<RealtimeChannelEvent>> {
  if (!redis) {
    return [];
  }

  try {
    const channelList = `${channel}:messages`;
    const messages = await redis.lrange(channelList, 0, limit - 1);

    return messages
      .map((msg) => {
        try {
          return typeof msg === "string" ? JSON.parse(msg) : msg;
        } catch {
          return null;
        }
      })
      .filter((msg): msg is RealtimeChannelEvent => msg !== null);
  } catch (_error) {
    return [];
  }
}
