// AI-Powered Semantic Search Service
// Provides semantic search beyond keyword matching using AI
// Uses shared free-tier model chains from providers.ts + client.ts

import { AI_PROVIDERS, type AIProvider } from "./providers";
import { callProviderWithModelChain } from "./client";
import type { UrlItem } from "@/stores/urlListStore";

export interface SearchResult {
  url: UrlItem;
  relevanceScore: number;
  matchReason: string;
}

export interface SemanticSearchOptions {
  provider?: AIProvider;
  limit?: number; // Max number of results
  minRelevanceScore?: number; // Minimum relevance score (0-1)
}

class SemanticSearchService {
  /**
   * Generate searchable text content from a URL item
   */
  private generateSearchableContent(url: UrlItem): string {
    const parts: string[] = [];

    if (url.title) parts.push(`Title: ${url.title}`);
    if (url.description) parts.push(`Description: ${url.description}`);
    if (url.url) parts.push(`URL: ${url.url}`);
    if (url.tags && url.tags.length > 0)
      parts.push(`Tags: ${url.tags.join(", ")}`);
    if (url.category) parts.push(`Category: ${url.category}`);
    if (url.notes) parts.push(`Notes: ${url.notes}`);

    return parts.join("\n");
  }

  /**
   * Use AI to understand search intent and match URLs semantically
   */
  async semanticSearch(
    query: string,
    urls: UrlItem[],
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const { provider, limit = 20, minRelevanceScore = 0.3 } = options;

    if (!query.trim() || urls.length === 0) {
      return [];
    }

    const prompt = this.buildSemanticSearchPrompt(query, urls);

    try {
      // If specific provider requested, use it
      if (provider) {
        const providerConfig = AI_PROVIDERS[provider];
        if (!providerConfig.available || !providerConfig.apiKey) {
          throw new Error(`${providerConfig.displayName} not available`);
        }
        return await this.callProviderForSearch(provider, prompt, urls, limit, minRelevanceScore);
      }

      // Auto-fallback: Try providers in order
      const providers: AIProvider[] = ["gemini", "groq"];
      
      for (const providerName of providers) {
        const providerConfig = AI_PROVIDERS[providerName];
        if (!providerConfig.available || !providerConfig.apiKey) {
          continue;
        }

        try {
          return await this.callProviderForSearch(providerName, prompt, urls, limit, minRelevanceScore);
        } catch (error) {
          console.warn(`${providerConfig.displayName} failed, trying next...`, error);
          continue; // Try next provider
        }
      }

      throw new Error("All AI providers failed or are unavailable");
    } catch (error) {
      console.error("Semantic search error:", error);
      // Fallback to keyword-based search
      return this.fallbackKeywordSearch(query, urls, limit);
    }
  }

  /**
   * Call a specific provider for semantic search
   */
  private async callProviderForSearch(
    providerName: AIProvider,
    prompt: string,
    urls: UrlItem[],
    limit: number,
    minRelevanceScore: number
  ): Promise<SearchResult[]> {
    // Search only uses gemini + groq (outer order preserved in semanticSearch)
    if (providerName !== "gemini" && providerName !== "groq") {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    const aiResponse = await callProviderWithModelChain(providerName, prompt, {
      maxTokens: 2048,
      temperature: 0.3,
      system:
        providerName === "groq"
          ? "You are a semantic search assistant. Return only valid JSON arrays."
          : undefined,
    });

    // Parse AI response and extract relevance scores
    const results = this.parseAIResponse(aiResponse, urls);

    // Filter by minimum relevance score and limit results
    return results
      .filter((r) => r.relevanceScore >= minRelevanceScore)
      .slice(0, limit)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Build prompt for AI semantic search
   */
  private buildSemanticSearchPrompt(query: string, urls: UrlItem[]): string {
    const urlEntries = urls.map((url, index) => {
      const content = this.generateSearchableContent(url);
      return `[${index}] ${content}`;
    });

    return `You are a semantic search assistant. Given a search query and a list of URLs, rank the URLs by relevance to the query.

Search Query: "${query}"

URLs to rank:
${urlEntries.join("\n\n")}

For each URL, provide:
1. Index number (e.g., [0], [1])
2. Relevance score (0.0 to 1.0, where 1.0 is most relevant)
3. Brief reason for the match (one sentence)

Format your response as JSON array:
[
  {"index": 0, "score": 0.95, "reason": "Matches query because..."},
  {"index": 1, "score": 0.75, "reason": "Related to query because..."}
]

Only include URLs with relevance score >= 0.3. Return empty array if no relevant URLs found.`;
  }

  /**
   * Parse AI response and extract relevance scores
   */
  private parseAIResponse(
    aiResponse: string,
    urls: UrlItem[]
  ): SearchResult[] {
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;

      const parsed = JSON.parse(jsonStr) as Array<{
        index: number;
        score: number;
        reason: string;
      }>;

      return parsed
        .filter((item) => item.index >= 0 && item.index < urls.length)
        .map((item) => ({
          url: urls[item.index],
          relevanceScore: Math.min(Math.max(item.score, 0), 1), // Clamp between 0-1
          matchReason: item.reason || "Relevant to search query",
        }));
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return [];
    }
  }

  /**
   * Fallback to keyword-based search if AI fails
   */
  private fallbackKeywordSearch(
    query: string,
    urls: UrlItem[],
    limit: number
  ): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    return urls
      .map((url) => {
        let score = 0;
        const searchableText = this.generateSearchableContent(url).toLowerCase();

        // Exact match gets highest score
        if (searchableText.includes(queryLower)) {
          score += 0.8;
        }

        // Word-by-word matching
        queryWords.forEach((word) => {
          if (searchableText.includes(word)) {
            score += 0.2;
          }
        });

        // Title matches are more important
        if (url.title?.toLowerCase().includes(queryLower)) {
          score += 0.3;
        }

        // Tag matches
        if (
          url.tags?.some((tag) =>
            tag.toLowerCase().includes(queryLower)
          )
        ) {
          score += 0.2;
        }

        return {
          url,
          relevanceScore: Math.min(score, 1),
          matchReason: "Keyword match",
        };
      })
      .filter((r) => r.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Find similar URLs based on content similarity
   */
  async findSimilarUrls(
    targetUrl: UrlItem,
    allUrls: UrlItem[],
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 5, minRelevanceScore = 0.5 } = options;

    // Generate a search query from the target URL
    const searchQuery = this.generateSearchableContent(targetUrl);

    // Find URLs similar to the target (excluding the target itself)
    const otherUrls = allUrls.filter((url) => url.id !== targetUrl.id);

    if (otherUrls.length === 0) {
      return [];
    }

    // Use semantic search to find similar URLs
    return this.semanticSearch(searchQuery, otherUrls, {
      ...options,
      limit,
      minRelevanceScore,
    });
  }
}

export const semanticSearchService = new SemanticSearchService();

