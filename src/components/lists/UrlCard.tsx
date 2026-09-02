"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { SafeImage } from "@/components/ui/safe-image";
import {
  GlobeAltIcon,
  StarIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  BellIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useToast } from "@/components/ui/Toaster";
import { Grip, Pin } from "lucide-react";
import { IconButton } from "@/components/ui/HoverTooltip";
import type { UrlItem } from "@/stores/urlListStore";
import type { UrlMetadata } from "@/utils/urlMetadata";
import type { SearchResult } from "@/lib/ai/search";
import { Dialog } from "@/components/ui/Dialog";
import { currentList } from "@/stores/urlListStore";
import { UrlHealthIndicator } from "@/components/urls/UrlHealthIndicator";
import { Comments } from "@/components/collaboration/Comments";
import { MessageSquare } from "lucide-react";
import { CARD_PAD } from "@/lib/ui-spacing";
import {
  URL_META_CHIP_BLUE,
  URL_META_CHIP_ORANGE,
  URL_META_CHIP_PURPLE,
  URL_META_CHIP_RED,
  URL_META_CHIP_YELLOW,
} from "@/lib/ui/glass-badge-styles";
import { cn, ensureAbsoluteHttpUrl } from "@/lib/utils";
// Using public path instead of import
const logoPath = "/favicon.ico";

interface UrlCardProps {
  url: UrlItem;
  metadata?: UrlMetadata;
  isLoadingMetadata?: boolean;
  onEdit: (url: UrlItem) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleFavorite: (id: string) => void;
  onShare: (url: { url: string; title?: string }) => void;
  onUrlClick?: (urlId: string) => void;
  onDuplicate?: (url: UrlItem) => void;
  onArchive?: (id: string) => void | Promise<void>;
  onPin?: (id: string) => void;
  shareTooltip: string | null;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> | null;
  canEdit?: boolean; // Permission to edit URLs (false for viewers)
}

interface TimeInfoProps {
  icon: React.ReactNode;
  label: string;
  date: Date;
}

const TimeInfo = ({ icon, label, date }: TimeInfoProps) => (
  <div className="flex items-center gap-1 text-white/60 text-xs font-delicious">
    {icon}
    <span>{label}</span>
    <span className="text-white/40">{date.toLocaleDateString()}</span>
  </div>
);

