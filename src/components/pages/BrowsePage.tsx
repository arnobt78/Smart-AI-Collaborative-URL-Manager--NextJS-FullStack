"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Search, Globe, Eye, Users } from "lucide-react";

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
  const [lists, setLists] = useState<PublicList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPublicLists();
    // Update URL query params when search or page changes
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
  }, [page, search]);

  const fetchPublicLists = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/lists/public?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch public lists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPublicLists();
  };

  return (
    <div className="min-h-screen w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2">
          🌐 Discover Public Lists
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Browse and explore curated URL collections from the community
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="text"
              placeholder="Search lists by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <Button
            type="submit"
            className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Lists Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="group bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-6 bg-white/10 rounded flex-1" />
                <div className="h-5 w-16 bg-white/10 rounded-full ml-2" />
              </div>
              <div className="h-4 bg-white/10 rounded mb-2 w-2/3" />
              <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
              <div className="flex items-center gap-4 mb-4">
                <div className="h-3 w-20 bg-white/10 rounded" />
                <div className="h-3 w-16 bg-white/10 rounded" />
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
          <Globe className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60 text-lg">
            {search
              ? "No lists found matching your search"
              : "No public lists available yet"}
          </p>
          <p className="text-white/40 text-sm mt-2">
            Be the first to create a public list!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/list/${list.slug}`}
                className="group bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-blue-400/30 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    {list.title}
                  </h3>
                  <Badge variant="success" className="flex-shrink-0 ml-2">
                    <Globe className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                </div>

                {list.description && (
                  <p className="text-sm text-white/60 mb-4 line-clamp-2">
                    {list.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{list.user.email.split("@")[0]}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>
                      {Array.isArray(list.urls) ? list.urls.length : 0} URLs
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">
                    View List →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                className="text-white border-white/20"
              >
                Previous
              </Button>
              <span className="text-white/60 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
                className="text-white border-white/20"
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
