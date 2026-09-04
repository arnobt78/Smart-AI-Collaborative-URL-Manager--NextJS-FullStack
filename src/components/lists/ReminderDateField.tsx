"use client";

import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type ReminderDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

/** Optional reminder date with calendar chrome right-justified (Add + Edit parity). */
export function ReminderDateField({
  value,
  onChange,
  id = "reminder-date",
  label = "Reminder (optional)",
  className,
  disabled,
}: ReminderDateFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm sm:text-base font-medium text-white"
      >
        {label}
      </label>
      <div className="relative mt-2">
        <Input
          id={id}
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "pr-10 text-sm sm:text-base shadow-sm font-delicious bg-transparent",
          )}
        />
        <Calendar
          className={cn(
            UI_ICON_CONTROL,
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50",
          )}
          aria-hidden
        />
      </div>
    </div>
  );
}
