/**
 * Pocket Export JSON Parser
 * Parses Pocket export JSON file
 */

import type { ImportResult, ImportedUrlItem } from "./types";

interface PocketItem {
  item_id: string;
  resolved_id?: string;
  given_url: string;
  resolved_url?: string;
  given_title?: string;
  resolved_title?: string;
  favorite?: "0" | "1";
  status?: "0" | "1"; // 0 = unread, 1 = archived
  time_added?: string; // Unix timestamp
  time_updated?: string; // Unix timestamp
  tags?: string; // Comma-separated tags
  excerpt?: string;
}

interface PocketExport {
  list: Record<string, PocketItem>;
}

/**
 * Parse Pocket export JSON file
 */
export function parsePocketExport(jsonString: string): ImportResult {
  const errors: string[] = [];
  const items: ImportedUrlItem[] = [];

  try {
    const data = JSON.parse(jsonString) as PocketExport;

    if (!data.list || typeof data.list !== "object") {
      errors.push("Invalid Pocket export format. Expected 'list' object.");
      return {
        items: [],
        source: "Pocket Export",
        count: 0,
        errors,
      };
    }

    Object.values(data.list).forEach((item, index) => {
      try {
        // Use resolved_url if available, otherwise given_url
        const url = item.resolved_url || item.given_url;
        if (!url) {
          errors.push(`Item ${index + 1} has no URL`);
          return;
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          errors.push(`Invalid URL at item ${index + 1}: ${url}`);
          return;
        }

        // Use resolved_title if available, otherwise given_title
        const title = item.resolved_title || item.given_title;

        // Parse tags (comma-separated string)
        const tags = item.tags
          ? item.tags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t.length > 0)
          : undefined;

        // Convert favorite flag
        const isFavorite = item.favorite === "1";

        // Use time_added as a note
        const addedDate = item.time_added
          ? new Date(parseInt(item.time_added) * 1000).toISOString()
          : undefined;

        const importedItem: ImportedUrlItem = {
          url,
          title: title || undefined,
          description: item.excerpt || undefined,
          tags,
          isFavorite,
          notes: addedDate
            ? `Imported from Pocket on ${new Date(addedDate).toLocaleDateString()}`
            : undefined,
        };

        items.push(importedItem);
      } catch (error) {
        errors.push(
          `Error parsing item ${index + 1}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    if (items.length === 0 && errors.length === 0) {
      errors.push("No items found in the Pocket export file.");
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push("Invalid JSON format. Please check the file.");
    } else {
      errors.push(
        `Failed to parse Pocket export: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return {
    items,
    source: "Pocket Export",
    count: items.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}
