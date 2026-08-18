"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealDirection = "bottom" | "left" | "right" | "appear";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  parallax?: boolean;
};

type RevealStyle = CSSProperties & {
  "--scroll-reveal-delay": string;
  "--scroll-parallax-y"?: string;
};

/** REQ-0017: dependency-free, replayable viewport reveal with optional subtle parallax. */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "bottom",
  parallax = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !parallax) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let frameId = 0;
    const updateParallax = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const progress = Math.min(
          1,
          Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
        );
        element.style.setProperty("--scroll-parallax-y", `${Math.round((progress - 0.5) * 16)}px`);
      });
    };

    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });
    window.addEventListener("resize", updateParallax);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateParallax);
      window.removeEventListener("resize", updateParallax);
    };
  }, [parallax]);

  return (
    <div
      ref={ref}
      className={cn(
        "scroll-reveal",
        `scroll-reveal--${direction}`,
        parallax && "scroll-reveal--parallax",
        isVisible && "scroll-reveal--visible",
        className,
      )}
      style={{ "--scroll-reveal-delay": `${delay}ms` } as RevealStyle}
    >
      {children}
    </div>
  );
}
