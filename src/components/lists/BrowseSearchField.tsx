/**
 * C7.0: Browse search field only — instant client filter (no Search submit button).
 */
"use client";

import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type BrowseSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function BrowseSearchField({
  value,
  onChange,
  disabled = false,
}: BrowseSearchFieldProps) {
  return (
    <div className="relative flex h-10 w-full items-center">
      <Search
        className={cn(
          UI_ICON_CONTROL,
          "pointer-events-none absolute left-3 z-10 text-white/40",
        )}
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Search lists by title or description..."
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 bg-white/5 border-white/10 pl-10 text-sm text-white placeholder:text-sm placeholder:text-white/40 sm:text-base sm:placeholder:text-base"
        aria-label="Filter public lists"
      />
    </div>
  );
}
