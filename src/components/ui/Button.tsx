import { ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  GLASS_ACTION_BUTTON,
  GLASS_BUTTON_DISABLED,
  GLASS_BUTTON_ICON_HOVER,
  GLASS_GHOST_BUTTON,
  GLASS_PRIMARY_BUTTON,
} from "@/lib/ui/glass-button-styles";
import { UI_CONTROL_HEIGHT, UI_CONTROL_ICON_GAP, UI_ICON_CONTROL } from "@/lib/ui/control-styles";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "glass"
  | "glassPurple"
  | "glassAmber"
  | "glassEmerald"
  | "glassRose"
  | "glassNeutral"
  | "action"
  | "actionViolet"
  | "actionEmerald"
  | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  /** Shown instead of children while isLoading (spinner + this text only). */
  loadingText?: string;
  href?: string;
}

/**
 * Button — stock-inventory shadow-glow primary/action recipes.
 * Prefer meaningful lucide icons as first child on labeled CTAs.
 * While isLoading: spinner + loadingText only (children hidden).
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      loadingText,
      href,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

    const variants: Record<ButtonVariant, string> = {
      primary: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_PRIMARY_BUTTON.blue}`,
      glass: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_PRIMARY_BUTTON.blue}`,
      glassPurple: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_PRIMARY_BUTTON.violet}`,
      glassAmber: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_PRIMARY_BUTTON.amber}`,
      glassEmerald: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_PRIMARY_BUTTON.emerald}`,
      glassRose: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_PRIMARY_BUTTON.rose}`,
      destructive: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_PRIMARY_BUTTON.rose}`,
      action: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_ACTION_BUTTON.blue}`,
      actionViolet: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_ACTION_BUTTON.violet}`,
      actionEmerald: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_ACTION_BUTTON.emerald}`,
      glassNeutral: GLASS_GHOST_BUTTON,
      secondary: GLASS_GHOST_BUTTON,
      ghost: GLASS_GHOST_BUTTON,
      outline: `${GLASS_BUTTON_ICON_HOVER} ${GLASS_BUTTON_DISABLED} ${GLASS_ACTION_BUTTON.sky}`,
    };

    const sizes = {
      sm: `${UI_CONTROL_HEIGHT} px-3 text-xs sm:text-sm`,
      md: `${UI_CONTROL_HEIGHT} px-4 text-sm`,
      lg: `${UI_CONTROL_HEIGHT} px-6 text-base`,
    };

    const classes = twMerge(
      clsx(baseStyles, UI_CONTROL_ICON_GAP, variants[variant], sizes[size], isLoading && "cursor-wait", className),
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={isLoading || props.disabled}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className={clsx(UI_ICON_CONTROL, "animate-spin")}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText ? <span>{loadingText}</span> : null}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, type ButtonProps };
