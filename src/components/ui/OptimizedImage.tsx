"use client";

import Image from "next/image";
import { getPublicImageUrl } from "@/lib/cloudinary";
import type { ImageProps } from "next/image";
import { useMemo } from "react";

// Make Cloudinary cloud name available on client side
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__CLOUDINARY_CLOUD_NAME__ =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
}

interface OptimizedImageProps extends Omit<ImageProps, "src" | "alt"> {
  src: string;
  alt: string; // Required for accessibility
  publicAsset?: boolean; // If true, optimize via Cloudinary
  optimizeOptions?: {
    width?: number;
    height?: number;
    quality?: "auto" | number;
  };
}

/**
 * OptimizedImage component that uses Cloudinary for optimization
 * For public folder images, it automatically optimizes via Cloudinary
 * For external images, it passes through to Next.js Image optimization
 */
export function OptimizedImage({
  src,
  alt,
  publicAsset = false,
  optimizeOptions,
  ...props
}: OptimizedImageProps) {
  // Use useMemo with consistent logic that works on both server and client
  const optimizedSrc = useMemo(() => {
    if (!publicAsset || !src) return src;

    // Only optimize if it's a public folder asset (starts with /)
    if (src.startsWith("/")) {
      // This function already handles localhost detection internally
      // and returns the original path in development for consistency
      return getPublicImageUrl(src, {
        width: optimizeOptions?.width,
        height: optimizeOptions?.height,
        quality: optimizeOptions?.quality || "auto",
      });
    }

    return src;
  }, [src, publicAsset, optimizeOptions]);

  // Suppress hydration warning for public assets - getPublicImageUrl ensures
  // server and client return the same value (original path in dev, Cloudinary URL in prod)
  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      {...props}
      suppressHydrationWarning={publicAsset}
    />
  );
}
