"use client";

/**
 * Navbar — sticky glass header.
 * Authenticated: ProfileDropdown holds API Docs / API Status / Logout (PORTABLE_AUTH_UI_GUIDE §2.2).
 * Top-level links stay: Public URL, Analytics, My Lists.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LinkIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { abortRegistry } from "@/utils/abortRegistry";
import { useSession } from "@/hooks/useSession";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { WAS_AUTHED_KEY } from "@/constants/auth";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [wasAuthedHint, setWasAuthedHint] = useState(false);
  const { user, isLoading, isAuthenticated } = useSession();

  // Guide §3 — defer localStorage until mounted (avoid hydration mismatch)
  useEffect(() => {
    setMounted(true);
    try {
      setWasAuthedHint(localStorage.getItem(WAS_AUTHED_KEY) === "1");
    } catch {
      setWasAuthedHint(false);
    }
  }, []);

  // Keep wasAuthed in sync when session resolves
  useEffect(() => {
    if (!mounted) return;
    if (isAuthenticated && user?.email) {
      localStorage.setItem(WAS_AUTHED_KEY, "1");
      setWasAuthedHint(true);
    } else if (!isLoading && !isAuthenticated) {
      localStorage.removeItem(WAS_AUTHED_KEY);
      setWasAuthedHint(false);
    }
  }, [mounted, isAuthenticated, isLoading, user?.email]);

  const showProfileSkeleton =
    mounted && wasAuthedHint && isLoading && !user;
  const showProfile = Boolean(user?.email);

  // Handle navigation with import check
  const handleNavigation = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    // Check if import is active or just completed
    if (typeof window !== "undefined") {
      const isImportActive = (window as any).__bulkImportActive === true;
      const importJustCompleted =
        (window as any).__bulkImportJustCompleted === true;

      if (isImportActive || importJustCompleted) {
        e.preventDefault();
        e.stopPropagation();

        if (process.env.NODE_ENV === "development") {
          console.log(
            `⏸️ [NAVBAR] Navigation blocked - import active: ${isImportActive}, just completed: ${importJustCompleted}`
          );
        }

        // CRITICAL: Force abort any pending requests and clear router cache
        // This ensures RSC requests don't get stuck
        try {
          if (abortRegistry) {
            abortRegistry.forceAbortAllGlobal();
            abortRegistry.stopGlobalInterception();

            if (process.env.NODE_ENV === "development") {
              console.log(
                `🧹 [NAVBAR] Force cleaned up abort registry before navigation`
              );
            }
          }

          const nextRouter = (window as any).__NEXT_DATA__?.router;
          if (nextRouter?.prefetchCache) {
            nextRouter.prefetchCache.clear();
          }

          const routerInstance = (window as any).__nextRouter;
          if (routerInstance) {
            if (routerInstance.isPending !== undefined) {
              routerInstance.isPending = false;
            }
            if (routerInstance.cache) {
              routerInstance.cache.clear?.();
            }
          }

          const nextFetchCache = (window as any).__nextFetchCache;
          if (nextFetchCache) {
            nextFetchCache.clear();
          }

          if (process.env.NODE_ENV === "development") {
            console.log(`🧹 [NAVBAR] Cleared all Next.js router caches`);
          }
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`⚠️ [NAVBAR] Error during cleanup:`, e);
          }
        }

        setTimeout(() => {
          (window as any).__bulkImportActive = false;
          (window as any).__bulkImportJustCompleted = false;
          window.location.href = href;
        }, 100);

        return;
      }
    }
  };

  return (
    <nav className="bg-transparent backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-2 sm:px-0 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={(e) => handleNavigation(e, "/")}
            className="flex items-center gap-2 sm:gap-3 text-base sm:text-xl font-bold text-white hover:text-blue-400 transition-all duration-300 font-mono group"
          >
            <div className="bg-transparent transition-transform duration-300 group-hover:scale-110 shrink-0">
              <LinkIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 stroke-[2.5px] drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            </div>
            {/* Static brand — no typewriter/cursor (stable height/width) */}
            <span className="gradient-color drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight leading-none inline-block min-h-[1.25em]">
              Daily Urlist
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-3 lg:gap-4 flex-wrap">
            <Link
              href="/browse"
              onClick={(e) => handleNavigation(e, "/browse")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base"
            >
              Public URL
            </Link>
            <Link
              href="/business-insights"
              onClick={(e) => handleNavigation(e, "/business-insights")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base"
            >
              Analytics
            </Link>
            <Link
              href="/lists"
              onClick={(e) => handleNavigation(e, "/lists")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base"
            >
              My Lists
            </Link>

            <div className="pl-2 lg:pl-4 size-10 shrink-0 flex items-center justify-center">
              {showProfile && user ? (
                <ProfileDropdown
                  email={user.email}
                  onNavigate={handleNavigation}
                />
              ) : showProfileSkeleton ? (
                <div
                  className="size-10 animate-pulse rounded-full border border-white/20 bg-white/10"
                  aria-hidden
                />
              ) : (
                <div className="size-10" aria-hidden />
              )}
            </div>
          </div>

          {/* Mobile: profile + hamburger */}
          <div className="flex items-center gap-2 sm:hidden">
            <div className="size-10 shrink-0 flex items-center justify-center">
              {showProfile && user ? (
                <ProfileDropdown
                  email={user.email}
                  onNavigate={handleNavigation}
                />
              ) : showProfileSkeleton ? (
                <div
                  className="size-10 animate-pulse rounded-full border border-white/20 bg-white/10"
                  aria-hidden
                />
              ) : (
                <div className="size-10" aria-hidden />
              )}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-white/80 hover:text-white transition-colors"
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
          <div className="sm:hidden mt-3 pb-3 border-t border-white/10 pt-3">
            <div className="flex flex-col gap-3">
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
