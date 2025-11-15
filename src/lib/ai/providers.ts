// AI Provider configuration for URL enhancement
// Adapted from ai-chat-bot project for Next.js server-side usage

export type AIProvider = "gemini" | "groq" | "openrouter" | "huggingface";

export interface ProviderConfig {
  name: AIProvider;
  displayName: string;
  available: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  icon: string;
}

export const AI_PROVIDERS: Record<AIProvider, ProviderConfig> = {
  // Google Gemini AI - 1.5M free tokens/month
  gemini: {
    name: "gemini",
    displayName: "Google Gemini",
    available: true,
    apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
    baseUrl:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    model: "gemini-2.0-flash",
    icon: "🤖",
  },

  // Groq API - Fast Llama 3 Turbo (Always-free daily quota)
  groq: {
    name: "groq",
    displayName: "Groq (Llama 3)",
    available: true,
    apiKey: process.env.GROQ_LLAMA_API_KEY || "",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-8b-instant",
    icon: "⚡",
  },

  // OpenRouter - Multi-model aggregator (Free quotas from partner models)
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    available: true,
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    icon: "💬",
  },

  // Hugging Face Inference Providers API
  huggingface: {
    name: "huggingface",
    displayName: "Hugging Face",
    available: true,
    apiKey: process.env.HUGGING_FACE_INFERENCE_API_KEY || "",
    baseUrl: "https://router.huggingface.co/v1/chat/completions",
    model: "meta-llama/Llama-3.1-8B-Instruct",
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
