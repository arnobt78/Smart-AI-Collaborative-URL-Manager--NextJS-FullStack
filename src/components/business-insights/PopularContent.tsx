"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import {
  Star,
  Globe,
  Lock,
  Users,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
import { CARD_PAD, HEADING_STACK } from "@/lib/ui-spacing";
import {
  UI_CONTROL_ICON_GAP,
  UI_ICON_CONTROL,
  UI_IDENTITY_GAP,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";
import { SectionCountBadge } from "@/components/ui/SectionCountBadge";

interface PopularUrl {
  id: string;
  url: string;
  title?: string;
  listTitle: string;
  listSlug: string;
  isFavorite: boolean;
  clickCount?: number;
}

interface ActiveList {
  id: string;
  title: string;
  slug: string;
  urlCount: number;
  isPublic: boolean;
  collaborators: number;
}

interface PopularContentProps {
  popularUrls: PopularUrl[];
  activeLists: ActiveList[];
  isLoading?: boolean;
}

export function PopularContent({
  popularUrls,
  activeLists,
  isLoading,
}: PopularContentProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-white/10 rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-16 bg-white/10 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Popular URLs */}
      <Card className={CARD_PAD}>
        <CardHeader className="pb-2">
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Star} hue="amber" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm sm:text-base">Popular URLs</CardTitle>
                <SectionCountBadge count={popularUrls.length} />
              </div>
              <p className="text-xs text-white/60">Most favorited and clicked</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {popularUrls.length === 0 ? (
              <p className="text-white/60 text-xs sm:text-sm text-center py-6 sm:py-8">
                No URLs yet
              </p>
            ) : (
              popularUrls.map((url) => (
                <div
                  key={url.id}
                  className={cn(
                    "flex items-start p-2 sm:p-3 rounded-lg bg-white/5 border border-white/20 hover:border-blue-400/30 transition-all",
                    UI_CONTROL_ICON_GAP,
                  )}
                >
                  {url.isFavorite && (
                    <Star
                      className={cn(
                        UI_ICON_CONTROL,
                        "text-yellow-400 mt-0.5 sm:mt-1 fill-yellow-400",
                      )}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={url.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-400 transition-colors text-xs sm:text-sm font-medium truncate block"
                    >
                      {url.title || url.url}
                    </a>
                    <div
                      className={cn("flex items-center mt-1 flex-wrap gap-1")}
                    >
                      <WarmSoftNavLink
                        href={`/list/${url.listSlug}`}
                        className="text-white/60 hover:text-white/80 text-xs truncate"
                      >
                        From: {url.listTitle}
                      </WarmSoftNavLink>
                      {url.clickCount !== undefined && url.clickCount > 0 && (
                        <span
                          className={cn(
                            "flex items-center text-white/50 text-xs gap-1",
                          )}
                        >
                          <MousePointerClick className={UI_ICON_CONTROL} />
                          {url.clickCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink
                    className={cn(
                      UI_ICON_CONTROL,
                      "text-white/40 mt-0.5 sm:mt-1",
                    )}
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Lists */}
      <Card className={CARD_PAD}>
        <CardHeader className="pb-2">
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile icon={Users} hue="blue" />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm sm:text-base">
                  Most Active Lists
                </CardTitle>
                <SectionCountBadge count={activeLists.length} />
              </div>
              <p className="text-xs text-white/60">Highest URL and collaborator counts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeLists.length === 0 ? (
              <p className="text-white/60 text-xs sm:text-sm text-center py-6 sm:py-8">
                No lists yet
              </p>
            ) : (
              activeLists.map((list) => (
                <WarmSoftNavLink
                  key={list.id}
                  href={`/list/${list.slug}`}
                  className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-white/5 border border-white/20 hover:border-blue-400/30 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className={cn("flex items-center mb-1 gap-1 min-w-0")}>
                      <h4 className="text-white group-hover:text-blue-400 transition-colors text-xs sm:text-sm font-medium truncate">
                        {list.title}
                      </h4>
                      {list.isPublic ? (
                        <Globe className={cn(UI_ICON_CONTROL, "text-green-400")} />
                      ) : (
                        <Lock className={cn(UI_ICON_CONTROL, "text-yellow-400")} />
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex items-center flex-wrap text-xs text-white/60 gap-1",
                      )}
                    >
                      <span>{list.urlCount} URLs</span>
                      {list.collaborators > 0 && (
                        <>
                          <span aria-hidden>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className={UI_ICON_CONTROL} />
                            {list.collaborators}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {list.urlCount}
                  </Badge>
                </WarmSoftNavLink>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
