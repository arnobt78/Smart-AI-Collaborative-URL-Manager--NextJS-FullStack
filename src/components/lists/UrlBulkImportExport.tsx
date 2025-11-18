"use client";

import React, { useRef, useState } from "react";
import { Upload, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { useToast } from "@/components/ui/Toaster";
import type { UrlItem } from "@/stores/urlListStore";
import { addUrlToList } from "@/stores/urlListStore";
import { fetchUrlMetadata, type UrlMetadata } from "@/utils/urlMetadata";
import { useQueryClient } from "@tanstack/react-query";

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

  const handleExport = async (type: "json" | "csv") => {
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
      }
    } catch (error) {
      console.error("Export failed:", error);
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

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

      if (fileExtension === "json") {
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
        throw new Error("Unsupported file format. Please use JSON or CSV.");
      }

      // Validate URLs
      const validUrls = importedUrls.filter((item) => {
        try {
          new URL(item.url);
          return true;
        } catch {
          return false;
        }
      });

      if (validUrls.length === 0) {
        throw new Error(
          "No valid URLs found in the file. Please check the format."
        );
      }

      // Notify parent that bulk operation is starting
      if (onBulkOperationStart) {
        onBulkOperationStart();
      }

      // Import URLs one by one with metadata fetching
      let successCount = 0;
      let errorCount = 0;

      for (const urlItem of validUrls) {
        try {
          // Fetch metadata for the URL
          const metadata = await fetchUrlMetadata(urlItem.url);

          // Use imported title if provided, otherwise use metadata title
          const finalTitle = urlItem.title || metadata.title;

          // Pre-populate the query cache
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

          // Add URL to list
          await addUrlToList(
            urlItem.url,
            finalTitle,
            urlItem.tags || [],
            urlItem.notes || "",
            urlItem.reminder,
            urlItem.category || metadata.siteName
          );

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
        } catch (error) {
          console.error(`Failed to import URL ${urlItem.url}:`, error);
          errorCount++;
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (successCount > 0) {
        toast({
          title: "Import Successful! 📤",
          description: `Imported ${successCount} URL${
            successCount === 1 ? "" : "s"
          }.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
          variant: "success",
        });
      } else {
        toast({
          title: "Import Failed",
          description: `Failed to import URLs. Please check the file format.`,
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to import URLs. Please check the file format.",
        variant: "error",
      });
    } finally {
      setIsImporting(false);
      // Notify parent that bulk operation is ending
      if (onBulkOperationEnd) {
        // Delay clearing the flag to allow operations to complete
        setTimeout(() => {
          if (onBulkOperationEnd) {
            onBulkOperationEnd();
          }
        }, 2000);
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

      {/* Import */}
      <HoverTooltip message="Import URLs from JSON or CSV file" position="top">
        <label
          className={`
            relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl
            transition-all duration-200 shadow-md hover:shadow-lg
            text-sm font-medium whitespace-nowrap cursor-pointer
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
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
          />
        </label>
      </HoverTooltip>
    </div>
  );
}
