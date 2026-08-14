import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client (existing) + thin null-safe cache helpers (REQ-0005).
 * Env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (not UPSTASH_REDIS_URL).
 * Caching is optional — helpers fail soft when Redis is not configured.
 */

// Initialize Redis client
// Only initialize if environment variables are available
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

// Cache key helpers
export const cacheKeys = {
  search: (listId: string, query: string) => `search:${listId}:${query}`,
  similarUrls: (listId: string, urlId: string) => `similar:${listId}:${urlId}`,
  urlEmbedding: (listId: string, urlId: string) =>
    `embedding:${listId}:${urlId}`,
  listMetadata: (listId: string) => `list-metadata:${listId}`,
  urlMetadata: (url: string) => `url-metadata:${url}`,
  comments: (listId: string, urlId?: string) =>
    urlId ? `comments:${listId}:${urlId}` : `comments:${listId}`,
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SEARCH_RESULTS: 3600, // 1 hour
  SIMILAR_URLS: 7200, // 2 hours
  URL_EMBEDDINGS: 86400, // 24 hours
};

/** Get cached value — returns null if missing or Redis unavailable */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

/** Set cached value with optional TTL (seconds) */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  if (!redis) return;
  try {
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

/** Delete cached key — no-op if Redis unavailable */
export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}
