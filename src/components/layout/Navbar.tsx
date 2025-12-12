"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LinkIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTypewriter } from "@/hooks/useTypewriter";
import { IconButton } from "@/components/ui/HoverTooltip";
import { useQueryClient } from "@tanstack/react-query";

export default function Navbar() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { displayText, isComplete } = useTypewriter({
    text: "Daily Urlist",
    speed: 200,
    delay: 2500,
  });

  // Handle navigation with import check
  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Check if import is active or just completed
    if (typeof window !== "undefined") {
      const isImportActive = (window as any).__bulkImportActive === true;
      const importJustCompleted = (window as any).__bulkImportJustCompleted === true;
      
      if (isImportActive || importJustCompleted) {
        e.preventDefault();
        e.stopPropagation();
        
        if (process.env.NODE_ENV === "development") {
          console.log(`⏸️ [NAVBAR] Navigation blocked - import active: ${isImportActive}, just completed: ${importJustCompleted}`);
        }
        
        // CRITICAL: Force abort any pending requests and clear router cache
        // This ensures RSC requests don't get stuck
        try {
          const { abortRegistry } = require("@/utils/abortRegistry");
          if (abortRegistry) {
            // Force abort all requests
            abortRegistry.forceAbortAllGlobal();
            
            // Ensure interception is stopped
            abortRegistry.stopGlobalInterception();
            
            if (process.env.NODE_ENV === "development") {
              console.log(`🧹 [NAVBAR] Force cleaned up abort registry before navigation`);
            }
          }
          
          // Clear ALL Next.js router caches aggressively
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
          // Ignore errors
          if (process.env.NODE_ENV === "development") {
            console.warn(`⚠️ [NAVBAR] Error during cleanup:`, e);
          }
        }
        
        // CRITICAL: Always use window.location for forced navigation
        // This bypasses Next.js router and prevents stuck RSC requests
        // Use a small delay to ensure cleanup completes
        setTimeout(() => {
          // Clear flags before navigation
          (window as any).__bulkImportActive = false;
          (window as any).__bulkImportJustCompleted = false;
          
          // Force full page reload to ensure clean state
          window.location.href = href;
        }, 100);
        
        return;
      }
    }
    
    // Normal navigation - let Next.js handle it
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // CRITICAL: Clear ALL React Query cache before logout
        // This ensures no user-specific data remains cached for the next user
        queryClient.clear(); // Remove all queries from cache
        
        // Clear localStorage cache as well (if used)
        if (typeof window !== "undefined") {
          const keys = Object.keys(localStorage);
          keys.forEach((key) => {
            if (key.startsWith("react-query:")) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // Clear browser session/cookies and redirect to home (which will show Auth page)
        // Use window.location.href to force a full page reload and clear all state
        window.location.href = "/";
      } else {
        setIsLoggingOut(false);
      }
    } catch (error) {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-transparent backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand - Responsive sizing */}
          <Link
            href="/"
            onClick={(e) => handleNavigation(e, "/")}
            className="flex items-center gap-2 sm:gap-3 text-base sm:text-xl font-bold text-white hover:text-blue-400 transition-all duration-300 font-mono group"
          >
            <div className="bg-transparent transition-transform duration-300 group-hover:scale-110">
              <LinkIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 stroke-[2.5px] drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            </div>
            <div className="animate-ease-in-out" suppressHydrationWarning>
              <span className="gradient-color drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight">
                {displayText}
                {!isComplete && <span className="typewriter-cursor" />}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
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
              href="/api-status"
              onClick={(e) => handleNavigation(e, "/api-status")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base"
            >
              API Status
            </Link>
            <Link
              href="/api-docs"
              onClick={(e) => handleNavigation(e, "/api-docs")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base"
            >
              API Docs
            </Link>
            <Link
              href="/lists"
              onClick={(e) => handleNavigation(e, "/lists")}
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm lg:text-base"
            >
              My Lists
            </Link>

            <div className="pl-4 lg:pl-8">
              <IconButton
                icon={
                  <ArrowRightStartOnRectangleIcon
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${isLoggingOut ? "animate-pulse" : ""}`}
                  />
                }
                onClick={handleLogout}
                tooltip={isLoggingOut ? "Logging out..." : "Logout"}
                variant="default"
              />
            </div>
          </div>

          {/* Mobile Menu Button - Visible only on mobile */}
          <div className="flex items-center gap-2 sm:hidden">
            <IconButton
              icon={
                <ArrowRightStartOnRectangleIcon
                  className={`h-5 w-5 ${isLoggingOut ? "animate-pulse" : ""}`}
                />
              }
              onClick={handleLogout}
              tooltip={isLoggingOut ? "Logging out..." : "Logout"}
              variant="default"
            />
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

        {/* Mobile Menu - Dropdown on mobile */}
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
                href="/api-status"
                onClick={(e) => {
                  handleNavigation(e, "/api-status");
                  setIsMobileMenuOpen(false);
                }}
                className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm py-2 px-2 rounded-lg hover:bg-white/5"
              >
                API Status
              </Link>
              <Link
                href="/api-docs"
                onClick={(e) => {
                  handleNavigation(e, "/api-docs");
                  setIsMobileMenuOpen(false);
                }}
                className="text-white/80 hover:text-white font-medium transition-colors font-mono text-sm py-2 px-2 rounded-lg hover:bg-white/5"
              >
                API Docs
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
