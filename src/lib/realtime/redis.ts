import { Redis } from "@upstash/redis";

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
  message: Record<string, unknown>
): Promise<void> {
  if (!redis) {
    console.warn("⚠️ [REALTIME] Redis not configured, skipping publish");
    return;
  }

  try {
    // Redis pub/sub via REST API
    // Note: Upstash Redis REST API doesn't support native pub/sub
    // We'll use a different approach: store messages in a list and poll or use SSE
    // For now, we'll use a simple key-based approach with expiration
    const messageKey = `${channel}:${Date.now()}`;
    await redis.setex(messageKey, 10, JSON.stringify(message)); // 10 second TTL

    // Also store in a list for the channel
    const channelList = `${channel}:messages`;
    await redis.lpush(channelList, JSON.stringify(message));
    await redis.ltrim(channelList, 0, 99); // Keep last 100 messages
    await redis.expire(channelList, 3600); // 1 hour expiration

    console.log(`✅ [REALTIME] Published message to ${channel}`);
  } catch (error) {
    console.error(`❌ [REALTIME] Failed to publish to ${channel}:`, error);
  }
}

/**
 * Get recent messages from a channel
 */
export async function getRecentMessages(
  channel: string,
  limit: number = 10
): Promise<Array<Record<string, unknown>>> {
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
      .filter((msg): msg is Record<string, unknown> => msg !== null);
  } catch (error) {
    console.error(
      `❌ [REALTIME] Failed to get messages from ${channel}:`,
      error
    );
    return [];
  }
}
