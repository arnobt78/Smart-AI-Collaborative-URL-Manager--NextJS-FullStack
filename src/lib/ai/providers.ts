/**
 * AI provider registry (Layer 1 — data, not logic).
 *
 * Free-tier model chains verified 2026-09-02 against docs/LLM_MODEL_SELECTION.md,
 * Groq models/deprecation email (Qwen3.6→3.8), Gemini pricing, and OpenRouter
 * model pages / free collection (not `max_price=0` alone). Order within `models`
 * is the inner fallback chain; callers walk providers in their own outer priority order.
 *
 * Env keys are unchanged so existing deployments keep working.
 */

export type AIProvider = "gemini" | "groq" | "openrouter" | "huggingface";

export interface ProviderConfig {
  name: AIProvider;
  displayName: string;
  available: boolean;
  apiKey: string;
  /** OpenAI-compatible chat URL, or Gemini generateContent base host for gemini */
  baseUrl: string;
  /**
   * Ordered free-tier model IDs for this provider.
   * First entry is preferred; later entries are tried on retriable failures.
   */
  models: string[];
  /** Convenience alias for models[0] — primary model for display / legacy reads */
  model: string;
  icon: string;
  /** Extra headers for OpenAI-compatible providers (e.g. OpenRouter referer) */
  extraHeaders?: Record<string, string>;
}

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
] as const;

// Groq: Llama Instant/Versatile free shutdown 2026-08-16; Qwen3.6 decommission 2026-09-14
const GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
] as const;

// OpenRouter: preferred free IDs first (model pages / free collection); max_price=0
// snapshots can omit gpt-oss:free. openrouter/free = dynamic last-rung router.
// 404/410 already retries next model in client.ts.
const OPENROUTER_MODELS = [
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "cohere/north-mini-code:free",
  "z-ai/glm-5.2:free",
  "openrouter/free",
] as const;

// Hugging Face Inference Providers router — prefer gpt-oss + Qwen3 fallback
const HUGGINGFACE_MODELS = [
  "openai/gpt-oss-20b:fastest",
  "openai/gpt-oss-120b:fastest",
  "Qwen/Qwen3-8B",
] as const;

export const AI_PROVIDERS: Record<AIProvider, ProviderConfig> = {
  gemini: {
    name: "gemini",
    displayName: "Google Gemini",
    available: true,
    apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
    // Path is built per-model in client.ts; host base kept for clarity
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [...GEMINI_MODELS],
    model: GEMINI_MODELS[0],
    icon: "🤖",
  },

  groq: {
    name: "groq",
    displayName: "Groq",
    available: true,
    apiKey: process.env.GROQ_LLAMA_API_KEY || "",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    models: [...GROQ_MODELS],
    model: GROQ_MODELS[0],
    icon: "⚡",
  },

  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    available: true,
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    models: [...OPENROUTER_MODELS],
    model: OPENROUTER_MODELS[0],
    icon: "💬",
    extraHeaders: {
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
      "X-Title": "Daily Urlist",
    },
  },

  huggingface: {
    name: "huggingface",
    displayName: "Hugging Face",
    available: true,
    apiKey: process.env.HUGGING_FACE_INFERENCE_API_KEY || "",
    baseUrl: "https://router.huggingface.co/v1/chat/completions",
    models: [...HUGGINGFACE_MODELS],
    model: HUGGINGFACE_MODELS[0],
    icon: "🔍",
  },
};

export const getAvailableProviders = (): ProviderConfig[] => {
  return Object.values(AI_PROVIDERS).filter(
    (provider) => provider.available && provider.apiKey
  );
};

export const getProvider = (name: AIProvider): ProviderConfig => {
  return AI_PROVIDERS[name];
};
