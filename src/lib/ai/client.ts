/**
 * Shared AI HTTP client (Layer 2) + per-provider model-chain loop.
 *
 * - Gemini: native generateContent endpoint (model ID in URL path)
 * - Groq / OpenRouter / Hugging Face: OpenAI-compatible /chat/completions
 *
 * Retriable failures advance to the next model; HTTP 429 skips the rest of
 * that provider's models so the outer caller can try the next provider.
 * See docs/LLM_MODEL_SELECTION.md — Generic automatic fallback chain.
 */

import type { AIProvider, ProviderConfig } from "./providers";
import { getProvider } from "./providers";

export interface ChatCallOptions {
  /** Max completion tokens (OpenAI-compatible) / maxOutputTokens (Gemini) */
  maxTokens?: number;
  temperature?: number;
  /** Optional system message for OpenAI-compatible providers */
  system?: string;
}

/** Status codes treated as retriable (try next model / provider). */
const RETRIABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export class ProviderRateLimitedError extends Error {
  readonly provider: AIProvider;
  constructor(provider: AIProvider, message?: string) {
    super(message || `${provider} rate limited`);
    this.name = "ProviderRateLimitedError";
    this.provider = provider;
  }
}

function isRetriableStatus(status: number): boolean {
  return RETRIABLE_STATUSES.has(status);
}

/**
 * Call Gemini generateContent for a single model ID.
 */
async function callGeminiModel(
  model: string,
  prompt: string,
  apiKey: string,
  options: ChatCallOptions
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 500,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(
      `Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
}

/**
 * Call an OpenAI-compatible chat/completions endpoint for a single model.
 */
async function callOpenAICompatibleModel(
  config: ProviderConfig,
  model: string,
  prompt: string,
  options: ChatCallOptions
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.extraHeaders || {}),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 500,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(
      `${config.displayName} API error: ${response.status} - ${JSON.stringify(errorData)}`
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error(`${config.displayName} returned empty response`);
  }
  return text;
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status?: number }).status;
  }
  return undefined;
}

/**
 * Try every model in the provider's chain until one succeeds.
 * On 429, throws ProviderRateLimitedError so the outer loop skips to next provider.
 */
export async function callProviderWithModelChain(
  provider: AIProvider,
  prompt: string,
  options: ChatCallOptions = {}
): Promise<string> {
  const config = getProvider(provider);

  if (!config.available || !config.apiKey) {
    throw new Error(`${config.displayName} is not configured`);
  }

  const models = config.models?.length ? config.models : [config.model];
  let lastError: unknown;

  for (const model of models) {
    try {
      if (provider === "gemini") {
        return await callGeminiModel(model, prompt, config.apiKey, options);
      }
      return await callOpenAICompatibleModel(config, model, prompt, options);
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);

      // Rate limit: do not burn remaining models on the same key/window
      if (status === 429) {
        throw new ProviderRateLimitedError(
          provider,
          `${config.displayName} rate limited (429)`
        );
      }

      // Non-retriable client errors (except empty/malformed handled as retriable above)
      if (status !== undefined && status >= 400 && status < 500 && !isRetriableStatus(status)) {
        throw error;
      }

      // Retriable or network/empty: try next model in chain
      console.warn(
        `${config.displayName} model ${model} failed, trying next...`,
        error instanceof Error ? error.message : error
      );
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All ${config.displayName} models failed`);
}
