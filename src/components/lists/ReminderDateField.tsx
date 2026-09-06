"use client";

import { useRef } from "react";
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

/** Optional reminder date: one Lucide calendar (native indicator hidden) opens the picker. */
export function ReminderDateField({
  value,
  onChange,
  id = "reminder-date",
  label = "Reminder (optional)",
  className,
  disabled,
}: ReminderDateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
    }
  };

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
          ref={inputRef}
          id={id}
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "pr-10 text-sm sm:text-base shadow-sm font-delicious bg-transparent",
            // Hide native calendar chrome — Lucide button is the only control
            "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={openPicker}
          aria-label="Pick reminder date"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Calendar className={UI_ICON_CONTROL} aria-hidden />
        </button>
      </div>
    </div>
  );
}
