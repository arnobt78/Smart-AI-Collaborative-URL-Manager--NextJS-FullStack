/**
 * Shared types for import parsers
 */

export interface ImportedUrlItem {
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
  notes?: string;
  reminder?: string;
  category?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
}

export interface ImportResult {
  items: ImportedUrlItem[];
  source: string;
  count: number;
  errors?: string[];
}

export type ImportParser = (content: string) => ImportResult;

