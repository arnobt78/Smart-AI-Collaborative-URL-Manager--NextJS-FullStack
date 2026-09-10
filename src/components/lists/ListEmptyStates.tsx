"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import { Globe, SearchX } from "lucide-react";
import { CreateNewListButton } from "@/components/ui/CreateNewListButton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CARD_PAD, HEADING_STACK } from "@/lib/ui-spacing";
import { UI_ICON_DECORATIVE } from "@/lib/ui/control-styles";

type MyListsEmptyStateProps = {
  onCreateClick?: () => void;
  /** Soft-nav: same chrome, Create CTA inert until ListsPage hydrates. */
  createDisabled?: boolean;
};

/** Shared My Lists empty chrome — ListsPage + warm soft-nav (REQ-0053). */
export function MyListsEmptyState({
  onCreateClick,
  createDisabled = false,
}: MyListsEmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-white/30 p-2 sm:p-4 text-center bg-white/5 backdrop-blur-md">
      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full flex items-center justify-center">
        <LinkIcon className={cn(UI_ICON_DECORATIVE, "text-blue-400")} />
      </div>
      <div className={`${HEADING_STACK} mt-4`}>
        <h3 className="text-base sm:text-lg font-medium text-white">
          No Lists Yet
        </h3>
        <p className="text-sm sm:text-base text-white/60 px-2">
          Start organizing your URLs by creating your first list
        </p>
      </div>
      <div className="mt-6 sm:mt-8">
        <CreateNewListButton
          onClick={onCreateClick ?? (() => {})}
          disabled={createDisabled || !onCreateClick}
          aria-busy={createDisabled || undefined}
        />
      </div>
    </div>
  );
}

type BrowseEmptyStateProps = {
  searchActive?: boolean;
};

/** Shared Browse empty chrome — BrowsePage + warm soft-nav (REQ-0053). */
export function BrowseEmptyState({ searchActive = false }: BrowseEmptyStateProps) {
  return (
    <div
      className={cn(
        "text-center py-8 sm:py-12 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center gap-2",
        CARD_PAD,
      )}
    >
      <Globe className={cn(UI_ICON_DECORATIVE, "text-white/40")} />
      <p className="text-white/60 text-base sm:text-lg">
        {searchActive
          ? "No lists found matching your search"
          : "No public lists available yet"}
      </p>
      <p className="text-white/40 text-xs sm:text-sm">
        Be the first to create a public list!
      </p>
    </div>
  );
}

/** Shared list-detail 404 chrome — ListPage + soft-nav tombstone (readable on dark BG). */
export function ListNotFoundEmptyState() {
  return (
    <div
      className={cn(
        "mx-auto max-w-lg text-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md",
        CARD_PAD,
      )}
    >
      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-slate-500/20 to-blue-500/20 border border-white/20 rounded-full flex items-center justify-center">
        <SearchX
          className={cn(UI_ICON_DECORATIVE, "text-white/50")}
          aria-hidden
        />
      </div>
      <div className={`${HEADING_STACK} mt-4`}>
        <h1 className="text-lg sm:text-xl font-medium text-white">
          List not found
        </h1>
        <p className="text-sm sm:text-base text-white/60 px-2">
          The list you&apos;re looking for doesn&apos;t exist or has been
          deleted.
        </p>
      </div>
      <div className="mt-6 sm:mt-8">
        <Button href="/">Go Home</Button>
      </div>
    </div>
  );
}
