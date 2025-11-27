// AI-Powered Smart Collections Service
// Provides URL grouping, categorization, duplicate detection, and smart recommendations

import { AI_PROVIDERS, type AIProvider } from "./providers";
import { findSimilarUrls } from "@/lib/vector";
import { redis } from "@/lib/redis";
import type { UrlItem } from "@/stores/urlListStore";

export interface CollectionSuggestion {
  id: string;
  name: string;
  description: string;
  urls: UrlItem[];
  category?: string;
  confidence: number;
  reason: string;
}

export interface DuplicateDetection {
  url: UrlItem;
  duplicates: Array<{
    url: UrlItem;
    listId: string;
    listSlug?: string;
    listTitle?: string;
    similarity: number;
  }>;
}

export interface SmartCollectionOptions {
  provider?: AIProvider;
  minGroupSize?: number; // Minimum URLs per collection
  maxCollections?: number;
  useVectorSearch?: boolean; // Use vector similarity for grouping
  clearCache?: boolean; // Force clear cache and regenerate
}

class SmartCollectionsService {
  /**
   * Generate collection suggestions using AI categorization
   */
  async suggestCollections(
    urls: UrlItem[],
    listId: string,
    options: SmartCollectionOptions = {}
  ): Promise<CollectionSuggestion[]> {
    const {
      provider,
      minGroupSize = 2,
      maxCollections = 10,
      useVectorSearch = true,
      clearCache = false,
    } = options;

    if (urls.length < minGroupSize) {
      return [];
    }

    const cacheKey = `collections:suggestions:${listId}`;

    // Clear cache if requested
    if (clearCache && redis) {
      try {
        await redis.del(cacheKey);
        console.log(`🗑️ [COLLECTIONS] Cache cleared for list ${listId}`);
      } catch (error) {
        console.warn("Failed to clear cache:", error);
      }
    }

    // Check Redis cache first (skip if clearCache is true)
    if (!clearCache && redis) {
      try {
        const cached = await redis.get<string>(cacheKey);
        // Check if cached value is a valid string
        if (cached && typeof cached === "string" && cached.trim() && cached !== "null") {
          try {
            const parsed = JSON.parse(cached) as CollectionSuggestion[];
            // Validate parsed data
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`✅ [COLLECTIONS] Cache hit for list ${listId}`);
              return parsed;
            }
          } catch (parseError) {
            // Invalid JSON in cache, delete it and continue
            console.warn("Invalid cache data, deleting:", parseError);
            await redis.del(cacheKey).catch(() => {});
          }
        }
      } catch (error) {
        console.warn("Failed to read from cache:", error);
      }
    }

    try {
      // Step 1: Use vector search to find similar URLs (if enabled)
      let groupedUrls: Map<string, UrlItem[]> = new Map();

      if (useVectorSearch && urls.length > 0) {
        try {
          // Improved grouping: Use vector search to find similar URLs and group them
          const processed = new Set<string>();
          const urlMap = new Map<string, UrlItem>();
          urls.forEach((url) => urlMap.set(url.id, url));

          // Optimize: For small lists (≤3 URLs), skip individual vector searches and group all together
          // For medium lists (4-20 URLs), use sample-based grouping
          // For large lists (>20 URLs), use smart sampling to reduce vector searches
          if (urls.length <= 3) {
            // Small list: Group all URLs together without individual vector searches
            const allUrlsArray = [...urls];
            const groupKey = "All URLs";
            groupedUrls.set(groupKey, allUrlsArray);
            urls.forEach((url) => processed.add(url.id));
          } else if (urls.length <= 20) {
            // Medium list: Process each URL with vector search (up to 20 searches)
            for (const url of urls) {
              if (processed.has(url.id)) continue;

              try {
                const similar = await findSimilarUrls(
                  this.generateSearchableText(url),
                  listId,
                  10 // Get more results to find actual matches
                );

                // Filter out the URL itself and already processed URLs
                const validSimilar = similar.filter(
                  (result) =>
                    result.url.id !== url.id &&
                    !processed.has(result.url.id) &&
                    result.score >= 0.65 && // Lower threshold for grouping
                    urlMap.has(result.url.id) // Ensure it's in our URL list
                );

                if (validSimilar.length > 0) {
                  // Create a group - use category if available, otherwise use first URL's title/hostname
                  const groupKey =
                    url.category ||
                    url.title?.substring(0, 30).replace(/[^a-z0-9]/gi, "-") ||
                    new URL(url.url).hostname.replace(/\./g, "-");

                  // Ensure unique group key
                  let finalGroupKey = groupKey;
                  let counter = 1;
                  while (groupedUrls.has(finalGroupKey)) {
                    finalGroupKey = `${groupKey}-${counter}`;
                    counter++;
                  }

                  // Create group with this URL and similar ones
                  const group: UrlItem[] = [url];
                  processed.add(url.id);

                  for (const similarResult of validSimilar) {
                    const similarUrl = urlMap.get(similarResult.url.id);
                    if (similarUrl && !processed.has(similarUrl.id)) {
                      group.push(similarUrl);
                      processed.add(similarUrl.id);
                    }
                  }

                  groupedUrls.set(finalGroupKey, group);
                } else {
                  // No similar URLs found, add to uncategorized
                  const groupKey = url.category || "Uncategorized";
                  if (!groupedUrls.has(groupKey)) {
                    groupedUrls.set(groupKey, []);
                  }
                  groupedUrls.get(groupKey)!.push(url);
                  processed.add(url.id);
                }
              } catch (error) {
                // Vector search failed for this URL, add to uncategorized
                console.warn(`Vector search failed for URL ${url.id}:`, error);
                const groupKey = url.category || "Uncategorized";
                if (!groupedUrls.has(groupKey)) {
                  groupedUrls.set(groupKey, []);
                }
                groupedUrls.get(groupKey)!.push(url);
                processed.add(url.id);
              }
            }
          } else {
            // Large list (>20 URLs): Use smart sampling - only search ~20 representative URLs
            // This reduces 100+ searches to ~20 while still finding good groups
            const sampleSize = Math.min(20, Math.ceil(urls.length / 2));
            const step = Math.floor(urls.length / sampleSize);
            const sampleUrls = urls.filter((_, index) => index % step === 0 || index === 0 || index === urls.length - 1).slice(0, sampleSize);
            
            // Batch vector searches with concurrency limit (5 at a time)
            const concurrencyLimit = 5;
            const searchResults: Array<{ url: UrlItem; similar: any[] }> = [];
            
            for (let i = 0; i < sampleUrls.length; i += concurrencyLimit) {
              const batch = sampleUrls.slice(i, i + concurrencyLimit);
              const batchPromises = batch.map(async (url) => {
                if (processed.has(url.id)) {
                  return { url, similar: [] };
                }
                try {
                  const similar = await findSimilarUrls(
                    this.generateSearchableText(url),
                    listId,
                    15 // Get more results for better grouping
                  );
                  return { url, similar };
                } catch (error) {
                  console.warn(`Vector search failed for URL ${url.id}:`, error);
                  return { url, similar: [] };
                }
              });
              
              const batchResults = await Promise.all(batchPromises);
              searchResults.push(...batchResults);
            }
            
            // Process results to build groups
            for (const { url, similar } of searchResults) {
              if (processed.has(url.id)) continue;

              const validSimilar = similar.filter(
                (result) =>
                  result.url.id !== url.id &&
                  !processed.has(result.url.id) &&
                  result.score >= 0.65 &&
                  urlMap.has(result.url.id)
              );

              if (validSimilar.length > 0) {
                const groupKey =
                  url.category ||
                  url.title?.substring(0, 30).replace(/[^a-z0-9]/gi, "-") ||
                  new URL(url.url).hostname.replace(/\./g, "-");

                let finalGroupKey = groupKey;
                let counter = 1;
                while (groupedUrls.has(finalGroupKey)) {
                  finalGroupKey = `${groupKey}-${counter}`;
                  counter++;
                }

                const group: UrlItem[] = [url];
                processed.add(url.id);

                for (const similarResult of validSimilar) {
                  const similarUrl = urlMap.get(similarResult.url.id);
                  if (similarUrl && !processed.has(similarUrl.id)) {
                    group.push(similarUrl);
                    processed.add(similarUrl.id);
                  }
                }

                groupedUrls.set(finalGroupKey, group);
              } else {
                const groupKey = url.category || "Uncategorized";
                if (!groupedUrls.has(groupKey)) {
                  groupedUrls.set(groupKey, []);
                }
                groupedUrls.get(groupKey)!.push(url);
                processed.add(url.id);
              }
            }
            
            // Add any unprocessed URLs to uncategorized
            urls.forEach((url) => {
              if (!processed.has(url.id)) {
                const groupKey = url.category || "Uncategorized";
                if (!groupedUrls.has(groupKey)) {
                  groupedUrls.set(groupKey, []);
                }
                groupedUrls.get(groupKey)!.push(url);
              }
            });
          }
        } catch (error) {
          // Vector search completely failed, fall back to category grouping
          console.warn("Vector search failed, using category grouping:", error);
          urls.forEach((url) => {
            const key = url.category || "Uncategorized";
            if (!groupedUrls.has(key)) {
              groupedUrls.set(key, []);
            }
            groupedUrls.get(key)!.push(url);
          });
        }
      } else {
        // Fallback: Group by category if available
        urls.forEach((url) => {
          const key = url.category || "Uncategorized";
          if (!groupedUrls.has(key)) {
            groupedUrls.set(key, []);
          }
          groupedUrls.get(key)!.push(url);
        });
      }

      // Step 2: Use AI to refine and name collections
      // OPTIMIZATION: Generate metadata in parallel for all collections (much faster)
      const collections: CollectionSuggestion[] = [];
      
      // Filter groups by minGroupSize first
      const validGroups = Array.from(groupedUrls.entries()).filter(
        ([_, groupUrls]) => groupUrls.length >= minGroupSize
      );

      if (validGroups.length === 0 && urls.length >= minGroupSize) {
        // Fallback: Create one collection with all URLs
        const aiResult = await this.generateCollectionMetadata(urls, provider);
        collections.push({
          id: `collection-all-${Date.now()}`,
          name: aiResult.name || "All URLs",
          description: aiResult.description || `Collection of ${urls.length} URLs from this list`,
          urls: urls,
          category: aiResult.category || "General",
          confidence: Math.max(aiResult.confidence || 50, 50),
          reason: aiResult.reason || "All URLs from this list",
        });
      } else {
        // OPTIMIZATION: Generate all metadata in parallel (not sequentially)
        const metadataPromises = validGroups.map(async ([key, groupUrls]) => {
          // First, generate a simple heuristic-based name/description (fast)
          const heuristic = this.generateHeuristicMetadata(groupUrls, key);
          
          // Then enhance with AI in parallel
          try {
            const aiResult = await this.generateCollectionMetadata(
              groupUrls,
              provider
            );
            return {
              key,
              groupUrls,
              metadata: aiResult,
            };
          } catch (error) {
            // If AI fails, use heuristic
            return {
              key,
              groupUrls,
              metadata: heuristic,
            };
          }
        });

        // Wait for all metadata generation in parallel
        const results = await Promise.all(metadataPromises);

        // Build collection objects
        const timestamp = Date.now();
        for (const { key, groupUrls, metadata } of results) {
          collections.push({
            id: `collection-${key}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
            name: metadata.name || key,
            description: metadata.description || `Collection of ${groupUrls.length} related URLs`,
            urls: groupUrls,
            category: metadata.category || key,
            confidence: metadata.confidence || 75,
            reason: metadata.reason || "Grouped by similarity",
          });
        }
      }

      // Removed duplicate fallback - handled above

      // Sort by confidence and limit
      const sorted = collections
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxCollections);

      // Cache results for 1 hour (only if we have valid collections)
      if (redis && sorted.length > 0) {
        try {
          await redis.setex(cacheKey, 3600, JSON.stringify(sorted));
        } catch (error) {
          console.warn("Failed to cache collection suggestions:", error);
        }
      }

      return sorted;
    } catch (error) {
      console.error("❌ [COLLECTIONS] Failed to suggest collections:", error);
      return [];
    }
  }

  /**
   * Detect duplicate URLs across lists
   * OPTIMIZED: First check for exact matches (fast), only use vector search if needed
   */
  async detectDuplicates(
    url: UrlItem,
    allLists: Array<{ id: string; slug?: string; title?: string; urls: UrlItem[] }>,
    listId: string
  ): Promise<DuplicateDetection | null> {
    const duplicates: DuplicateDetection["duplicates"] = [];

    // OPTIMIZATION: First, check for exact URL matches across ALL lists (fast, no vector search)
    for (const list of allLists) {
      if (list.id === listId) continue; // Skip current list

      for (const listUrl of list.urls) {
        // Exact URL match (no vector search needed)
        if (listUrl.url === url.url) {
          duplicates.push({
            url: listUrl,
            listId: list.id,
            listSlug: list.slug,
            listTitle: list.title || "Untitled List",
            similarity: 1.0,
          });
        }
      }
    }

    // If exact matches found, return early (no need for expensive vector search)
    if (duplicates.length > 0) {
      return {
        url,
        duplicates,
      };
    }

    // OPTIMIZATION: Only use vector search if no exact matches found (expensive operation)
    // Also skip vector search if we have too many lists (performance optimization)
    if (allLists.length > 10) {
      // Too many lists - skip vector search for performance
      return null;
    }

    // Try vector search for similar URLs (only in first few lists to save time)
    const listsToCheck = allLists.slice(0, 3); // Only check first 3 lists for similar URLs
    
    for (const list of listsToCheck) {
      if (list.id === listId) continue;

      try {
        const similar = await findSimilarUrls(
          this.generateSearchableText(url),
          list.id,
          1 // Only get 1 result
        );
        
        // Use high similarity threshold (0.85) for duplicate detection
        if (similar.length > 0 && similar[0].score >= 0.85) {
          // Find the matching URL in the list
          const matchingUrl = list.urls.find((u) => u.id === similar[0].url.id);
          if (matchingUrl) {
            duplicates.push({
              url: matchingUrl,
              listId: list.id,
              listSlug: list.slug,
              listTitle: list.title || "Untitled List",
              similarity: similar[0].score,
            });
            // Found a similar URL, return early (no need to check more)
            break;
          }
        }
      } catch (error) {
        // Vector search failed, skip this list
        continue;
      }
    }

    if (duplicates.length === 0) {
      return null;
    }

    return {
      url,
      duplicates,
    };
  }

  /**
   * Generate heuristic-based metadata without AI (fast fallback)
   */
  private generateHeuristicMetadata(
    urls: UrlItem[],
    key: string
  ): {
    name: string;
    description: string;
    category?: string;
    confidence: number;
    reason: string;
  } {
    // Extract common keywords from titles
    const titles = urls.map((u) => u.title?.toLowerCase() || "").filter(Boolean);
    const commonWords: string[] = [];
    
    if (titles.length > 0) {
      const words = titles[0].split(/\s+/);
      for (const word of words.slice(0, 3)) {
        if (word.length > 3 && titles.every((t) => t.includes(word))) {
          commonWords.push(word);
        }
      }
    }

    const name = commonWords.length > 0
      ? commonWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Tools"
      : key.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    // Extract common domain patterns
    const domains = urls.map((u) => {
      try {
        return new URL(u.url).hostname.replace("www.", "");
      } catch {
        return "";
      }
    }).filter(Boolean);

    const category = this.inferCategory(urls, domains);

    return {
      name,
      description: `Collection of ${urls.length} related ${category || "URLs"}`,
      category: category || "General",
      confidence: 65, // Lower confidence for heuristic
      reason: `Grouped by similarity and common domain patterns`,
    };
  }

  /**
   * Infer category from URLs
   */
  private inferCategory(urls: UrlItem[], domains: string[]): string | undefined {
    const techKeywords = ["api", "console", "cloud", "database", "framework", "library"];
    const designKeywords = ["design", "ui", "icon", "color", "font", "illustration"];
    const businessKeywords = ["job", "career", "business", "analytics", "dashboard"];

    const allText = [...urls.map((u) => u.title || ""), ...domains]
      .join(" ")
      .toLowerCase();

    if (techKeywords.some((k) => allText.includes(k))) return "Tech";
    if (designKeywords.some((k) => allText.includes(k))) return "Design";
    if (businessKeywords.some((k) => allText.includes(k))) return "Business";

    return undefined;
  }

  /**
   * Generate collection metadata using AI
   */
  private async generateCollectionMetadata(
    urls: UrlItem[],
    provider?: AIProvider
  ): Promise<{
    name: string;
    description: string;
    category?: string;
    confidence: number;
    reason: string;
  }> {
    const urlInfo = urls
      .slice(0, 5)
      .map((u) => `${u.title || u.url}${u.description ? ` - ${u.description}` : ""}`)
      .join("\n");

    const prompt = `Analyze these URLs and suggest a collection name and description:

${urlInfo}

Provide a JSON response:
{
  "name": "Short collection name (2-4 words)",
  "description": "Brief description of what these URLs have in common",
  "category": "Category name (Tech, Design, Business, etc.)",
  "confidence": 85,
  "reason": "Why these URLs belong together"
}

Respond ONLY with valid JSON, no additional text.`;

    try {
      const providers: AIProvider[] = provider
        ? [provider]
        : ["gemini", "groq", "openrouter"];

      for (const providerName of providers) {
        const providerConfig = AI_PROVIDERS[providerName];
        if (!providerConfig.available || !providerConfig.apiKey) {
          continue;
        }

        try {
          const response = await this.callAIProvider(providerName, prompt);
          const parsed = this.parseAIResponse(response);

          return {
            name: parsed.name || "Untitled Collection",
            description: parsed.description || "A collection of related URLs",
            category: parsed.category,
            confidence: parsed.confidence || 75,
            reason: parsed.reason || "Grouped by similarity",
          };
        } catch (error) {
          console.warn(`${providerConfig.displayName} failed, trying next...`);
          continue;
        }
      }
    } catch (error) {
      console.error("AI metadata generation failed:", error);
    }

    // Fallback
    return {
      name: "Related URLs",
      description: `Collection of ${urls.length} related URLs`,
      confidence: 50,
      reason: "Grouped by similarity",
    };
  }

  /**
   * Call AI provider
   */
  private async callAIProvider(
    provider: AIProvider,
    prompt: string
  ): Promise<string> {
    const providerConfig = AI_PROVIDERS[provider];
    const apiKey = providerConfig.apiKey;

    if (!apiKey) {
      throw new Error(`${providerConfig.displayName} API key not configured`);
    }

    switch (provider) {
      case "gemini": {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      }

      case "groq": {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant. Return only valid JSON.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 500,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "{}";
      }

      case "openrouter": {
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer":
                process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
              "X-Title": "Daily Urlist - Smart Collections",
            },
            body: JSON.stringify({
              model: "meta-llama/llama-3.2-3b-instruct:free",
              messages: [
                {
                  role: "system",
                  content: "Return only valid JSON.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 500,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "{}";
      }

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(response: string): {
    name?: string;
    description?: string;
    category?: string;
    confidence?: number;
    reason?: string;
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn("Failed to parse AI response:", error);
    }

    return {};
  }

  /**
   * Generate searchable text from URL
   */
  private generateSearchableText(url: UrlItem): string {
    const parts: string[] = [];
    if (url.title) parts.push(url.title);
    if (url.description) parts.push(url.description);
    if (url.url) parts.push(url.url);
    if (url.tags && url.tags.length > 0) parts.push(url.tags.join(", "));
    if (url.category) parts.push(url.category);
    return parts.join("\n");
  }
}

export const smartCollectionsService = new SmartCollectionsService();

