"use client";

import { GlassIconTile } from "@/components/ui/GlassIconTile";
import { FileText, Link2, Users, Globe, Lock, TrendingUp } from "lucide-react";
import { CARD_PAD, HEADING_STACK } from "@/lib/ui-spacing";
import { UI_IDENTITY_GAP, type UIIconTileHue } from "@/lib/ui/control-styles";
import {
  GLASS_STAT_CARD,
  type GlassCardHue,
} from "@/lib/ui/glass-card-styles";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface OverviewData {
  totalLists: number;
  totalUrls: number;
  publicLists: number;
  privateLists: number;
  totalCollaborators: number;
  recentLists: number;
  recentUrls: number;
}

interface OverviewCardsProps {
  data: OverviewData;
  isLoading?: boolean;
}

type KpiCard = {
  title: string;
  value: number;
  icon: LucideIcon;
  hue: GlassCardHue;
  subtitle: string;
};

export function OverviewCards({ data, isLoading }: OverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={cn(
              GLASS_STAT_CARD.blue,
              CARD_PAD,
              "animate-pulse opacity-60",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/2" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            </div>
            <div className="mt-3 h-8 bg-white/10 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const recentActivity = data.recentLists + data.recentUrls;

  const cards: KpiCard[] = [
    {
      title: "Total Lists",
      value: data.totalLists,
      icon: FileText,
      hue: "blue",
      subtitle:
        data.recentLists > 0
          ? `+${data.recentLists} in the last 7 days`
          : "Lists in your workspace",
    },
    {
      title: "Total URLs",
      value: data.totalUrls,
      icon: Link2,
      hue: "violet",
      subtitle:
        data.recentUrls > 0
          ? `+${data.recentUrls} in the last 7 days`
          : "URLs across all lists",
    },
    {
      title: "Public Lists",
      value: data.publicLists,
      icon: Globe,
      hue: "emerald",
      subtitle: "Visible to everyone",
    },
    {
      title: "Private Lists",
      value: data.privateLists,
      icon: Lock,
      hue: "amber",
      subtitle: "Only you and collaborators",
    },
    {
      title: "Collaborators",
      value: data.totalCollaborators,
      icon: Users,
      hue: "sky",
      subtitle: "People with list access",
    },
    {
      title: "Recent Activity",
      value: recentActivity,
      icon: TrendingUp,
      hue: "rose",
      subtitle:
        recentActivity > 0
          ? "Adds in the last 7 days"
          : "No recent change",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={cn(GLASS_STAT_CARD[card.hue], CARD_PAD)}
        >
          <div className={cn("flex items-center", UI_IDENTITY_GAP)}>
            <GlassIconTile
              icon={card.icon}
              hue={card.hue as UIIconTileHue}
            />
            <div className={cn(HEADING_STACK, "min-w-0")}>
              <h3 className="text-xs sm:text-sm font-medium text-white/80">
                {card.title}
              </h3>
              <p className="text-xs text-white/60 leading-snug">
                {card.subtitle}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xl font-medium text-white sm:text-2xl">
            {card.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
