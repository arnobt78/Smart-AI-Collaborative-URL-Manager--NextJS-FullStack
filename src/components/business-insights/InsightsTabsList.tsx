/**
 * C7.0: Shared Insights tab row — always painted with page chrome / optimistic surface.
 */
"use client";

import { TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { TrendingUp, Star, Zap, Globe } from "lucide-react";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";

export function InsightsTabsList() {
  return (
    <TabsList className="grid h-11 w-full grid-cols-4 items-center">
      <TabsTrigger
        value="overview"
        className="flex h-full items-center justify-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
      >
        <TrendingUp className={UI_ICON_CONTROL} aria-hidden />
        <span>Overview</span>
      </TabsTrigger>
      <TabsTrigger
        value="popular"
        className="flex h-full items-center justify-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
      >
        <Star className={UI_ICON_CONTROL} aria-hidden />
        <span>Popular</span>
      </TabsTrigger>
      <TabsTrigger
        value="performance"
        className="flex h-full items-center justify-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
      >
        <Zap className={UI_ICON_CONTROL} aria-hidden />
        <span className="hidden sm:inline">Performance</span>
        <span className="sm:hidden">Perf</span>
      </TabsTrigger>
      <TabsTrigger
        value="global"
        className="flex h-full items-center justify-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
      >
        <Globe className={UI_ICON_CONTROL} aria-hidden />
        <span>Global</span>
      </TabsTrigger>
    </TabsList>
  );
}
