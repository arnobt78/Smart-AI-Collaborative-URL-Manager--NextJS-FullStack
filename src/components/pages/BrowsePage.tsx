"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePublicListsQuery } from "@/hooks/useBrowseQueries";
import { cn } from "@/lib/utils";
import { CARD_PAD, PAGE_STACK } from "@/lib/ui-spacing";
import { UI_ICON_DECORATIVE } from "@/lib/ui/control-styles";
import { DataSurfaceSlot } from "@/components/ui/DataSurfaceSlot";
import { BrowsePublicListCard } from "@/components/lists/BrowsePublicListCard";
import { BrowseSearchField } from "@/components/lists/BrowseSearchField";

/**
 * C7.0: Instant client filter on cached public lists; search row always present;
 * no Search button; title click opens detail (shared BrowsePublicListCard).
 */
export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10),
  );

  // Fetch page without per-keystroke server search — filter client-side for instant UI
  const { data, isLoading } = usePublicListsQuery(page, undefined);
  const totalPages = data?.pagination?.totalPages || 1;

  const isColdLoading = isLoading && !data;

  const filteredLists = useMemo(() => {
    const lists = data?.lists || [];
    const q = filter.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((list) => {
      const title = (list.title || "").toLowerCase();
      const description = (list.description || "").toLowerCase();
      return title.includes(q) || description.includes(q);
    });
  }, [data?.lists, filter]);

  // Soft-sync ?search= after typing settles — avoid RSC on every keystroke
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const currentSearch = searchParams.get("search") || "";
      const currentPage = parseInt(searchParams.get("page") || "1", 10);
      const nextSearch = filter.trim();
      if (nextSearch === currentSearch && page === currentPage) return;

      const params = new URLSearchParams();
      if (nextSearch) params.set("search", nextSearch);
      if (page > 1) params.set("page", page.toString());
      const queryString = params.toString();
      router.replace(`/browse${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    }, 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  return (
    <div className={cn("w-full", PAGE_STACK)}>
      <PageHeader
        icon={Globe}
        title="Discover Public Lists"
        description="Browse and explore curated URL collections from the community"
      />

      <BrowseSearchField value={filter} onChange={setFilter} />

      {isColdLoading ? (
        <DataSurfaceSlot
          label="Preparing public lists"
          description="Finding shared collections…"
          className={CARD_PAD}
        />
      ) : filteredLists.length === 0 ? (
        <div
          className={cn(
            "text-center py-8 sm:py-12 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center gap-2",
            CARD_PAD,
          )}
        >
          <Globe className={cn(UI_ICON_DECORATIVE, "text-white/40")} />
          <p className="text-white/60 text-base sm:text-lg">
            {filter.trim()
              ? "No lists found matching your search"
              : "No public lists available yet"}
          </p>
          <p className="text-white/40 text-xs sm:text-sm">
            Be the first to create a public list!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists.map((list) => (
              <BrowsePublicListCard key={list.id} list={list} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                className="text-white border-white/20 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
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
                className="text-white border-white/20 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
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
