"use client";

/**
 * UserAvatar — PORTABLE_AUTH_UI_GUIDE §2.3
 * Cascade: optional src → Robohash(seed) → initials. onError swaps to Robohash.
 */
import { useState, useMemo } from "react";
import { robohashUrl, displayNameFromEmail } from "@/lib/robohash";
import { cn } from "@/lib/utils";

export type UserAvatarProps = {
  /** Primary image URL (OAuth / profile). Falls back to Robohash. */
  src?: string | null;
  /** Stable seed — prefer email. */
  seed: string;
  size?: number;
  alt?: string;
  className?: string;
};

function initialsFromSeed(seed: string): string {
  if (seed.includes("@")) {
    const name = displayNameFromEmail(seed);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || "U").toUpperCase();
  }
  return seed.slice(0, 2).toUpperCase() || "U";
}

export function UserAvatar({
  src,
  seed,
  size = 36,
  alt = "",
  className,
}: UserAvatarProps) {
  const fallback = useMemo(() => robohashUrl(seed, size * 2), [seed, size]);
  const [failed, setFailed] = useState(false);
  const [roboFailed, setRoboFailed] = useState(false);

  const imageSrc = !failed && src ? src : fallback;
  const showInitials = roboFailed || (!src && failed);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden={alt ? undefined : true}
    >
      {showInitials ? (
        <span
          className="font-semibold text-white/90"
          style={{ fontSize: Math.max(10, size * 0.35) }}
        >
          {initialsFromSeed(seed)}
        </span>
      ) : (
        // Native img — avoids next/image optimizer quirks for Robohash / third-party avatars
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={alt}
          width={size}
          height={size}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            if (src && !failed) {
              setFailed(true);
              return;
            }
            setRoboFailed(true);
          }}
        />
      )}
    </span>
  );
}
