// AI Enhancement Service for URLs
// Provides automatic categorization, tagging, description generation, and duplicate detection
// Model IDs and HTTP calls live in providers.ts + client.ts (free-tier chains, 2026-08-14)

import { AIProvider, getProvider, AI_PROVIDERS } from "./providers";
import { callProviderWithModelChain } from "./client";

export interface UrlMetadata {
  url: string;
  title?: string;
  description?: string;
  existingTags?: string[];
}

export interface EnhancementResult {
  category: string;
  tags: string[];
  summary: string;
  isDuplicate?: boolean;
  confidence: number;
  provider: string;
  success: boolean;
  error?: string;
}

export interface EnhancementOptions {
  provider?: AIProvider; // Optional: force specific provider
  detectDuplicates?: boolean; // Check for duplicates
  generateTags?: boolean; // Generate tags
  summarize?: boolean; // Summarize description
  categorize?: boolean; // Auto-categorize
}

class AIEnhancementService {
  private buildEnhancementPrompt(
    metadata: UrlMetadata,
    options: EnhancementOptions
  ): string {
    const parts: string[] = [];

    parts.push(
      `Analyze this URL and provide enhancement information in JSON format:`
    );
    parts.push(`URL: ${metadata.url}`);
    if (metadata.title) parts.push(`Title: ${metadata.title}`);
    if (metadata.description)
      parts.push(`Description: ${metadata.description}`);

    parts.push(
      `\nPlease provide a JSON response with the following structure:`
    );

    if (options.categorize) {
      parts.push(
        `- "category": A single category from this list: Tech, Design, Business, Education, Entertainment, News, Tools, Shopping, Social, Development, DevOps, Tutorial, Documentation, Blog, Portfolio, Other`
      );
    }

    if (options.generateTags) {
      parts.push(
        `- "tags": An array of 3-5 relevant tags (lowercase, hyphenated, e.g., ["web-development", "javascript", "tutorial"])`
      );
    }

    if (options.summarize) {
      if (metadata.description) {
        parts.push(
          `- "summary": A concise summary (1-2 sentences) of the description provided, or create a helpful summary based on the title and URL context`
        );
      } else {
        parts.push(
          `- "summary": A concise summary (1-2 sentences) describing what this URL is about based on the title and URL context`
        );
      }
    }

    parts.push(
      `- "confidence": A number from 0-100 indicating confidence in the analysis`
    );

    parts.push(
      `\nRespond ONLY with valid JSON, no additional text. Example format:\n{"category": "Tech", "tags": ["web-dev", "tools"], "summary": "...", "confidence": 85}`
    );

    return parts.join("\n");
  }

  private parseAIResponse(response: string): Partial<EnhancementResult> {
    // Try to extract JSON from response (might have markdown formatting)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_error) {
      }
    }

    // Fallback: Try to extract information manually
    const result: Partial<EnhancementResult> = {};

    // Extract category
    const categoryMatch = response.match(/category["\s:]+["']?([^"'\n}]+)/i);
    if (categoryMatch) {
      result.category = categoryMatch[1].trim();
    }

    // Extract tags
    const tagsMatch = response.match(/tags["\s:]+\[(.*?)\]/i);
    if (tagsMatch) {
      try {
        result.tags = JSON.parse(`[${tagsMatch[1]}]`);
      } catch {
        // Try manual extraction
        const tagList = tagsMatch[1].match(/["']([^"']+)["']/g);
        if (tagList) {
          result.tags = tagList.map((t) => t.replace(/["']/g, ""));
        }
      }
    }

    // Extract summary
    const summaryMatch = response.match(/summary["\s:]+["']?(.+?)["']?[,}]/i);
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim();
    }

    // Extract confidence
    const confidenceMatch = response.match(/confidence["\s:]+(\d+)/i);
    if (confidenceMatch) {
      result.confidence = parseInt(confidenceMatch[1], 10);
    }

    return result;
  }

  /** Delegate to shared client — walks that provider's free-tier model chain */
  private async callAIProvider(
    provider: AIProvider,
    prompt: string
  ): Promise<string> {
    return callProviderWithModelChain(provider, prompt, {
      maxTokens: 500,
      temperature: 0.7,
      system:
        provider === "huggingface"
          ? "You are a helpful AI assistant that analyzes and categorizes URLs."
          : undefined,
    });
  }

  async enhanceUrl(
    metadata: UrlMetadata,
    options: EnhancementOptions = {}
  ): Promise<EnhancementResult> {
    // Default options
    const opts: EnhancementOptions = {
      categorize: true,
      generateTags: true,
      summarize: true,
      detectDuplicates: false,
      ...options,
    };

    // Build prompt
    const prompt = this.buildEnhancementPrompt(metadata, opts);

    // If specific provider requested
    if (opts.provider) {
      const providerConfig = getProvider(opts.provider);
      if (!providerConfig.available || !providerConfig.apiKey) {
        return {
          category: "",
          tags: [],
          summary: "",
          confidence: 0,
          provider: providerConfig.displayName,
          success: false,
          error: `${providerConfig.displayName} is not available`,
        };
      }

      try {
        const response = await this.callAIProvider(opts.provider, prompt);
        const parsed = this.parseAIResponse(response);

        return {
          category: parsed.category || "Other",
          tags: parsed.tags || [],
          summary: parsed.summary || metadata.description || "",
          confidence: parsed.confidence || 50,
          provider: providerConfig.displayName,
          success: true,
        };
      } catch (error) {
        return {
          category: "",
          tags: [],
          summary: "",
          confidence: 0,
          provider: providerConfig.displayName,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Auto-fallback: Try providers in order
    const providers: AIProvider[] = [
      "gemini",
      "groq",
      "openrouter",
      "huggingface",
    ];

    for (const provider of providers) {
      const providerConfig = AI_PROVIDERS[provider];
      if (!providerConfig.available || !providerConfig.apiKey) {
        continue;
      }

      try {
        const response = await this.callAIProvider(provider, prompt);
        const parsed = this.parseAIResponse(response);

        return {
          category: parsed.category || "Other",
          tags: parsed.tags || [],
          summary: parsed.summary || metadata.description || "",
          confidence: parsed.confidence || 50,
          provider: providerConfig.displayName,
          success: true,
        };
      } catch (_error) {
        continue; // Try next provider
      }
    }

    return {
      category: "",
      tags: [],
      summary: "",
      confidence: 0,
      provider: "None",
      success: false,
      error:
        "All AI providers failed or are unavailable. Please check your API keys.",
    };
  }
}

export const aiEnhancementService = new AIEnhancementService();
