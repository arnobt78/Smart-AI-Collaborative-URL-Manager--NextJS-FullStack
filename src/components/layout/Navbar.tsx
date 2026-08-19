"use client";

/**
 * Navbar — sticky glass header.
 * Authenticated: ProfileDropdown holds API Docs / API Status / Logout (PORTABLE_AUTH_UI_GUIDE §2.2).
 * Top-level links stay: Public URL, Analytics, My Lists.
 * initialWasAuthed from SSR cookie → profile skeleton on first paint (no empty→jump).
 * REQ-0015: the shared chrome row keeps interactive header content centered in 56px.
 */
import Link from "next/link";
import { LinkIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { abortRegistry } from "@/utils/abortRegistry";
import { useSession } from "@/hooks/useSession";
import { useWasAuthedHint } from "@/hooks/useWasAuthedHint";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { UI_CHROME_ROW } from "@/lib/ui/control-styles";

export type NavbarProps = {
  /** From cookies() urlist_was_authed — skeleton on first paint for returning users */
  initialWasAuthed?: boolean;
};

export default function Navbar({ initialWasAuthed = false }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading } = useSession();
  const wasAuthedHint = useWasAuthedHint(initialWasAuthed);

  const showProfile = Boolean(user?.email);
  // Skeleton as soon as SSR/client hint says returning user — never empty slot jump
  const showProfileSkeleton =
    !showProfile && wasAuthedHint && (isLoading || !user);

  // Handle navigation with import check
  const handleNavigation = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (typeof window !== "undefined") {
      const win = window;
      const isImportActive = win.__bulkImportActive === true;
      const importJustCompleted = win.__bulkImportJustCompleted === true;

      if (isImportActive || importJustCompleted) {
        e.preventDefault();
        e.stopPropagation();


        // CRITICAL: Force abort any pending requests and clear router cache
        // This ensures RSC requests don't get stuck
        try {
          if (abortRegistry) {
            abortRegistry.forceAbortAllGlobal();
            abortRegistry.stopGlobalInterception();

          }

          const routerInstance = win.__nextRouter;
          if (routerInstance) {
            if (routerInstance.isPending !== undefined) {
              routerInstance.isPending = false;
            }
            if (routerInstance.cache) {
              routerInstance.cache.clear?.();
            }
          }

          const nextFetchCache = win.__nextFetchCache;
          if (nextFetchCache?.clear) {
            nextFetchCache.clear();
          }

        } catch (_err) {
        }

        setTimeout(() => {
          win.__bulkImportActive = false;
          win.__bulkImportJustCompleted = false;
          window.location.href = href;
        }, 100);

        return;
      }
    }
  };

  const renderProfileSlot = () => (
    // size-10 shell — ProfileDropdown positions menu with top-full (below trigger)
    <div className="relative size-10 min-h-10 min-w-10 shrink-0 overflow-visible">
      {showProfile && user ? (
        <ProfileDropdown email={user.email} onNavigate={handleNavigation} />
      ) : showProfileSkeleton ? (
        <div
          className="size-10 animate-pulse rounded-full border border-white/20 bg-white/10"
          aria-hidden
        />
      ) : (
        <div className="size-10" aria-hidden />
      )}
    </div>
  );

  return (
    <nav
      className={`bg-transparent backdrop-blur-md sticky top-0 z-50 shrink-0 overflow-visible ${
        isMobileMenuOpen ? "min-h-14" : "h-14"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col overflow-visible px-2 sm:px-4">
        <div className={`${UI_CHROME_ROW} h-14 overflow-visible`}>
          <Link
            href="/"
            onClick={(e) => handleNavigation(e, "/")}
            className="flex h-10 items-center gap-2 text-base sm:text-xl font-medium text-white hover:text-blue-400 transition-colors font-mono group"
          >
            <div className="bg-transparent shrink-0 flex items-center">
              <LinkIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 stroke-[2.5px] drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            </div>
            {/* Fixed line box — font swap must not change nav / avatar vertical align */}
            <span className="gradient-color drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] text-sm lg:text-base font-medium tracking-tight leading-none inline-flex h-8 items-center">
              Daily Urlist
            </span>
          </Link>

          {/* Desktop Navigation — nowrap so avatar never wraps/squeezes */}
          <div className="hidden sm:flex h-10 items-center gap-4 lg:gap-6 flex-nowrap">
            <Link
              href="/browse"
              onClick={(e) => handleNavigation(e, "/browse")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base leading-none"
            >
              Public URL
            </Link>
            <Link
              href="/business-insights"
              onClick={(e) => handleNavigation(e, "/business-insights")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base leading-none"
            >
              Analytics
            </Link>
            <Link
              href="/lists"
              onClick={(e) => handleNavigation(e, "/lists")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base leading-none"
            >
              My Lists
            </Link>

            {/* Padding outside size-10 — padding+size on same node squashed the avatar */}
            <div className="pl-2 lg:pl-4 shrink-0 flex items-center">
              {renderProfileSlot()}
            </div>
          </div>

          {/* Mobile: profile + hamburger */}
          <div className="flex h-10 items-center gap-2 sm:hidden">
            {renderProfileSlot()}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex size-10 items-center justify-center p-0 text-white/80 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu — Browse / Analytics / Lists only (API + Logout live in ProfileDropdown) */}
        {isMobileMenuOpen && (
          <div className="sm:hidden pb-3 border-t border-white/10 pt-2">
            <div className="flex flex-col gap-2">
              <Link
                href="/browse"
                onClick={(e) => {
                  handleNavigation(e, "/browse");
                  setIsMobileMenuOpen(false);
                }}
                className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm py-2 px-2 rounded-lg hover:bg-white/5"
              >
                Public URL
              </Link>
              <Link
                href="/business-insights"
                onClick={(e) => {
                  handleNavigation(e, "/business-insights");
                  setIsMobileMenuOpen(false);
                }}
                className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm py-2 px-2 rounded-lg hover:bg-white/5"
              >
                Analytics
              </Link>
              <Link
                href="/lists"
                onClick={(e) => {
                  handleNavigation(e, "/lists");
                  setIsMobileMenuOpen(false);
                }}
                className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm py-2 px-2 rounded-lg hover:bg-white/5"
              >
                My Lists
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
