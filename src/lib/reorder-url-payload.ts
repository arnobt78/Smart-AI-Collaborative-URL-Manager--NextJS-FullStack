/**
 * Strip client-only / unknown URL fields (e.g. commentCount) before PATCH reorder.
 * Must match urlItemSchema keys in api-validation.ts.
 * Reorder API only applies id → position; other fields must still pass Zod.
 */

import { z } from "zod";

const REORDER_URL_KEYS = [
  "id",
  "url",
  "title",
  "description",
  "createdAt",
  "updatedAt",
  "isFavorite",
  "isPinned",
  "tags",
  "category",
  "notes",
  "reminder",
  "clickCount",
  "position",
  "healthStatus",
  "healthCheckedAt",
  "healthLastStatus",
  "healthResponseTime",
] as const;

const isoDatetime = z.string().datetime();
const DATETIME_KEYS = new Set(["createdAt", "updatedAt", "healthCheckedAt"]);

export type ReorderUrlItem = {
  id: string;
  url: string;
  title?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  tags?: string[];
  category?: string;
  notes?: string;
  reminder?: string;
  clickCount?: number;
  position?: number;
  healthStatus?: "healthy" | "warning" | "broken" | "unknown";
  healthCheckedAt?: string;
  healthLastStatus?: number;
  healthResponseTime?: number;
};

function isSchemaSafeValue(key: string, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (DATETIME_KEYS.has(key)) {
    return typeof value === "string" && isoDatetime.safeParse(value).success;
  }
  // Network failures persist httpStatus 0; urlItemSchema requires 100–599.
  if (key === "healthLastStatus") {
    return (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 100 &&
      value <= 599
    );
  }
  return true;
}

/** Map URL rows to schema-safe reorder payload objects (no commentCount / extras). */
export function toReorderUrlItems(
  urls: ReadonlyArray<Record<string, unknown>>,
): ReorderUrlItem[] {
  return urls.map((raw) => {
    const item: Record<string, unknown> = {};
    for (const key of REORDER_URL_KEYS) {
      const value = raw[key];
      if (isSchemaSafeValue(key, value)) {
        item[key] = value;
      }
    }
    return item as ReorderUrlItem;
  });
}
