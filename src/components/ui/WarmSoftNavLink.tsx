"use client";

import Link from "next/link";
import type { ComponentProps, FocusEvent, MouseEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prepareWarmSoftNav } from "@/lib/soft-nav-cache";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { cn } from "@/lib/utils";

type WarmSoftNavLinkProps = ComponentProps<typeof Link>;

/**
 * C6.8: Next Link that marks warm soft-nav when RQ already holds destination data
 * so segment loading.tsx can skip RoutePageSkeleton.
 */
export function WarmSoftNavLink({
  href,
  onClick,
  onMouseEnter,
  onFocus,
  className,
  children,
  ...props
}: WarmSoftNavLinkProps) {
  const queryClient = useQueryClient();
  const { prefetchIntent } = useWarmSoftNav();
  const hrefString = typeof href === "string" ? href : href.pathname || "/";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    prepareWarmSoftNav(queryClient, hrefString);
    onClick?.(event);
  };

  return (
    <Link
      href={href}
      className={cn(className)}
      onClick={handleClick}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        prefetchIntent(hrefString);
        onMouseEnter?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        prefetchIntent(hrefString);
        onFocus?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
