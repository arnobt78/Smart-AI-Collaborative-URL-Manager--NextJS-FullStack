"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  Star,
  Globe,
  Lock,
  Users,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";

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
              <div className="space-y-3">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Popular URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {popularUrls.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-8">
                No URLs yet
              </p>
            ) : (
              popularUrls.map((url) => (
                <div
                  key={url.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-blue-400/30 transition-all"
                >
                  {url.isFavorite && (
                    <Star className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-1 fill-yellow-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={url.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-400 transition-colors text-sm font-medium truncate block"
                    >
                      {url.title || url.url}
                    </a>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Link
                        href={`/list/${url.listSlug}`}
                        className="text-white/60 hover:text-white/80 text-xs truncate"
                      >
                        From: {url.listTitle}
                      </Link>
                      {url.clickCount !== undefined && url.clickCount > 0 && (
                        <span className="flex items-center gap-1 text-white/50 text-xs">
                          <MousePointerClick className="h-3 w-3" />
                          {url.clickCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/40 flex-shrink-0 mt-1" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Lists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Most Active Lists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeLists.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-8">
                No lists yet
              </p>
            ) : (
              activeLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/list/${list.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-blue-400/30 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white group-hover:text-blue-400 transition-colors text-sm font-medium truncate">
                        {list.title}
                      </h4>
                      {list.isPublic ? (
                        <Globe className="h-3 w-3 text-green-400 flex-shrink-0" />
                      ) : (
                        <Lock className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/60">
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
                  <Badge variant="secondary" className="ml-2">
                    {list.urlCount}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
