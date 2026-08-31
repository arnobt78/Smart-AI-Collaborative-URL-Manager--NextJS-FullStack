/**
 * C7.0: Browse public-list card — title click opens detail; no late “View List” row.
 * Chrome aligned with ListDetailHeaderChrome (Blocks / AlignLeft / CARD_STACK).
 */
"use client";

import { Badge } from "@/components/ui/Badge";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import { AlignLeft, Blocks, Eye, Globe2, Users } from "lucide-react";
import { CARD_PAD, CARD_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

export type BrowsePublicListCardModel = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  urls?: unknown[];
  user: { email: string };
};

export function BrowsePublicListCard({
  list,
}: {
  list: BrowsePublicListCardModel;
}) {
  const urlCount = Array.isArray(list.urls) ? list.urls.length : 0;

  return (
    <WarmSoftNavLink
      href={`/list/${list.slug}`}
      className={cn(
        "group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-xl hover:bg-white/10 hover:border-blue-400/30 transition-all duration-200 cursor-pointer",
        CARD_STACK,
        CARD_PAD,
      )}
    >
      <div className="flex items-start justify-between gap-1 sm:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          <Blocks className="h-5 w-5 shrink-0 text-blue-300" aria-hidden />
          <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2">
            {list.title}
          </h3>
        </div>
        <Badge
          variant="success"
          className="inline-flex shrink-0 items-center gap-1 text-xs"
        >
          <Globe2 className="w-3 h-3 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Public</span>
        </Badge>
      </div>

      {list.description ? (
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <AlignLeft className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
          <p className="min-w-0 text-xs sm:text-sm text-white/60 line-clamp-2">
            {list.description}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-white/50">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" aria-hidden />
          <span className="truncate max-w-[100px] sm:max-w-none">
            {list.user.email.split("@")[0]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3" aria-hidden />
          <span>
            {urlCount} {urlCount === 1 ? "URL" : "URLs"}
          </span>
        </div>
      </div>
    </WarmSoftNavLink>
  );
}
