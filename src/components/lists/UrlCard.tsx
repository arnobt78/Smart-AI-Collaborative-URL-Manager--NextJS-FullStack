"use client";

import React from "react";
import ReactDOM from "react-dom";
import { useSession } from "@/hooks/useSession";
import Image from "next/image";
import {
  GlobeAltIcon,
  StarIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  BellIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useToast } from "@/components/ui/Toaster";
import { Grip, Pin } from "lucide-react";
import { IconButton } from "@/components/ui/HoverTooltip";
import type { UrlItem } from "@/stores/urlListStore";
import type { UrlMetadata } from "@/utils/urlMetadata";
import type { SearchResult } from "@/lib/ai/search";
import { Button } from "@/components/ui/Button";
import { currentList } from "@/stores/urlListStore";
import { UrlHealthIndicator } from "@/components/urls/UrlHealthIndicator";
import { Comments } from "@/components/collaboration/Comments";
import { MessageSquare } from "lucide-react";
// Using public path instead of import
const logoPath = "/favicon.ico";

interface UrlCardProps {
  url: UrlItem;
  metadata?: UrlMetadata;
  isLoadingMetadata?: boolean;
  onEdit: (url: UrlItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onShare: (url: { url: string; title?: string }) => void;
  onUrlClick?: (urlId: string) => void;
  onDuplicate?: (url: UrlItem) => void;
  onArchive?: (id: string) => void;
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
  <div className="flex items-center gap-1.5 text-white/60 text-sm font-delicious">
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
  // Log click count changes for debugging
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development" && url.clickCount !== undefined) {
      // Removed excessive console log for URL card rendering
    }
  }, [url.id, url.clickCount, url.title]);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);
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
    []
  );
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [similarUrlsOpen, setSimilarUrlsOpen] = React.useState(false);
  const [similarUrls, setSimilarUrls] = React.useState<SearchResult[]>([]);
  const [loadingSimilarUrls, setLoadingSimilarUrls] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const { toast } = useToast();
  const { user: sessionUser } = useSession();
  const currentUserId = sessionUser?.id;

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
      }`
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find similar URLs
  const handleFindSimilar = async () => {
    const current = currentList.get();
    if (!current.id) return;

    setSimilarUrlsOpen(true);
    setLoadingSimilarUrls(true);
    setSimilarUrls([]);

    try {
      const response = await fetch(
        `/api/search/smart?listId=${current.id}&urlId=${url.id}`
      );

      if (response.ok) {
        const data = await response.json();
        setSimilarUrls(data.results || []);
        // Don't show toast for empty results - modal will show empty state
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to find similar URLs:", errorData);
        // Don't show toast - modal will show error state
        setSimilarUrls([]);
      }
    } catch (error) {
      console.error("Failed to find similar URLs:", error);
      // Don't show toast - modal will show error state
      setSimilarUrls([]);
    } finally {
      setLoadingSimilarUrls(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    onDelete(url.id);
    toast({
      title: "URL Deleted",
      description: `"${url.title || url.url}" has been removed from the list.`,
      variant: "success",
    });
  };

  // Handle archive confirmation
  const handleArchiveConfirm = () => {
    if (onArchive) {
      onArchive(url.id);
      toast({
        title: "URL Archived",
        description: `"${
          url.title || url.url
        }" has been archived and removed from the list.`,
        variant: "success",
      });
    }
  };

  // Use logo.png only for your own site URLs
  const isOwnUrl = (() => {
    try {
      const u = new URL(url.url);
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
      // Only update if we're currently showing an image (prevent unnecessary state changes)
      if (currentImageUrl !== undefined) {
        setCurrentImageUrl(undefined);
        setImageError(true);
        setImageLoading(false);
      }
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
  const siteName = metadata?.siteName || url.category; // Use category as siteName fallback

  // Check if we should show skeleton
  // Only show skeleton if we truly don't have ANY data to display
  // Don't show skeleton if we have cached metadata, URL title, or image URL (for instant display)
  const hasCachedData = metadata !== undefined && metadata !== null;
  const hasTitle = !!url.title;
  const hasPrimaryImage = !!primaryImage;
  const hasAnyData = hasCachedData || hasTitle || hasPrimaryImage;

  // Only show skeleton if:
  // 1. We're actively loading AND don't have any data at all
  // 2. No metadata, no title, no image, AND still loading
  // This ensures cards display instantly when cached data exists
  const shouldShowSkeleton = isLoadingMetadata && !hasAnyData && imageLoading;

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
    <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-400/30">
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
      <div className="flex flex-col sm:flex-row p-4 gap-4">
        {/* Image Section */}
        <div className="md:w-1/5 w-full flex-shrink-0 flex items-center justify-center">
          <div className="relative w-28 h-28 md:w-full md:h-full aspect-square overflow-hidden rounded-xl shadow-sm bg-gray-900/30 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            {shouldShowSkeleton ? (
              <div className="absolute inset-0 bg-gray-800/40 rounded-xl animate-pulse" />
            ) : !currentImageUrl || imageError ? (
              <div className="flex flex-col items-center justify-center h-full w-full text-white/40">
                <GlobeAltIcon className="h-12 w-12 mb-2" />
                <span className="text-sm">No image available</span>
              </div>
            ) : (
              <div className="relative w-full h-full">
                {imageLoading && (
                  <div className="absolute inset-0 bg-gray-800/40 rounded-xl animate-pulse" />
                )}
                <Image
                  key={currentImageUrl}
                  src={currentImageUrl}
                  alt={title}
                  width={208}
                  height={208}
                  className={`h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 ${
                    imageError ? "opacity-0" : imageLoading ? "opacity-0" : ""
                  }`}
                  unoptimized={currentImageUrl.startsWith("http")}
                  onError={() => {
                    // Immediately stop showing spinner for failed image
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
              className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg p-2 hover:bg-black/70 transition-colors cursor-pointer z-10"
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
        <div className="sm:w-3/5 w-full flex-1 min-w-0 flex flex-col gap-4">
          {shouldShowSkeleton ? (
            <>
              {/* Skeleton for title */}
              <div className="flex-1 min-w-0 space-y-3">
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
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
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
                {/* Title with Health Status directly after text */}
                <div className="flex items-center gap-2 mb-2 flex-wrap min-w-0">
                  <h3
                    className="font-bold text-xl text-white group-hover:text-blue-400 transition-colors font-joti inline-block"
                    title={title}
                  >
                    {title}
                  </h3>
                  {/* Health Status Indicator - directly after title */}
                  <UrlHealthIndicator
                    status={url.healthStatus}
                    httpStatus={url.healthLastStatus}
                    responseTime={url.healthResponseTime}
                    checkedAt={url.healthCheckedAt}
                    showDetails={false}
                  />
                </div>

                {/* Pinned Badge */}
                {url.isPinned && (
                  <div className="mb-2 flex items-center gap-1">
                    <Pin className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 rounded-md text-xs font-semibold">
                      Pinned
                    </span>
                  </div>
                )}

                {/* Category and Tags Display - Same Line */}
                {(url.category || (url.tags && url.tags.length > 0)) && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {url.category && (
                      <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-md text-xs font-semibold whitespace-nowrap">
                        {url.category}
                      </span>
                    )}
                    {url.tags && url.tags.length > 0 && (
                      <>
                        {url.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-md text-xs font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Reminder Display */}
                {url.reminder && (
                  <div className="mb-2 flex items-center gap-2">
                    <BellIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-yellow-300 font-medium">
                      Reminder:{" "}
                      <span className="text-yellow-200">
                        {new Date(url.reminder).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {new Date(url.reminder) < new Date() && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500/20 border border-red-400/30 text-red-300 rounded text-xs font-semibold">
                          Overdue
                        </span>
                      )}
                      {new Date(url.reminder) >= new Date() &&
                        new Date(url.reminder) <=
                          new Date(
                            new Date().setDate(new Date().getDate() + 7)
                          ) && (
                          <span className="ml-2 px-2 py-0.5 bg-orange-500/20 border border-orange-400/30 text-orange-300 rounded text-xs font-semibold">
                            Soon
                          </span>
                        )}
                    </span>
                  </div>
                )}

                {isNoPreview ? (
                  <p className="text-md text-white/40 italic font-delicious">
                    No preview available for this site.
                  </p>
                ) : (
                  description && (
                    <p className="text-md text-white/60 leading-relaxed font-delicious line-clamp-5 break-words overflow-hidden">
                      {description}
                    </p>
                  )
                )}
              </div>
              {/* Action buttons row with timestamp */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <IconButton
                    icon={<ArrowTopRightOnSquareIcon />}
                    onClick={() => {
                      // Track the click
                      if (onUrlClick) {
                        onUrlClick(url.id);
                      }
                      // Open the URL
                      window.open(url.url, "_blank", "noopener,noreferrer");
                    }}
                    tooltip="Visit Site"
                    variant="primary"
                    className="hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform"
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
                    variant={url.isFavorite ? "default" : "default"}
                    className={url.isFavorite ? "border-yellow-400" : ""}
                    disabled={!canEdit}
                  />
                  <IconButton
                    icon={<ClipboardIcon className="h-5 w-5" />}
                    onClick={handleCopyUrl}
                    tooltip="Copy URL"
                    variant="default"
                  />
                  {onDuplicate && (
                    <IconButton
                      icon={<DocumentDuplicateIcon className="h-5 w-5" />}
                      onClick={() => onDuplicate(url)}
                      tooltip="Duplicate URL"
                      variant="default"
                      disabled={!canEdit}
                    />
                  )}
                  {onArchive && (
                    <IconButton
                      icon={<ArchiveBoxIcon className="h-5 w-5" />}
                      onClick={() => setArchiveDialogOpen(true)}
                      tooltip="Archive URL"
                      variant="default"
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
                      variant={url.isPinned ? "default" : "default"}
                      disabled={!canEdit}
                    />
                  )}
                  {url.clickCount !== undefined && (
                    <IconButton
                      icon={<ChartBarIcon className="h-5 w-5" />}
                      onClick={handleShowAnalytics}
                      tooltip={`View analytics (${url.clickCount || 0} clicks)`}
                      variant="default"
                    />
                  )}
                  <IconButton
                    icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                    onClick={handleFindSimilar}
                    tooltip="Find similar URLs"
                    variant="default"
                  />
                  <IconButton
                    icon={<MessageSquare className="h-5 w-5" />}
                    onClick={() => setCommentsOpen(true)}
                    tooltip="Comments"
                    variant="default"
                  />
                </div>
                <div className="flex items-center gap-3 text-white/60 text-sm font-delicious">
                  <TimeInfo
                    icon={<ClockIcon className="h-4 w-4" />}
                    label="Added"
                    date={new Date(url.createdAt)}
                  />
                  {url.updatedAt && url.updatedAt !== url.createdAt && (
                    <TimeInfo
                      icon={<ClockIcon className="h-4 w-4" />}
                      label="Updated"
                      date={new Date(url.updatedAt)}
                    />
                  )}
                </div>
              </div>
              {/* Toast notification */}
              {toastMessage && (
                <div className="fixed bottom-4 right-4 bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 border border-green-400/30">
                  {toastMessage}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom bar with note */}
      {url.notes && (
        <div className="px-6 pb-4 pt-0 border-t border-white/10">
          <div className="flex items-start gap-2 text-yellow-200 text-sm font-delicious pt-4">
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span className="font-semibold">Note:</span>
            <span>{url.notes}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete URL"
        description={`Are you sure you want to delete "${
          url.title || url.url
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      {/* Archive Confirmation Dialog */}
      {onArchive && (
        <AlertDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          title="Archive URL"
          description={`Are you sure you want to archive "${
            url.title || url.url
          }"? It will be removed from the list.`}
          confirmText="Archive"
          cancelText="Cancel"
          onConfirm={handleArchiveConfirm}
          variant="default"
        />
      )}

      {/* Similar URLs Modal - Portal to body */}
      {similarUrlsOpen &&
        typeof window !== "undefined" &&
        document.body &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSimilarUrlsOpen(false)}
            style={{ position: "fixed" }}
          >
            <div
              className="relative w-full max-w-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl border border-white/20 flex flex-col"
              style={{
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed */}
              <div className="flex items-start justify-between p-6 border-b border-white/10 flex-shrink-0 bg-gradient-to-br from-zinc-900 to-zinc-800">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-xl font-bold text-white line-clamp-2 break-words">
                    Similar URLs to &quot;{url.title || url.url}&quot;
                  </h3>
                  <p className="text-sm text-white/60 mt-1">
                    AI-powered similarity search
                  </p>
                </div>
                <button
                  onClick={() => setSimilarUrlsOpen(false)}
                  className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div
                className="overflow-y-scroll overflow-x-hidden p-6 custom-scrollbar"
                style={{
                  flex: "1 1 auto",
                  minHeight: 0,
                  maxHeight: "calc(85vh - 120px)",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255, 255, 255, 0.4) rgba(0, 0, 0, 0.1)",
                }}
              >
                {loadingSimilarUrls ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-white/60">Finding similar URLs...</p>
                    </div>
                  </div>
                ) : similarUrls.length === 0 ? (
                  <div className="text-center py-12">
                    <MagnifyingGlassIcon className="h-16 w-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60 text-lg font-medium">
                      No similar URLs found
                    </p>
                    <p className="text-sm text-white/40 mt-2 max-w-md mx-auto">
                      Try adding more URLs to find similar ones. The AI needs
                      enough content to match against.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-2">
                    {similarUrls.map((result) => (
                      <div
                        key={result.url.id}
                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:border-blue-400/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded text-xs font-semibold whitespace-nowrap">
                                {Math.round(result.relevanceScore * 100)}% match
                              </span>
                              {result.url.category && (
                                <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded text-xs font-medium whitespace-nowrap">
                                  {result.url.category}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-white mb-1 break-words">
                              {result.url.title || result.url.url}
                            </h4>
                            {result.url.description && (
                              <p className="text-sm text-white/70 mb-2 line-clamp-2">
                                {result.url.description}
                              </p>
                            )}
                            <p className="text-xs text-white/50 mb-2 break-all">
                              {result.url.url}
                            </p>
                            {result.matchReason && (
                              <p className="text-xs text-white/60 italic mt-2">
                                {result.matchReason}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              window.open(
                                result.url.url,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg whitespace-nowrap"
                          >
                            Visit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Comments Modal - Portal to body */}
      {commentsOpen &&
        typeof window !== "undefined" &&
        document.body &&
        currentList.get()?.id &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setCommentsOpen(false)}
            style={{ position: "fixed" }}
          >
            <div
              className="relative w-full max-w-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl border border-white/20 flex flex-col"
              style={{
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed */}
              <div className="flex items-start justify-between p-6 border-b border-white/10 flex-shrink-0 bg-gradient-to-br from-zinc-900 to-zinc-800">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-xl font-bold text-white line-clamp-2 break-words">
                    Comments
                  </h3>
                  <p className="text-sm text-white/60 mt-1">
                    {url.title || url.url}
                  </p>
                </div>
                <button
                  onClick={() => setCommentsOpen(false)}
                  className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div
                className="overflow-y-scroll overflow-x-hidden p-6 custom-scrollbar"
                style={{
                  flex: "1 1 auto",
                  minHeight: 0,
                  maxHeight: "calc(85vh - 120px)",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255, 255, 255, 0.4) rgba(0, 0, 0, 0.1)",
                }}
              >
                <Comments
                  listId={currentList.get()!.id!}
                  urlId={url.id}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
