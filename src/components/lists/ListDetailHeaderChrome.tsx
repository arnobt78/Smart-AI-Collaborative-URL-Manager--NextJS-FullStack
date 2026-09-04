"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DescriptionRow } from "@/components/ui/DescriptionRow";
import { ListTitleRow } from "@/components/lists/ListTitleRow";
import { Switch } from "@/components/ui/Switch";
import { ArrowLeft, Blocks, Globe2, GlobeLock, Shield, Sparkles, Telescope } from "lucide-react";
import { GLASS_LIST_CARD } from "@/lib/ui/glass-card-styles";
import {
  UI_ICON_CONTROL,
  UI_IDENTITY_GAP,
  UI_LIST_CARD_META_BADGE,
} from "@/lib/ui/control-styles";
import { CARD_PAD, CARD_STACK, HEADING_STACK, LIST_STACK } from "@/lib/ui-spacing";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";
import { ACTIVITY_FEED_LIMIT } from "@/lib/activity-feed-limit";
import { PermissionManager } from "@/components/collaboration/PermissionManager";
import { SmartCollections } from "@/components/collections/SmartCollections";
import { useStore } from "@nanostores/react";
import { collectionCreateInFlight } from "@/stores/urlListStore";
import { ListDetailSectionHeader } from "@/components/lists/ListDetailSectionHeader";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
export type ListDetailHeaderList = {
  slug: string;
  title?: string | null;
  description?: string | null;
  isPublic?: boolean;
  urls?: unknown[] | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type ListDetailHeaderChromeProps = {
  list: ListDetailHeaderList;
  /** When true, Switch/actions are non-interactive shells (optimistic soft-nav). */
  busy?: boolean;
  canInvite?: boolean;
  visibilityPending?: boolean;
  onVisibilityChange?: (isPublic: boolean) => void;
  /** Navigate back to Lists (stable). Soft-nav may omit or pass live handler. */
  onBack?: () => void;
  actions?: ReactNode;
  shareRow?: ReactNode;
  className?: string;
};

const badgeTextClass = "text-xs text-center justify-center";

/**
 * Shared list-detail header chrome for ListPage + OptimisticSoftNavSurface (C7.9 / C7.10).
 */
export function ListDetailHeaderChrome({
  list,
  busy = false,
  canInvite = false,
  visibilityPending = false,
  onVisibilityChange,
  onBack,
  actions,
  shareRow,
  className,
}: ListDetailHeaderChromeProps) {
  const urlCount = Array.isArray(list.urls) ? list.urls.length : 0;
  const isPublic = list.isPublic ?? false;

  const backButton =
    onBack ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        aria-label="Back"
      >
        <ArrowLeft className={UI_ICON_CONTROL} aria-hidden />
        <span className="hidden sm:inline">Back</span>
      </Button>
    ) : null;

  const titleHeading = (
    <h1 className="min-w-0 break-words text-base font-medium leading-[1.15] text-white sm:text-lg xl:text-xl">
      {list.title || `List: ${list.slug}`}
    </h1>
  );

  const actionsCluster =
    backButton || actions ? (
      <>
        {backButton}
        {actions}
      </>
    ) : null;

  return (
    <div
      className={cn(GLASS_LIST_CARD, CARD_PAD, className)}
    >
      <div className={cn(CARD_STACK, "min-w-0")}>
        {/* Mobile: actions row, then title-only row */}
        <div className="flex w-full items-center justify-between sm:hidden">
          <div className="flex shrink-0 items-center gap-2">{backButton}</div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
        <div className="sm:hidden">
          <ListTitleRow icon={Blocks} hue="blue" title={titleHeading} />
        </div>

        {/* Desktop: tile+title | Back/menu in isolated trailing cluster */}
        <div className="hidden sm:block">
          <ListTitleRow
            icon={Blocks}
            hue="blue"
            title={titleHeading}
            trailing={actionsCluster}
          />
        </div>

        <DescriptionRow
          text={list.description?.trim() || "No description yet"}
        />

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Badge
            variant="secondary"
            className={cn(
              badgeTextClass,
              UI_LIST_CARD_META_BADGE,
              "w-fit border",
            )}
          >
            {urlCount} {urlCount === 1 ? "URL" : "URLs"}
          </Badge>
          <Badge
            variant={isPublic ? "success" : "secondary"}
            className={cn(
              badgeTextClass,
              UI_LIST_CARD_META_BADGE,
              "w-fit min-w-6 border sm:min-w-0",
            )}
          >
            {isPublic ? (
              <>
                <Globe2 className={UI_ICON_CONTROL} aria-hidden />
                <span className="hidden sm:inline">
                  Public - Anyone can view
                </span>
                <span className="sm:hidden">Public</span>
              </>
            ) : (
              <>
                <GlobeLock className={UI_ICON_CONTROL} aria-hidden />
                <span className="hidden sm:inline">
                  Private - Only you & collaborators
                </span>
                <span className="sm:hidden">Private</span>
              </>
            )}
          </Badge>
          <div className="flex items-center gap-1">
            <Switch
              checked={isPublic}
              disabled={busy || visibilityPending || !canInvite}
              onChange={(e) => {
                if (busy || !onVisibilityChange) return;
                onVisibilityChange(e.target.checked);
              }}
            />
            <span className="text-[10px] text-white/50 hidden sm:inline">
              {isPublic ? "Public" : "Private"}
            </span>
          </div>
        </div>

        {shareRow}
      </div>
    </div>
  );
}

