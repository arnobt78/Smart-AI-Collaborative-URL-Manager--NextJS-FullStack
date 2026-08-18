"use client";

import React, { useEffect, useRef, useState } from "react";
import { Filter, Clock, ArrowUpDown, Star, Bell } from "lucide-react";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { UI_CONTROL_HEIGHT } from "@/lib/ui/control-styles";

interface UrlFilterBarProps {
  sortOption: "latest" | "oldest" | "az" | "za" | "favourite" | "reminders";
  setSortOption: (
    v: "latest" | "oldest" | "az" | "za" | "favourite" | "reminders",
  ) => void;
}

export function UrlFilterBar({ sortOption, setSortOption }: UrlFilterBarProps) {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  return (
    <div className="relative" ref={filterDropdownRef}>
      <HoverTooltip message="Filter and Sort Options" position="top">
        <button
          type="button"
          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
          className={`
            ${UI_CONTROL_HEIGHT} relative flex w-12 items-center justify-center rounded-xl
            transition-all duration-200 shadow-md hover:shadow-lg
            ${
              isFilterDropdownOpen || sortOption !== "latest"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
            }
          `}
          aria-label="Filter and sort URLs"
        >
          <Filter className="h-4 w-4 " />
          {(sortOption !== "latest" || isFilterDropdownOpen) && (
            <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-400 rounded-full ring-2 ring-white/20" />
          )}
        </button>
      </HoverTooltip>

      {/* Dropdown Menu */}
      {isFilterDropdownOpen && (
        <div
          className={`
            absolute right-0 top-full mt-2 w-[280px] max-w-[calc(100vw-1rem)] sm:w-52 md:w-56 sm:max-w-none
            bg-gradient-to-br from-zinc-900/95 to-zinc-800/95
            backdrop-blur-md border border-white/20 rounded-xl shadow-2xl
            py-2 z-50
            animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200
          `}
        >
          {/* Sort Options */}
          <div className="px-1 sm:px-2 py-1">
            <div className="px-2 sm:px-3 py-1 text-xs font-medium text-white/60 uppercase tracking-wider">
              Sort By
            </div>
            <button
              type="button"
              onClick={() => {
                setSortOption("latest");
                setIsFilterDropdownOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2 rounded-lg
                text-xs sm:text-sm font-medium transition-all duration-150
                ${
                  sortOption === "latest"
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Recently Added</span>
              {sortOption === "latest" && (
                <span className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSortOption("oldest");
                setIsFilterDropdownOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2 rounded-lg
                text-xs sm:text-sm font-medium transition-all duration-150
                ${
                  sortOption === "oldest"
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-180" />
              <span>Oldest</span>
              {sortOption === "oldest" && (
                <span className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSortOption("az");
                setIsFilterDropdownOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2 rounded-lg
                text-xs sm:text-sm font-medium transition-all duration-150
                ${
                  sortOption === "az"
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>A-Z</span>
              {sortOption === "az" && (
                <span className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSortOption("za");
                setIsFilterDropdownOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2 rounded-lg
                text-xs sm:text-sm font-medium transition-all duration-150
                ${
                  sortOption === "za"
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-180" />
              <span>Z-A</span>
              {sortOption === "za" && (
                <span className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 mx-1.5 sm:mx-2 my-2" />

          {/* Filter Options */}
          <div className="px-1 sm:px-2 py-1">
            <div className="px-2 sm:px-3 py-1 text-xs font-medium text-white/60 uppercase tracking-wider">
              Filters
            </div>
            <button
              type="button"
              onClick={() => {
                setSortOption("favourite");
                setIsFilterDropdownOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2 rounded-lg
                text-xs sm:text-sm font-medium transition-all duration-150
                ${
                  sortOption === "favourite"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Favourites</span>
              {sortOption === "favourite" && (
                <span className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSortOption("reminders");
                setIsFilterDropdownOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2 rounded-lg
                text-xs sm:text-sm font-medium transition-all duration-150
                ${
                  sortOption === "reminders"
                    ? "bg-orange-500/20 text-orange-300"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Reminders</span>
              {sortOption === "reminders" && (
                <span className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
