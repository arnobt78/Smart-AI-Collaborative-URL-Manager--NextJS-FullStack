"use client";

import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams } from "next/navigation";
import Image from "next/image";
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
} from "lucide-react";
import { useToast } from "@/components/ui/Toaster";
import { InputDialog } from "@/components/ui/InputDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";

export default function ListPageClient() {
  const { toast } = useToast();
  const { slug } = useParams();
  const list = useStore(currentList);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);
  const hasSyncedVectors = useRef<string | null>(null); // Track which list ID we've synced
  const hasFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchList() {
      if (typeof slug === "string") {
        // Only fetch if slug changed (prevent duplicate fetches)
        if (hasFetchedRef.current === slug) {
          setIsLoading(false);
          return;
        }
        // Mark as fetched before the async call
        hasFetchedRef.current = slug;
        await getList(slug);
      }
      setIsLoading(false);
    }
    fetchList();
  }, [slug]);

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

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <div className="container mx-auto px-2 sm:px-0">
          <div className="mx-auto max-w-7xl">
            {/* Header Card Skeleton */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
              {/* Single Row Layout Skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
                {/* Title and URL Count Skeleton */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Skeleton className="h-6 sm:h-7 md:h-8 w-48 sm:w-64" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                {/* Visibility Toggle Section Skeleton */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <Skeleton className="h-6 w-12 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>

                {/* Shareable Link Skeleton */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32 sm:w-48 flex-1" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>

              {/* Collaborators Section Skeleton */}
              <div className="mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-10 w-44 rounded-xl" />
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

            {/* Social Preview Card Skeleton */}
            <div className="my-8 max-w-xl mx-auto border border-white/20 rounded-2xl shadow-lg bg-white/5 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!list) {
    return (
      <main className="container mx-auto px-2 sm:px-0">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold">List not found</h1>
          <p className="mt-2 text-gray-600">
            The list you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button href="/" className="mt-8">
            Go Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-2 sm:px-0">
        <div className="mx-auto max-w-7xl">
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

                {/* Private/Public Toggle */}
                <div className="flex flex-col items-center">
                  <Switch
                    checked={list.isPublic ?? false}
                    disabled={isToggling}
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
                            }, Warning: ${
                              data.results?.warning || 0
                            }, Broken: ${data.results?.broken || 0}`,
                            variant: "success",
                          });
                        } else {
                          toast({
                            title: "Health Check Failed",
                            description:
                              data.error || "Failed to check URL health",
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
                    <span>
                      {isCheckingHealth ? "Checking..." : "Health Check"}
                    </span>
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

            {/* Collaborators Section */}
            <div className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-2 border border-blue-400/30">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Collaborators
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteDialogOpen(true)}
                  className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden"
                >
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                  {/* Icon */}
                  <UserPlus className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />

                  {/* Text */}
                  <span className="relative z-10 text-sm sm:text-base whitespace-nowrap">
                    Invite Collaborator
                  </span>

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </button>
              </div>

              {/* Collaborators Grid */}
              {list.collaborators && list.collaborators.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {list.collaborators.map((email) => (
                    <div
                      key={email}
                      className="group relative bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 hover:from-white/10 hover:to-white/5 hover:border-blue-400/40 hover:shadow-lg transition-all duration-300 cursor-default overflow-hidden"
                    >
                      {/* Subtle glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-indigo-500/10 transition-all duration-300 rounded-2xl" />

                      <div className="flex items-center gap-4 relative z-10">
                        {/* Enhanced Avatar Circle */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-500 border-2 border-blue-400/60 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:shadow-blue-500/50">
                            {email.charAt(0).toUpperCase()}
                          </div>
                          {/* Online indicator dot */}
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white/20 rounded-full shadow-sm" />
                        </div>

                        {/* Email and Role */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors duration-200">
                            {email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                            <p className="text-xs font-medium text-white/60 truncate">
                              Collaborator
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Hover arrow indicator */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Mail className="w-3 h-3 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-white/5 to-white/3 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-12 text-center overflow-hidden relative">
                  {/* Subtle animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-indigo-500/0 animate-pulse" />

                  <div className="relative z-10">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-blue-400/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      No collaborators yet
                    </h3>
                    <p className="text-sm text-white/60 max-w-sm mx-auto">
                      Invite team members to collaborate on this list.
                      They&apos;ll receive an email invitation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Feed Section */}
            {list.id && (
              <div className="mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                <ActivityFeed listId={list.id} limit={30} />
              </div>
            )}
          </div>
          <UrlList />
          {/* Social Preview Card */}
          <div className="my-8 max-w-xl mx-auto border border-white/20 rounded-2xl shadow-lg bg-white/5 backdrop-blur-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/favicon.ico"
                alt="The Urlist Logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <h2 className="text-xl font-bold text-white">
                  {list.title || `List: ${list.slug}`}
                </h2>
                <span className="text-xs text-white/60">
                  Shared via The Urlist
                </span>
              </div>
            </div>
            <p className="text-white/70 mb-4 line-clamp-3">
              {list.description || "A collection of useful links."}
            </p>
            <ul className="space-y-2">
              {list.urls?.slice(0, 3).map((url, idx) => {
                // Defensive: ensure key is always unique and non-empty
                const key =
                  url.id && typeof url.id === "string" && url.id.length > 0
                    ? url.id
                    : url.url || `url-${idx}`;
                return (
                  <li
                    key={key}
                    className="flex items-center gap-2 text-sm text-blue-400 truncate"
                  >
                    <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                    <span className="truncate">{url.title || url.url}</span>
                  </li>
                );
              })}
              {list.urls && list.urls.length > 3 && (
                <li className="text-xs text-white/40">...and more</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Invite Collaborator Dialog */}
      <InputDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        title="Invite Collaborator"
        description="Add someone to collaborate on this list. They'll be able to view and edit the list."
        label="Email Address"
        type="email"
        placeholder="collaborator@example.com"
        confirmText="Send Invite"
        cancelText="Cancel"
        validate={(email) => {
          if (!email || email.trim() === "") {
            return "Email is required";
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return "Please enter a valid email address";
          }
          return null;
        }}
        onConfirm={async (email) => {
          try {
            const response = await fetch(
              `/api/lists/${list.id}/collaborators`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
              }
            );

            const data = await response.json();

            // Close dialog first
            setInviteDialogOpen(false);

            if (!response.ok) {
              toast({
                title: "Invite Failed",
                description: data.error || "Failed to invite collaborator",
                variant: "error",
              });
              return;
            }

            // Update the list state immediately (optimistic)
            if (data.list) {
              flushSync(() => {
                currentList.set(data.list);
              });

              // Trigger activity feed update AFTER API completes (activity is now in DB)
              // The API already publishes real-time updates, so other windows will get it via SSE
              window.dispatchEvent(
                new CustomEvent("activity-updated", {
                  detail: { listId: list.id },
                })
              );
            } else if (typeof slug === "string") {
              // Fallback: fetch if list not in response
              await getList(slug);
            }

            // Check if email was sent successfully
            const emailSent = data.emailSent === true;

            if (emailSent) {
              toast({
                title: "Invite Sent! ✉️",
                description: `Invitation sent to ${email}. They'll receive an email notification.`,
                variant: "success",
              });
            } else {
              // Check if it's a domain verification error
              const isDomainError =
                data.emailError?.includes("verify a domain") ||
                data.emailError?.includes("Domain not verified");

              if (isDomainError) {
                toast({
                  title: "Collaborator Added (Email Pending)",
                  description: `${email} has been added, but email notification couldn't be sent. Domain verification required.`,
                  variant: "info",
                });
              } else {
                toast({
                  title: "Collaborator Added",
                  description: `${email} has been added as a collaborator.`,
                  variant: "success",
                });
              }
            }
          } catch {
            // Close dialog on error
            setInviteDialogOpen(false);
            toast({
              title: "Invite Failed",
              description: "Failed to invite collaborator",
              variant: "error",
            });
          }
        }}
      />
    </main>
  );
}
