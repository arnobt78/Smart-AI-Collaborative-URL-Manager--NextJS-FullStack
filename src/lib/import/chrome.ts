/**
 * Chrome Bookmarks HTML Parser
 * Parses Chrome bookmarks HTML export file
 */

import type { ImportResult, ImportedUrlItem } from "./types";

/**
 * Parse Chrome bookmarks HTML file
 * Chrome exports bookmarks in HTML format with nested <DL> and <DT> structures
 */
export function parseChromeBookmarks(html: string): ImportResult {
  const errors: string[] = [];
  const items: ImportedUrlItem[] = [];

  try {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Check for parsing errors
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      const errorText = parserError.textContent || "Unknown parsing error";
      errors.push(`HTML parsing error: ${errorText}`);
      if (process.env.NODE_ENV === "development") {
        console.error("❌ [CHROME PARSER] HTML parsing failed:", errorText);
      }
      return {
        items: [],
        source: "Chrome Bookmarks",
        count: 0,
        errors,
      };
    }

    // Find all bookmark links
    const links = doc.querySelectorAll("a[href]");
    
    if (process.env.NODE_ENV === "development") {
      console.log(`📥 [CHROME PARSER] Found ${links.length} bookmark links`);
    }

    links.forEach((link, index) => {
      try {
        const href = link.getAttribute("href");
        if (!href) return;

        // Validate URL
        try {
          new URL(href);
        } catch {
          errors.push(`Invalid URL at bookmark ${index + 1}: ${href}`);
          return;
        }

        // Decode HTML entities in title
        let title = link.textContent?.trim() || "";
        // Create a temporary element to decode HTML entities
        const tempDiv = doc.createElement("div");
        tempDiv.innerHTML = title;
        title = tempDiv.textContent || tempDiv.innerText || title;

        const addDate = link.getAttribute("add_date");
        const addDateParsed = addDate
          ? new Date(parseInt(addDate) * 1000).toISOString()
          : undefined;

        // Look for folder path in parent elements for category/tags
        let folderPath: string[] = [];
        let parent: Element | null = link.parentElement;
        while (parent && parent !== doc.body) {
          const dt = parent.querySelector("h3");
          if (dt) {
            folderPath.unshift(dt.textContent?.trim() || "");
          }
          parent = parent.parentElement;
        }

        // Check if it's in a folder with a special name like "Favorites"
        const isFavorite = folderPath.some(
          (folder) =>
            folder.toLowerCase().includes("favorite") ||
            folder.toLowerCase().includes("star")
        );

        const item: ImportedUrlItem = {
          url: href,
          title: title || undefined,
          category: folderPath.length > 0 ? folderPath.join(" / ") : undefined,
          tags: folderPath.length > 0 ? folderPath : undefined,
          isFavorite,
          // Use add_date as a reminder/created date note
          notes: addDateParsed
            ? `Imported from Chrome on ${new Date(addDateParsed).toLocaleDateString()}`
            : undefined,
        };

        items.push(item);
      } catch (error) {
        errors.push(
          `Error parsing bookmark ${index + 1}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    if (items.length === 0 && errors.length === 0) {
      errors.push("No bookmarks found in the file. Is this a Chrome bookmarks export?");
    }
  } catch (error) {
    errors.push(
      `Failed to parse Chrome bookmarks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  return {
    items,
    source: "Chrome Bookmarks",
    count: items.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

