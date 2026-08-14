"use client";

/**
 * SafeImage — next/image with native <img> fallback (REQ-0003).
 *
 * Tries Vercel/Next image optimization first. If that fails (quota, 402, bad
 * upstream), re-renders a plain <img> with the same string src so the preview
 * still shows without going through /_next/image.
 *
 * Parent onError is called only after the native fallback also fails — so
 * callers like UrlCard can show a placeholder without unmounting SafeImage
 * before the native path has a chance to succeed.
 *
 * onLoad is forwarded on both paths so loading spinners clear after native success.
 *
 * @see docs/SAFE_IMAGE_REUSABLE_COMPONENT.md
 */

import { cn } from "@/lib/utils";
import Image, { type ImageProps } from "next/image";
import { useCallback, useState, type SyntheticEvent } from "react";

type SafeImageProps = ImageProps;

export function SafeImage({
  alt,
  src,
  className,
  fill,
  width,
  height,
  onError,
  onLoad,
  priority,
  loading,
  ...rest
}: SafeImageProps) {
  const [useNative, setUseNative] = useState(false);
  const resolvedSrc = typeof src === "string" ? src : "";

  /** Optimized Image failed — switch to native without notifying parent yet */
  const handleOptimizedError = useCallback(
    (e: SyntheticEvent<HTMLImageElement, Event>) => {
      if (resolvedSrc) {
        setUseNative(true);
        return;
      }
      // Non-string StaticImport: no native URL to fall back to
      onError?.(e);
    },
    [onError, resolvedSrc]
  );

  /** Native <img> also failed — notify parent (e.g. UrlCard placeholder) */
  const handleNativeError = useCallback(
    (e: SyntheticEvent<HTMLImageElement, Event>) => {
      onError?.(e);
    },
    [onError]
  );

  const eager = Boolean(priority || loading === "eager");

  if (useNative && resolvedSrc) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- fallback when /_next/image fails (e.g. 402)
        <img
          alt={alt}
          src={resolvedSrc}
          className={cn("absolute inset-0 h-full w-full", className)}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          sizes={typeof rest.sizes === "string" ? rest.sizes : undefined}
          onError={handleNativeError}
          onLoad={onLoad}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fallback when /_next/image fails (e.g. 402)
      <img
        alt={alt}
        src={resolvedSrc}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        className={cn(className)}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={handleNativeError}
        onLoad={onLoad}
      />
    );
  }

  return (
    <Image
      {...rest}
      alt={alt}
      src={src}
      className={className}
      fill={fill}
      width={width}
      height={height}
      priority={priority}
      loading={loading}
      onError={handleOptimizedError}
      onLoad={onLoad}
    />
  );
}
