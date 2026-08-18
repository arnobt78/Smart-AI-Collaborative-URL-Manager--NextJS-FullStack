import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { UI_FORM_CONTROL } from "@/lib/ui/control-styles";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    const hasBgClass = className?.includes("bg-");
    const defaultClasses = `${UI_FORM_CONTROL} flex appearance-none cursor-pointer pr-10 leading-normal`;

    return (
      <div className="w-full relative">
        <select
          className={cn(
            defaultClasses,
            !hasBgClass && "bg-transparent",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className,
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
