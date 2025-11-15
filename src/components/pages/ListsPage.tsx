"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LinkIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

interface List {
  id: string;
  slug: string;
  title: string | null;
  urls: { id: string; url: string; title?: string }[];
  created_at: string;
}

export default function ListsPageClient() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const hasFetchedRef = React.useRef(false);
  // Hardcoded skeleton count - always show 3 skeletons while loading
  const skeletonCount = 3;

  useEffect(() => {
    // Prevent double fetching (React Strict Mode in dev)
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    async function fetchData() {
      try {
        // Fetch lists
        const listsRes = await fetch("/api/lists");
        const listsData = await listsRes.json();
        const fetchedLists = listsData.lists || [];
        setLists(fetchedLists);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this list?")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/lists/${id}`, { method: "DELETE" });

      if (!response.ok) throw new Error("Failed to delete list");
      const updatedLists = lists.filter((list) => list.id !== id);
      setLists(updatedLists);
    } catch (error) {
      console.error("Error deleting list:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="container mx-auto">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 md:gap-0">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              My Lists
            </h1>
            <p className="mt-2 text-white/70">
              Manage and organize your URL collections
            </p>
          </div>
          {!isLoading && (
            <Button
              href="/new"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full md:w-auto"
            >
              Create New List
            </Button>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {isLoading ? (
            // Skeleton loaders matching the exact card structure
            <>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 sm:p-6 shadow-md animate-pulse"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Title section skeleton */}
                    <div className="flex-1 w-full">
                      {/* Title skeleton */}
                      <div className="h-7 bg-white/10 rounded-lg w-2/3 mb-3"></div>
                      {/* Metadata skeleton */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="h-5 bg-white/10 rounded w-20"></div>
                        <div className="h-5 bg-white/10 rounded w-24"></div>
                      </div>
                    </div>
                    {/* Buttons section skeleton */}
                    <div className="flex flex-row gap-2 w-full sm:w-auto">
                      <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                      <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                      <div className="h-10 bg-white/10 rounded-lg w-24 sm:w-32"></div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : lists.length > 0 ? (
            lists.map((list) => (
              <div
                key={list.id}
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-200 hover:border-blue-400/30"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {list.title || `List: ${list.slug}`}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/60">
                      <span className="flex items-center">
                        <LinkIcon className="h-4 w-4 mr-1" />
                        {list.urls.length} URLs
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        Created {new Date(list.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => router.push(`/list/${list.slug}/edit`)}
                      variant="ghost"
                      className="text-white/80 hover:text-blue-400 hover:bg-white/10 transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(list.id)}
                      variant="ghost"
                      className="text-white/80 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                      disabled={deletingId === list.id}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      onClick={() => router.push(`/list/${list.slug}`)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
                    >
                      View List
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border-2 border-dashed border-white/30 p-8 sm:p-12 text-center bg-white/5 backdrop-blur-sm">
              <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full flex items-center justify-center">
                <LinkIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400" />
              </div>
              <h3 className="mt-4 text-base sm:text-lg font-medium text-white">
                No Lists Yet
              </h3>
              <p className="mt-2 text-white/60">
                Start organizing your URLs by creating your first list
              </p>
              <div className="mt-8">
                <Button
                  href="/new"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                >
                  Create New List
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
