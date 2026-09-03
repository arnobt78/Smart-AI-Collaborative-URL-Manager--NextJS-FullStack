/**
 * C7.0: Browse public-list card — title link only; sticky footer + share copy.
 */
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { DescriptionRow } from "@/components/ui/DescriptionRow";
import { ListTitleRow } from "@/components/lists/ListTitleRow";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import { Blocks, Check, Copy, Eye, Globe, Globe2, Users } from "lucide-react";
import {
  GLASS_LIST_CARD,
  GLASS_LIST_CARD_INTERACTIVE,
} from "@/lib/ui/glass-card-styles";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { CARD_PAD, CARD_STACK } from "@/lib/ui-spacing";
import { cn, listShareUrl, resolveListShareUrl } from "@/lib/utils";

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
  const description = list.description?.trim() || "No description yet";
  const [copied, setCopied] = useState(false);
  const shareHref = resolveListShareUrl(list.slug);

  const handleCopy = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be denied */
    }
  };

  return (
    <div
      className={cn(
        "group h-full cursor-default",
        GLASS_LIST_CARD,
        GLASS_LIST_CARD_INTERACTIVE,
        CARD_STACK,
        CARD_PAD,
      )}
    >
      <ListTitleRow
        icon={Blocks}
        hue="blue"
        title={
          <WarmSoftNavLink
            href={`/list/${list.slug}`}
            className="min-w-0 cursor-pointer break-words text-base font-medium leading-[1.15] text-white line-clamp-2 transition-colors hover:text-blue-400 sm:text-lg"
          >
            {list.title}
          </WarmSoftNavLink>
        }
        trailing={
          <Badge
            variant="success"
            className="inline-flex shrink-0 items-center gap-1 text-xs"
          >
            <Globe2 className={UI_ICON_CONTROL} aria-hidden />
            <span className="hidden sm:inline">Public</span>
          </Badge>
        }
      />

      <DescriptionRow text={description} lineClamp />

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-white/50">
          <span className="inline-flex shrink-0 items-center gap-1">
            <Globe className={cn(UI_ICON_CONTROL, "text-blue-400")} aria-hidden />
            <span className="truncate max-w-[10rem] sm:max-w-[14rem] text-white/70">
              {listShareUrl(list.slug)}
            </span>
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 items-center rounded p-0.5 transition-colors hover:bg-white/10"
            aria-label="Copy shareable link"
          >
            {copied ? (
              <Check className={cn(UI_ICON_CONTROL, "text-green-400")} aria-hidden />
            ) : (
              <Copy
                className={cn(UI_ICON_CONTROL, "text-white/70")}
                aria-hidden
              />
            )}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <Users className={UI_ICON_CONTROL} aria-hidden />
            <span className="truncate max-w-[100px] sm:max-w-none">
              {list.user.email.split("@")[0]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className={UI_ICON_CONTROL} aria-hidden />
            <span>
              {urlCount} {urlCount === 1 ? "URL" : "URLs"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
