import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-blue-500/20 text-blue-400 border-blue-400/30",
      secondary: "bg-white/10 text-white/80 border-white/20",
      success: "bg-green-500/20 text-green-400 border-green-400/30",
      warning: "bg-yellow-500/20 text-yellow-400 border-yellow-400/30",
      destructive: "bg-red-500/20 text-red-400 border-red-400/30",
      outline: "border border-white/20 text-white/80",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
