"use client";

/**
 * Navbar — sticky header: transparent at top, contained glass on scroll.
 * Authenticated: ProfileDropdown holds API Docs / API Status / Logout (PORTABLE_AUTH_UI_GUIDE §2.2).
 * Top-level links stay: Public URL, Analytics, My Lists.
 * initialWasAuthed from SSR cookie → profile skeleton on first paint (no empty→jump).
 * REQ-0015: the shared chrome row keeps interactive header content centered in 56px.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { abortRegistry } from "@/utils/abortRegistry";
import { useSession } from "@/hooks/useSession";
import { useWasAuthedHint } from "@/hooks/useWasAuthedHint";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { WarmSoftNavLink } from "@/components/ui/WarmSoftNavLink";
import { UI_CHROME_ROW, UI_ICON_CONTROL, UI_ICON_DECORATIVE } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

const SCROLL_GLASS_THRESHOLD_PX = 8;

const NAV_LINK_BASE =
  "font-medium transition-colors font-mono text-sm lg:text-base leading-none";
const NAV_LINK_IDLE = "text-white/80 hover:text-white";
const NAV_LINK_ACTIVE =
  "text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]";
const NAV_LINK_MOBILE_BASE =
  "font-medium transition-colors font-mono text-sm py-2 px-2 rounded-lg";
const NAV_LINK_MOBILE_IDLE = "text-white/80 hover:text-white hover:bg-white/5";
const NAV_LINK_MOBILE_ACTIVE =
  "text-white bg-white/5 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]";

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/lists") {
    return pathname === "/lists" || pathname.startsWith("/lists/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}


export type NavbarProps = {
  /** From cookies() urlist_was_authed — skeleton on first paint for returning users */
  initialWasAuthed?: boolean;
};

export default function Navbar({ initialWasAuthed = false }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, isLoading } = useSession();
  const wasAuthedHint = useWasAuthedHint(initialWasAuthed);
  const browseActive = isNavActive(pathname, "/browse");
  const insightsActive = isNavActive(pathname, "/business-insights");
  const listsActive = isNavActive(pathname, "/lists");


  const showProfile = Boolean(user?.email) && wasAuthedHint;
  // Skeleton as soon as SSR/client hint says returning user — never empty slot jump
  // C7.7: force-guest keeps wasAuthedHint false → no avatar while signout lands
  const showProfileSkeleton =
    !showProfile && wasAuthedHint && (isLoading || !user);

  useEffect(() => {
    const updateScrolled = () => {
      setScrolled(window.scrollY > SCROLL_GLASS_THRESHOLD_PX);
    };
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  const showGlass = scrolled || isMobileMenuOpen;

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
      className={cn(
        "sticky top-0 z-50 shrink-0 isolation-isolate bg-transparent transition-colors duration-200",
        showGlass && "backdrop-blur-md",
        isMobileMenuOpen
          ? "min-h-14 overflow-visible"
          : "h-14 overflow-hidden",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl flex-col px-2 sm:px-4",
          isMobileMenuOpen ? "overflow-visible" : "overflow-hidden",
        )}
      >
        <div
          className={cn(
            UI_CHROME_ROW,
            "h-14",
            isMobileMenuOpen ? "overflow-visible" : "overflow-hidden",
          )}
        >
          <Link
            href="/"
            onClick={(e) => handleNavigation(e, "/")}
            className="flex h-10 items-center gap-2 text-base sm:text-xl font-medium text-white hover:text-blue-400 transition-colors font-mono group"
          >
            <div className="bg-transparent shrink-0 flex items-center">
              <LinkIcon
                className={cn(
                  UI_ICON_DECORATIVE,
                  "text-blue-600 stroke-[2.5px] drop-shadow-[0_0_6px_rgba(59,130,246,0.35)]",
                )}
              />
            </div>
            {/* Fixed line box — font swap must not change nav / avatar vertical align */}
            <span className="gradient-color drop-shadow-[0_0_8px_rgba(59,130,246,0.2)] text-sm lg:text-base font-medium tracking-tight leading-none inline-flex h-8 items-center">
              Daily Urlist
            </span>
          </Link>

          {/* Desktop Navigation — nowrap so avatar never wraps/squeezes */}
          <div className="hidden sm:flex h-10 items-center gap-4 lg:gap-6 flex-nowrap">
            <WarmSoftNavLink
              href="/browse"
              onClick={(e) => handleNavigation(e, "/browse")}
              aria-current={browseActive ? "page" : undefined}
              className={cn(
                NAV_LINK_BASE,
                browseActive ? NAV_LINK_ACTIVE : NAV_LINK_IDLE,
              )}
            >
              Public URL
            </WarmSoftNavLink>
            <WarmSoftNavLink
              href="/business-insights"
              onClick={(e) => handleNavigation(e, "/business-insights")}
              aria-current={insightsActive ? "page" : undefined}
              className={cn(
                NAV_LINK_BASE,
                insightsActive ? NAV_LINK_ACTIVE : NAV_LINK_IDLE,
              )}
            >
              Analytics
            </WarmSoftNavLink>
            <WarmSoftNavLink
              href="/lists"
              onClick={(e) => handleNavigation(e, "/lists")}
              aria-current={listsActive ? "page" : undefined}
              className={cn(
                NAV_LINK_BASE,
                listsActive ? NAV_LINK_ACTIVE : NAV_LINK_IDLE,
              )}
            >
              My Lists
            </WarmSoftNavLink>


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
                <XMarkIcon className={UI_ICON_CONTROL} />
              ) : (
                <Bars3Icon className={UI_ICON_CONTROL} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu — Browse / Analytics / Lists only (API + Logout live in ProfileDropdown) */}
        {isMobileMenuOpen && (
          <div className="sm:hidden pb-3 border-t border-white/10 pt-2">
            <div className="flex flex-col gap-2">
              <WarmSoftNavLink
                href="/browse"
                onClick={(e) => {
                  handleNavigation(e, "/browse");
                  setIsMobileMenuOpen(false);
                }}
                aria-current={browseActive ? "page" : undefined}
                className={cn(
                  NAV_LINK_MOBILE_BASE,
                  browseActive ? NAV_LINK_MOBILE_ACTIVE : NAV_LINK_MOBILE_IDLE,
                )}
              >
                Public URL
              </WarmSoftNavLink>
              <WarmSoftNavLink
                href="/business-insights"
                onClick={(e) => {
                  handleNavigation(e, "/business-insights");
                  setIsMobileMenuOpen(false);
                }}
                aria-current={insightsActive ? "page" : undefined}
                className={cn(
                  NAV_LINK_MOBILE_BASE,
                  insightsActive ? NAV_LINK_MOBILE_ACTIVE : NAV_LINK_MOBILE_IDLE,
                )}
              >
                Analytics
              </WarmSoftNavLink>
              <WarmSoftNavLink
                href="/lists"
                onClick={(e) => {
                  handleNavigation(e, "/lists");
                  setIsMobileMenuOpen(false);
                }}
                aria-current={listsActive ? "page" : undefined}
                className={cn(
                  NAV_LINK_MOBILE_BASE,
                  listsActive ? NAV_LINK_MOBILE_ACTIVE : NAV_LINK_MOBILE_IDLE,
                )}
              >
                My Lists
              </WarmSoftNavLink>
            </div>

          </div>
        )}
      </div>
    </nav>
  );
}
