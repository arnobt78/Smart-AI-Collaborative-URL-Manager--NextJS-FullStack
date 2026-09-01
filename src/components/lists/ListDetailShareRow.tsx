"use client";

import { Check, Copy, Globe } from "lucide-react";
import { ListMetaDates } from "@/lib/ui/list-meta-dates";
import { cn, listShareUrl, resolveListShareUrl } from "@/lib/utils";

export type ListDetailShareRowProps = {
  slug: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  isCopied?: boolean;
  onCopy?: () => void;
  copyDisabled?: boolean;
  className?: string;
};

/** Share link + Created/Updated meta — list detail header footer row. */
export function ListDetailShareRow({
  slug,
  createdAt,
  updatedAt,
  isCopied = false,
  onCopy,
  copyDisabled = false,
  className,
}: ListDetailShareRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 min-w-0 text-xs sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 w-full sm:flex-1">
        <span className="inline-flex items-center gap-1.5 font-light text-white/70">
          <Globe className="h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden />
          Shareable Link:
        </span>{" "}
        <span className="break-words text-white/90">
          {listShareUrl(slug)}
          <button
            type="button"
            onClick={onCopy}
            disabled={copyDisabled || !onCopy}
            className={cn(
              "inline-flex shrink-0 items-center align-middle ml-1 p-0.5 rounded transition-colors duration-200 group",
              copyDisabled || !onCopy
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white/10",
            )}
            aria-label="Copy link"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-400 group-hover:scale-110 transition-transform duration-200" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-white/70 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
            )}
          </button>
        </span>
      </div>
      <ListMetaDates createdAt={createdAt} updatedAt={updatedAt} />
    </div>
  );
}

export { resolveListShareUrl };
