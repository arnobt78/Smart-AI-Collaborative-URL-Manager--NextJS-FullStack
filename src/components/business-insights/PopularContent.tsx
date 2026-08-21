"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import {
  Star,
  Globe,
  Lock,
  Users,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
import { CARD_PAD } from "@/lib/ui-spacing";

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
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Star className="h-4 w-4  text-yellow-400" />
            <span>Popular URLs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-2">
            {popularUrls.length === 0 ? (
              <p className="text-white/60 text-xs sm:text-sm text-center py-6 sm:py-8">
                No URLs yet
              </p>
            ) : (
              popularUrls.map((url) => (
                <div
                  key={url.id}
                  className="flex items-start gap-2 sm:gap-2 p-2 sm:p-3 rounded-lg bg-white/5 border border-white/10 hover:border-blue-400/30 transition-all"
                >
                  {url.isFavorite && (
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-1 fill-yellow-400" />
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
                    <div className="flex items-center  mt-1 flex-wrap">
                      <WarmSoftNavLink
                        href={`/list/${url.listSlug}`}
                        className="text-white/60 hover:text-white/80 text-xs truncate"
                      >
                        From: {url.listTitle}
                      </WarmSoftNavLink>
                      {url.clickCount !== undefined && url.clickCount > 0 && (
                        <span className="flex items-center gap-1 text-white/50 text-xs">
                          <MousePointerClick className="h-3 w-3" />
                          {url.clickCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/40 flex-shrink-0 mt-0.5 sm:mt-1" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Lists */}
      <Card className={CARD_PAD}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Users className="h-4 w-4  text-blue-400" />
            <span>Most Active Lists</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-2">
            {activeLists.length === 0 ? (
              <p className="text-white/60 text-xs sm:text-sm text-center py-6 sm:py-8">
                No lists yet
              </p>
            ) : (
              activeLists.map((list) => (
                <WarmSoftNavLink
                  key={list.id}
                  href={`/list/${list.slug}`}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-white/5 border border-white/10 hover:border-blue-400/30 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center  mb-1">
                      <h4 className="text-white group-hover:text-blue-400 transition-colors text-xs sm:text-sm font-medium truncate">
                        {list.title}
                      </h4>
                      {list.isPublic ? (
                        <Globe className="h-3 w-3 text-green-400 flex-shrink-0" />
                      ) : (
                        <Lock className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2 text-xs text-white/60">
                      <span>{list.urlCount} URLs</span>
                      {list.collaborators > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {list.collaborators}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2 text-xs">
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
