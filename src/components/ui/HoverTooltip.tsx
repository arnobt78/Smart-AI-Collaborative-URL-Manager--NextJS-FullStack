"use client";

import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

interface HoverTooltipProps {
  message: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  usePortal?: boolean; // Option to render tooltip via portal to escape overflow containers
}

export function HoverTooltip({
  message,
  children,
  position = "top",
  usePortal = false,
}: HoverTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state to prevent portal rendering during SSR or after unmount
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 ",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  };

  useEffect(() => {
    if (
      isVisible &&
      usePortal &&
      triggerRef.current &&
      typeof window !== "undefined" &&
      document.body
    ) {
      const updatePosition = () => {
        // Check if ref still exists (component might have unmounted)
        if (!triggerRef.current || !document.body) return;
        const rect = triggerRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // Estimate tooltip width (approximate based on message length)
        // Average character width is ~7px, padding is 12px on each side
        const estimatedTooltipWidth = message.length * 7 + 24;
        const tooltipHalfWidth = estimatedTooltipWidth / 2;

        // Get viewport and container dimensions
        const viewportWidth = window.innerWidth;
        const padding = 16; // Minimum padding from edges

        // Find max-w-7xl container if exists (80rem = 1280px)
        const maxW7xl = 1280;
        const containerWidth = Math.min(viewportWidth, maxW7xl);
        const containerLeft = Math.max(0, (viewportWidth - containerWidth) / 2);

        switch (position) {
          case "top":
            // Position above the element, centered horizontally
            top = rect.top - 8; // 8px margin ()
            left = rect.left + rect.width / 2;

            // Adjust to stay within container bounds
            const minLeft = containerLeft + padding + tooltipHalfWidth;
            const maxLeft =
              containerLeft + containerWidth - padding - tooltipHalfWidth;
            left = Math.max(minLeft, Math.min(maxLeft, left));
            break;
          case "bottom":
            top = rect.bottom + 8; // 8px margin (mt-2)
            left = rect.left + rect.width / 2;

            // Adjust to stay within container bounds
            const minLeftBottom = containerLeft + padding + tooltipHalfWidth;
            const maxLeftBottom =
              containerLeft + containerWidth - padding - tooltipHalfWidth;
            left = Math.max(minLeftBottom, Math.min(maxLeftBottom, left));
            break;
          case "left":
            top = rect.top + rect.height / 2;
            left = rect.left - 8; // 8px margin (mr-2)
            break;
          case "right":
            top = rect.top + rect.height / 2;
            left = rect.right + 8; // 8px margin (ml-2)
            break;
        }

        setTooltipPosition({ top, left });
      };

      // Update position immediately
      updatePosition();

      // Update on scroll and resize
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isVisible, message.length, position, usePortal]);

  const tooltipContent = usePortal ? (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        transform:
          position === "top"
            ? "translate(-50%, -100%)"
            : position === "bottom"
              ? "translate(-50%, 0)"
              : position === "left"
                ? "translate(-100%, -50%)"
                : "translate(0, -50%)",
      }}
      role="tooltip"
    >
      <div className="bg-gray-900 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg shadow-lg whitespace-normal sm:whitespace-nowrap max-w-[calc(100vw-2rem)] sm:max-w-none font-delicious animate-in fade-in-0 zoom-in-95 duration-200">
        {message}
      </div>
    </div>
  ) : (
    <div
      className={`absolute z-50 ${positionClasses[position]}`}
      role="tooltip"
    >
      <div className="bg-gray-900 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-lg shadow-lg whitespace-normal sm:whitespace-nowrap max-w-[calc(100vw-2rem)] sm:max-w-none font-delicious animate-in fade-in-0 zoom-in-95 duration-200 pointer-events-none">
        {message}
      </div>
    </div>
  );

  return (
    <>
      <span
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {!usePortal && isVisible && tooltipContent}
      </span>
      {isVisible &&
        usePortal &&
        isMounted &&
        typeof window !== "undefined" &&
        document.body &&
        triggerRef.current &&
        ReactDOM.createPortal(tooltipContent, document.body)}
    </>
  );
}

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  tooltip: string;
  variant?: "default" | "primary" | "danger";
  className?: string;
  disabled?: boolean; // Disabled state for viewer permissions
  badge?: number;
}

export function IconButton({
  icon,
  onClick,
  href,
  tooltip,
  variant = "default",
  className = "",
  disabled = false,
  badge,
}: IconButtonProps) {
  const variantClasses = {
    default:
      "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 hover:border-white/30",
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700",
    danger:
      "bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50",
  };

  const safeHref = typeof href === "string" ? href.trim() : "";
  // Empty/whitespace href is not a navigable link — disable instead of a silent no-op button.
  const missingHref = href !== undefined && !safeHref;
  const isDisabled = disabled || missingHref;

  const disabledClasses = isDisabled
    ? "opacity-40 cursor-not-allowed hover:scale-100 hover:shadow-sm"
    : "hover:scale-110 active:scale-95";

  const content = (
    <>
      <div className="w-5 h-5">{icon}</div>
      {badge && badge > 0 ? (
        <span aria-hidden className="absolute -right-1 -top-1 min-w-4 rounded-full border border-zinc-950 bg-blue-500 px-1 text-[10px] font-semibold leading-4 text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </>
  );

  const buttonClassName = `relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${disabledClasses} shadow-sm hover:shadow-md ${variantClasses[variant]} ${className}`;
  const buttonContent = safeHref && !isDisabled ? (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      onClick={onClick}
      aria-label={tooltip}
      className={buttonClassName}
    >
      {content}
    </a>
  ) : (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-label={tooltip}
      className={buttonClassName}
    >
      {content}
    </button>
  );

  // Don't show tooltip if disabled (to prevent hover confusion)
  if (isDisabled) {
    return buttonContent;
  }

  return (
    <HoverTooltip message={tooltip} position="top">
      {buttonContent}
    </HoverTooltip>
  );
}
