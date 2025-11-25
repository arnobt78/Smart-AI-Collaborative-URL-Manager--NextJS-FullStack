"use client";

import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams } from "next/navigation";
import { useStore } from "@nanostores/react";
import { currentList, getList } from "@/stores/urlListStore";
import { UrlList } from "@/components/lists/UrlList";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import {
  Copy,
  Check,
  Globe,
  Lock,
  UserPlus,
  Mail,
  Activity,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { InputDialog } from "@/components/ui/InputDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";
import { PermissionManager } from "@/components/collaboration/PermissionManager";
import { useListPermissions } from "@/hooks/useListPermissions";

export default function ListPageClient() {
  const { toast } = useToast();
  const { slug } = useParams();
  const list = useStore(currentList);
  const permissions = useListPermissions(); // Get permissions for current list and user
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  // inviteDialogOpen removed - PermissionManager handles dialogs internally
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);
  const hasSyncedVectors = useRef<string | null>(null); // Track which list ID we've synced
  const hasFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchList() {
      if (typeof slug === "string") {
        // Reset fetch ref if slug changed (user navigated to different list)
        if (hasFetchedRef.current && hasFetchedRef.current !== slug) {
          hasFetchedRef.current = null;
          setIsLoading(true); // Show skeleton for new list
        }

        // Only fetch if slug changed (prevent duplicate fetches)
        if (hasFetchedRef.current === slug) {
          // If already fetched, check if we have valid list data
          if (list && list.slug === slug) {
            setIsLoading(false);
          }
          return;
        }

        // CRITICAL: Before calling getList, check localStorage for preserved drag order
        // This must happen FIRST to restore order before getList can overwrite it
        // This is especially important after Fast Refresh in dev mode
        // NOTE: In production, Fast Refresh doesn't exist, so this issue won't occur
        if (typeof window !== "undefined") {
          try {
            // First, we need to get the list to know the ID, but we can check after a small delay
            // to see if localStorage has a preserved order for any list
            const currentStoreData = currentList.get();
            if (currentStoreData && currentStoreData.id) {
              const storageKey = `drag-order:${currentStoreData.id}`;
              const stored = localStorage.getItem(storageKey);
              const globalCache = (window as any).__dragOrderCache;
              const cachedOrder = globalCache?.[storageKey];

              if ((stored || cachedOrder) && currentStoreData.slug === slug) {
                // We have a preserved order for this list - restore it immediately
                try {
                  const preservedOrder = cachedOrder || JSON.parse(stored!);
                  if (
                    preservedOrder &&
                    Array.isArray(preservedOrder) &&
                    preservedOrder.length > 0
                  ) {
                    // Restore to store (use queueMicrotask to avoid flushSync warning)
                    queueMicrotask(() => {
                      currentList.set({
                        ...currentStoreData,
                        urls: preservedOrder,
                      });
                    });
                    console.log(
                      "✅ [PAGE] Restored drag order from localStorage before getList",
                      {
                        hasLocalStorage: !!stored,
                        hasGlobalCache: !!cachedOrder,
                        order: preservedOrder.map((u: any) => u.id),
                        slug,
                        note: "Order restored to prevent getList overwrite",
                      }
                    );
                  }
                } catch (parseErr) {
                  console.error(
                    "❌ [PAGE] Failed to parse preserved order",
                    parseErr
                  );
                }
              }
            }
          } catch (err) {
            console.error("❌ [PAGE] Error checking localStorage", err);
          }
        }

        // Mark as fetched before the async call
        hasFetchedRef.current = slug;
        try {
          await getList(slug, true); // Pass true to skip if drag in progress

          // Only set loading to false if we have valid list data with matching slug
          // This prevents showing "List: undefined" flash
          const currentListData = currentList.get();
          if (currentListData && currentListData.slug === slug) {
            setIsLoading(false);
          }
        } catch (error) {
          // Handle 401 Unauthorized - redirect to login immediately
          if (
            error instanceof Error &&
            (error as any).status === 401 &&
            typeof window !== "undefined"
          ) {
            // Redirect URL is already stored in sessionStorage by getList
            // Redirect already happened in getList, but ensure it happens here too as backup
            console.log("🔒 [AUTH] 401 Unauthorized - redirecting to login...");
            window.location.replace("/");
            return; // Exit early - don't set loading state or process further
          }
          // For other errors, set loading to false and let error state handle it
          console.error("❌ [PAGE] Error fetching list:", error);
          setIsLoading(false);
          // Don't re-throw - just show error state
        }
      } else {
        setIsLoading(false);
      }
    }
    fetchList();
  }, [slug]); // Only depend on slug, not list (to avoid infinite loops)

  // Watch for list updates from store and update loading state when valid data arrives
  useEffect(() => {
    if (typeof slug === "string" && list && list.slug === slug) {
      // We have valid list data matching the current slug - hide loading
      setIsLoading(false);
    } else if (slug && list && list.slug && list.slug !== slug) {
      // List data doesn't match current slug - keep loading or reset
      setIsLoading(true);
    }
  }, [list, slug]);

  // Auto-sync vectors for existing URLs when list loads (background, non-blocking)
  useEffect(() => {
    async function syncVectors() {
      if (!list?.id || !list.urls || list.urls.length === 0) {
        return;
      }

      // Only sync once per list (avoid duplicate syncs)
      if (hasSyncedVectors.current === list.id) {
        return;
      }

      // Mark as synced
      hasSyncedVectors.current = list.id;

      // Sync vectors in background (don't block UI)
      fetch(`/api/lists/${list.id}/sync-vectors`, {
        method: "POST",
      }).catch((error) => {
        // Silently fail - vector sync is optional enhancement
        console.warn("Vector sync failed (non-critical):", error);
      });
    }

    // Only sync once when list is loaded (after initial load)
    // Add a small delay to prevent immediate sync on every render
    const timeoutId = setTimeout(() => {
      if (list && !isLoading && list.id) {
        syncVectors();
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?.id]); // Only run when list ID changes

  // Show skeleton if loading OR if list doesn't have valid slug yet
  // This prevents "List: undefined" flash on initial load
  const shouldShowLoading =
    isLoading ||
    !list ||
    !list.slug ||
    (slug && typeof slug === "string" && list.slug !== slug);

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen w-full">
        {/* Header Card Skeleton */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
          {/* First Row: Title/Info on Left, Buttons on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Left Side: Title, URL Count, Visibility Badge, Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
              {/* Title Skeleton */}
              <Skeleton className="h-6 sm:h-7 md:h-8 w-48 sm:w-64" />

              {/* URL Count Badge Skeleton */}
              <Skeleton className="h-5 w-16 rounded-full" />

              {/* Visibility Badge Skeleton */}
              <Skeleton className="h-5 w-20 sm:w-32 rounded-full" />

              {/* Private/Public Toggle Skeleton */}
              <div className="flex flex-col items-center">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-3 w-12 mt-1" />
              </div>
            </div>

            {/* Right Side: Setup Schedule and Health Check Buttons Skeleton */}
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-7 w-28 rounded-lg" />
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          </div>

          {/* Second Row: Shareable Link Skeleton */}
          <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-32 sm:w-48 flex-1" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>

          {/* Collaborators Section Skeleton */}
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-11 w-44 rounded-xl" />
            </div>

            {/* Collaborator Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed Section Skeleton */}
          <div className="mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* URL List Skeleton */}
        <div className="space-y-6 mb-8">
          {/* Search and Sort Skeleton */}
          <div className="flex flex-col gap-2 mb-4 w-full sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-12 w-full sm:max-w-2xl" />
            <div className="flex flex-row flex-wrap gap-2 sm:flex-nowrap">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-28" />
            </div>
          </div>

          {/* Add URL Form Skeleton */}
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-white/20">
            <Skeleton className="h-12 w-full mb-3" />
            <Skeleton className="h-24 w-full mb-4" />
            <div className="flex justify-end gap-3">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* URL Cards Skeleton */}
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-6 w-28 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold">List not found</h1>
          <p className="mt-2 text-gray-600">
            The list you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button href="/" className="mt-8">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Header Card */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
        {/* First Row: Title/Info on Left, Buttons on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Left Side: Title, URL Count, Visibility Badge, Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
            {/* Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              {list.title || `List: ${list.slug}`}
            </h1>

            {/* URL Count Badge */}
            <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
              {list.urls?.length || 0}{" "}
              {list.urls?.length === 1 ? "URL" : "URLs"}
            </Badge>

            {/* Visibility Badge */}
            <Badge
              variant={list.isPublic ? "success" : "secondary"}
              className="text-xs sm:text-sm flex items-center gap-1 w-fit"
            >
              {list.isPublic ? (
                <>
                  <Globe className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    Public - Anyone can view
                  </span>
                  <span className="sm:hidden">Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    Private - Only you & collaborators
                  </span>
                  <span className="sm:hidden">Private</span>
                </>
              )}
            </Badge>

            {/* Private/Public Toggle - Disabled for viewers */}
            <div className="flex flex-col items-center">
              <Switch
                checked={list.isPublic ?? false}
                disabled={isToggling || !permissions.canInvite}
                onChange={async (e) => {
                  const newValue = e.target.checked;
                  setIsToggling(true);
                  try {
                    const response = await fetch(
                      `/api/lists/${list.id}/visibility`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPublic: newValue }),
                      }
                    );

                    if (response.ok) {
                      const { list: updatedList } = await response.json();
                      if (updatedList) {
                        flushSync(() => {
                          currentList.set(updatedList);
                        });

                        // Trigger activity feed update AFTER API call completes (activity is now in DB)
                        window.dispatchEvent(
                          new CustomEvent("activity-updated", {
                            detail: { listId: list.id },
                          })
                        );

                        toast({
                          title: newValue
                            ? "Made Public 🌐"
                            : "Made Private 🔒",
                          description: `List is now ${
                            newValue ? "public" : "private"
                          }`,
                          variant: "success",
                        });
                      } else {
                        // Refetch the list if not returned
                        if (typeof slug === "string") {
                          await getList(slug);
                        }
                        toast({
                          title: newValue
                            ? "Made Public 🌐"
                            : "Made Private 🔒",
                          description: `List is now ${
                            newValue ? "public" : "private"
                          }`,
                          variant: "success",
                        });
                      }
                    } else {
                      const data = await response.json();
                      toast({
                        title: "Failed",
                        description:
                          data.error || "Failed to update visibility",
                        variant: "error",
                      });
                    }
                  } catch {
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred",
                      variant: "error",
                    });
                  } finally {
                    setIsToggling(false);
                  }
                }}
              />
              <span className="text-[10px] text-white/50 mt-1">
                {list.isPublic ? "Public" : "Private"}
              </span>
            </div>
          </div>

          {/* Right Side: Setup Schedule and Health Check Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Setup Schedule Button */}
            <button
              type="button"
              onClick={async () => {
                setIsSettingUpSchedule(true);
                try {
                  const response = await fetch("/api/jobs/setup-schedule", {
                    method: "POST",
                  });

                  const data = await response.json();

                  if (response.ok) {
                    toast({
                      title: "Scheduled Jobs Setup Complete! ✅",
                      description:
                        "Daily health checks and weekly metadata refresh are now scheduled.",
                      variant: "success",
                    });
                  } else {
                    // Handle local development case
                    if (data.localDevelopment) {
                      toast({
                        title: "Local Development Detected",
                        description:
                          "Scheduled jobs require a public URL. Deploy to production or set up manually in QStash dashboard. Check console for details.",
                        variant: "info",
                      });
                      console.log(
                        "📋 Manual Setup Instructions:",
                        data.instructions
                      );
                    } else {
                      toast({
                        title: "Setup Failed",
                        description:
                          data.error ||
                          data.message ||
                          "Failed to setup scheduled jobs",
                        variant: "error",
                      });
                    }
                  }
                } catch {
                  toast({
                    title: "Error",
                    description: "An unexpected error occurred",
                    variant: "error",
                  });
                } finally {
                  setIsSettingUpSchedule(false);
                }
              }}
              disabled={isSettingUpSchedule}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-white/90 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Setup scheduled jobs (daily health checks, weekly metadata refresh)"
            >
              <Activity
                className={`w-4 h-4 ${
                  isSettingUpSchedule ? "animate-spin" : ""
                }`}
              />
              <span>
                {isSettingUpSchedule ? "Setting up..." : "Setup Schedule"}
              </span>
            </button>
            {/* Refresh Metadata Button */}
            {list.urls && list.urls.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (!list.id) return;
                  setIsRefreshingMetadata(true);
                  try {
                    const response = await fetch("/api/jobs/refresh-metadata", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ listId: list.id }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                      // Clear React Query cache for all URLs to force re-fetch
                      if (list.urls && list.urls.length > 0) {
                        // Dispatch event to clear metadata cache
                        window.dispatchEvent(
                          new CustomEvent("metadata-refresh-complete", {
                            detail: { listId: list.id },
                          })
                        );
                      }

                      // Refetch list to get updated URLs
                      if (typeof slug === "string") {
                        await getList(slug);
                      }

                      toast({
                        title: "Metadata Refresh Complete! ✅",
                        description: `Refreshed metadata for ${
                          data.refreshed || list.urls?.length || 0
                        } URLs using improved extractor.`,
                        variant: "success",
                      });
                    } else {
                      toast({
                        title: "Refresh Failed",
                        description: data.error || "Failed to refresh metadata",
                        variant: "error",
                      });
                    }
                  } catch {
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred",
                      variant: "error",
                    });
                  } finally {
                    setIsRefreshingMetadata(false);
                  }
                }}
                disabled={isRefreshingMetadata}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-white/90 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Refresh metadata for all URLs with improved extractor"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isRefreshingMetadata ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isRefreshingMetadata ? "Refreshing..." : "Refresh Metadata"}
                </span>
              </button>
            )}
            {/* Health Check Button */}
            {list.urls && list.urls.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (!list.id) return;
                  setIsCheckingHealth(true);
                  try {
                    const response = await fetch("/api/jobs/check-urls", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ listId: list.id }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                      // Update list immediately if returned
                      if (data.list) {
                        flushSync(() => {
                          currentList.set(data.list);
                        });

                        // Trigger activity feed update
                        window.dispatchEvent(
                          new CustomEvent("activity-updated", {
                            detail: { listId: list.id },
                          })
                        );
                      } else if (typeof slug === "string") {
                        // Fallback: fetch if list not in response
                        await getList(slug);
                      }

                      toast({
                        title: "Health Check Complete! ✅",
                        description: `Checked ${
                          data.checked || 0
                        } URLs. Healthy: ${
                          data.results?.healthy || 0
                        }, Warning: ${data.results?.warning || 0}, Broken: ${
                          data.results?.broken || 0
                        }`,
                        variant: "success",
                      });
                    } else {
                      toast({
                        title: "Health Check Failed",
                        description: data.error || "Failed to check URL health",
                        variant: "error",
                      });
                    }
                  } catch {
                    toast({
                      title: "Error",
                      description: "An unexpected error occurred",
                      variant: "error",
                    });
                  } finally {
                    setIsCheckingHealth(false);
                  }
                }}
                disabled={isCheckingHealth}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-white/90 text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Check URL health status for this list"
              >
                <Activity
                  className={`w-4 h-4 ${
                    isCheckingHealth ? "animate-spin" : ""
                  }`}
                />
                <span>{isCheckingHealth ? "Checking..." : "Health Check"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Shareable Link */}
        <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
          <span className="text-xs sm:text-sm font-light text-white/70 whitespace-nowrap">
            Shareable Link:
          </span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-white/90 truncate">
              {typeof window !== "undefined"
                ? `${window.location.origin}/list/${list.slug}`
                : ""}
            </span>
            <button
              type="button"
              onClick={async () => {
                const url = `${window.location.origin}/list/${list.slug}`;
                try {
                  await navigator.clipboard.writeText(url);
                  setIsCopied(true);
                  toast({
                    title: "Copied!",
                    description: "Link copied to clipboard",
                    variant: "success",
                  });
                  setTimeout(() => setIsCopied(false), 2000);
                } catch {
                  toast({
                    title: "Failed",
                    description: "Failed to copy link",
                    variant: "error",
                  });
                }
              }}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors duration-200 group"
              aria-label="Copy link"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Copy className="w-4 h-4 text-white/70 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
              )}
            </button>
          </div>
        </div>

        {/* Collaborators Section - PermissionManager */}
        {list.id && list.slug && (
          <div className="mt-4 bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <PermissionManager
              listId={list.id}
              listTitle={list.title || "Untitled List"}
              listSlug={list.slug}
            />
          </div>
        )}

        {/* Activity Feed Section */}
        {list.id && (
          <div className="mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <ActivityFeed listId={list.id} limit={30} />
          </div>
        )}
      </div>
      <UrlList />

      {/* PermissionManager handles all collaborator dialogs internally */}
    </div>
  );
}
