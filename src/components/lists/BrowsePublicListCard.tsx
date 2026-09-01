/**
 * C7.0: Browse public-list card — title click opens detail; no late “View List” row.
 * Chrome aligned with ListDetailHeaderChrome / MyListsCard (Blocks / DescriptionRow / CARD_STACK).
 */
"use client";

import { Badge } from "@/components/ui/Badge";
import { DescriptionRow } from "@/components/ui/DescriptionRow";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import { Blocks, Eye, Globe2, Users } from "lucide-react";
import {
  GLASS_LIST_CARD,
  GLASS_LIST_CARD_INTERACTIVE,
} from "@/lib/ui/glass-card-styles";
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
        "group",
        GLASS_LIST_CARD,
        GLASS_LIST_CARD_INTERACTIVE,
        CARD_STACK,
        CARD_PAD,
      )}
    >
      <div className="flex w-full min-w-0 items-start justify-between gap-1 sm:gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-1 sm:gap-2">
          <Blocks className="mt-0.5 h-5 w-5 shrink-0 self-start text-blue-300" aria-hidden />
          <h3 className="min-w-0 flex-1 break-words text-base font-medium text-white line-clamp-2 transition-colors group-hover:text-blue-400 sm:text-lg">
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
        <DescriptionRow text={list.description} lineClamp />
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
