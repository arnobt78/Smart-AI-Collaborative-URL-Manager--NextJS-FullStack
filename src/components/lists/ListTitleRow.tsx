/**
 * List identity title row — GlassIconTile + title only; trailing cluster isolated
 * so badge/actions center independently of title wrap height.
 * Single-line titles center with the tile; multi-line keeps icon on the first line.
 */
"use client";

import type { LucideIcon } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import { GlassIconTile } from "@/components/ui/GlassIconTile";
import {
  UI_IDENTITY_GAP,
  type UIIconTileHue,
} from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

type AnyIcon =
  | LucideIcon
  | ComponentType<
      SVGProps<SVGSVGElement> & {
        className?: string;
        "aria-hidden"?: boolean | "true" | "false";
      }
    >;

export type ListTitleRowProps = {
  icon: AnyIcon;
  hue?: UIIconTileHue;
  title: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function ListTitleRow({
  icon,
  hue = "blue",
  title,
  trailing,
  className,
}: ListTitleRowProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [isMultiLine, setIsMultiLine] = useState(false);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const resolveLineHeight = (target: Element) => {
      const style = window.getComputedStyle(target);
      const parsed = Number.parseFloat(style.lineHeight);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      const fontSize = Number.parseFloat(style.fontSize);
      return Number.isFinite(fontSize) && fontSize > 0 ? fontSize * 1.15 : 20;
    };

    const measure = () => {
      const textEl = el.firstElementChild ?? el;
      const lineHeight = resolveLineHeight(textEl);
      setIsMultiLine(el.scrollHeight > lineHeight * 1.5);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [title]);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center justify-between",
        UI_IDENTITY_GAP,
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1",
          UI_IDENTITY_GAP,
          isMultiLine ? "items-start" : "items-center",
        )}
      >
        <GlassIconTile
          icon={icon}
          hue={hue}
          className={isMultiLine ? "self-start" : undefined}
        />
        <div ref={titleRef} className="min-w-0 flex-1">
          {title}
        </div>
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}
