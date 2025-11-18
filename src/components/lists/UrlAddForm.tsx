"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { CirclePlus } from "lucide-react";
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";
import type { EnhancementResult } from "@/lib/ai";
import React, { useState, useEffect, useRef } from "react";
import { queryClient } from "@/lib/react-query";
import { saveQueryDataToLocalStorage } from "@/lib/react-query";
import type { UrlMetadata } from "@/utils/urlMetadata";

interface UrlAddFormProps {
  newUrl: string;
  setNewUrl: (v: string) => void;
  newTags: string;
  setNewTags: (v: string | ((prev: string) => string)) => void;
  newNote: string;
  setNewNote: (v: string | ((prev: string) => string)) => void;
  error?: string;
  isLoading: boolean;
  onAdd: (e: React.FormEvent) => void;
  onClear: () => void;
  isExpanded: boolean;
}

export function UrlAddForm({
  newUrl,
  setNewUrl,
  newTags,
  setNewTags,
  newNote,
  setNewNote,
  error,
  isLoading,
  onAdd,
  onClear,
  isExpanded,
}: UrlAddFormProps) {
  const [isUrlInputFocused, setIsUrlInputFocused] = useState(false);
  const [enhancementResult, setEnhancementResult] =
    useState<EnhancementResult | null>(null);
  
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel prefetch timeout and any in-flight fetch (call this when form is submitted or cleared)
  const cancelPrefetch = () => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
    // Abort any in-flight fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Prefetch metadata when URL changes while typing (debounced)
  useEffect(() => {
    if (!newUrl?.trim()) {
      // Cancel prefetch when URL is cleared
      cancelPrefetch();
      previousUrlRef.current = null;
      return;
    }

    // Skip if URL hasn't changed or is empty/invalid
    if (newUrl === previousUrlRef.current) return;

    // Validate URL format
    try {
      new URL(newUrl);
    } catch {
      return; // Invalid URL, skip prefetch
    }

    // Clear previous timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Debounce: prefetch after 1 second of no changes
    prefetchTimeoutRef.current = setTimeout(async () => {
      const queryKey = ["url-metadata", newUrl] as const;

      // Check if already cached
      const cached = queryClient.getQueryData<UrlMetadata>(queryKey);
      if (cached) {
        return; // Already cached, skip
      }

      // Create AbortController for this prefetch
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Prefetch metadata in background (non-blocking)
      try {
        // Use AbortController to cancel fetch if form is submitted/cleared
        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        const response = await fetch(
          `${baseUrl}/api/metadata?url=${encodeURIComponent(newUrl)}`,
          { signal: abortController.signal }
        );

        // Check if aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch metadata");
        }

        const metadata = await response.json();

        // Final check: if aborted while fetching, don't cache
        if (abortController.signal.aborted) {
          return;
        }

        // Populate React Query cache and localStorage
        queryClient.setQueryData<UrlMetadata>(queryKey, metadata);
        saveQueryDataToLocalStorage(queryKey, metadata);
      } catch (error) {
        // Silently fail if aborted or other error - prefetch is optional
        if (error instanceof Error && error.name !== "AbortError") {
          // Only log non-abort errors if needed for debugging
        }
      } finally {
        // Clear abort controller if this fetch completed (not aborted)
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }, 1000); // 1 second debounce

    previousUrlRef.current = newUrl;

    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [newUrl]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewUrl(e.target.value);
    setEnhancementResult(null); // Reset enhancement when URL changes
  };

  const handleFocus = () => {
    setIsUrlInputFocused(true);
  };

  const handleBlur = () => {
    // Reset focus state when blurring - fields are controlled by URL content, not focus
    setIsUrlInputFocused(false);
  };

  const handleClear = () => {
    // Cancel prefetch when clearing
    cancelPrefetch();
    setNewUrl("");
    setNewNote("");
    setNewTags("");
    setEnhancementResult(null);
    setIsUrlInputFocused(false);
    previousUrlRef.current = null;
    onClear();
  };

  const handleEnhance = (result: EnhancementResult) => {
    setEnhancementResult(result);
    console.log("AI Enhancement Result:", result); // Debug log

    // Auto-fill tags if enhancement succeeded
    if (result.success && result.tags && result.tags.length > 0) {
      const existingTags = newTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const allTags = [...existingTags, ...result.tags].filter(
        (tag, index, self) => self.indexOf(tag) === index
      );
      setNewTags(allTags.join(", "));
      console.log("Auto-filled tags:", allTags); // Debug log
    }

    // Auto-fill notes with summary if enhancement succeeded
    // Always fill if empty, or append if not empty but different
    if (result.success && result.summary && result.summary.trim().length > 0) {
      if (!newNote || newNote.trim().length === 0) {
        // Only auto-fill if empty to avoid overwriting user input
        setNewNote(result.summary);
        console.log("Auto-filled notes with summary:", result.summary); // Debug log
      } else {
        // If notes exist, append summary with a separator
        setNewNote((prev) =>
          prev.includes(result.summary)
            ? prev
            : `${prev}\n\nAI Summary: ${result.summary}`
        );
      }
    } else {
      console.log("No summary generated by AI or summary is empty"); // Debug log
    }
  };

  if (!isExpanded) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    // Cancel prefetch when form is submitted
    cancelPrefetch();
    onAdd(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`
        flex flex-col gap-4 bg-white/5 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 mx-auto
        transition-all duration-300 ease-in-out overflow-hidden
        ${
          isExpanded
            ? "p-8 max-h-[1000px] opacity-100"
            : "p-0 max-h-0 opacity-0"
        }
      `}
    >
      <div className="space-y-3">
        <Input
          type="url"
          value={newUrl}
          onChange={handleUrlChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Enter a URL to add to your list..."
          error={error}
          className="text-lg shadow-md font-delicious bg-transparent"
        />

        {/* AI Enhancement - Compact mode for inline use */}
        {newUrl && (
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <UrlEnhancer
                url={newUrl}
                onEnhance={handleEnhance}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional fields - shown only when URL input has content */}
      {newUrl.trim() && (
        <div
          className={`
            transition-all duration-300 ease-in-out overflow-hidden
            max-h-[500px] opacity-100
          `}
        >
          <div className="space-y-3">
            {/* Tags input - visible when URL is entered or enhancement provides tags */}
            <Input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated) - AI will suggest some!"
              className="text-lg shadow-md font-delicious bg-transparent"
            />

            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Note (optional) - AI will suggest a summary!"
              className="text-lg shadow-md font-delicious rounded-xl min-h-[40px]"
              rows={2}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        {newUrl && (
          <Button
            type="button"
            onClick={handleClear}
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-xl transition-all duration-200"
          >
            Clear
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-2.5 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer font-delicious"
        >
          <CirclePlus className="h-5 w-5" />
          Add URL
        </Button>
      </div>
    </form>
  );
}
