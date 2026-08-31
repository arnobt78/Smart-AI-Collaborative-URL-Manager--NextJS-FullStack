"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { UI_GLASS_MENU_PANEL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

export type GlassPortalMenuProps = {
  open: boolean;
  onClose: () => void;
  /** Trigger element used for getBoundingClientRect positioning. */
  triggerRef: RefObject<HTMLElement | null>;
  /** Optional outer ref for click-outside (trigger + panel). */
  containerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  /** Menu width utility classes. */
  widthClassName?: string;
  role?: "menu" | "listbox";
};

type PanelPos = { top: number; left: number; minWidth: number };

const VIEWPORT_PAD = 8;
const GAP = 6;
/** Used before the panel is measurable so first paint can flip correctly. */
const ESTIMATED_PANEL_HEIGHT = 200;

function computePos(
  trigger: HTMLElement,
  panelWidth: number,
  panelHeight: number,
): PanelPos {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(panelWidth, rect.width);
  let left = rect.right - width;
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - width - VIEWPORT_PAD),
  );

  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
  const spaceAbove = rect.top - VIEWPORT_PAD;
  const preferAbove =
    rect.bottom + GAP + panelHeight > window.innerHeight - VIEWPORT_PAD &&
    spaceAbove > spaceBelow;

  let top = preferAbove
    ? rect.top - GAP - panelHeight
    : rect.bottom + GAP;

  const maxTop = window.innerHeight - panelHeight - VIEWPORT_PAD;
  top = Math.max(VIEWPORT_PAD, Math.min(top, Math.max(VIEWPORT_PAD, maxTop)));

  return { top, left, minWidth: width };
}

/**
 * Body-portaled glass dropdown panel aligned to a trigger (bottom-end, flips up).
 * Avoids being clipped / stacked under later list-detail cards.
 */
export function GlassPortalMenu({
  open,
  onClose,
  triggerRef,
  containerRef,
  children,
  className,
  widthClassName = "w-56",
  role = "menu",
}: GlassPortalMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const panel = panelRef.current;
    const measuredW = panel?.offsetWidth ?? 224;
    const measuredH = panel?.offsetHeight || ESTIMATED_PANEL_HEIGHT;
    setPos(computePos(trigger, measuredW, measuredH));
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
    // Second pass after children paint so flip uses real height.
    const raf = requestAnimationFrame(() => updatePosition());
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      if (containerRef?.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, triggerRef, containerRef]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      className={cn(UI_GLASS_MENU_PANEL, widthClassName, className)}
      style={
        pos
          ? {
              top: pos.top,
              left: pos.left,
              minWidth: pos.minWidth,
            }
          : { visibility: "hidden", top: 0, left: 0 }
      }
    >
      {children}
    </div>,
    document.body,
  );
}
