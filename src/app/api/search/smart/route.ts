import { NextRequest, NextResponse } from "next/server";
import { redis, cacheKeys, CACHE_TTL } from "@/lib/redis";
import { semanticSearchService } from "@/lib/ai/search";
import { findSimilarUrls as vectorFindSimilar, generateEmbeddingText } from "@/lib/vector";
import type { UrlItem } from "@/stores/urlListStore";
import { getListById } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const listId = searchParams.get("listId");
    const urlId = searchParams.get("urlId"); // For "find similar" feature

    // Validate listId (required for both modes)
    if (!listId) {
      return NextResponse.json(
        { error: "List ID is required" },
        { status: 400 }
      );
    }

    // Get list data
    const list = await getListById(listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const urls = ((list.urls as UrlItem[]) || []) as UrlItem[];

    // For "find similar" feature (urlId provided, query not required)
    if (urlId) {
      const targetUrl = urls.find((u) => u.id === urlId);
      if (!targetUrl) {
        return NextResponse.json(
          { error: "URL not found" },
          { status: 404 }
        );
      }

      // Check cache for similar URLs
      const cacheKey = cacheKeys.similarUrls(listId, urlId);
      let cached: Array<{
        url: UrlItem;
        relevanceScore: number;
        matchReason: string;
      }> | null = null;

      if (redis) {
        cached = await redis.get<
          Array<{
            url: UrlItem;
            relevanceScore: number;
            matchReason: string;
          }>
        >(cacheKey);
      }

      if (cached) {
        return NextResponse.json({ results: cached, cached: true });
      }

      // Try vector search first (faster and more accurate)
      let similarResults: Array<{
        url: UrlItem;
        relevanceScore: number;
        matchReason: string;
      }> = [];

      console.log(`🔍 [SMART SEARCH] Finding similar URLs for: ${targetUrl.title || targetUrl.url} (using vector search)`);
      const vectorResults = await vectorFindSimilar(
        generateEmbeddingText(targetUrl),
        listId,
        5
      );

      if (vectorResults.length > 0) {
        console.log(`✅ [SMART SEARCH] Vector search found ${vectorResults.length} similar URLs`);
        // Transform vector results to match SearchResult format
        similarResults = vectorResults.map((result) => ({
          url: result.url,
          relevanceScore: result.score,
          matchReason: `Vector similarity: ${Math.round(result.score * 100)}% match`,
        }));
      } else {
        console.log(`⚠️ [SMART SEARCH] Vector search returned no results, falling back to AI semantic search`);
        // Fallback to AI semantic search if vector search fails/empty
        similarResults = await semanticSearchService.findSimilarUrls(
          targetUrl,
          urls,
          { limit: 5, minRelevanceScore: 0.5 }
        );
        console.log(`✅ [SMART SEARCH] AI search found ${similarResults.length} similar URLs`);
      }

      // Cache results
      if (redis) {
        await redis.setex(
          cacheKey,
          CACHE_TTL.SIMILAR_URLS,
          JSON.stringify(similarResults)
        );
      }

      return NextResponse.json({ results: similarResults, cached: false });
    }

    // Regular semantic search (query required)
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = cacheKeys.search(listId, normalizedQuery);

    // Check Redis cache first
    let cached: Array<{
      url: UrlItem;
      relevanceScore: number;
      matchReason: string;
    }> | null = null;

    if (redis) {
      cached = await redis.get<
        Array<{
          url: UrlItem;
          relevanceScore: number;
          matchReason: string;
        }>
      >(cacheKey);
    }

    if (cached) {
      return NextResponse.json({ results: cached, cached: true });
    }

    // First, try keyword search for exact/partial matches (fastest and most relevant)
    const keywordResults: Array<{
      url: UrlItem;
      relevanceScore: number;
      matchReason: string;
    }> = [];

    urls.forEach((url) => {
      const title = (url.title || "").toLowerCase();
      const description = (url.description || "").toLowerCase();
      const urlStr = url.url.toLowerCase();
      const tags = (url.tags || []).join(" ").toLowerCase();
      const category = (url.category || "").toLowerCase();

      // Check for exact matches first (higher relevance)
      if (
        title.includes(normalizedQuery) ||
        urlStr.includes(normalizedQuery) ||
        tags.includes(normalizedQuery)
      ) {
        keywordResults.push({
          url,
          relevanceScore: 0.9, // High relevance for keyword matches
          matchReason: "Keyword match",
        });
      } else if (
        description.includes(normalizedQuery) ||
        category.includes(normalizedQuery)
      ) {
        keywordResults.push({
          url,
          relevanceScore: 0.7, // Medium relevance
          matchReason: "Keyword match in description/category",
        });
      }
    });

    // If keyword search found results, ONLY return those (exact matches take priority)
    // Only use vector search as fallback when keyword search finds 0 results
    let searchResults: Array<{
      url: UrlItem;
      relevanceScore: number;
      matchReason: string;
    }> = [...keywordResults];

    // Only use vector search if keyword search found NO results
    if (keywordResults.length === 0) {
      console.log(`🔍 [SMART SEARCH] No keyword matches for "${query}", trying vector search`);
      const vectorResults = await vectorFindSimilar(query, listId, 20);

      if (vectorResults.length > 0) {
        console.log(`✅ [SMART SEARCH] Vector search found ${vectorResults.length} results`);
        // Transform vector results to match SearchResult format
        // Also enrich with full URL data from database
        const vectorSearchResults = vectorResults
          .map((result) => {
            const fullUrl = urls.find((u) => u.id === result.url.id);
            if (!fullUrl) return null;
            return {
              url: fullUrl,
              relevanceScore: result.score,
              matchReason: `Semantic similarity: ${Math.round(result.score * 100)}% match`,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        searchResults = [...vectorSearchResults];
      }
    } else {
      console.log(`✅ [SMART SEARCH] Keyword search found ${keywordResults.length} exact matches, skipping vector search`);
    }

    // Only use AI semantic search as fallback if we have NO results from keyword/vector search
    // If keyword search found results (even just 1), we should ONLY return those - don't add AI results
    if (searchResults.length === 0) {
      console.log(`⚠️ [SMART SEARCH] No keyword or vector results found, trying AI semantic search`);
      const aiResults = await semanticSearchService.semanticSearch(
        query,
        urls,
        { limit: 20, minRelevanceScore: 0.3 }
      );
      // Use AI results as last resort
      searchResults = aiResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 20);
      console.log(`✅ [SMART SEARCH] AI search found ${searchResults.length} results as fallback`);
    } else {
      console.log(`✅ [SMART SEARCH] Returning ${searchResults.length} results from keyword/vector search (no AI fallback needed)`);
    }

    // Sort all results by relevance score
    searchResults = searchResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    // Cache results in Redis
    if (redis) {
      await redis.setex(
        cacheKey,
        CACHE_TTL.SEARCH_RESULTS,
        JSON.stringify(searchResults)
      );
    }

    return NextResponse.json({ results: searchResults, cached: false });
  } catch (error) {
    console.error("Smart search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

