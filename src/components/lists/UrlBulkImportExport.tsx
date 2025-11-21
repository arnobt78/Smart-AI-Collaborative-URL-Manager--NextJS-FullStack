"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { useToast } from "@/components/ui/Toaster";
import type { UrlItem } from "@/stores/urlListStore";
import { addUrlToList, cancelPendingGetList } from "@/stores/urlListStore";
import { abortRegistry } from "@/utils/abortRegistry";
import { fetchUrlMetadata, type UrlMetadata } from "@/utils/urlMetadata";
import { useQueryClient } from "@tanstack/react-query";
import {
  parseChromeBookmarks,
  parsePocketExport,
  parsePinboardExport,
} from "@/lib/import";
import { formatAsMarkdown, downloadMarkdownFile } from "@/lib/export";

interface UrlBulkImportExportProps {
  urls: UrlItem[];
  listTitle?: string;
  onBulkOperationStart?: () => void;
  onBulkOperationEnd?: () => void;
}

export function UrlBulkImportExport({
  urls,
  listTitle,
  onBulkOperationStart,
  onBulkOperationEnd,
}: UrlBulkImportExportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isImportActiveRef = useRef(false); // Track if import is active (accessible from cleanup)

  const handleExport = async (type: "json" | "csv" | "markdown") => {
    if (!urls || urls.length === 0) {
      toast({
        title: "No URLs to Export",
        description: "Add some URLs to your list before exporting.",
        variant: "error",
      });
      return;
    }

    setIsExporting(type);

    try {
      if (type === "json") {
        // Export as JSON
        const exportData = {
          listTitle: listTitle || "URL List",
          exportedAt: new Date().toISOString(),
          version: "1.0",
          urls: urls.map((url) => ({
            url: url.url,
            title: url.title,
            description: url.description,
            tags: url.tags || [],
            notes: url.notes,
            reminder: url.reminder,
            category: url.category,
            isFavorite: url.isFavorite,
            isPinned: url.isPinned,
          })),
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${(listTitle || "url-list")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful! 📥",
          description: `Exported ${urls.length} URLs as JSON.`,
          variant: "success",
        });
      } else if (type === "csv") {
        // Export as CSV
        const headers = [
          "URL",
          "Title",
          "Description",
          "Tags",
          "Notes",
          "Reminder",
          "Category",
          "Favorite",
          "Pinned",
        ];

        const csvRows = [
          headers.join(","),
          ...urls.map((url) => {
            const row = [
              `"${(url.url || "").replace(/"/g, '""')}"`,
              `"${(url.title || "").replace(/"/g, '""')}"`,
              `"${(url.description || "").replace(/"/g, '""')}"`,
              `"${(url.tags || []).join("; ").replace(/"/g, '""')}"`,
              `"${(url.notes || "").replace(/"/g, '""')}"`,
              `"${(url.reminder || "").replace(/"/g, '""')}"`,
              `"${(url.category || "").replace(/"/g, '""')}"`,
              url.isFavorite ? "Yes" : "No",
              url.isPinned ? "Yes" : "No",
            ];
            return row.join(",");
          }),
        ];

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${(listTitle || "url-list")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful! 📥",
          description: `Exported ${urls.length} URLs as CSV.`,
          variant: "success",
        });
      } else if (type === "markdown") {
        // Export as Markdown
        const markdownContent = formatAsMarkdown(urls, {
          listTitle: listTitle || "URL List",
          includeMetadata: true,
          includeTags: true,
          includeNotes: true,
        });

        const filename = `${(listTitle || "url-list")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${
          new Date().toISOString().split("T")[0]
        }`;

        downloadMarkdownFile(markdownContent, filename);

        toast({
          title: "Export Successful! 📥",
          description: `Exported ${urls.length} URLs as Markdown.`,
          variant: "success",
        });
      }
    } catch (error) {
      // console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export URLs. Please try again.",
        variant: "error",
      });
    } finally {
      setIsExporting(null);
    }
  };

  // Close import menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        importMenuRef.current &&
        !importMenuRef.current.contains(event.target as Node)
      ) {
        setShowImportMenu(false);
      }
    }

    if (showImportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showImportMenu]);

  // Cleanup on unmount - cancel any ongoing imports
  React.useEffect(() => {
    isMountedRef.current = true;

    // Handle page refresh/navigation - cancel ongoing operations IMMEDIATELY
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Cancel ALL pending operations immediately
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Cancel all pending getList requests
      cancelPendingGetList();
      // Mark import as inactive immediately
      isImportActiveRef.current = false;
      // Clear global flag
      if (typeof window !== "undefined") {
        (window as any).__bulkImportActive = false;
      }
      // Note: We don't prevent default here to allow normal page navigation
      // The abort signal will cancel ongoing fetches
    };

    // Handle visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      // Don't cancel on visibility change - let it continue in background
      // Only cancel on actual page unload
    };

    // Handle popstate (back/forward navigation)
    const handlePopState = () => {
      // Cancel ALL pending operations on navigation
      if (abortControllerRef.current && isImportActiveRef.current) {
        abortControllerRef.current.abort();
        cancelPendingGetList();
        // Abort all tracked requests globally
        if (typeof window !== "undefined" && abortRegistry) {
          abortRegistry.abortAll();
        }
        isImportActiveRef.current = false;
        // Clear global flag
        if (typeof window !== "undefined") {
          (window as any).__bulkImportActive = false;
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing fetch operations IMMEDIATELY (only on unmount)
      // Only abort if import is actually active to avoid aborting a fresh controller
      if (abortControllerRef.current && isImportActiveRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Cancel all pending getList requests
      cancelPendingGetList();
      // Mark import as inactive
      isImportActiveRef.current = false;
      // Clear global flag
      if (typeof window !== "undefined") {
        (window as any).__bulkImportActive = false;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount/unmount, not when isImporting changes

  const handleImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    sourceType?: "json" | "csv" | "chrome" | "pocket" | "pinboard" | "auto"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clean up any previous abort controller BEFORE setting state
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Mark import as active FIRST to prevent cleanup from aborting the new controller
    isImportActiveRef.current = true;

    // Set global flag to skip getList calls during bulk import
    if (typeof window !== "undefined") {
      (window as any).__bulkImportActive = true;
    }

    // Create abort controller for this import operation BEFORE setting state
    // This ensures we have a fresh controller before any useEffect cleanup runs
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    setIsImporting(true);
    setShowImportMenu(false);

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("📥 [IMPORT] Starting import:", {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          sourceType,
        });
      }

      const text = await file.text();

      if (process.env.NODE_ENV === "development") {
        console.log("📥 [IMPORT] File read successfully, length:", text.length);
      }

      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const fileName = file.name.toLowerCase();

      let importedUrls: Array<{
        url: string;
        title?: string;
        description?: string;
        tags?: string[];
        notes?: string;
        reminder?: string;
        category?: string;
        isFavorite?: boolean;
        isPinned?: boolean;
      }> = [];

      // Auto-detect source type if not specified
      const detectedType =
        sourceType === "auto" || !sourceType
          ? fileExtension === "html" ||
            fileName.includes("bookmarks") ||
            fileName.includes("chrome")
            ? "chrome"
            : fileExtension === "json"
            ? fileName.includes("pocket") || text.includes('"item_id"')
              ? "pocket"
              : fileName.includes("pinboard") ||
                (text.includes('"href"') && text.includes('"description"'))
              ? "pinboard"
              : "json"
            : fileExtension === "csv"
            ? "csv"
            : "json"
          : sourceType;

      if (detectedType === "chrome") {
        // Parse Chrome bookmarks HTML
        let result;
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("📥 [IMPORT] Parsing Chrome bookmarks...");
          }
          result = parseChromeBookmarks(text);
          importedUrls = result.items;

          if (process.env.NODE_ENV === "development") {
            console.log("📥 [IMPORT] Chrome parsing result:", {
              count: result.count,
              itemsLength: result.items.length,
              errors: result.errors?.length || 0,
              firstItem: result.items[0],
            });
          }
        } catch (parseError) {
          console.error(
            "❌ [IMPORT] Failed to parse Chrome bookmarks:",
            parseError
          );
          if (process.env.NODE_ENV === "development") {
            console.error("Parse error details:", {
              error: parseError,
              message:
                parseError instanceof Error
                  ? parseError.message
                  : String(parseError),
              stack: parseError instanceof Error ? parseError.stack : undefined,
            });
          }
          throw new Error(
            `Failed to parse Chrome bookmarks file: ${
              parseError instanceof Error
                ? parseError.message
                : "Unknown parsing error"
            }. Please ensure this is a valid Chrome bookmarks export file.`
          );
        }

        // Log parsing warnings only in development (not critical errors)
        if (result.errors && result.errors.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.info(
              `ℹ️ [CHROME IMPORT] ${result.errors.length} parsing warning(s):`,
              result.errors.slice(0, 3) // Only show first 3 in dev mode
            );
          }
        }

        // Validate that we found some URLs
        if (result.count === 0) {
          const errorMessage =
            result.errors && result.errors.length > 0
              ? result.errors[0]
              : "No bookmarks found in Chrome export file. Please check the file format.";
          console.error("❌ [IMPORT] Chrome import validation failed:", {
            count: result.count,
            errors: result.errors,
            itemsLength: result.items.length,
            textLength: text.length,
            textPreview: text.substring(0, 500),
          });
          throw new Error(errorMessage);
        }
      } else if (detectedType === "pocket") {
        // Parse Pocket export JSON
        const result = parsePocketExport(text);
        importedUrls = result.items;

        // Log parsing warnings only in development
        if (result.errors && result.errors.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.info(
              `ℹ️ [POCKET IMPORT] ${result.errors.length} parsing warning(s):`,
              result.errors.slice(0, 3)
            );
          }
        }

        // Validate that we found some URLs
        if (result.count === 0) {
          throw new Error(
            result.errors && result.errors.length > 0
              ? result.errors[0]
              : "No items found in Pocket export file. Please check the file format."
          );
        }
      } else if (detectedType === "pinboard") {
        // Parse Pinboard export JSON
        const result = parsePinboardExport(text);
        importedUrls = result.items;

        // Log parsing warnings only in development
        if (result.errors && result.errors.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.info(
              `ℹ️ [PINBOARD IMPORT] ${result.errors.length} parsing warning(s):`,
              result.errors.slice(0, 3)
            );
          }
        }

        // Validate that we found some URLs
        if (result.count === 0) {
          throw new Error(
            result.errors && result.errors.length > 0
              ? result.errors[0]
              : "No bookmarks found in Pinboard export file. Please check the file format."
          );
        }
      } else if (detectedType === "json") {
        // Parse JSON
        const jsonData = JSON.parse(text);
        if (jsonData.urls && Array.isArray(jsonData.urls)) {
          importedUrls = jsonData.urls;
        } else if (Array.isArray(jsonData)) {
          // Handle case where JSON is directly an array
          importedUrls = jsonData;
        } else {
          throw new Error(
            "Invalid JSON format. Expected 'urls' array or array of URLs."
          );
        }
      } else if (fileExtension === "csv") {
        // Parse CSV
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          throw new Error(
            "CSV file must have at least a header row and one data row."
          );
        }

        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/^"|"$/g, ""));
        const urlIndex = headers.findIndex((h) => h.toLowerCase() === "url");
        if (urlIndex === -1) {
          throw new Error("CSV must have a 'URL' column.");
        }

        importedUrls = lines.slice(1).map((line) => {
          // Simple CSV parsing (handles quoted fields)
          const values: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === "," && !inQuotes) {
              values.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current.trim()); // Add last value

          const urlObj: {
            url: string;
            title?: string;
            description?: string;
            tags?: string[];
            notes?: string;
            reminder?: string;
            category?: string;
            isFavorite?: boolean;
            isPinned?: boolean;
          } = {
            url: values[urlIndex]?.replace(/^"|"$/g, "") || "",
          };

          const titleIndex = headers.findIndex(
            (h) => h.toLowerCase() === "title"
          );
          if (titleIndex !== -1 && values[titleIndex]) {
            urlObj.title =
              values[titleIndex].replace(/^"|"$/g, "") || undefined;
          }

          const descIndex = headers.findIndex(
            (h) => h.toLowerCase() === "description"
          );
          if (descIndex !== -1 && values[descIndex]) {
            urlObj.description =
              values[descIndex].replace(/^"|"$/g, "") || undefined;
          }

          const tagsIndex = headers.findIndex(
            (h) => h.toLowerCase() === "tags"
          );
          if (tagsIndex !== -1 && values[tagsIndex]) {
            const tagsStr = values[tagsIndex].replace(/^"|"$/g, "");
            urlObj.tags =
              tagsStr
                ?.split(";")
                .map((t) => t.trim())
                .filter((t) => t.length > 0) || undefined;
          }

          const notesIndex = headers.findIndex(
            (h) => h.toLowerCase() === "notes"
          );
          if (notesIndex !== -1 && values[notesIndex]) {
            urlObj.notes =
              values[notesIndex].replace(/^"|"$/g, "") || undefined;
          }

          const reminderIndex = headers.findIndex(
            (h) => h.toLowerCase() === "reminder"
          );
          if (reminderIndex !== -1 && values[reminderIndex]) {
            urlObj.reminder =
              values[reminderIndex].replace(/^"|"$/g, "") || undefined;
          }

          const categoryIndex = headers.findIndex(
            (h) => h.toLowerCase() === "category"
          );
          if (categoryIndex !== -1 && values[categoryIndex]) {
            urlObj.category =
              values[categoryIndex].replace(/^"|"$/g, "") || undefined;
          }

          const favoriteIndex = headers.findIndex(
            (h) => h.toLowerCase() === "favorite"
          );
          if (favoriteIndex !== -1 && values[favoriteIndex]) {
            urlObj.isFavorite =
              values[favoriteIndex].replace(/^"|"$/g, "").toLowerCase() ===
              "yes";
          }

          const pinnedIndex = headers.findIndex(
            (h) => h.toLowerCase() === "pinned"
          );
          if (pinnedIndex !== -1 && values[pinnedIndex]) {
            urlObj.isPinned =
              values[pinnedIndex].replace(/^"|"$/g, "").toLowerCase() === "yes";
          }

          return urlObj;
        });
      } else {
        throw new Error(
          "Unsupported file format. Please use JSON, CSV, or Chrome bookmarks HTML."
        );
      }

      // Validate URLs
      const validUrls = importedUrls.filter((item) => {
        try {
          new URL(item.url);
          return true;
        } catch {
          if (process.env.NODE_ENV === "development") {
            console.warn(`⚠️ [IMPORT] Invalid URL skipped: ${item.url}`);
          }
          return false;
        }
      });

      if (process.env.NODE_ENV === "development") {
        console.log("📥 [IMPORT] URL validation:", {
          totalImported: importedUrls.length,
          validUrls: validUrls.length,
          invalidUrls: importedUrls.length - validUrls.length,
        });
      }

      if (validUrls.length === 0) {
        console.error("❌ [IMPORT] No valid URLs found:", {
          totalImported: importedUrls.length,
          sampleUrls: importedUrls.slice(0, 5).map((item) => item.url),
        });
        throw new Error(
          `No valid URLs found in the file. Found ${importedUrls.length} bookmarks, but none had valid URLs. Please check the file format.`
        );
      }

      // Notify parent that bulk operation is starting
      if (onBulkOperationStart) {
        onBulkOperationStart();
      }

      // Helper function to decode HTML entities
      const decodeHtmlEntities = (text: string): string => {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
      };

      // Helper function to clean title/notes from HTML entities
      const cleanText = (text?: string): string | undefined => {
        if (!text) return undefined;
        // Remove HTML tags and decode entities
        const cleaned = text
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
          .trim();
        return decodeHtmlEntities(cleaned) || undefined;
      };

      // Concurrency queue: Process 2 URLs in parallel, start next immediately when any finishes
      // Reduced to 2 to avoid overwhelming the server and prevent request timeouts
      // Sequential processing (1 at a time) would be too slow for large imports
      const CONCURRENCY_LIMIT = 2;
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0; // URLs that failed validation
      const metadataFailedUrls: string[] = []; // Track URLs that couldn't fetch metadata
      let processedCount = 0; // Track total processed for progress

      // Process URLs with a concurrency queue (not batches)
      // As soon as one URL finishes processing, the next one starts
      const processUrl = async (urlItem: (typeof validUrls)[0]) => {
        // Helper to get current signal (in case controller was recreated)
        const getCurrentSignal = () => abortControllerRef.current?.signal;

        // Check if import was cancelled or component unmounted (use ref to get current signal)
        const currentSignal = getCurrentSignal();
        if (
          currentSignal?.aborted ||
          !isMountedRef.current ||
          !isImportActiveRef.current
        ) {
          return;
        }

        try {
          // Clean HTML entities from title and notes
          const cleanedTitle = cleanText(urlItem.title);
          const cleanedNotes = cleanText(urlItem.notes);

          // Try to fetch metadata with 10-second timeout (faster failure, less blocking)
          let metadata: UrlMetadata = {};
          let metadataFetched = false;
          try {
            // Check again before starting metadata fetch (use ref to get current signal)
            const signalBeforeFetch = getCurrentSignal();
            if (
              signalBeforeFetch?.aborted ||
              !isMountedRef.current ||
              !isImportActiveRef.current
            ) {
              return;
            }
            metadata = await fetchUrlMetadata(
              urlItem.url,
              10000,
              signalBeforeFetch || abortSignal
            ); // 10 second timeout with cancellation

            // Check if metadata was successfully fetched (has meaningful data)
            metadataFetched = Boolean(
              metadata &&
                Object.keys(metadata).length > 0 &&
                (metadata.title || metadata.description || metadata.image)
            );

            // Pre-populate the query cache only if metadata was successfully fetched
            if (metadataFetched) {
              queryClient.setQueryData(["url-metadata", urlItem.url], metadata);

              // Also save to localStorage for persistence
              try {
                const queryKey = ["url-metadata", urlItem.url] as const;
                const key = `react-query:${queryKey.join(":")}`;
                localStorage.setItem(
                  key,
                  JSON.stringify({ data: metadata, timestamp: Date.now() })
                );
              } catch {
                // Ignore localStorage errors
              }
            } else {
              // Metadata fetch returned empty or incomplete - track it
              metadataFailedUrls.push(urlItem.url);
            }
          } catch (metadataError) {
            // Metadata fetch failed - that's okay, we'll use imported data
            // Track URLs that failed metadata fetch (suppress console warnings)
            metadataFailedUrls.push(urlItem.url);
            // Continue with empty metadata - we'll use imported title/description
            // Don't log AbortError - it's expected when cancelling
            if (
              process.env.NODE_ENV === "development" &&
              !(
                metadataError instanceof Error &&
                metadataError.name === "AbortError"
              )
            ) {
              console.debug(
                `Metadata fetch failed for ${urlItem.url}:`,
                metadataError
              );
            }
          }

          // Use imported title if provided (cleaned), otherwise use metadata title, otherwise use URL
          const finalTitle =
            cleanedTitle ||
            metadata.title ||
            new URL(urlItem.url).hostname.replace("www.", "");

          // Use imported category or metadata siteName
          const finalCategory =
            urlItem.category || metadata.siteName || undefined;

          // Check again before adding URL (use ref to get current signal)
          const signalBeforeAdd = getCurrentSignal();
          if (
            signalBeforeAdd?.aborted ||
            !isMountedRef.current ||
            !isImportActiveRef.current
          ) {
            return;
          }

          // Add URL to list (using imported data, with metadata as fallback)
          // Wrap in timeout to prevent hanging indefinitely (30 second max wait)
          // Also pass abort signal to allow cancellation
          try {
            const getCurrentSignal = () => abortControllerRef.current?.signal;
            const currentAbortSignal = getCurrentSignal();

            // Check if aborted before attempting to add
            if (currentAbortSignal?.aborted) {
              return;
            }

            const addUrlWithTimeout = Promise.race([
              addUrlToList(
                urlItem.url,
                finalTitle,
                urlItem.tags || [],
                cleanedNotes || "",
                urlItem.reminder,
                finalCategory,
                undefined, // existingMetadata - pass undefined, let server fetch or use cache
                false, // isDuplicate
                currentAbortSignal // Pass abort signal to allow cancellation
              ),
              new Promise<void>((_, reject) =>
                setTimeout(
                  () =>
                    reject(new Error("addUrlToList timeout after 10 seconds")),
                  10000 // Reduced to 10 seconds to match server-side timeout expectations
                )
              ),
            ]);

            await addUrlWithTimeout;
          } catch (addUrlError) {
            // If addUrlToList fails or times out, log but continue with next URL
            if (process.env.NODE_ENV === "development") {
              console.warn(
                `⚠️ [IMPORT] Failed to add URL ${urlItem.url}:`,
                addUrlError instanceof Error
                  ? addUrlError.message
                  : String(addUrlError)
              );
            }
            // Re-throw to be caught by outer catch block
            throw addUrlError;
          }

          // Check again after adding URL (use ref to get current signal)
          const signalAfterAdd = getCurrentSignal();
          if (
            signalAfterAdd?.aborted ||
            !isMountedRef.current ||
            !isImportActiveRef.current
          ) {
            return;
          }

          // If favorite or pinned, update after adding
          if (urlItem.isFavorite || urlItem.isPinned) {
            const { updateUrlInList } = await import("@/stores/urlListStore");
            const currentList = (await import("@/stores/urlListStore"))
              .currentList;
            const current = currentList.get();
            if (current.urls) {
              const currentUrls = current.urls as unknown as UrlItem[];
              const addedUrl = currentUrls.find((u) => u.url === urlItem.url);
              if (addedUrl) {
                await updateUrlInList(addedUrl.id, {
                  isFavorite: urlItem.isFavorite || false,
                  isPinned: urlItem.isPinned || false,
                });
              }
            }
          }

          successCount++;
          if (process.env.NODE_ENV === "development") {
            console.log(
              `✅ [IMPORT] Successfully imported: ${urlItem.url} (successCount: ${successCount})`
            );
          }
        } catch (error) {
          // Check if this is an abort error or cancellation
          const isAborted =
            error instanceof Error &&
            (error.name === "AbortError" ||
              error.message === "Request aborted" ||
              error.message.includes("aborted"));

          // If aborted, don't count as error - just skip
          if (isAborted) {
            if (process.env.NODE_ENV === "development") {
              console.log(
                `⏭️ [IMPORT] Skipping URL ${urlItem.url.substring(
                  0,
                  60
                )}... (import cancelled)`
              );
            }
            return; // Exit without counting as error
          }

          // Only log and count non-abort errors
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `⚠️ [IMPORT] Failed to import URL ${urlItem.url.substring(
                0,
                60
              )}...:`,
              error instanceof Error ? error.message : String(error)
            );
            console.warn(`⚠️ [IMPORT] Failed URL details:`, {
              url: urlItem.url,
              title: urlItem.title,
              index: nextUrlIndex - runningPromises.size - 1,
              errorType:
                error instanceof Error ? error.constructor.name : typeof error,
              errorMessage:
                error instanceof Error ? error.message : String(error),
            });
          }
          errorCount++;
        } finally {
          processedCount++;

          // Show progress for large imports (every 5 URLs or at milestones)
          if (
            validUrls.length > 10 &&
            (processedCount % 5 === 0 ||
              processedCount === validUrls.length ||
              processedCount === 1)
          ) {
            const progress = Math.min(
              100,
              Math.round((processedCount / validUrls.length) * 100)
            );
            if (process.env.NODE_ENV === "development") {
              console.log(
                `📊 [IMPORT] Progress: ${progress}% (${processedCount}/${validUrls.length} URLs processed, ${successCount} successful, ${errorCount} failed)`
              );
            }
          }
        }
      };

      // Improved concurrency queue: Maintain exactly CONCURRENCY_LIMIT running at all times
      // As soon as one finishes, start the next one (sliding window approach)
      const runningPromises = new Map<number, Promise<void>>();
      const promiseStartTimes = new Map<number, number>(); // Track when each promise started
      let nextUrlIndex = 0;
      let completedCount = 0;

      // Helper to start processing next URL when slot becomes available
      const startNextUrl = (): Promise<void> | null => {
        // Check if we have more URLs to process
        if (nextUrlIndex >= validUrls.length) {
          return null; // No more URLs
        }

        // Check if import was cancelled (use ref to get current signal in case controller was recreated)
        const currentSignal = abortControllerRef.current?.signal;
        if (
          currentSignal?.aborted ||
          !isMountedRef.current ||
          !isImportActiveRef.current
        ) {
          return null;
        }

        const urlItem = validUrls[nextUrlIndex];
        const currentIndex = nextUrlIndex;
        nextUrlIndex++;

        if (process.env.NODE_ENV === "development") {
          console.log(
            `📥 [IMPORT] startNextUrl: Starting URL ${currentIndex + 1}/${
              validUrls.length
            }: ${urlItem.url.substring(0, 60)}...`
          );
        }

        const startTime = Date.now();
        promiseStartTimes.set(currentIndex, startTime);

        const promise = processUrl(urlItem)
          .then(() => {
            completedCount++;
            if (process.env.NODE_ENV === "development") {
              console.log(
                `✅ [IMPORT] URL ${currentIndex + 1}/${
                  validUrls.length
                } completed (${completedCount}/${validUrls.length} total)`
              );
            }
          })
          .catch((error) => {
            completedCount++;
            if (process.env.NODE_ENV === "development") {
              console.error(
                `❌ [IMPORT] URL ${currentIndex + 1}/${
                  validUrls.length
                } failed:`,
                error
              );
            }
          })
          .finally(() => {
            // Remove this promise from running set when done
            runningPromises.delete(currentIndex);
            promiseStartTimes.delete(currentIndex);

            // Immediately start the next URL when this one finishes (if import is still active)
            // Use ref to get current signal in case controller was recreated
            const signalForNext = abortControllerRef.current?.signal;
            if (
              isImportActiveRef.current &&
              !signalForNext?.aborted &&
              isMountedRef.current
            ) {
              startNextUrl();
            }
          });

        runningPromises.set(currentIndex, promise);
        return promise;
      };

      // Safety check: if abort signal was aborted before we could use it, create a fresh one
      // This can happen if useEffect cleanup ran between controller creation and processing start
      if (
        abortSignal.aborted &&
        isImportActiveRef.current &&
        isMountedRef.current
      ) {
        console.warn(
          "⚠️ [IMPORT] Abort signal was aborted before processing started. Creating fresh controller."
        );
        abortControllerRef.current = new AbortController();
        // Note: We can't update the local abortSignal const, but we'll use abortControllerRef.current.signal
        // for all checks in the processing loop to ensure we use the fresh signal
      }

      // Use the current signal from the ref (in case it was recreated)
      const currentAbortSignal =
        abortControllerRef.current?.signal || abortSignal;

      // Start initial batch of concurrent requests (up to CONCURRENCY_LIMIT)
      if (process.env.NODE_ENV === "development") {
        console.log(`📥 [IMPORT] Starting processing loop:`, {
          validUrlsLength: validUrls.length,
          concurrencyLimit: CONCURRENCY_LIMIT,
          nextUrlIndex,
          abortSignalAborted: currentAbortSignal.aborted,
          isMounted: isMountedRef.current,
          isImportActive: isImportActiveRef.current,
        });
      }

      // Start initial batch - but only if signal is not aborted
      if (
        !currentAbortSignal.aborted &&
        isImportActiveRef.current &&
        isMountedRef.current
      ) {
        for (let i = 0; i < CONCURRENCY_LIMIT && i < validUrls.length; i++) {
          const promise = startNextUrl();
          if (!promise) break;
        }
      } else {
        console.error(
          "❌ [IMPORT] Cannot start processing - abort signal aborted or import inactive",
          {
            abortSignalAborted: currentAbortSignal.aborted,
            isImportActive: isImportActiveRef.current,
            isMounted: isMountedRef.current,
          }
        );
        throw new Error(
          "Cannot start import - abort signal was aborted before processing could begin"
        );
      }

      if (process.env.NODE_ENV === "development") {
        console.log(
          `📥 [IMPORT] Processing loop started. ${runningPromises.size} promises running.`
        );
      }

      // Wait for ALL URLs to complete
      // Keep processing until all URLs are done
      while (nextUrlIndex < validUrls.length || runningPromises.size > 0) {
        // If we have slots available and more URLs, start them
        while (
          runningPromises.size < CONCURRENCY_LIMIT &&
          nextUrlIndex < validUrls.length &&
          isImportActiveRef.current &&
          !abortControllerRef.current?.signal?.aborted &&
          isMountedRef.current
        ) {
          const promise = startNextUrl();
          if (!promise) break;
        }

        // If no promises are running and we're done, break
        if (runningPromises.size === 0 && nextUrlIndex >= validUrls.length) {
          break;
        }

        // Wait for at least one promise to complete (with timeout to prevent infinite hang)
        if (runningPromises.size > 0) {
          try {
            // Add a timeout promise to ensure we don't wait forever
            // If no promise completes in 45 seconds, force continue to prevent infinite hang
            const timeoutPromise = new Promise<void>((resolve) => {
              setTimeout(() => {
                const now = Date.now();
                const stuckThreshold = 60000; // 60 seconds - consider promises stuck if running longer
                const stuckPromises: number[] = [];

                // Find promises that have been running too long
                for (const [index, startTime] of promiseStartTimes.entries()) {
                  const elapsed = now - startTime;
                  if (elapsed > stuckThreshold) {
                    stuckPromises.push(index);
                    if (process.env.NODE_ENV === "development") {
                      console.warn(
                        `⚠️ [IMPORT] Promise ${
                          index + 1
                        } stuck (running for ${Math.round(
                          elapsed / 1000
                        )}s), forcing cleanup`
                      );
                    }
                  }
                }

                // Force remove stuck promises to allow queue to continue
                if (stuckPromises.length > 0) {
                  for (const index of stuckPromises) {
                    runningPromises.delete(index);
                    promiseStartTimes.delete(index);
                    completedCount++;
                    errorCount++;
                  }
                  if (process.env.NODE_ENV === "development") {
                    console.warn(
                      `⚠️ [IMPORT] Cleaned up ${stuckPromises.length} stuck promise(s), continuing with remaining URLs...`
                    );
                  }
                } else if (runningPromises.size > 0) {
                  if (process.env.NODE_ENV === "development") {
                    console.warn(
                      `⚠️ [IMPORT] Promise.race timeout after 45s - ${runningPromises.size} promises still running, continuing to wait...`
                    );
                  }
                }

                resolve();
              }, 45000); // 45 second timeout to prevent infinite hang
            });

            await Promise.race([
              Promise.race(Array.from(runningPromises.values())),
              timeoutPromise,
            ]);
            // Small delay to allow finally blocks to execute
            await new Promise((resolve) => setTimeout(resolve, 10));
          } catch (error) {
            // Error already handled in processUrl, continue
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "⚠️ [IMPORT] Error waiting for promise completion, continuing...",
                error
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        } else {
          // No promises running but we should have more - break to avoid infinite loop
          break;
        }

        // Check if we should continue (use ref to get current signal)
        const signalForLoop = abortControllerRef.current?.signal;
        if (
          signalForLoop?.aborted ||
          !isMountedRef.current ||
          !isImportActiveRef.current
        ) {
          break;
        }
      }

      // Final wait: ensure all remaining promises complete (use ref to get current signal)
      // But with a timeout to prevent infinite hang
      const signalForWait = abortControllerRef.current?.signal;
      if (
        runningPromises.size > 0 &&
        isImportActiveRef.current &&
        !signalForWait?.aborted
      ) {
        try {
          // Wait max 10 seconds for remaining promises, then force abort
          const finalWaitTimeout = new Promise<void>((resolve) => {
            setTimeout(() => {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `⚠️ [IMPORT] Final wait timeout - aborting remaining ${runningPromises.size} request(s)`
                );
              }
              // Abort all pending requests
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              resolve();
            }, 10000); // 10 second timeout for final wait
          });

          const results = await Promise.race([
            Promise.allSettled(Array.from(runningPromises.values())),
            finalWaitTimeout.then(() => {
              // Return empty results if timeout
              return [] as PromiseSettledResult<void>[];
            }),
          ]);

          results.forEach((result) => {
            if (result.status === "rejected") {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `URL processing promise was rejected (final wait):`,
                  result.reason
                );
              }
              errorCount++;
            }
          });
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Error in final wait for URL processing:", error);
          }
        }
      }

      // CRITICAL: Abort all pending requests before clearing controller
      // This ensures all in-flight fetch requests are cancelled
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Cancel all pending getList requests that might be stuck
      // These are likely GET requests to /api/lists/test-import that are pending
      cancelPendingGetList();

      // Give a longer delay to ensure all cancellations are processed
      // This prevents the page from getting stuck with pending requests
      // and allows RSC (React Server Components) requests to be cancelled too
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Clear abort controller AFTER aborting (to ensure cleanup)
      abortControllerRef.current = null;

      if (process.env.NODE_ENV === "development") {
        console.log(`📥 [IMPORT] Processing complete. Summary:`, {
          successCount,
          errorCount,
          processedCount,
          metadataFailedUrls: metadataFailedUrls.length,
          skippedCount,
          validUrlsLength: validUrls.length,
        });
      }

      if (successCount > 0) {
        const messageParts: string[] = [];
        messageParts.push(
          `Imported ${successCount} URL${successCount === 1 ? "" : "s"}`
        );

        if (errorCount > 0) {
          messageParts.push(`${errorCount} failed`);
        }
        if (metadataFailedUrls.length > 0) {
          messageParts.push(
            `${metadataFailedUrls.length} couldn't fetch metadata (using imported data)`
          );
        }
        if (skippedCount > 0) {
          messageParts.push(`${skippedCount} skipped`);
        }

        toast({
          title: "Import Successful! 📤",
          description: messageParts.join(". ") + ".",
          variant: "success",
        });

        // If there were metadata fetch failures, log them (only in development for debugging)
        if (
          metadataFailedUrls.length > 0 &&
          process.env.NODE_ENV === "development"
        ) {
          console.info(
            `ℹ️ [IMPORT] ${metadataFailedUrls.length} URL(s) couldn't fetch metadata (using imported data):`,
            metadataFailedUrls.slice(0, 10) // Show first 10 in dev mode
          );
        }
      } else {
        toast({
          title: "Import Failed",
          description: `Failed to import URLs. Please check the file format.`,
          variant: "error",
        });
      }
    } catch (error) {
      // Mark import as inactive on error
      isImportActiveRef.current = false;
      // Clear global flag
      if (typeof window !== "undefined") {
        (window as any).__bulkImportActive = false;
      }

      // If error is due to abort, that's expected - don't show error
      if (error instanceof Error && error.name === "AbortError") {
        if (process.env.NODE_ENV === "development") {
          console.debug("Import cancelled (page refresh or unmount)");
        }
        return; // Silent cancellation - page is refreshing/unmounting
      }

      // Log full error details for debugging
      console.error("Import failed:", error);
      if (process.env.NODE_ENV === "development") {
        console.error("Error details:", {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
        });
      }

      // Only show error toast if component is still mounted
      if (isMountedRef.current) {
        let errorMessage =
          "Failed to import URLs. Please check the file format.";

        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else if (error && typeof error === "object" && "message" in error) {
          errorMessage = String((error as any).message);
        }

        toast({
          title: "Import Failed",
          description: errorMessage,
          variant: "error",
        });
      }
    } finally {
      // CRITICAL: Force abort ALL pending requests immediately
      // This prevents navigation from getting stuck
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Cancel all pending getList requests that might be stuck
      cancelPendingGetList();

      // CRITICAL: Abort ALL tracked fetch requests globally
      // This ensures no requests (including RSC requests) block navigation
      if (typeof window !== "undefined" && abortRegistry) {
        const abortedCount = abortRegistry.getCount();
        abortRegistry.abortAll();

        if (process.env.NODE_ENV === "development" && abortedCount > 0) {
          console.debug(
            `🛑 [IMPORT] Aborted ${abortedCount} tracked request(s) - navigation should work now`
          );
        }

        // CRITICAL: Force abort Next.js router RSC prefetch requests
        // These are internal Next.js requests that block navigation
        // We need to clear the router's prefetch cache and abort pending RSC requests
        setTimeout(() => {
          try {
            // Access Next.js router internals to clear prefetch cache
            const nextRouter = (window as any).__NEXT_DATA__?.router;
            if (nextRouter) {
              // Clear prefetch cache
              if (nextRouter.prefetchCache) {
                nextRouter.prefetchCache.clear();
              }

              // Try to abort pending RSC requests via router internals
              // This is a workaround since Next.js doesn't expose abort for RSC prefetches
              const routerInstance = (window as any).__nextRouter;
              if (routerInstance) {
                // Clear any pending navigation state
                if (routerInstance.isPending) {
                  routerInstance.isPending = false;
                }
              }
            }

            // Force clear Next.js internal fetch cache for RSC requests
            const nextFetchCache = (window as any).__nextFetchCache;
            if (nextFetchCache) {
              nextFetchCache.clear();
            }
          } catch (e) {
            // Ignore - Next.js internal API might change
            if (process.env.NODE_ENV === "development") {
              console.debug(
                "[IMPORT] Could not clear Next.js router cache:",
                e
              );
            }
          }
        }, 100);
      }

      // Mark import as inactive
      isImportActiveRef.current = false;

      // Only reset if still mounted (don't update state after unmount)
      if (isMountedRef.current) {
        setIsImporting(false);

        // CRITICAL: Wait for all abort signals to propagate
        // Increased delay to ensure Next.js router processes all aborts
        // Navigation will work AFTER this delay completes
        // The delay allows:
        // 1. All registered fetch requests to be aborted
        // 2. Next.js router to process abort signals
        // 3. Browser to clear pending network requests
        await new Promise((resolve) => setTimeout(resolve, 300));

        // CRITICAL: Clear global flag AFTER aborting all requests and waiting
        // This prevents Next.js router from making new prefetch requests too soon
        // If we clear it too early, router will start prefetching while requests are still aborting
        if (typeof window !== "undefined") {
          (window as any).__bulkImportActive = false;
          // Also set a flag indicating import just completed (for navigation checks)
          (window as any).__bulkImportJustCompleted = true;
          // Clear the flag after a short delay
          setTimeout(() => {
            (window as any).__bulkImportJustCompleted = false;
          }, 1000);
        }

        // Notify parent that bulk operation is ending
        if (onBulkOperationEnd) {
          // Delay calling callback to allow operations to complete
          setTimeout(() => {
            if (onBulkOperationEnd && isMountedRef.current) {
              onBulkOperationEnd();
            }
          }, 500);
        }

        // After import completes, trigger a single refresh to get final state
        // This happens AFTER all cancellations and delays to ensure clean state
        import("@/stores/urlListStore").then(({ getList, currentList }) => {
          const current = currentList.get();
          const slug = current?.slug;
          if (slug && typeof slug === "string") {
            setTimeout(() => {
              // Only refresh if we're still on the same list and not unmounted
              if (isMountedRef.current && !isImportActiveRef.current) {
                if (process.env.NODE_ENV === "development") {
                  console.debug(
                    "🔄 [IMPORT] Triggering final list refresh after import completion"
                  );
                }
                // Use getList from the store instead of window event to avoid real-time throttling
                getList(slug, true);
              }
            }, 800); // Reduced delay since we're aborting all requests
          }
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-row items-center gap-2 flex-wrap flex-shrink-0">
      {/* Export JSON */}
      <HoverTooltip message="Export URLs as JSON file" position="top">
        <button
          type="button"
          onClick={() => handleExport("json")}
          disabled={isExporting !== null || urls.length === 0}
          className={`
            relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl
            transition-all duration-200 shadow-md hover:shadow-lg
            text-sm font-medium whitespace-nowrap
            ${
              isExporting === "json" || urls.length === 0
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/30 hover:to-purple-500/30 border border-purple-500/30 text-purple-300 hover:text-purple-200"
            }
          `}
        >
          {isExporting === "json" ? (
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileJson className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isExporting === "json" ? "Exporting..." : "Export JSON"}
          </span>
        </button>
      </HoverTooltip>

      {/* Export CSV */}
      <HoverTooltip message="Export URLs as CSV file" position="top">
        <button
          type="button"
          onClick={() => handleExport("csv")}
          disabled={isExporting !== null || urls.length === 0}
          className={`
            relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl
            transition-all duration-200 shadow-md hover:shadow-lg
            text-sm font-medium whitespace-nowrap
            ${
              isExporting === "csv" || urls.length === 0
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 hover:from-emerald-600/30 hover:to-emerald-500/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200"
            }
          `}
        >
          {isExporting === "csv" ? (
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isExporting === "csv" ? "Exporting..." : "Export CSV"}
          </span>
        </button>
      </HoverTooltip>

      {/* Export Markdown */}
      <HoverTooltip message="Export URLs as Markdown file" position="top">
        <button
          type="button"
          onClick={() => handleExport("markdown")}
          disabled={isExporting !== null || urls.length === 0}
          className={`
            relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl
            transition-all duration-200 shadow-md hover:shadow-lg
            text-sm font-medium whitespace-nowrap
            ${
              isExporting === "markdown" || urls.length === 0
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600/20 to-indigo-500/20 hover:from-indigo-600/30 hover:to-indigo-500/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200"
            }
          `}
        >
          {isExporting === "markdown" ? (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isExporting === "markdown" ? "Exporting..." : "Export MD"}
          </span>
        </button>
      </HoverTooltip>

      {/* Import with dropdown menu */}
      <div className="relative" ref={importMenuRef}>
        <HoverTooltip message="Import URLs from various formats" position="top">
          <button
            type="button"
            onClick={() => setShowImportMenu(!showImportMenu)}
            disabled={isImporting}
            className={`
              relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl
              transition-all duration-200 shadow-md hover:shadow-lg
              text-sm font-medium whitespace-nowrap
              ${
                isImporting
                  ? "bg-white/5 text-white/40 cursor-wait"
                  : "bg-gradient-to-r from-blue-600/20 to-blue-500/20 hover:from-blue-600/30 hover:to-blue-500/30 border border-blue-500/30 text-blue-300 hover:text-blue-200"
              }
            `}
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Importing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </HoverTooltip>

        {/* Import dropdown menu */}
        {showImportMenu && !isImporting && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="py-1">
              <label className="block px-4 py-2 text-sm text-white/90 hover:bg-slate-700 cursor-pointer">
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-purple-400" />
                  <span>JSON or CSV</span>
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={(e) => handleImport(e, "auto")}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
              <label className="block px-4 py-2 text-sm text-white/90 hover:bg-slate-700 cursor-pointer">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-400" />
                  <span>Chrome Bookmarks</span>
                </span>
                <input
                  type="file"
                  accept=".html"
                  onChange={(e) => handleImport(e, "chrome")}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
              <label className="block px-4 py-2 text-sm text-white/90 hover:bg-slate-700 cursor-pointer">
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-red-400" />
                  <span>Pocket Export</span>
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleImport(e, "pocket")}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
              <label className="block px-4 py-2 text-sm text-white/90 hover:bg-slate-700 cursor-pointer">
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-green-400" />
                  <span>Pinboard Export</span>
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleImport(e, "pinboard")}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
