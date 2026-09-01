"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, Clock, ArrowUpDown, Star, Bell } from "lucide-react";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { UI_CONTROL_HEIGHT } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type SortOption =
  | "latest"
  | "oldest"
  | "az"
  | "za"
  | "favourite"
  | "reminders";

interface UrlFilterBarProps {
  sortOption: SortOption;
  setSortOption: (v: SortOption) => void;
}

const SORT_OPTIONS: {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
  selectedClass: string;
  dotClass: string;
}[] = [
  {
    value: "latest",
    label: "Recently Added",
    icon: <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
    selectedClass: "bg-blue-600/20 text-blue-300",
    dotClass: "bg-blue-400",
  },
  {
    value: "oldest",
    label: "Oldest",
    icon: <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-180" />,
    selectedClass: "bg-blue-600/20 text-blue-300",
    dotClass: "bg-blue-400",
  },
  {
    value: "az",
    label: "A-Z",
    icon: <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
    selectedClass: "bg-blue-600/20 text-blue-300",
    dotClass: "bg-blue-400",
  },
  {
    value: "za",
    label: "Z-A",
    icon: <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-180" />,
    selectedClass: "bg-blue-600/20 text-blue-300",
    dotClass: "bg-blue-400",
  },
];

const FILTER_OPTIONS: {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
  selectedClass: string;
  dotClass: string;
}[] = [
  {
    value: "favourite",
    label: "Favourites",
    icon: <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
    selectedClass: "bg-yellow-500/20 text-yellow-300",
    dotClass: "bg-yellow-400",
  },
  {
    value: "reminders",
    label: "Reminders",
    icon: <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
    selectedClass: "bg-orange-500/20 text-orange-300",
    dotClass: "bg-orange-400",
  },
];

function FilterRadioItem({
  value,
  label,
  icon,
  selectedClass,
  dotClass,
  sortOption,
}: {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
  selectedClass: string;
  dotClass: string;
  sortOption: SortOption;
}) {
  const isSelected = sortOption === value;
  return (
    <DropdownMenuRadioItem
      value={value}
      className={cn(
        "cursor-pointer gap-2 pl-2 sm:pl-3 text-xs sm:text-sm font-medium [&>span:first-child]:hidden",
        isSelected ? selectedClass : "text-white/80",
      )}
    >
      {icon}
      <span>{label}</span>
      {isSelected ? (
        <span
          className={cn(
            "ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
            dotClass,
          )}
        />
      ) : null}
    </DropdownMenuRadioItem>
  );
}

export function UrlFilterBar({ sortOption, setSortOption }: UrlFilterBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = sortOption !== "latest" || menuOpen;

  return (
    <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
      <HoverTooltip message="Filter and Sort Options" position="top">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              UI_CONTROL_HEIGHT,
              "relative flex w-12 items-center justify-center rounded-xl transition-all duration-200 shadow-md hover:shadow-lg",
              isActive
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20",
            )}
            aria-label="Filter and sort URLs"
          >
            <Filter className="h-4 w-4" />
            {isActive ? (
              <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-400 rounded-full ring-2 ring-white/20" />
            ) : null}
          </button>
        </DropdownMenuTrigger>
      </HoverTooltip>
      <DropdownMenuContent
        align="end"
        className="w-[280px] max-w-[calc(100vw-1rem)] sm:w-52 md:w-56 sm:max-w-none"
      >
        <DropdownMenuRadioGroup
          value={sortOption}
          onValueChange={(value) => setSortOption(value as SortOption)}
        >
          <DropdownMenuLabel className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Sort By
          </DropdownMenuLabel>
          {SORT_OPTIONS.map((option) => (
            <FilterRadioItem key={option.value} {...option} sortOption={sortOption} />
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Filters
          </DropdownMenuLabel>
          {FILTER_OPTIONS.map((option) => (
            <FilterRadioItem key={option.value} {...option} sortOption={sortOption} />
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