/** Shared list-detail section shell (Collaborators, Activity, etc.). */
export function ListDetailSection({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        GLASS_LIST_CARD,
        "overflow-hidden max-sm:bg-white/[0.08] max-sm:backdrop-blur-none [transform:translateZ(0)]",
        CARD_PAD,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Pulse bar for section skeleton rows. */
function SkeletonBar({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("rounded bg-white/10 animate-pulse", className)}
      aria-hidden
    />
  );
}

/** Header row skeleton: icon + title/badge/subtitle + optional trailing action. */
function SectionHeaderRowSkeleton({
  actionClassName,
}: {
  actionClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3">
      <div className={cn("flex min-w-0 flex-1 items-center", UI_IDENTITY_GAP)}>
        <SkeletonBar className="h-10 w-10 shrink-0 rounded-xl" />
        <div className={cn(HEADING_STACK, "min-w-0 flex-1")}>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <SkeletonBar className="h-4 w-28 sm:w-32" />
            <SkeletonBar className="h-5 w-6 rounded-full" />
          </div>
          <SkeletonBar className="mt-1 h-3 w-40 sm:w-52 max-w-full" />
        </div>
      </div>
      {actionClassName ? (
        <SkeletonBar className={cn("shrink-0", actionClassName)} />
      ) : null}
    </div>
  );
}

export type ListDetailBodyList = {
  id: string;
  slug: string;
  title?: string | null;
  urls?: unknown[] | null;
};

/** Live Collaborators / Smart Collections / Activity sections (ListPage + warm soft-nav). */
export function ListDetailBodySections({ list }: { list: ListDetailBodyList }) {
  const urlCount = Array.isArray(list.urls) ? list.urls.length : 0;
  const createInFlight = useStore(collectionCreateInFlight);

  return (
    <>
      <ListDetailSection>
        <PermissionManager
          listId={list.id}
          listTitle={list.title || "Untitled List"}
          listSlug={list.slug}
        />
      </ListDetailSection>

      {urlCount >= 2 || createInFlight ? (
        <ListDetailSection>
          <SmartCollections listId={list.id} listSlug={list.slug} />
        </ListDetailSection>
      ) : null}

      <ListDetailSection className="p-0 sm:p-0">
        <ActivityFeed listId={list.id} limit={ACTIVITY_FEED_LIMIT} />
      </ListDetailSection>
    </>
  );
}

/** Skeletons for Collaborators / SC / Activity while thin soft-nav awaits hydrate. */
export function ListDetailBodySkeletons({
  urlCount,
  knownCollaboratorCount,
}: {
  /** When set, Smart Collections shell only renders when urlCount >= 2. */
  urlCount?: number;
  /**
   * From densified allLists / list.collaborators emails.
   * 0 → empty chrome (no pulse). undefined → unknown → pulse rows.
   */
  knownCollaboratorCount?: number;
} = {}) {
  const showSmartCollections =
    urlCount === undefined ? true : urlCount >= 2;
  const collaboratorsKnownEmpty = knownCollaboratorCount === 0;

  return (
    <div className={LIST_STACK} aria-hidden={!collaboratorsKnownEmpty}>
      <ListDetailSection>
        {collaboratorsKnownEmpty ? (
          <div className={CARD_STACK}>
            <ListDetailSectionHeader
              icon={Shield}
              hue="blue"
              title="Collaborators"
              subtitle="No collaborators yet · Invite others to collaborate on this list"
            />
          </div>
        ) : (
          <div className={cn(CARD_STACK, "animate-pulse")}>
            <SectionHeaderRowSkeleton actionClassName="h-8 w-28 sm:w-36 rounded-lg" />
            <div className="space-y-2 pt-1">
              <SkeletonBar className="h-14 w-full rounded-lg border border-white/10 bg-white/5" />
              <SkeletonBar className="h-14 w-full rounded-lg border border-white/10 bg-white/5" />
            </div>
          </div>
        )}
      </ListDetailSection>

      {showSmartCollections ? (
        <ListDetailSection>
          {/* Collapsed SC shell — no AI fetch / no pulse while thin */}
          <div className="flex items-center justify-between gap-2 sm:gap-2">
            <div className={cn("flex min-w-0 flex-1 items-center", UI_IDENTITY_GAP)}>
              <GlassIconTile icon={Sparkles} hue="violet" />
              <div className={`${HEADING_STACK} min-w-0`}>
                <h3 className="font-medium text-white text-sm sm:text-base truncate">
                  Smart Collections
                </h3>
                <p className="text-xs sm:text-sm text-white/60 truncate">
                  Get AI-powered collection suggestions
                </p>
              </div>
            </div>
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/20 px-2 sm:px-3 py-1 text-xs sm:text-sm text-white/50"
              aria-hidden
            >
              <Telescope className={UI_ICON_CONTROL} />
              View Suggestions
            </span>
          </div>
        </ListDetailSection>
      ) : null}

      <ListDetailSection className="animate-pulse p-0 sm:p-0">
        <div className={CARD_PAD}>
          <SectionHeaderRowSkeleton actionClassName="h-4 w-4 rounded" />
        </div>
      </ListDetailSection>
    </div>
  );
}
