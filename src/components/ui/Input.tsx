import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { UI_FORM_CONTROL } from "@/lib/ui/control-styles";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const hasBgClass = className?.includes("bg-");
    const defaultClasses = `flex ${UI_FORM_CONTROL}`;

    return (
      <div className="w-full">
        <input
          className={cn(
            defaultClasses,
            !hasBgClass && "bg-transparent",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
