"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CancelButton } from "@/components/ui/ActionButtons";
import { Dialog } from "@/components/ui/Dialog";
import React, { useEffect, useRef } from "react";
import type { UrlItem } from "@/stores/urlListStore";
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";
import { queryClient } from "@/lib/react-query";
import type { UrlMetadata } from "@/utils/urlMetadata";
import { saveQueryDataToLocalStorage } from "@/lib/react-query";

interface UrlEditModalProps {
  editingUrl: UrlItem | null;
  setEditingUrl: (v: UrlItem | null) => void;
  editingTags: string;
  setEditingTags: (v: string) => void;
  editingNotes: string;
  setEditingNotes: (v: string) => void;
  editingReminder: string;
  setEditingReminder: (v: string) => void;
  isEditing?: boolean;
  handleEditUrl: (
    id: string,
    title: string,
    url: string,
    tags?: string[],
    notes?: string,
    reminder?: string,
  ) => void;
}

export function UrlEditModal({
  editingUrl,
  setEditingUrl,
  editingTags,
  setEditingTags,
  editingNotes,
  setEditingNotes,
  editingReminder,
  setEditingReminder,
  isEditing = false,
  handleEditUrl,
}: UrlEditModalProps) {
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel prefetch timeout and any in-flight fetch (call this when form is submitted)
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
    isSubmittingRef.current = true;
  };

  // Prefetch metadata when URL changes while editing (debounced)
  useEffect(() => {
    if (!editingUrl?.url) {
      // Cancel prefetch when modal closes
      cancelPrefetch();
      return;
    }

    // Reset submitting flag when URL changes (user is editing again)
    isSubmittingRef.current = false;

    // Skip if URL hasn't changed or is empty/invalid
    if (editingUrl.url === previousUrlRef.current) return;

    // Validate URL format
    try {
      new URL(editingUrl.url);
    } catch {
      return; // Invalid URL, skip prefetch
    }

    // Clear previous timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Debounce: prefetch after 1 second of no changes
    prefetchTimeoutRef.current = setTimeout(async () => {
      // Double-check: if form was submitted, don't prefetch
      if (isSubmittingRef.current) {
        return;
      }

      const queryKey = ["url-metadata", editingUrl.url] as const;

      // Check if already cached (might have been cached by PATCH response)
      const cached = queryClient.getQueryData<UrlMetadata>(queryKey);
      if (cached) {
        return; // Already cached, skip
      }

      // Create AbortController for this prefetch
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Prefetch metadata in background (non-blocking)
      try {
        // Use AbortController to cancel fetch if form is submitted
        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        const response = await fetch(
          `${baseUrl}/api/metadata?url=${encodeURIComponent(editingUrl.url)}`,
          { signal: abortController.signal },
        );

        // Check if aborted
        if (abortController.signal.aborted || isSubmittingRef.current) {
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch metadata");
        }

        const metadata = await response.json();

        // Final check: if form was submitted while fetching, don't cache
        if (isSubmittingRef.current || abortController.signal.aborted) {
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

    previousUrlRef.current = editingUrl.url;

    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [editingUrl?.url]);

  if (!editingUrl) return null;
  return (
    <Dialog
      open={Boolean(editingUrl)}
      onOpenChange={(open) => !open && setEditingUrl(null)}
      title="Edit URL"
      description="Update this saved URL and its organization details."
      size="form"
      pending={isEditing}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Cancel prefetch timeout immediately when form is submitted
          cancelPrefetch();

          const tagsArray = editingTags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
          handleEditUrl(
            editingUrl.id,
            editingUrl.title || "",
            editingUrl.url,
            tagsArray.length > 0 ? tagsArray : undefined,
            editingNotes || undefined,
            editingReminder || undefined,
          );
        }}
        className="mt-4 sm:mt-6 lg:mt-8 space-y-2 sm:space-y-4"
      >
        <div>
          <label className="block text-sm sm:text-base font-medium text-white">
            Title
          </label>
          <Input
            type="text"
            value={editingUrl.title}
            onChange={(e) =>
              setEditingUrl({ ...editingUrl, title: e.target.value })
            }
            placeholder="URL Title"
            className="mt-2 text-sm sm:text-base shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white">
            URL
          </label>
          <Input
            type="url"
            value={editingUrl.url}
            onChange={(e) =>
              setEditingUrl({ ...editingUrl, url: e.target.value })
            }
            placeholder="https://example.com"
            className="mt-2 text-sm sm:text-base shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white">
            Tags (comma separated)
          </label>
          <Input
            type="text"
            value={editingTags}
            onChange={(e) => setEditingTags(e.target.value)}
            placeholder="e.g. work, reading, ai"
            className="mt-2 text-sm sm:text-base shadow-sm"
          />
          {editingUrl?.url && (
            <div className="mt-2">
              <UrlEnhancer
                url={editingUrl.url}
                title={editingUrl.title}
                description={editingUrl.description}
                onEnhance={(result) => {
                  // Apply AI suggestions
                  if (result.tags && result.tags.length > 0) {
                    const existingTags = editingTags
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0);
                    const newTags = [...existingTags, ...result.tags].filter(
                      (tag, index, self) => self.indexOf(tag) === index,
                    );
                    setEditingTags(newTags.join(", "));
                  }
                  if (result.summary) {
                    setEditingNotes(result.summary);
                  }
                }}
                compact={true}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white">
            Notes (optional)
          </label>
          <Input
            type="text"
            value={editingNotes}
            onChange={(e) => setEditingNotes(e.target.value)}
            placeholder="Add a note..."
            className="mt-2 text-sm sm:text-base shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-white">
            Reminder (optional)
          </label>
          <Input
            type="date"
            value={editingReminder}
            onChange={(e) => setEditingReminder(e.target.value)}
            className="mt-2 text-sm sm:text-base shadow-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 mt-6 sm:mt-8">
          <CancelButton
            onClick={() => setEditingUrl(null)}
            className="w-full sm:w-auto"
          >
            Cancel
          </CancelButton>
          <Button
            type="submit"
            disabled={isEditing}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-medium px-4 sm:px-6 py-2 sm:py-2 rounded-lg sm:rounded-xl shadow-md hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {isEditing ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
