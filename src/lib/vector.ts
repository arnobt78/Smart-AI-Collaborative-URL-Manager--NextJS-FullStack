import { Index } from "@upstash/vector";
import type { UrlItem } from "@/stores/urlListStore";

// Initialize Vector Index
let vectorIndex: Index | null = null;

if (
  process.env.UPSTASH_VECTOR_REST_URL &&
  process.env.UPSTASH_VECTOR_REST_TOKEN
) {
  vectorIndex = new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  });
}

export { vectorIndex };

// Vector metadata interface
export interface UrlVectorMetadata {
  urlId: string;
  listId: string;
  title?: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
}

/**
 * Generate searchable text content from URL for embedding
 */
export function generateEmbeddingText(url: UrlItem): string {
  const parts: string[] = [];

  if (url.title) parts.push(url.title);
  if (url.description) parts.push(url.description);
  if (url.url) parts.push(url.url);
  if (url.tags && url.tags.length > 0) parts.push(url.tags.join(", "));
  if (url.category) parts.push(url.category);
  if (url.notes) parts.push(url.notes);

  return parts.join("\n");
}

/**
 * Upsert a URL into the vector database
 */
export async function upsertUrlVector(
  url: UrlItem,
  listId: string
): Promise<void> {
  if (!vectorIndex) {
    console.warn("Vector index not configured, skipping vector upsert");
    return;
  }

  try {
    const embeddingText = generateEmbeddingText(url);
    const metadata: Record<string, unknown> = {
      urlId: url.id,
      listId,
      title: url.title || "",
      url: url.url,
      description: url.description || "",
      category: url.category || "",
      tags: url.tags || [],
    };

    // Use listId:urlId as unique ID to support multiple lists
    const vectorId = `${listId}:${url.id}`;

    await vectorIndex.upsert({
      id: vectorId,
      data: embeddingText, // Upstash will automatically generate embeddings using the model
      metadata,
    });
    console.log(
      `✅ [VECTOR] Upserted vector for URL: ${
        url.title || url.url
      } (${vectorId})`
    );
  } catch (error) {
    console.error("❌ [VECTOR] Failed to upsert URL vector:", error);
    // Don't throw - vector search is optional enhancement
  }
}

/**
 * Delete a URL from the vector database
 */
export async function deleteUrlVector(
  urlId: string,
  listId: string
): Promise<void> {
  if (!vectorIndex) {
    return;
  }

  try {
    const vectorId = `${listId}:${urlId}`;
    await vectorIndex.delete([vectorId]);
    console.log(`🗑️ [VECTOR] Deleted vector: ${vectorId}`);
  } catch (error) {
    console.error("❌ [VECTOR] Failed to delete URL vector:", error);
  }
}

/**
 * Query similar URLs using vector similarity search
 */
export async function findSimilarUrls(
  query: string,
  listId: string,
  topK: number = 5
): Promise<
  Array<{
    url: UrlItem;
    score: number;
    metadata: UrlVectorMetadata;
  }>
> {
  if (!vectorIndex) {
    console.warn(
      "⚠️ [VECTOR] Vector index not configured, returning empty results"
    );
    return [];
  }

  try {
    const startTime = Date.now();
    // Query vector database - Upstash will automatically generate embedding for the query
    // Note: Upstash Vector filters work differently, we'll filter results after fetching
    const results = await vectorIndex.query({
      data: query,
      topK: topK * 2, // Fetch more to account for filtering
      includeMetadata: true,
    });

    // Filter results to only include URLs from the current list
    // Also filter by minimum similarity score (0.65 = 65% similarity for stricter matching)
    // Upstash Vector returns cosine similarity scores (0-1, where 1 is most similar)
    // Using 0.65 ensures we only show truly relevant semantic matches
    const MIN_SIMILARITY_SCORE = 0.65;
    const filteredResults = results
      .filter(
        (result) =>
          result.metadata?.listId === listId &&
          (result.score || 0) >= MIN_SIMILARITY_SCORE
      )
      .slice(0, topK); // Limit to requested topK

    const duration = Date.now() - startTime;
    console.log(
      `🔍 [VECTOR] Found ${
        filteredResults.length
      } similar URLs in ${duration}ms (min similarity: ${MIN_SIMILARITY_SCORE}, query: "${query.substring(
        0,
        50
      )}...")`
    );

    // Transform results to match our SearchResult interface
    return filteredResults.map((result) => {
      const metadata = result.metadata as unknown as Record<string, unknown>;
      const vectorMetadata: UrlVectorMetadata = {
        urlId: (metadata?.urlId as string) || "",
        listId: (metadata?.listId as string) || "",
        title: (metadata?.title as string) || undefined,
        url: (metadata?.url as string) || "",
        description: (metadata?.description as string) || undefined,
        category: (metadata?.category as string) || undefined,
        tags: (metadata?.tags as string[]) || undefined,
      };
      return {
        url: {
          id: vectorMetadata.urlId,
          url: vectorMetadata.url,
          title: vectorMetadata.title,
          description: vectorMetadata.description,
          category: vectorMetadata.category,
          tags: vectorMetadata.tags,
          createdAt: "", // Will be populated from database
          isFavorite: false,
        } as UrlItem,
        score: result.score || 0,
        metadata: vectorMetadata,
      };
    });
  } catch (error) {
    console.error("❌ [VECTOR] Vector search failed:", error);
    return [];
  }
}

/**
 * Upsert multiple URLs in batch (for bulk operations)
 */
export async function upsertUrlVectors(
  urls: UrlItem[],
  listId: string
): Promise<void> {
  if (!vectorIndex) {
    console.warn(
      "⚠️ [VECTOR] Vector index not configured, skipping batch upsert"
    );
    return;
  }

  if (urls.length === 0) {
    console.log("ℹ️ [VECTOR] No URLs to sync, skipping");
    return;
  }

  try {
    const startTime = Date.now();
    const vectors = urls.map((url) => {
      const embeddingText = generateEmbeddingText(url);
      const metadata: Record<string, unknown> = {
        urlId: url.id,
        listId,
        title: url.title || "",
        url: url.url,
        description: url.description || "",
        category: url.category || "",
        tags: url.tags || [],
      };

      return {
        id: `${listId}:${url.id}`,
        data: embeddingText,
        metadata,
      };
    });

    // Upsert in batches (Upstash supports up to 100 vectors per request)
    const batchSize = 100;
    let totalSynced = 0;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await vectorIndex.upsert(batch);
      totalSynced += batch.length;
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ [VECTOR] Synced ${totalSynced} URLs to vector database in ${duration}ms (listId: ${listId})`
    );
  } catch (error) {
    console.error("❌ [VECTOR] Failed to upsert URL vectors in batch:", error);
  }
}
