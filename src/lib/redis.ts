import { Redis } from "@upstash/redis";

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
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SEARCH_RESULTS: 3600, // 1 hour
  SIMILAR_URLS: 7200, // 2 hours
  URL_EMBEDDINGS: 86400, // 24 hours
};