export const UrlCard: React.FC<UrlCardProps> = ({
  url,
  metadata,
  isLoadingMetadata = false,
  onEdit,
  onDelete,
  onToggleFavorite,
  onShare,
  onUrlClick,
  onDuplicate,
  onArchive,
  onPin,
  shareTooltip,
  dragHandleProps,
  canEdit = true, // Default to true for backward compatibility
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(false);
  const [currentImageUrl, setCurrentImageUrl] = React.useState<
    string | undefined
  >(undefined);

  // Check if image has been prefetched/loaded before (prevents loading state on reorder)
  const checkImageCache = React.useCallback(
    (imageUrl: string | undefined): boolean => {
      if (!imageUrl || typeof window === "undefined") return false;

      try {
        // Check sessionStorage for prefetched images
        const imageCacheKey = `image-loaded:${imageUrl}`;
        return sessionStorage.getItem(imageCacheKey) === "true";
      } catch {
        return false;
      }
    },
    [],
  );
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [archivePending, setArchivePending] = React.useState(false);
  const [similarUrlsOpen, setSimilarUrlsOpen] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const { toast } = useToast();
  const { user: sessionUser } = useSession();
  const currentUserId = sessionUser?.id;
  const listIdForSimilar = currentList.get()?.id;

  const {
    data: similarResults = [],
    isLoading: loadingSimilarUrls,
    isError: similarError,
  } = useQuery<{ results: SearchResult[] }, Error, SearchResult[]>({
    queryKey: ["similar", listIdForSimilar, url.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/search/smart?listId=${listIdForSimilar}&urlId=${url.id}`,
      );
      if (!response.ok) {
        throw new Error("Failed to find similar URLs");
      }
      return response.json();
    },
    enabled: similarUrlsOpen && Boolean(listIdForSimilar),
    select: (data) => data.results || [],
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const similarUrls = similarResults;
  // isLoading = cold miss only; warm RQ cache paints instantly (no spinner)
  const showSimilarLoading = loadingSimilarUrls;

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url.url);
      setToastMessage("URL copied to clipboard!");
      setTimeout(() => setToastMessage(null), 2000);
    } catch {
      setToastMessage("Failed to copy URL");
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  // Show analytics/click count
  const handleShowAnalytics = () => {
    const clickCount = url.clickCount || 0;
    setToastMessage(
      `This URL has been clicked ${clickCount} time${
        clickCount !== 1 ? "s" : ""
      }`,
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find similar URLs — open dialog; RQ cache paints instantly on revisit
  const handleFindSimilar = () => {
    if (!currentList.get()?.id) return;
    setSimilarUrlsOpen(true);
  };

  // Confirm delete only after the store mutation settles, then close on the next paint.
  const handleDeleteConfirm = async () => {
    setDeletePending(true);
    try {
      await onDelete(url.id);
      toast({
        title: "URL Deleted",
        description: `"${url.title || url.url}" has been removed from the list.`,
        variant: "success",
      });
      requestAnimationFrame(() => setDeleteDialogOpen(false));
    } catch (caughtError) {
      toast({
        title: "Delete Failed",
        description:
          caughtError instanceof Error
            ? caughtError.message
            : "Please try again",
        variant: "error",
      });
    } finally {
      setDeletePending(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!onArchive) return;
    setArchivePending(true);
    try {
      await onArchive(url.id);
      toast({
        title: "URL Archived",
        description: `"${
          url.title || url.url
        }" has been archived and removed from the list.`,
        variant: "success",
      });
      requestAnimationFrame(() => setArchiveDialogOpen(false));
    } catch {
      // Store/query rollback and error toasts remain with the mutation owner.
    } finally {
      setArchivePending(false);
    }
  };

  // Use logo.png only for your own site URLs
  const isOwnUrl = (() => {
    try {
      const u = new URL(ensureAbsoluteHttpUrl(url.url) || url.url);
      return [
        "localhost",
        "127.0.0.1",
        "daily-urlist.vercel.app", // your prod domain
      ].includes(u.hostname);
    } catch {
      return false;
    }
  })();

  // For own URLs, always use logo. For external URLs, only use metadata image (no favicon fallback)
  // We rely on server-side metadata API to find valid images - no client-side fallbacks to avoid 403 errors
  const primaryImage = isOwnUrl ? logoPath : metadata?.image || undefined;

  // Determine current image URL to use
  React.useEffect(() => {
    if (isOwnUrl) {
      // Only reset loading state if URL actually changed (prevents flicker on reorder)
      if (currentImageUrl !== logoPath) {
        setCurrentImageUrl(logoPath);
        setImageError(false);
        // For own URLs (logo), always assume loaded (static asset)
        setImageLoading(false);
      }
      return;
    }

    if (primaryImage) {
      // Only reset loading state if URL actually changed (prevents flicker on reorder)
      if (currentImageUrl !== primaryImage) {
        setCurrentImageUrl(primaryImage);
        setImageError(false);

        // Check if image has been prefetched/loaded before (from batch prefetch)
        // If yes, set loading to false immediately (instant display)
        const isCached = checkImageCache(primaryImage);
        setImageLoading(!isCached);
      }
    } else {
      if (currentImageUrl !== undefined) {
        setCurrentImageUrl(undefined);
      }
      setImageError(true);
      setImageLoading(false);
    }
  }, [primaryImage, isOwnUrl, currentImageUrl, checkImageCache]);

  // Monitor image loading state with timeout fallback to prevent infinite spinner
  React.useEffect(() => {
    if (!imageLoading || !currentImageUrl) return;
    if (imageError) return; // Don't timeout if we're already in error state (handled by error handler)

    // Fallback timeout: reset loading state after 3 seconds if image hasn't loaded
    // This prevents infinite spinner if onLoad doesn't fire
    const timeout = setTimeout(() => {
      // Only clear loading if we're still loading and not in error state
      setImageLoading((prevLoading) => {
        if (prevLoading && !imageError) {
          return false;
        }
        return prevLoading;
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [imageLoading, currentImageUrl, imageError]);

  // Use metadata with fallback to URL object fields for persistence
  // This ensures data is displayed even if metadata hasn't loaded yet
  const title = metadata?.title || url.title || url.url;
  const description = metadata?.description || url.description; // Fallback to url.description from database
  const visitHref = ensureAbsoluteHttpUrl(url.url);
  // Reserved for richer card chrome (site label); keep derived so metadata path stays warm
  const _siteName = metadata?.siteName || url.category;

  // Check if we should show skeleton
  // Only show skeleton if we truly don't have ANY data to display
  // Don't show skeleton if we have cached metadata, URL title, or image URL (for instant display)
  const hasCachedData = metadata !== undefined && metadata !== null;
  const hasDisplayableText = !!(url.title || url.url);
  const hasPrimaryImage = !!primaryImage;
  const hasAnyData = hasCachedData || hasDisplayableText || hasPrimaryImage;

  // Only show skeleton if we truly don't have any data at all
  const shouldShowSkeleton =
    isLoadingMetadata && !hasAnyData && imageLoading && !url.url;

  // Check if we have an actual image to display
  // For own URLs, logoPath is valid. For external URLs, only metadata?.image counts
  // Also check if image failed to load and no more fallbacks available
  const hasImage =
    !imageError &&
    currentImageUrl !== undefined &&
    (isOwnUrl ? currentImageUrl === logoPath : true);

  // Handle image load error - show placeholder immediately
  const handleImageError = React.useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  // Reset when metadata changes
  React.useEffect(() => {
    setImageError(false);
  }, [metadata?.image]);
  // Fallback for sites that block metadata (e.g., Facebook)
  const isNoPreview = !hasImage && !description;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md max-sm:bg-white/[0.08] max-sm:backdrop-blur-none shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-400/30 cursor-default [transform:translateZ(0)]">
      {/* Drag handle in top-right corner */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-2 hover:bg-white/10 rounded-lg transition-all duration-200 drag-handle opacity-30 group-hover:opacity-100 z-20 touch-none"
          title="Drag to reorder"
          role="button"
          tabIndex={0}
          aria-label="Drag to reorder"
          style={{ userSelect: "none" }}
        >
          <Grip className="h-5 w-5 text-white/40 hover:text-blue-400 transition-colors pointer-events-none" />
        </div>
      )}
      <div className={cn(CARD_PAD, "flex flex-col gap-2")}>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          {/* Image Section */}
          <div className="md:w-1/5 w-full flex-shrink-0 flex items-center justify-center">
            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 md:mx-0 md:w-full md:h-full aspect-square overflow-hidden rounded-lg sm:rounded-xl shadow-sm bg-gray-900/30 backdrop-blur-md border border-white/10 flex items-center justify-center">
              {shouldShowSkeleton ? (
                <div className="absolute inset-0 bg-gray-800/40 rounded-xl animate-pulse" />
              ) : !currentImageUrl || imageError ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-white/40">
                  <GlobeAltIcon className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" />
                  <span className="w-full text-center text-[10px] leading-tight sm:text-xs">
                    No image available
                  </span>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {imageLoading && (
                    <div className="absolute inset-0 bg-gray-800/40 rounded-xl animate-pulse" />
                  )}
                  <SafeImage
                    key={currentImageUrl}
                    src={currentImageUrl}
                    alt={title}
                    width={208}
                    height={208}
                    className={`h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-300 ${
                      imageError ? "opacity-0" : imageLoading ? "opacity-0" : ""
                    }`}
                    onError={() => {
                      // Native fallback also failed — show placeholder
                      setImageLoading(false);
                      handleImageError();
                    }}
                    onLoad={() => {
                      setImageLoading(false);
                      setImageError(false);

                      // Mark image as loaded in global cache (for instant display on future renders)
                      if (currentImageUrl && typeof window !== "undefined") {
                        try {
                          const imageCacheKey = `image-loaded:${currentImageUrl}`;
                          sessionStorage.setItem(imageCacheKey, "true");
                        } catch {
                          // Ignore sessionStorage errors
                        }
                      }
                    }}
                  />
                </div>
              )}
              <button
                onClick={() => onToggleFavorite(url.id)}
                className="absolute top-2 right-2 bg-black/50 backdrop-blur-md rounded-lg p-2 hover:bg-black/70 transition-colors cursor-pointer z-10"
              >
                <StarIcon
                  className={`h-5 w-5 ${
                    url.isFavorite ? "text-yellow-400" : "text-white"
                  }`}
                />
              </button>
            </div>
          </div>
          {/* Content Section */}
          <div className="sm:w-3/5 w-full flex-1 min-w-0 flex flex-col gap-2 sm:gap-4">
            {shouldShowSkeleton ? (
              <>
                {/* Skeleton for title */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-7 bg-gray-800/40 rounded-lg w-3/4 animate-pulse" />
                  {/* Skeleton for category/tags */}
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-gray-800/30 rounded animate-pulse" />
                    <div className="h-6 w-24 bg-gray-800/30 rounded animate-pulse" />
                    <div className="h-6 w-20 bg-gray-800/30 rounded animate-pulse" />
                  </div>
                  {/* Skeleton for description lines */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-800/30 rounded w-full animate-pulse" />
                    <div className="h-4 bg-gray-800/30 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-gray-800/30 rounded w-4/6 animate-pulse" />
                  </div>
                </div>
                {/* Skeleton for action buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-full bg-gray-800/40 animate-pulse"
                      />
                    ))}
                  </div>
                  <div className="h-5 w-24 bg-gray-800/40 rounded animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  {/* Title with health status badge — same row, vertically centered */}
                  <div className="flex min-w-0 items-center gap-1.5 text-base leading-snug sm:text-lg xl:text-xl">
                    {visitHref ? (
                      <a
                        href={visitHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          onUrlClick?.(url.id);
                        }}
                        className="min-w-0 inline break-words align-baseline font-medium text-white hover:text-blue-400 transition-colors font-joti text-left cursor-pointer"
                        title={title}
                      >
                        {title}
                      </a>
                    ) : (
                      <span
                        className="min-w-0 inline break-words align-baseline font-medium text-white font-joti text-left"
                        title={title}
                      >
                        {title}
                      </span>
                    )}
                    <UrlHealthIndicator
                      variant="inline"
                      status={url.healthStatus}
                      httpStatus={url.healthLastStatus}
                      responseTime={url.healthResponseTime}
                      checkedAt={url.healthCheckedAt}
                      showDetails={false}
                    />
                  </div>

                  {/* Pinned Badge */}
                  {url.isPinned && (
                    <div className="mt-1 flex items-center gap-1">
                      <Pin className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <span className={URL_META_CHIP_YELLOW}>Pinned</span>
                    </div>
                  )}

                  {/* Category and Tags Display - Same Line */}
                  {(url.category || (url.tags && url.tags.length > 0)) && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {url.category && (
                        <span className={URL_META_CHIP_BLUE}>
                          {url.category}
                        </span>
                      )}
                      {url.tags && url.tags.length > 0 && (
                        <>
                          {url.tags.map((tag, index) => (
                            <span key={index} className={URL_META_CHIP_PURPLE}>
                              #{tag}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Reminder Display */}
                  {url.reminder && (
                    <div className="mt-1 flex items-center gap-2">
                      <BellIcon className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                      <span className="text-xs text-yellow-300 font-normal inline-flex items-center flex-wrap gap-1">
                        Reminder:{" "}
                        <span className="text-yellow-200">
                          {new Date(url.reminder).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {new Date(url.reminder) < new Date() && (
                          <span className={URL_META_CHIP_RED}>Overdue</span>
                        )}
                        {new Date(url.reminder) >= new Date() &&
                          new Date(url.reminder) <=
                            new Date(
                              new Date().setDate(new Date().getDate() + 7),
                            ) && (
                            <span className={URL_META_CHIP_ORANGE}>Soon</span>
                          )}
                      </span>
                    </div>
                  )}

                  {isNoPreview ? (
                    <p className="mt-1 text-xs text-white/40 italic font-delicious">
                      No preview available for this site.
                    </p>
                  ) : (
                    description && (
                      <div className="mt-1 flex w-full min-h-[3.5rem] items-center">
                        <p className="w-full text-xs text-white/60 leading-relaxed font-delicious line-clamp-5 break-words">
                          {description}
                        </p>
                      </div>
                    )
                  )}
                </div>
                {/* Action buttons row with timestamp */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <IconButton
                      icon={<ArrowTopRightOnSquareIcon />}
                      href={visitHref}
                      onClick={() => {
                        onUrlClick?.(url.id);
                      }}
                      tooltip="Visit Site"
                      className={
                        visitHref
                          ? "hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform cursor-pointer"
                          : undefined
                      }
                    />
                    <IconButton
                      icon={<PencilIcon />}
                      onClick={() => onEdit(url)}
                      tooltip="Edit URL"
                      disabled={!canEdit}
                    />
                    <IconButton
                      icon={<TrashIcon />}
                      onClick={() => setDeleteDialogOpen(true)}
                      tooltip="Delete URL"
                      variant="danger"
                      disabled={!canEdit}
                    />
                    <IconButton
                      icon={<ShareIcon />}
                      onClick={() => onShare(url)}
                      tooltip={shareTooltip || "Share URL"}
                    />
                    <IconButton
                      icon={
                        <StarIcon
                          className={
                            url.isFavorite ? "text-yellow-400 fill-current" : ""
                          }
                        />
                      }
                      onClick={() => onToggleFavorite(url.id)}
                      tooltip={
                        url.isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      className={url.isFavorite ? "border-yellow-400" : ""}
                      disabled={!canEdit}
                    />
                    <IconButton
                      icon={<ClipboardIcon className="h-5 w-5" />}
                      onClick={handleCopyUrl}
                      tooltip="Copy URL"
                    />
                    {onDuplicate && (
                      <IconButton
                        icon={<DocumentDuplicateIcon className="h-5 w-5" />}
                        onClick={() => onDuplicate(url)}
                        tooltip="Duplicate URL"
                        disabled={!canEdit}
                      />
                    )}
                    {onArchive && (
                      <IconButton
                        icon={<ArchiveBoxIcon className="h-5 w-5" />}
                        onClick={() => setArchiveDialogOpen(true)}
                        tooltip="Archive URL"
                        disabled={!canEdit}
                      />
                    )}
                    {onPin && (
                      <IconButton
                        icon={
                          <Pin
                            className={`h-5 w-5 ${
                              url.isPinned
                                ? "text-yellow-400 fill-yellow-400"
                                : ""
                            }`}
                          />
                        }
                        onClick={() => {
                          onPin(url.id);
                          toast({
                            title: url.isPinned ? "URL Unpinned" : "URL Pinned",
                            description: url.isPinned
                              ? `"${url.title || url.url}" has been unpinned.`
                              : `"${
                                  url.title || url.url
                                }" has been pinned to the top.`,
                            variant: "success",
                          });
                        }}
                        tooltip={url.isPinned ? "Unpin from top" : "Pin to top"}
                        disabled={!canEdit}
                      />
                    )}
                    {url.clickCount !== undefined && (
                      <IconButton
                        icon={<ChartBarIcon className="h-5 w-5" />}
                        onClick={handleShowAnalytics}
                        tooltip={`View analytics (${url.clickCount || 0} clicks)`}
                        badge={url.clickCount}
                      />
                    )}
                    <IconButton
                      icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                      onClick={handleFindSimilar}
                      tooltip="Find similar URLs"
                    />
                    <IconButton
                      icon={<MessageSquare className="h-5 w-5" />}
                      onClick={() => setCommentsOpen(true)}
                      tooltip="Comments"
                      badge={url.commentCount}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-xs font-delicious flex-wrap justify-end">
                    <TimeInfo
                      icon={<ClockIcon className="h-3.5 w-3.5 shrink-0" />}
                      label="Added"
                      date={new Date(url.createdAt)}
                    />
                    {url.updatedAt ? (
                      <TimeInfo
                        icon={<ClockIcon className="h-3.5 w-3.5 shrink-0" />}
                        label="Updated"
                        date={new Date(url.updatedAt)}
                      />
                    ) : null}
                  </div>
                </div>
                {/* Toast notification */}
                {toastMessage && (
                  <div className="fixed bottom-4 right-4 bg-green-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 border border-green-400/30">
                    {toastMessage}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {url.notes ? (
          <>
            <div className="h-px bg-white/10" aria-hidden />
            <p className="min-w-0 text-xs italic leading-relaxed text-yellow-200/90">
              <span className="not-italic font-medium">Note:</span> {url.notes}
            </p>
          </>
        ) : null}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deletePending) setDeleteDialogOpen(open);
        }}
        title="Delete URL"
        description={`Are you sure you want to delete "${
          url.title || url.url
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        pending={deletePending}
        pendingText="Deleting…"
        closeOnConfirm={false}
      />

      {onArchive && (
        <AlertDialog
          open={archiveDialogOpen}
          onOpenChange={(open) => {
            if (!archivePending) setArchiveDialogOpen(open);
          }}
          title="Archive URL"
          description={`Are you sure you want to archive "${
            url.title || url.url
          }"? It will be removed from the list.`}
          confirmText="Archive"
          cancelText="Cancel"
          onConfirm={handleArchiveConfirm}
          variant="default"
          pending={archivePending}
          pendingText="Archiving…"
          closeOnConfirm={false}
        />
      )}

      <Dialog
        open={similarUrlsOpen}
        onOpenChange={setSimilarUrlsOpen}
        title={`Similar URLs to “${url.title || url.url}”`}
        description="AI-powered similarity search"
        size="wide"
        headerMode="scroll"
      >
        <div className="space-y-3">
          {showSimilarLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-white/60">Finding similar URLs...</p>
              </div>
            </div>
          ) : similarError ? (
            <div className="text-center py-12">
              <p className="text-white/60 text-sm sm:text-base font-medium">
                Couldn’t load similar URLs
              </p>
              <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
                Try again in a moment.
              </p>
            </div>
          ) : similarUrls.length === 0 ? (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="h-16 w-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-sm sm:text-base font-medium">
                No similar URLs found
              </p>
              <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
                Try adding more URLs to find similar ones. The AI needs enough
                content to match against.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {similarUrls.map((result) => {
                const visitHref = ensureAbsoluteHttpUrl(result.url.url);
                return (
                <div
                  key={result.url.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-blue-400/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2  flex-wrap">
                        <span className={URL_META_CHIP_BLUE}>
                          {Math.round(result.relevanceScore * 100)}% match
                        </span>
                        {result.url.category && (
                          <span className={URL_META_CHIP_PURPLE}>
                            {result.url.category}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-white mb-1 break-words">
                        {result.url.title || result.url.url}
                      </h4>
                      {result.url.description && (
                        <p className="text-sm text-white/70  line-clamp-2">
                          {result.url.description}
                        </p>
                      )}
                      <p className="text-xs text-white/50  break-all">
                        {result.url.url}
                      </p>
                      {result.matchReason && (
                        <p className="text-xs text-white/60 italic mt-2">
                          {result.matchReason}
                        </p>
                      )}
                    </div>
                    {visitHref ? (
                      <a
                        href={visitHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-white whitespace-nowrap transition-colors hover:bg-blue-700 cursor-pointer"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden />
                        Visit
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-shrink-0 rounded-lg bg-blue-600/40 px-4 py-2 text-white/60 whitespace-nowrap cursor-not-allowed"
                      >
                        Visit
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </Dialog>

      {currentList.get()?.id ? (
        <Dialog
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          title="Comments"
          description={url.title || url.url}
          size="wide"
          headerMode="scroll"
        >
          <div>
            <Comments
              listId={currentList.get()!.id!}
              urlId={url.id}
              currentUserId={currentUserId}
              knownCount={url.commentCount}
            />
          </div>
        </Dialog>
      ) : null}
    </div>
  );
};
