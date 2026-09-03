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
    <div className="relative w-full">
      <Search
        className={cn(
          UI_ICON_CONTROL,
          "absolute left-3 top-1/2 -translate-y-1/2 text-white/40",
        )}
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Search lists by title or description..."
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 sm:pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm sm:text-base py-2 sm:py-2"
        aria-label="Filter public lists"
      />
    </div>
  );
}
