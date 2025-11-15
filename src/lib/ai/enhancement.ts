// AI Enhancement Service for URLs
// Provides automatic categorization, tagging, description generation, and duplicate detection

import { AIProvider, getProvider, AI_PROVIDERS } from "./providers";

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
  private async callGeminiAPI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  private async callGroqAPI(prompt: string, apiKey: string): Promise<string> {
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
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Groq API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private async callOpenRouterAPI(
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
          "X-Title": "Daily Urlist - URL Enhancement",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.2-3b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter API error: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  private async callHuggingFaceAPI(
    prompt: string,
    apiKey: string
  ): Promise<string> {
    const models = [
      "meta-llama/Llama-3.1-8B-Instruct",
      "mistralai/Mistral-7B-Instruct-v0.3",
      "HuggingFaceH4/zephyr-7b-beta",
    ];

    for (const model of models) {
      try {
        const response = await fetch(
          "https://router.huggingface.co/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful AI assistant that analyzes and categorizes URLs.",
                },
                { role: "user", content: prompt },
              ],
              max_tokens: 500,
              temperature: 0.7,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data?.choices?.[0]?.message?.content) {
            return data.choices[0].message.content.trim();
          }
        }
      } catch (_error) {
        console.warn(`${model} failed, trying next...`);
        continue;
      }
    }

    throw new Error("All Hugging Face models failed");
  }

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
      } catch (error) {
        console.warn("Failed to parse JSON response:", error);
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

  private async callAIProvider(
    provider: AIProvider,
    prompt: string
  ): Promise<string> {
    const providerConfig = getProvider(provider);
    const apiKey = providerConfig.apiKey;

    if (!apiKey) {
      throw new Error(`${providerConfig.displayName} API key not configured`);
    }

    switch (provider) {
      case "gemini":
        return await this.callGeminiAPI(prompt, apiKey);
      case "groq":
        return await this.callGroqAPI(prompt, apiKey);
      case "openrouter":
        return await this.callOpenRouterAPI(prompt, apiKey);
      case "huggingface":
        return await this.callHuggingFaceAPI(prompt, apiKey);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
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
      } catch (error) {
        console.warn(`${providerConfig.displayName} failed:`, error);
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
