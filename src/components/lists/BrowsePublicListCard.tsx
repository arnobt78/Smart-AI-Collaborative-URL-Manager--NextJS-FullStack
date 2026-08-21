/**
 * C7.0: Browse public-list card — title click opens detail; no late “View List” row.
 */
"use client";

import { Badge } from "@/components/ui/Badge";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import { Globe, Eye, Users } from "lucide-react";
import { CARD_PAD } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";

export type BrowsePublicListCardModel = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  urls?: unknown[];
  user: { email: string };
};

export function BrowsePublicListCard({ list }: { list: BrowsePublicListCardModel }) {
  const urlCount = Array.isArray(list.urls) ? list.urls.length : 0;

  return (
    <WarmSoftNavLink
      href={`/list/${list.slug}`}
      className={cn(
        "group bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-400/30 transition-all duration-200 cursor-pointer flex flex-col gap-2",
        CARD_PAD,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2 flex-1">
          {list.title}
        </h3>
        <Badge variant="success" className="flex-shrink-0 text-xs">
          <Globe className="w-3 h-3 mr-1" aria-hidden />
          <span className="hidden sm:inline">Public</span>
        </Badge>
      </div>

      {list.description ? (
        <p className="text-xs sm:text-sm text-white/60 line-clamp-2">
          {list.description}
        </p>
      ) : null}

      <div className="flex items-center gap-2 sm:gap-4 text-xs text-white/50 flex-wrap">
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
