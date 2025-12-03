"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LinkIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useTypewriter } from "@/hooks/useTypewriter";
import { IconButton } from "@/components/ui/HoverTooltip";
import { useQueryClient } from "@tanstack/react-query";

export default function Navbar() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
      <div className="mx-auto max-w-7xl px-2 sm:px-0 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            onClick={(e) => handleNavigation(e, "/")}
            className="flex items-center gap-3 text-xl font-bold text-white hover:text-blue-400 transition-all duration-300 font-mono group"
          >
            <div className="bg-transparent transition-transform duration-300 group-hover:scale-110">
              <LinkIcon className="h-8 w-8 text-blue-600 stroke-[2.5px] drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            </div>
            <div className="animate-ease-in-out" suppressHydrationWarning>
              <span className="gradient-color drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] text-2xl font-extrabold tracking-tight">
                {displayText}
                {!isComplete && <span className="typewriter-cursor" />}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="/browse"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-md"
            >
              Public URL
            </a>
            <a
              href="/business-insights"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-md"
            >
              Analytics
            </a>
            <a
              href="/api-status"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-md"
            >
              API Status
            </a>
            <a
              href="/api-docs"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-md"
            >
              API Docs
            </a>
            <a
              href="/lists"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-md"
            >
              My Lists
            </a>

            <div className="pl-12">
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
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
