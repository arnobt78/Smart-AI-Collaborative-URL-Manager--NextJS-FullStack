/**
 * Markdown Export Formatter
 * Exports URLs in Markdown format
 */

import type { UrlItem } from "@/stores/urlListStore";

export interface MarkdownExportOptions {
  listTitle?: string;
  includeMetadata?: boolean;
  includeTags?: boolean;
  includeNotes?: boolean;
}

/**
 * Format URLs as Markdown
 */
export function formatAsMarkdown(
  urls: UrlItem[],
  options: MarkdownExportOptions = {}
): string {
  const {
    listTitle = "URL List",
    includeMetadata = true,
    includeTags = true,
    includeNotes = true,
  } = options;

  let markdown = `# ${listTitle}\n\n`;
  markdown += `_Exported on ${new Date().toLocaleDateString()} - ${urls.length} URL${
    urls.length === 1 ? "" : "s"
  }_\n\n`;
  markdown += "---\n\n";

  urls.forEach((url, index) => {
    // URL title with link
    const title = url.title || url.url;
    markdown += `## ${index + 1}. [${title}](${url.url})\n\n`;

    // Metadata
    if (includeMetadata && url.description) {
      markdown += `${url.description}\n\n`;
    }

    // Category
    if (url.category) {
      markdown += `**Category:** ${url.category}\n\n`;
    }

    // Tags
    if (includeTags && url.tags && url.tags.length > 0) {
      markdown += `**Tags:** ${url.tags.map((tag) => `\`${tag}\``).join(", ")}\n\n`;
    }

    // Notes
    if (includeNotes && url.notes) {
      markdown += `**Notes:** ${url.notes}\n\n`;
    }

    // Reminder
    if (url.reminder) {
      const reminderDate = new Date(url.reminder);
      markdown += `**Reminder:** ${reminderDate.toLocaleDateString()}\n\n`;
    }

    // Favorite/Pinned status
    const badges: string[] = [];
    if (url.isFavorite) badges.push("⭐ Favorite");
    if (url.isPinned) badges.push("📌 Pinned");
    if (badges.length > 0) {
      markdown += `**Status:** ${badges.join(", ")}\n\n`;
    }

    // Separator between items
    if (index < urls.length - 1) {
      markdown += "---\n\n";
    }
  });

  // Footer
  markdown += "\n---\n\n";
  markdown += `_Exported from The Daily Urlist_\n`;

  return markdown;
}

/**
 * Download Markdown file
 */
export function downloadMarkdownFile(
  content: string,
  filename: string
): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().split("T")[0]}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

