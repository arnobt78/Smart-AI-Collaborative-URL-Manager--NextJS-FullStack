"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FileText, Link2, Users, Globe, Lock, TrendingUp } from "lucide-react";

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

export function OverviewCards({ data, isLoading }: OverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-white/10 rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Lists",
      value: data.totalLists,
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      change: data.recentLists,
      changeLabel: "Last 7 days",
    },
    {
      title: "Total URLs",
      value: data.totalUrls,
      icon: Link2,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      change: data.recentUrls,
      changeLabel: "Last 7 days",
    },
    {
      title: "Public Lists",
      value: data.publicLists,
      icon: Globe,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      change: null,
    },
    {
      title: "Private Lists",
      value: data.privateLists,
      icon: Lock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      change: null,
    },
    {
      title: "Collaborators",
      value: data.totalCollaborators,
      icon: Users,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      change: null,
    },
    {
      title: "Recent Activity",
      value: data.recentLists + data.recentUrls,
      icon: TrendingUp,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      change: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className="hover:border-blue-400/30 transition-all"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/70">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1">
                {card.value.toLocaleString()}
              </div>
              {card.change !== null && card.change > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>
                    +{card.change} {card.changeLabel}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
