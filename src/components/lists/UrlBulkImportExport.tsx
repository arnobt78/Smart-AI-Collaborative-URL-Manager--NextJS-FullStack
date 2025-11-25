"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  Download,
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
  canEdit?: boolean; // Permission to edit URLs (false for viewers)
}

export function UrlBulkImportExport({
  urls,
  listTitle,
  onBulkOperationStart,
  onBulkOperationEnd,
  canEdit = true, // Default to true for backward compatibility
}: UrlBulkImportExportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
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
    setShowExportMenu(false);

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
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    }

    if (showImportMenu || showExportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showImportMenu, showExportMenu]);

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

      // CRITICAL: Start intercepting ALL fetch calls globally (including Next.js RSC requests)
      // This allows us to abort even Next.js router internal requests
      if (typeof window !== "undefined" && abortRegistry) {
        abortRegistry.startGlobalInterception();
        if (process.env.NODE_ENV === "development") {
          console.log(
            `🔍 [IMPORT] Started global fetch interception for RSC request tracking`
          );
        }
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

      // NEW: Try bulk import API for better performance
      // DISABLED temporarily - causes Next.js dev server connection pool exhaustion
      const USE_BULK_IMPORT = true;

      if (USE_BULK_IMPORT) {
        try {
          // Get current list ID from store
          const { currentList } = await import("@/stores/urlListStore");
          const current = currentList.get();
          if (!current.id) {
            throw new Error("No list ID found");
          }

          // Send all URLs at once to bulk import endpoint
          const response = await fetch(`/api/lists/${current.id}/bulk-import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              urls: validUrls.map((item) => ({
                url: item.url,
                title: item.title,
                tags: item.tags,
                notes: item.notes,
                reminder: item.reminder,
                category: item.category,
                isFavorite: item.isFavorite,
                isPinned: item.isPinned,
              })),
            }),
          });

          if (!response.ok) {
            throw new Error(`Bulk import failed: ${response.statusText}`);
          }

          const result = await response.json();

          if (process.env.NODE_ENV === "development") {
            console.log(
              `✅ [BULK IMPORT] Successfully imported ${result.urls.length} URLs`
            );
          }

          // Update UI
          setIsImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          toast({
            title: "Import successful!",
            description: `Successfully imported ${result.urls.length} URLs. Reloading page...`,
          });

          if (onBulkOperationEnd) {
            onBulkOperationEnd();
          }

          // CRITICAL: Cleanup BEFORE reload to prevent stuck RSC requests
          // Must clear flags and abort requests before triggering page reload
          if (typeof window !== "undefined") {
            // Clear bulk import flag FIRST
            (window as any).__bulkImportActive = false;
            (window as any).__bulkImportJustCompleted = false;

            // Force abort ALL requests immediately
            if (abortRegistry) {
              cancelPendingGetList();
              abortRegistry.abortAll();
              abortRegistry.forceAbortAllGlobal();
              abortRegistry.stopGlobalInterception();

              if (process.env.NODE_ENV === "development") {
                console.log(
                  `🛑 [BULK IMPORT] Cleaned up all requests before reload (${abortRegistry.getCount()} remaining)`
                );
              }
            }

            // Clear Next.js router caches
            try {
              const nextRouter = (window as any).__NEXT_DATA__?.router;
              if (nextRouter?.prefetchCache) {
                nextRouter.prefetchCache.clear();
              }
              const routerInstance = (window as any).__nextRouter;
              if (routerInstance) {
                if (routerInstance.isPending !== undefined) {
                  routerInstance.isPending = false;
                }
                if (routerInstance.cache) {
                  routerInstance.cache.clear?.();
                }
              }
              const nextFetchCache = (window as any).__nextFetchCache;
              if (nextFetchCache) {
                nextFetchCache.clear();
              }
            } catch (e) {
              // Ignore errors
            }
          }

          // CRITICAL: Force page reload to clear server state and prevent connection pool exhaustion
          // The Next.js dev server can't handle the load from bulk import + SSE + metadata fetching
          // A hard reload ensures a clean slate
          if (process.env.NODE_ENV === "development") {
            console.log(
              "🔄 [BULK IMPORT] Forcing page reload to clear server state..."
            );
            // Set flag in sessionStorage to skip metadata fetch after reload
            sessionStorage.setItem("skipMetadataAfterBulkImport", "true");

            // Wait a bit for cleanup to fully propagate, then force reload
            setTimeout(() => {
              // Force stop interception one more time before reload
              if (typeof window !== "undefined" && abortRegistry) {
                abortRegistry.stopGlobalInterception();
                abortRegistry.forceAbortAllGlobal();
                (window as any).__bulkImportActive = false;
                (window as any).__bulkImportDisableInterception = true;
              }
              // Use window.location.href for more forceful navigation
              window.location.href = window.location.href;
            }, 300);
          }

          return; // Exit early - bulk import succeeded
        } catch (error) {
          console.error(
            "❌ [BULK IMPORT] Failed, falling back to one-by-one:",
            error
          );
          // Fall through to one-by-one import
        }
      }

      // Concurrency queue: Process 2 URLs in parallel, start next immediately when any finishes
      // Reduced to 2 to avoid overwhelming the server and prevent request timeouts
      // Sequential processing (1 at a time) would be too slow for large imports
      // Reduced from 2 -> 1 to avoid server saturation / dev server hang after large imports
      const CONCURRENCY_LIMIT = 1;
      let successCount = 0;

      // CRITICAL: Track import timing and metrics for debugging
      const importStartTime = Date.now();
      const importMetrics = {
        startTime: importStartTime,
        urlTimings: [] as Array<{
          url: string;
          startTime: number;
          endTime?: number;
          duration?: number;
          status: "success" | "failed" | "pending";
        }>,
        totalUrls: validUrls.length,
        concurrencyLimit: CONCURRENCY_LIMIT,
      };

      if (process.env.NODE_ENV === "development") {
        console.log(`🕐 [IMPORT] Import metrics initialized:`, {
          totalUrls: importMetrics.totalUrls,
          concurrencyLimit: importMetrics.concurrencyLimit,
          startTime: new Date(importStartTime).toISOString(),
        });
      }
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
          let metadataWasCancelled = false; // Track if metadata was cancelled (but import still active)

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

            // Create a separate abort controller for metadata fetch
            // This allows metadata to be cancelled independently without cancelling URL addition
            const metadataAbortController = new AbortController();

            // Link metadata controller to overall abort signal
            // If overall import is cancelled, cancel metadata too
            if (signalBeforeFetch) {
              signalBeforeFetch.addEventListener("abort", () => {
                if (!metadataAbortController.signal.aborted) {
                  metadataAbortController.abort();
                }
              });
            }

            // Also register timeout for metadata (10 seconds)
            const metadataTimeout = setTimeout(() => {
              if (!metadataAbortController.signal.aborted) {
                metadataAbortController.abort();
                metadataWasCancelled = true; // Mark as cancelled (timeout, not user cancellation)
              }
            }, 10000);

            try {
              metadata = await fetchUrlMetadata(
                urlItem.url,
                10000,
                metadataAbortController.signal // Use metadata-specific signal
              );
              clearTimeout(metadataTimeout);
            } catch (err) {
              clearTimeout(metadataTimeout);
              throw err; // Re-throw to outer catch block
            }

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
            // CRITICAL: If metadata fetch was aborted/cancelled, continue with imported data
            // Still add URL to list, but use imported title/URL directly (no metadata)
            // This prevents pending URL API requests while still adding the URL card
            const isAborted =
              metadataError instanceof Error &&
              (metadataError.name === "AbortError" ||
                metadataError.message === "Request aborted" ||
                metadataError.message.includes("aborted"));

            // Check if overall import was cancelled (not just metadata timeout)
            const overallImportCancelled =
              getCurrentSignal()?.aborted || !isImportActiveRef.current;

            if (isAborted) {
              // Metadata fetch was cancelled
              metadataFailedUrls.push(urlItem.url);

              if (overallImportCancelled) {
                // Overall import was cancelled - skip this URL
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `⏭️ [IMPORT] Overall import cancelled for ${urlItem.url}, skipping URL`
                  );
                }
                return; // Skip URL addition
              } else {
                // Only metadata was cancelled (timeout/network) - continue with imported data
                // URL will still be added with imported title/URL, just without metadata
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `⏭️ [IMPORT] Metadata cancelled for ${urlItem.url}, using imported data directly (no metadata) - URL will still be added`
                  );
                }
                // Continue to addUrlToList with imported title/URL
                // metadata remains {} (empty)
              }
            } else {
              // Metadata fetch failed (but not aborted) - that's okay, we'll use imported data
              // Track URLs that failed metadata fetch (suppress console warnings)
              metadataFailedUrls.push(urlItem.url);
              // Continue with empty metadata - we'll use imported title/description
              if (process.env.NODE_ENV === "development") {
                console.debug(
                  `Metadata fetch failed for ${urlItem.url}:`,
                  metadataError
                );
              }
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

          // CRITICAL: Check again before adding URL (use ref to get current signal)
          // If aborted at any point, skip addUrlToList to prevent pending requests
          const signalBeforeAdd = getCurrentSignal();
          if (
            signalBeforeAdd?.aborted ||
            !isMountedRef.current ||
            !isImportActiveRef.current
          ) {
            if (
              process.env.NODE_ENV === "development" &&
              signalBeforeAdd?.aborted
            ) {
              console.log(
                `⏭️ [IMPORT] Signal aborted before addUrlToList for ${urlItem.url}, skipping to prevent pending request`
              );
            }
            return;
          }

          // Add URL to list (using imported data, with metadata as fallback)
          // Wrap in timeout to prevent hanging indefinitely (10 second max wait)
          // Also pass abort signal to allow cancellation
          try {
            const currentAbortSignal = getCurrentSignal();

            // CRITICAL: Final check if aborted before attempting to add
            // This prevents starting addUrlToList if signal was aborted during metadata fetch
            if (currentAbortSignal?.aborted) {
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `⏭️ [IMPORT] Signal aborted before addUrlToList call for ${urlItem.url}, exiting immediately`
                );
              }
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
                    reject(new Error("addUrlToList timeout after 3 seconds")),
                  3000 // Reduced to 3 seconds to fail faster and prevent server saturation
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
            // Yield event loop after error to prevent server saturation
            await new Promise((resolve) => setTimeout(resolve, 0));
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

        const urlStartTime = Date.now();
        promiseStartTimes.set(currentIndex, urlStartTime);

        // Track URL in metrics
        importMetrics.urlTimings.push({
          url: urlItem.url,
          startTime: urlStartTime,
          status: "pending",
        });

        if (process.env.NODE_ENV === "development") {
          const elapsed = Math.round((urlStartTime - importStartTime) / 1000);
          console.log(
            `📥 [IMPORT] [${elapsed}s] Starting URL ${currentIndex + 1}/${
              validUrls.length
            }: ${urlItem.url.substring(0, 60)}...`
          );
        }

        const promise = processUrl(urlItem)
          .then(async () => {
            const urlEndTime = Date.now();
            const urlDuration = urlEndTime - urlStartTime;
            completedCount++;

            // Update metrics
            const urlMetric = importMetrics.urlTimings.find(
              (m) => m.url === urlItem.url && m.status === "pending"
            );
            if (urlMetric) {
              urlMetric.endTime = urlEndTime;
              urlMetric.duration = urlDuration;
              urlMetric.status = "success";
            }

            if (process.env.NODE_ENV === "development") {
              const elapsed = Math.round((urlEndTime - importStartTime) / 1000);
              console.log(
                `✅ [IMPORT] [${elapsed}s] URL ${currentIndex + 1}/${
                  validUrls.length
                } completed in ${Math.round(
                  urlDuration / 1000
                )}s (${completedCount}/${
                  validUrls.length
                } total, ${successCount} success, ${errorCount} failed)`
              );
            }

            // Yield to event loop to prevent server saturation
            await new Promise((resolve) => setTimeout(resolve, 0));
          })
          .catch((error) => {
            const urlEndTime = Date.now();
            const urlDuration = urlEndTime - urlStartTime;
            completedCount++;

            // Update metrics
            const urlMetric = importMetrics.urlTimings.find(
              (m) => m.url === urlItem.url && m.status === "pending"
            );
            if (urlMetric) {
              urlMetric.endTime = urlEndTime;
              urlMetric.duration = urlDuration;
              urlMetric.status = "failed";
            }

            if (process.env.NODE_ENV === "development") {
              const elapsed = Math.round((urlEndTime - importStartTime) / 1000);
              console.error(
                `❌ [IMPORT] [${elapsed}s] URL ${currentIndex + 1}/${
                  validUrls.length
                } failed after ${Math.round(urlDuration / 1000)}s:`,
                error instanceof Error ? error.message : String(error)
              );
            }
          })
          .finally(async () => {
            // Remove this promise from running set when done
            runningPromises.delete(currentIndex);
            promiseStartTimes.delete(currentIndex);

            // Increased throttle delay to 500ms to give server more breathing room
            // This prevents server saturation when processing many URLs with timeouts
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Start the next URL when this one finishes (if import is still active)
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
        // Declare finalWaitStartTime outside try block so it's accessible in catch
        const finalWaitStartTime = Date.now();

        if (process.env.NODE_ENV === "development") {
          console.log(
            `⏳ [IMPORT] Starting final wait for ${runningPromises.size} remaining promise(s)...`,
            {
              promiseIndices: Array.from(runningPromises.keys()),
            }
          );
        }

        try {
          // Wait max 10 seconds for remaining promises, then force abort
          const finalWaitTimeout = new Promise<void>((resolve) => {
            setTimeout(() => {
              const waitDuration = Date.now() - finalWaitStartTime;
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `⚠️ [IMPORT] Final wait timeout after ${Math.round(
                    waitDuration / 1000
                  )}s - aborting remaining ${runningPromises.size} request(s)`,
                  {
                    pendingIndices: Array.from(runningPromises.keys()),
                    abortRegistryCount: abortRegistry?.getCount() || 0,
                  }
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
                  `⚠️ [IMPORT] URL processing promise was rejected (final wait):`,
                  result.reason
                );
              }
              errorCount++;
            }
          });

          if (process.env.NODE_ENV === "development") {
            const finalWaitDuration = Date.now() - finalWaitStartTime;
            console.log(
              `✅ [IMPORT] Final wait completed in ${Math.round(
                finalWaitDuration / 1000
              )}s`,
              {
                remainingPromises: runningPromises.size,
                abortRegistryCount: abortRegistry?.getCount() || 0,
              }
            );
          }
        } catch (error) {
          const finalWaitDuration = Date.now() - finalWaitStartTime;
          if (process.env.NODE_ENV === "development") {
            console.error(
              `❌ [IMPORT] Error in final wait after ${Math.round(
                finalWaitDuration / 1000
              )}s:`,
              error
            );
          }
        }
      } else if (
        process.env.NODE_ENV === "development" &&
        runningPromises.size > 0
      ) {
        console.log(
          `⏭️ [IMPORT] Skipping final wait - import inactive or aborted`,
          {
            pendingPromises: runningPromises.size,
            isImportActive: isImportActiveRef.current,
            isAborted: signalForWait?.aborted || false,
          }
        );
      }

      const processingEndTime = Date.now();
      const processingDuration = processingEndTime - importStartTime;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `⏱️ [IMPORT] Processing loop completed in ${Math.round(
            processingDuration / 1000
          )}s`,
          {
            totalUrls: validUrls.length,
            processed: processedCount,
            success: successCount,
            failed: errorCount,
            pending: runningPromises.size,
            elapsed: Math.round(processingDuration / 1000) + "s",
          }
        );
      }

      // CRITICAL: Abort all pending requests before clearing controller
      // This ensures all in-flight fetch requests are cancelled
      const cleanupStartTime = Date.now();
      if (process.env.NODE_ENV === "development") {
        console.log(`🧹 [IMPORT] Starting cleanup phase...`, {
          pendingPromises: runningPromises.size,
          abortRegistryCount: abortRegistry?.getCount() || 0,
        });
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        if (process.env.NODE_ENV === "development") {
          console.log(`🛑 [IMPORT] Aborted import controller`);
        }
      }

      // Cancel all pending getList requests that might be stuck
      // These are likely GET requests to /api/lists/test-import that are pending
      cancelPendingGetList();
      if (process.env.NODE_ENV === "development") {
        console.log(`🛑 [IMPORT] Cancelled pending getList requests`);
      }

      // Give a longer delay to ensure all cancellations are processed
      // This prevents the page from getting stuck with pending requests
      // and allows RSC (React Server Components) requests to be cancelled too
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (process.env.NODE_ENV === "development") {
        const cleanupDuration = Date.now() - cleanupStartTime;
        console.log(
          `🧹 [IMPORT] Initial cleanup completed in ${Math.round(
            cleanupDuration
          )}ms`
        );
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Clear abort controller AFTER aborting (to ensure cleanup)
      abortControllerRef.current = null;

      const summaryTime = Date.now();
      const totalDuration = summaryTime - importStartTime;

      // Calculate average times
      const successfulUrls = importMetrics.urlTimings.filter(
        (m) => m.status === "success"
      );
      const failedUrls = importMetrics.urlTimings.filter(
        (m) => m.status === "failed"
      );
      const avgSuccessTime =
        successfulUrls.length > 0
          ? successfulUrls.reduce((sum, m) => sum + (m.duration || 0), 0) /
            successfulUrls.length
          : 0;
      const avgFailedTime =
        failedUrls.length > 0
          ? failedUrls.reduce((sum, m) => sum + (m.duration || 0), 0) /
            failedUrls.length
          : 0;

      if (process.env.NODE_ENV === "development") {
        console.log(`📊 [IMPORT] Processing complete. Detailed Summary:`, {
          timing: {
            totalDuration: Math.round(totalDuration / 1000) + "s",
            avgSuccessTime: Math.round(avgSuccessTime / 1000) + "s",
            avgFailedTime: Math.round(avgFailedTime / 1000) + "s",
            fastestUrl:
              successfulUrls.length > 0
                ? Math.round(
                    Math.min(...successfulUrls.map((m) => m.duration || 0)) /
                      1000
                  ) + "s"
                : "N/A",
            slowestUrl:
              successfulUrls.length > 0
                ? Math.round(
                    Math.max(...successfulUrls.map((m) => m.duration || 0)) /
                      1000
                  ) + "s"
                : "N/A",
          },
          results: {
            totalUrls: validUrls.length,
            processed: processedCount,
            success: successCount,
            failed: errorCount,
            metadataFailed: metadataFailedUrls.length,
            skipped: skippedCount,
          },
          pending: {
            runningPromises: runningPromises.size,
            abortRegistryCount: abortRegistry?.getCount() || 0,
          },
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

      const finallyStartTime = Date.now();

      // CRITICAL FIX: Clear __bulkImportActive flag FIRST before any other cleanup
      // The fetch wrapper checks this flag - must be false BEFORE we stop interception
      // Otherwise, pending RSC requests will still be intercepted even after "restoration"
      if (typeof window !== "undefined") {
        (window as any).__bulkImportActive = false;
        if (process.env.NODE_ENV === "development") {
          console.log(
            `🚫 [IMPORT] [FINALLY] Cleared __bulkImportActive flag FIRST (critical for wrapper bypass)`
          );
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`🏁 [IMPORT] [FINALLY] Starting final cleanup phase...`, {
          timestamp: new Date().toISOString(),
          abortRegistryCount: abortRegistry?.getCount() || 0,
        });
      }

      // Cancel all pending getList requests that might be stuck
      cancelPendingGetList();
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ [IMPORT] [FINALLY] Cancelled pending getList requests`);
      }

      // CRITICAL: Abort ALL tracked fetch requests globally
      // This ensures no requests (including RSC requests) block navigation
      if (typeof window !== "undefined" && abortRegistry) {
        const abortedCount = abortRegistry.getCount();

        if (process.env.NODE_ENV === "development") {
          console.log(`🛑 [IMPORT] [FINALLY] Starting global abort...`, {
            trackedRequests: abortedCount,
          });
        }

        abortRegistry.abortAll();

        if (process.env.NODE_ENV === "development") {
          const abortDuration = Date.now() - finallyStartTime;
          console.log(
            `🛑 [IMPORT] [FINALLY] Global abort completed in ${abortDuration}ms`,
            {
              abortedRequests: abortedCount,
              remainingCount: abortRegistry.getCount(),
            }
          );
        }

        // CRITICAL: Clear Next.js router cache IMMEDIATELY (not in setTimeout)
        // This must happen before aborting to prevent new requests from starting
        const routerCleanupStartTime = Date.now();
        try {
          if (process.env.NODE_ENV === "development") {
            console.log(
              `🧹 [IMPORT] [FINALLY] Attempting router cache cleanup IMMEDIATELY...`
            );
          }

          // Access Next.js router internals to clear prefetch cache
          const nextRouter = (window as any).__NEXT_DATA__?.router;
          if (nextRouter) {
            // Clear prefetch cache
            if (nextRouter.prefetchCache) {
              nextRouter.prefetchCache.clear();
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `✅ [IMPORT] [FINALLY] Cleared Next.js prefetch cache`
                );
              }
            }

            // Try to abort pending RSC requests via router internals
            // This is a workaround since Next.js doesn't expose abort for RSC prefetches
            const routerInstance = (window as any).__nextRouter;
            if (routerInstance) {
              // Clear any pending navigation state
              if (routerInstance.isPending !== undefined) {
                routerInstance.isPending = false;
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `✅ [IMPORT] [FINALLY] Cleared Next.js router pending state`
                  );
                }
              }

              // Try to clear router cache directly
              if (routerInstance.cache) {
                routerInstance.cache.clear?.();
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `✅ [IMPORT] [FINALLY] Cleared Next.js router cache`
                  );
                }
              }
            }
          }

          // Force clear Next.js internal fetch cache for RSC requests
          const nextFetchCache = (window as any).__nextFetchCache;
          if (nextFetchCache) {
            nextFetchCache.clear();
            if (process.env.NODE_ENV === "development") {
              console.log(`✅ [IMPORT] [FINALLY] Cleared Next.js fetch cache`);
            }
          }

          // CRITICAL: Also try to access Next.js router's internal promise queue
          // and abort pending RSC requests
          try {
            const routerInternals = (window as any).__NEXT_ROUTER_BASEPATH;
            const routerCache = (window as any).__NEXT_ROUTER_CACHE;
            if (routerCache && typeof routerCache.clear === "function") {
              routerCache.clear();
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `✅ [IMPORT] [FINALLY] Cleared Next.js router internal cache`
                );
              }
            }
          } catch (e) {
            // Ignore - internal API might not exist
          }

          if (process.env.NODE_ENV === "development") {
            const routerCleanupDuration = Date.now() - routerCleanupStartTime;
            console.log(
              `✅ [IMPORT] [FINALLY] Router cleanup completed in ${routerCleanupDuration}ms`
            );
          }
        } catch (e) {
          // Ignore - Next.js internal API might change
          if (process.env.NODE_ENV === "development") {
            const routerCleanupDuration = Date.now() - routerCleanupStartTime;
            console.warn(
              `⚠️ [IMPORT] [FINALLY] Router cleanup failed after ${routerCleanupDuration}ms:`,
              e
            );
          }
        }

        // CRITICAL: Additional delayed cleanup to catch any requests that started after initial cleanup
        setTimeout(() => {
          try {
            // Abort any new requests that might have started
            if (abortRegistry) {
              abortRegistry.abortAll();
            }

            // Force clear router cache again to be safe
            const nextRouter = (window as any).__NEXT_DATA__?.router;
            if (nextRouter?.prefetchCache) {
              nextRouter.prefetchCache.clear();
            }
          } catch (e) {
            // Ignore errors
          }
        }, 50);
      } else if (process.env.NODE_ENV === "development") {
        console.warn(`⚠️ [IMPORT] [FINALLY] Abort registry not available`);
      }

      // CRITICAL: Stop global fetch interception IMMEDIATELY after aborting
      // This prevents Next.js RSC requests from being intercepted and stuck
      // We stop it BEFORE the wait period to ensure router can make fresh requests
      if (typeof window !== "undefined" && abortRegistry) {
        // Abort all requests one more time
        abortRegistry.abortAll();

        // CRITICAL: Stop interception IMMEDIATELY, not after delay
        // This allows Next.js router to make new requests without interception
        abortRegistry.stopGlobalInterception();

        // CRITICAL FIX: Call stopGlobalInterception again after a micro-delay
        // to handle race conditions where the wrapper might be reinstalled
        setTimeout(() => {
          abortRegistry?.stopGlobalInterception();
        }, 10);

        if (process.env.NODE_ENV === "development") {
          console.log(
            `🔍 [IMPORT] [FINALLY] Stopped global fetch interception immediately (with retry scheduled)`
          );
        }
      }

      const finallyEndTime = Date.now();
      const finallyDuration = finallyEndTime - finallyStartTime;
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🏁 [IMPORT] [FINALLY] Final cleanup phase completed in ${finallyDuration}ms`
        );
        console.log(
          `✅ [IMPORT] Import fully cleaned up - page should be responsive now`
        );
        // ADDITIVE: Enforce hard disable + native fetch restoration guard
        try {
          (window as any).__bulkImportDisableInterception = true;
          const { abortRegistry } = require("@/utils/abortRegistry");
          abortRegistry?.forceRestoreNativeFetch?.();
          console.log(
            "🛠 [IMPORT] Disabled interception & enforced native fetch restoration"
          );
        } catch (e) {
          console.log(
            "⚠️ [IMPORT] Native restoration enforcement encountered error (ignored)",
            e
          );
        }
      }

      // Mark import as inactive
      isImportActiveRef.current = false;

      // Only reset if still mounted (don't update state after unmount)
      if (isMountedRef.current) {
        setIsImporting(false);

        // CRITICAL: Wait for all abort signals to propagate AND clear router cache again
        // Increased delay to ensure Next.js router processes all aborts
        // Navigation will work AFTER this delay completes
        // The delay allows:
        // 1. All registered fetch requests to be aborted
        // 2. Next.js router to process abort signals
        // 3. Browser to clear pending network requests
        // 4. Router cache to be fully cleared
        const waitStartTime = Date.now();
        if (process.env.NODE_ENV === "development") {
          console.log(
            `⏳ [IMPORT] Waiting for abort signals to propagate (500ms)...`,
            {
              abortRegistryCount: abortRegistry?.getCount() || 0,
              isImportActive: isImportActiveRef.current,
            }
          );
        }

        // Wait and clear router cache during the wait
        await new Promise((resolve) => {
          // Clear router cache after 100ms of wait
          setTimeout(() => {
            try {
              // Force clear all Next.js router caches again during wait
              const nextRouter = (window as any).__NEXT_DATA__?.router;
              if (nextRouter?.prefetchCache) {
                nextRouter.prefetchCache.clear();
              }

              const routerInstance = (window as any).__nextRouter;
              if (routerInstance) {
                if (routerInstance.isPending !== undefined) {
                  routerInstance.isPending = false;
                }
                if (routerInstance.cache) {
                  routerInstance.cache.clear?.();
                }
              }

              const nextFetchCache = (window as any).__nextFetchCache;
              if (nextFetchCache) {
                nextFetchCache.clear();
              }

              // Abort any new requests that might have started
              if (abortRegistry) {
                abortRegistry.abortAll();
              }

              if (process.env.NODE_ENV === "development") {
                console.log(
                  `🧹 [IMPORT] Cleared router cache again during wait`
                );
              }
            } catch (e) {
              // Ignore errors
            }
          }, 100);

          // Complete wait after total 500ms
          setTimeout(resolve, 500);
        });

        if (process.env.NODE_ENV === "development") {
          const waitDuration = Date.now() - waitStartTime;
          console.log(
            `✅ [IMPORT] Wait completed in ${waitDuration}ms, checking final state...`,
            {
              abortRegistryCount: abortRegistry?.getCount() || 0,
            }
          );
        }

        // CRITICAL: Force abort ALL requests (including Next.js internal) before clearing flags
        // This is a nuclear option to ensure NO requests are pending
        if (typeof window !== "undefined" && abortRegistry) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              `🛑 [IMPORT] Force aborting ALL global requests before clearing flags...`
            );
          }
          abortRegistry.forceAbortAllGlobal();

          // CRITICAL: Ensure interception is stopped before allowing navigation
          // This prevents new RSC requests from being intercepted
          if (abortRegistry) {
            abortRegistry.stopGlobalInterception();
            if (process.env.NODE_ENV === "development") {
              console.log(`🔍 [IMPORT] Ensured fetch interception is stopped`);
            }
          }
        }

        // Additional wait to ensure router cache is fully cleared and all aborts are processed
        // This gives Next.js time to process abort signals and clear internal state
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (typeof window !== "undefined") {
          if (process.env.NODE_ENV === "development") {
            console.log(
              `🏁 [IMPORT] Finalizing import and allowing navigation...`,
              {
                abortRegistryCount: abortRegistry?.getCount() || 0,
                willClearFlag: true,
              }
            );
          }

          // CRITICAL: Clear router cache ONE MORE TIME before clearing flags
          // This ensures Next.js router is in a clean state
          try {
            const nextRouter = (window as any).__NEXT_DATA__?.router;
            if (nextRouter?.prefetchCache) {
              nextRouter.prefetchCache.clear();
            }

            const routerInstance = (window as any).__nextRouter;
            if (routerInstance) {
              if (routerInstance.isPending !== undefined) {
                routerInstance.isPending = false;
              }
              if (routerInstance.cache) {
                routerInstance.cache.clear?.();
              }
            }

            const nextFetchCache = (window as any).__nextFetchCache;
            if (nextFetchCache) {
              nextFetchCache.clear();
            }
          } catch (e) {
            // Ignore errors
          }

          // Set flag indicating import just completed (for navigation checks)
          // Note: __bulkImportActive was already cleared at the START of finally block
          (window as any).__bulkImportJustCompleted = true;

          if (process.env.NODE_ENV === "development") {
            console.log(
              `✅ [IMPORT] Import completion flag set - page should be responsive now`,
              {
                __bulkImportActive: (window as any).__bulkImportActive,
                __bulkImportJustCompleted: true,
                abortRegistryCount: abortRegistry?.getCount() || 0,
              }
            );
          }

          // Clear the "just completed" flag after a delay to allow safe navigation
          // This gives Next.js router time to clear its internal state
          setTimeout(() => {
            (window as any).__bulkImportJustCompleted = false;
            if (process.env.NODE_ENV === "development") {
              console.log(
                `✅ [IMPORT] Import fully completed - navigation should work normally now`
              );
            }
          }, 1000);

          // --- BEGIN ADDITIVE NAVIGATION RECOVERY (non-destructive) ---
          // In rare cases (large Chrome bookmark imports) navigation can still appear "stuck"
          // even after all cleanup logs report success. We add a passive recovery loop that:
          // 1. Re-confirms interception is stopped.
          // 2. Re-aborts any straggler requests.
          // 3. Performs a gentle router refresh ping.
          // 4. Falls back to a hard location.reload if still stuck after 5s.
          // This code ONLY adds safeguards and does not remove or alter existing logic.
          const startRecoveryTs = Date.now();
          let recoveryAttempts = 0;
          const recoveryInterval = window.setInterval(() => {
            recoveryAttempts++;
            const elapsed = Date.now() - startRecoveryTs;
            const activeFlag = (window as any).__bulkImportActive === true;
            const justCompletedFlag =
              (window as any).__bulkImportJustCompleted === true;
            const pendingCount = abortRegistry?.getCount() || 0;

            // CRITICAL FIX: Every iteration, aggressively re-stop interception
            // This ensures window.fetch is restored even if there were race conditions
            abortRegistry?.stopGlobalInterception?.();

            // If import somehow reactivated or interception restarted, stop it again.
            if (activeFlag) {
              (window as any).__bulkImportActive = false;
              abortRegistry?.stopGlobalInterception?.();
            }

            // If we still see many pending requests after cleanup, abort them again.
            if (pendingCount > 0) {
              abortRegistry?.abortAll();
            }

            // Gentle router refresh ping (only once after initial second) to re-hydrate if needed.
            if (elapsed > 1200 && recoveryAttempts === 2) {
              try {
                // Using a lightweight HEAD request to current URL as a connectivity nudge.
                fetch(window.location.href, { method: "HEAD" }).catch(() => {});
              } catch {}
            }

            // If after 5 seconds there are still pending requests or navigation feels stuck,
            // perform a last safety: force abort all + hard reload.
            if (elapsed > 5000) {
              if (pendingCount > 0 || justCompletedFlag) {
                abortRegistry?.forceAbortAllGlobal?.();
                abortRegistry?.stopGlobalInterception?.();
                // Only reload if user is still on same page and flags haven't cleared.
                if ((window as any).__bulkImportJustCompleted) {
                  if (process.env.NODE_ENV === "development") {
                    console.warn(
                      "⚠️ [IMPORT] Navigation appears unresponsive after recovery window – performing hard reload"
                    );
                  }
                  (window as any).__bulkImportJustCompleted = false;
                  // Hard reload (no cache) to fully reset runtime state.
                  window.location.reload();
                }
              }
              window.clearInterval(recoveryInterval);
            }

            // Exit early if everything is clean and flags are cleared.
            if (!activeFlag && !justCompletedFlag && pendingCount === 0) {
              window.clearInterval(recoveryInterval);
              if (process.env.NODE_ENV === "development") {
                console.log(
                  "✅ [IMPORT] Post-import navigation recovery confirmed clean; stopping recovery loop"
                );
              }
            }
          }, 500);
          // --- END ADDITIVE NAVIGATION RECOVERY ---
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
      {/* Export with dropdown menu */}
      <div className="relative" ref={exportMenuRef}>
        <HoverTooltip
          message="Export URLs in various formats"
          position="top"
          usePortal
        >
          <button
            type="button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting !== null || urls.length === 0}
            className={`
              relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl
              transition-all duration-200 shadow-md hover:shadow-lg
              text-sm font-medium whitespace-nowrap
              ${
                isExporting !== null || urls.length === 0
                  ? "bg-white/5 text-white/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/30 hover:to-purple-500/30 border border-purple-500/30 text-purple-300 hover:text-purple-200"
              }
            `}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </HoverTooltip>

        {/* Export dropdown menu */}
        {showExportMenu && !isExporting && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  handleExport("json");
                  setShowExportMenu(false);
                }}
                disabled={urls.length === 0}
                className="w-full block px-4 py-2 text-sm text-white/90 hover:bg-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-purple-400" />
                  <span>Export as JSON</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExport("csv");
                  setShowExportMenu(false);
                }}
                disabled={urls.length === 0}
                className="w-full block px-4 py-2 text-sm text-white/90 hover:bg-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Export as CSV</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExport("markdown");
                  setShowExportMenu(false);
                }}
                disabled={urls.length === 0}
                className="w-full block px-4 py-2 text-sm text-white/90 hover:bg-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  <span>Export as Markdown</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import with dropdown menu */}
      <div className="relative" ref={importMenuRef}>
        <HoverTooltip
          message="Import URLs from various formats"
          position="top"
          usePortal
        >
          <button
            type="button"
            onClick={() => setShowImportMenu(!showImportMenu)}
            disabled={isImporting || !canEdit}
            className={`
              relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl
              transition-all duration-200 shadow-md hover:shadow-lg
              text-sm font-medium whitespace-nowrap
              ${
                isImporting || !canEdit
                  ? "bg-white/5 text-white/40 cursor-not-allowed"
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
        {showImportMenu && !isImporting && canEdit && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
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
