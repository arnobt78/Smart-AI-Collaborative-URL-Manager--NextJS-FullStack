import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const hasBgClass = className?.includes("bg-");
    const defaultClasses =
      "flex min-h-[80px] w-full rounded-md border border-white/20 px-3 py-2 text-base text-white placeholder:text-white/60 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 resize-y";

    return (
      <div className="w-full">
        <textarea
          className={cn(
            defaultClasses,
            !hasBgClass && "bg-transparent",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
