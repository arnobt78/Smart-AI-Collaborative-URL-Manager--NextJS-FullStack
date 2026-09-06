"use client";

import { useQueryClient } from "@tanstack/react-query";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { ArchiveRestore } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/Button";
import { useUrlMetadata } from "@/hooks/useUrlMetadata";
import type { UrlItem } from "@/stores/urlListStore";
import type { UrlMetadata } from "@/utils/urlMetadata";
import { CARD_PAD } from "@/lib/ui-spacing";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type ArchivedUrlCardProps = {
  url: UrlItem & { archivedAt?: string };
  canEdit: boolean;
  onRestore: () => void;
};

/** Archived list row — UrlCard-like image shell + restore-only actions. */
export function ArchivedUrlCard({
  url,
  canEdit,
  onRestore,
}: ArchivedUrlCardProps) {
  const queryClient = useQueryClient();
  const queryKey = ["url-metadata", url.url] as const;
  const cached = queryClient.getQueryData<UrlMetadata>(queryKey);
  const { data: fetched } = useUrlMetadata(url.url, !cached);
  const metadata = cached || fetched;
  const imageUrl = metadata?.image;
  const title = url.title || metadata?.title || url.url;
  const description = url.description || metadata?.description;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-md",
        CARD_PAD,
      )}
      data-url-id={url.id}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gray-900/30 sm:h-24 sm:w-24">
            {imageUrl ? (
              <SafeImage
                src={imageUrl}
                alt={title}
                width={96}
                height={96}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-white/40">
                <GlobeAltIcon className="h-8 w-8 shrink-0" />
                <span className="text-[10px] leading-tight">No image</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-medium text-white sm:text-lg">
              {title}
            </h3>
            {url.url !== title ? (
              <p className="truncate text-sm text-white/60">{url.url}</p>
            ) : null}
            {description ? (
              <p className="mt-1 line-clamp-2 text-sm text-white/70">
                {description}
              </p>
            ) : null}
            {url.archivedAt ? (
              <p className="mt-2 text-xs text-white/50">
                Archived: {new Date(url.archivedAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          disabled={!canEdit}
          onClick={() => {
            if (!canEdit) return;
            onRestore();
          }}
          className={cn(
            "shrink-0 bg-green-600 hover:bg-green-700 text-white",
            !canEdit && "opacity-50 cursor-not-allowed",
          )}
        >
          <ArchiveRestore className={UI_ICON_CONTROL} aria-hidden />
          Restore
        </Button>
      </div>
    </div>
  );
}
