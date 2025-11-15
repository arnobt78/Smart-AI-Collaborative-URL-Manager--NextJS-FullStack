"use client";

import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Bot,
  BotMessageSquare,
  Wand2,
  Tags,
  FileText,
  FolderOpen,
} from "lucide-react";
import type { AIProvider } from "@/lib/ai/providers";

interface EnhancementResult {
  category: string;
  tags: string[];
  summary: string;
  confidence: number;
  provider: string;
  success: boolean;
  error?: string;
}

interface UrlEnhancerProps {
  url: string;
  title?: string;
  description?: string;
  onEnhance: (result: EnhancementResult) => void;
  provider?: AIProvider;
  compact?: boolean; // For inline use in forms
}

export function UrlEnhancer({
  url,
  title,
  description,
  onEnhance,
  provider,
  compact = false,
}: UrlEnhancerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(true);

  const handleEnhance = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowResult(true);

    try {
      // Fetch metadata if title/description not provided for better AI enhancement
      let enhancedTitle = title;
      let enhancedDescription = description;

      if (!title || !description) {
        try {
          const metadataResponse = await fetch(
            `/api/metadata?url=${encodeURIComponent(url)}`
          );
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            enhancedTitle = enhancedTitle || metadata.title || undefined;
            enhancedDescription =
              enhancedDescription || metadata.description || undefined;
          }
        } catch (err) {
          // Metadata fetch failed, continue with provided values
          console.warn("Failed to fetch metadata for AI enhancement:", err);
        }
      }

      const response = await fetch("/api/ai/enhance-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          title: enhancedTitle,
          description: enhancedDescription,
          provider,
          options: {
            categorize: true,
            generateTags: true,
            summarize: true,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to enhance URL");
      }

      setResult(data);
      onEnhance(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to enhance URL";
      setError(errorMessage);
      console.error("Enhancement error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleEnhance}
          disabled={loading || !url}
          className="group relative flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white rounded-lg hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin relative z-10" />
              <span className="relative z-10">Enhancing...</span>
            </>
          ) : (
            <>
              <Bot className="w-4 h-4 relative z-10" />
              <span className="relative z-10">AI Enhance</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {result && result.success && showResult && (
          <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2.5 animate-in fade-in slide-in-from-bottom-2 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-xs font-semibold text-green-800 dark:text-green-200">
                  ✅ Auto-filled below! • {result.provider} •{" "}
                  {result.confidence}%
                </p>
              </div>
              <button
                onClick={() => setShowResult(false)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            {result.category && (
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-gray-600 dark:text-gray-300 mr-1">
                  Category:
                </span>
                <span className="inline-block px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-md text-xs font-semibold shadow-sm">
                  {result.category}
                </span>
              </div>
            )}
            {result.tags && result.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tags className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  Tags:
                </span>
                {result.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-800 dark:text-purple-200 rounded-md text-xs font-medium shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {result.summary && (
              <div className="flex items-start gap-1.5 pt-1 border-t border-green-200 dark:border-green-700">
                <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 flex items-start gap-1.5">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    Summary:
                  </span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic flex-1">
                    {result.summary}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleEnhance}
        disabled={loading || !url}
        className="group relative w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white rounded-xl hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin relative z-10" />
            <span className="relative z-10 font-semibold">
              Enhancing with AI...
            </span>
          </>
        ) : (
          <>
            <BotMessageSquare className="w-5 h-5 relative z-10" />
            <span className="relative z-10 font-semibold">Enhance with AI</span>
            <Wand2 className="w-4 h-4 relative z-10 opacity-75" />
          </>
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              Enhancement Failed
            </p>
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {result && result.success && showResult && (
        <div className="p-5 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-800 dark:text-green-200">
                  Successfully Enhanced
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Powered by {result.provider} • Confidence: {result.confidence}
                  %
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowResult(false)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.category && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Category
                  </p>
                </div>
                <span className="inline-block px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg text-sm font-medium shadow-sm">
                  {result.category}
                </span>
              </div>
            )}

            {result.tags && result.tags.length > 0 && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Tags className="w-4 h-4 text-purple-500" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Tags ({result.tags.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-800 dark:text-purple-200 rounded-md text-xs font-medium shadow-sm hover:scale-105 transition-transform"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.summary && (
            <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-teal-500" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Summary
                </p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {result.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
