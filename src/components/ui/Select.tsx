import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    const hasBgClass = className?.includes("bg-");
    // CRITICAL: Match Input component styling for consistency
    // Use same border, padding, and focus styles as Input component
    // CRITICAL: Use min-height instead of fixed height to prevent text cutoff
    // py-3 ensures adequate vertical padding for text visibility
    const defaultClasses =
      "flex min-h-[48px] w-full rounded-md border border-white/20 px-3 py-3 pr-10 text-base text-white placeholder:text-white/60 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer leading-normal";

    return (
      <div className="w-full relative">
        <select
          className={cn(
            defaultClasses,
            !hasBgClass && "bg-transparent",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {/* Custom dropdown arrow - positioned on right, non-interactive */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <svg
            className="w-4 h-4 text-white/60"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };

