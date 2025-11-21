/**
 * Pinboard Export JSON Parser
 * Parses Pinboard export JSON file
 */

import type { ImportResult, ImportedUrlItem } from "./types";

interface PinboardBookmark {
  href: string;
  description: string;
  extended?: string;
  meta?: string;
  hash?: string;
  time: string; // ISO 8601 date string
  shared?: "yes" | "no";
  toread?: "yes" | "no";
  tags?: string; // Space-separated tags
}

/**
 * Parse Pinboard export JSON file
 * Pinboard exports are a JSON array of bookmark objects
 */
export function parsePinboardExport(jsonString: string): ImportResult {
  const errors: string[] = [];
  const items: ImportedUrlItem[] = [];

  try {
    const data = JSON.parse(jsonString) as PinboardBookmark[];

    if (!Array.isArray(data)) {
      errors.push("Invalid Pinboard export format. Expected JSON array.");
      return {
        items: [],
        source: "Pinboard Export",
        count: 0,
        errors,
      };
    }

    data.forEach((bookmark, index) => {
      try {
        const url = bookmark.href;
        if (!url) {
          errors.push(`Bookmark ${index + 1} has no URL`);
          return;
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          errors.push(`Invalid URL at bookmark ${index + 1}: ${url}`);
          return;
        }

        // Parse tags (space-separated string)
        const tags = bookmark.tags
          ? bookmark.tags
              .split(/\s+/)
              .map((t) => t.trim())
              .filter((t) => t.length > 0)
          : undefined;

        // Check if marked as "to read" - could be treated as favorite
        const isFavorite = bookmark.toread === "yes";

        // Parse date
        const addedDate = bookmark.time
          ? new Date(bookmark.time).toISOString()
          : undefined;

        const importedItem: ImportedUrlItem = {
          url,
          title: bookmark.description || undefined,
          description: bookmark.extended || undefined,
          tags,
          isFavorite,
          notes: addedDate
            ? `Imported from Pinboard on ${new Date(addedDate).toLocaleDateString()}`
            : undefined,
        };

        items.push(importedItem);
      } catch (error) {
        errors.push(
          `Error parsing bookmark ${index + 1}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    if (items.length === 0 && errors.length === 0) {
      errors.push("No bookmarks found in the Pinboard export file.");
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push("Invalid JSON format. Please check the file.");
    } else {
      errors.push(
        `Failed to parse Pinboard export: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return {
    items,
    source: "Pinboard Export",
    count: items.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

