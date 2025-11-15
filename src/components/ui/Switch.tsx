"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked = false, onChange, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer">
        {label && (
          <span className="text-sm text-white/80 font-medium">{label}</span>
        )}
        <div className="relative inline-block w-11 h-6">
          <input
            type="checkbox"
            ref={ref}
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
            {...props}
          />
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-colors duration-200 ease-in-out",
              checked ? "bg-blue-600" : "bg-white/20"
            )}
          />
          <div
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
