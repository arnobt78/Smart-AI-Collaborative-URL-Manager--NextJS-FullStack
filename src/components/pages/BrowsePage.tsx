"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Search, Globe, Eye, Users } from "lucide-react";
import { usePublicListsQuery } from "@/hooks/useBrowseQueries";

interface UrlItem {
  id: string;
  url: string;
  title?: string;
  description?: string;
  createdAt: string;
  isFavorite: boolean;
  tags?: string[];
  notes?: string;
  clickCount?: number;
}

interface PublicList {
  id: string;
  slug: string;
  title: string;
  description?: string;
  urls: UrlItem[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
  };
}

export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  // CRITICAL: Use React Query with Infinity cache - only refetches when invalidated
  const { data, isLoading, isFetching } = usePublicListsQuery(page, search || undefined);
  const lists = data?.lists || [];
  const totalPages = data?.pagination?.totalPages || 1;

  // CRITICAL: Show skeleton during refetch (when isFetching is true and we have data)
  // This prevents showing stale cached data during invalidated refetch
  // Only show skeleton if we're fetching AND have data (means refetch, not initial load)
  const shouldShowSkeleton = isLoading || (isFetching && data);

  // Update URL query params when search or page changes (but only if different from current URL)
  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    const currentPage = parseInt(searchParams.get("page") || "1", 10);

    // Only update URL if state differs from URL params (prevents unnecessary RSC requests)
    if (search === currentSearch && page === currentPage) {
      return; // No change needed, skip router.replace to avoid extra RSC request
    }

    const params = new URLSearchParams();
    if (search) {
      params.set("search", search);
    }
    if (page > 1) {
      params.set("page", page.toString());
    }
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : "";
    router.replace(`/browse${newUrl}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, searchParams, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-2">
          🌐 Discover Public Lists
        </h1>
        <p className="text-white/60 text-xs sm:text-sm lg:text-base">
          Browse and explore curated URL collections from the community
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
            <Input
              type="text"
              placeholder="Search lists by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 sm:pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm sm:text-base py-2 sm:py-2.5"
            />
          </div>
          <Button
            type="submit"
            className="px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base py-2 sm:py-2.5 w-full sm:w-auto"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Lists Grid */}
      {shouldShowSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="group bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-5 sm:h-6 bg-white/10 rounded flex-1" />
                <div className="h-4 sm:h-5 w-12 sm:w-16 bg-white/10 rounded-full ml-2" />
              </div>
              <div className="h-3 sm:h-4 bg-white/10 rounded mb-2 w-2/3" />
              <div className="h-3 sm:h-4 bg-white/10 rounded w-1/2 mb-4" />
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="h-3 w-16 sm:w-20 bg-white/10 rounded" />
                <div className="h-3 w-12 sm:w-16 bg-white/10 rounded" />
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="h-3 w-20 sm:w-24 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white/5 border border-white/10 rounded-xl px-4">
          <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60 text-base sm:text-lg">
            {search
              ? "No lists found matching your search"
              : "No public lists available yet"}
          </p>
          <p className="text-white/40 text-xs sm:text-sm mt-2">
            Be the first to create a public list!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 sm:mb-6">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/list/${list.slug}`}
                className="group bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 hover:bg-white/10 hover:border-blue-400/30 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 flex-1">
                    {list.title}
                  </h3>
                  <Badge variant="success" className="flex-shrink-0 text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Public</span>
                  </Badge>
                </div>

                {list.description && (
                  <p className="text-xs sm:text-sm text-white/60 mb-3 sm:mb-4 line-clamp-2">
                    {list.description}
                  </p>
                )}

                <div className="flex items-center gap-3 sm:gap-4 text-xs text-white/50 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span className="truncate max-w-[100px] sm:max-w-none">
                      {list.user.email.split("@")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>
                      {Array.isArray(list.urls) ? list.urls.length : 0} URLs
                    </span>
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
                  <span className="text-xs sm:text-sm font-semibold text-blue-400 group-hover:text-blue-300">
                    View List →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                className="text-white border-white/20 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
              >
                Previous
              </Button>
              <span className="text-white/60 text-xs sm:text-sm px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
                className="text-white border-white/20 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
