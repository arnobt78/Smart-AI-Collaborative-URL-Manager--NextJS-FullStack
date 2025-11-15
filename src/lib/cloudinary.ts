// Client-side Cloudinary utilities (no Node.js dependencies)
// Server-side upload functionality is in src/lib/cloudinary-server.ts

// Extend Window interface to include Cloudinary cloud name
declare global {
  interface Window {
    __CLOUDINARY_CLOUD_NAME__?: string;
  }
}

// Environment variable to disable Cloudinary optimization (useful for development/testing)
const CLOUDINARY_ENABLED =
  process.env.NEXT_PUBLIC_CLOUDINARY_ENABLED !== "false" &&
  process.env.CLOUDINARY_ENABLED !== "false";

export interface OptimizedImageOptions {
  width?: number;
  height?: number;
  quality?: "auto" | number;
  format?: "auto" | "webp" | "jpg" | "png";
  fetchFormat?: "auto";
  flags?: string[];
}

/**
 * Generate an optimized Cloudinary URL from an external image URL
 * Uses Cloudinary's fetch feature to optimize external images
 */
export function getOptimizedImageUrl(
  imageUrl: string | null,
  options: OptimizedImageOptions = {}
): string | null {
  if (!imageUrl) return null;

  // If it's already a Cloudinary URL, return as-is
  if (imageUrl.includes("cloudinary.com")) {
    return imageUrl;
  }

  // Skip data URLs and relative paths without domain
  if (
    imageUrl.startsWith("data:") ||
    (imageUrl.startsWith("/") && !imageUrl.startsWith("//"))
  ) {
    return imageUrl;
  }

  // Get Cloudinary config from environment (client-safe)
  const cloudName =
    (typeof window === "undefined"
      ? process.env.CLOUDINARY_CLOUD_NAME
      : window.__CLOUDINARY_CLOUD_NAME__) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    // If Cloudinary not configured, return original URL
    return imageUrl;
  }

  const {
    width = 800,
    height,
    quality = "auto",
    format = "auto",
    fetchFormat = "auto",
    flags = ["immutable_cache"],
  } = options;

  try {
    // Build transformation parameters
    const transformations: string[] = [];

    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (quality) transformations.push(`q_${quality}`);
    if (format && format !== "auto") transformations.push(`f_${format}`);
    if (fetchFormat) transformations.push(`f_${fetchFormat}`);

    // Add flags for caching and optimization
    // Remove duplicates and ensure immutable_cache is only added once
    const uniqueFlags = Array.from(
      new Set(["immutable_cache", ...(flags || [])])
    ).filter(Boolean);
    if (uniqueFlags.length > 0) {
      transformations.push(...uniqueFlags.map((f) => `fl_${f}`));
    }

    const transformationString = transformations.join(",");
    const encodedUrl = encodeURIComponent(imageUrl);

    return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformationString}/${encodedUrl}`;
  } catch (error) {
    console.error("Error generating optimized image URL:", error);
    return imageUrl; // Fallback to original URL
  }
}

/**
 * Optimize a favicon URL
 * Returns null if Cloudinary is not configured or if URL should not be optimized
 */
export function getOptimizedFaviconUrl(
  faviconUrl: string | null
): string | null {
  if (!faviconUrl) return null;

  // Skip Cloudinary if URL is from localhost (not publicly accessible)
  try {
    const url = new URL(faviconUrl);
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.includes(".local")
    ) {
      return faviconUrl; // Return original URL, don't optimize
    }
  } catch {
    // Invalid URL, return original
    return faviconUrl;
  }

  // Only optimize if Cloudinary is configured
  const cloudName =
    (typeof window === "undefined"
      ? process.env.CLOUDINARY_CLOUD_NAME
      : window.__CLOUDINARY_CLOUD_NAME__) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    return faviconUrl; // Return original if Cloudinary not configured
  }

  return getOptimizedImageUrl(faviconUrl, {
    width: 32,
    height: 32,
    quality: "auto",
    format: "auto",
  });
}

/**
 * Optimize a metadata/OG image URL
 * Returns null if Cloudinary is not configured or if URL should not be optimized
 */
export function getOptimizedMetadataImageUrl(
  imageUrl: string | null
): string | null {
  if (!imageUrl) return null;

  // Skip Cloudinary if URL is from localhost (not publicly accessible)
  try {
    const url = new URL(imageUrl);
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.includes(".local")
    ) {
      return imageUrl; // Return original URL, don't optimize
    }
  } catch {
    // Invalid URL, return original
    return imageUrl;
  }

  // Only optimize if Cloudinary is enabled and configured
  if (!CLOUDINARY_ENABLED) {
    return imageUrl; // Return original if Cloudinary is disabled
  }

  const cloudName =
    (typeof window === "undefined"
      ? process.env.CLOUDINARY_CLOUD_NAME
      : window.__CLOUDINARY_CLOUD_NAME__) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    return imageUrl; // Return original if Cloudinary not configured
  }

  return getOptimizedImageUrl(imageUrl, {
    width: 1200,
    height: 630,
    quality: "auto",
    format: "auto",
  });
}

// Note: Upload functionality moved to src/lib/cloudinary-server.ts for server-side only

/**
 * Get optimized URL for public folder images
 * In production, these will be served via Cloudinary
 * In development (localhost), returns original path to avoid hydration issues
 */
export function getPublicImageUrl(
  publicPath: string,
  options: OptimizedImageOptions = {}
): string {
  // Get Cloudinary config from environment (client-safe)
  const cloudName =
    (typeof window === "undefined"
      ? process.env.CLOUDINARY_CLOUD_NAME
      : window.__CLOUDINARY_CLOUD_NAME__) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName || !CLOUDINARY_ENABLED) {
    return publicPath;
  }

  // For public folder images, use direct Cloudinary fetch
  // But only in production - localhost URLs aren't accessible from Cloudinary
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Skip Cloudinary for localhost/development URLs - they're not publicly accessible
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    return publicPath;
  }

  const fullUrl = `${baseUrl}${publicPath}`;
  const optimizedUrl = getOptimizedImageUrl(fullUrl, options);
  return optimizedUrl || publicPath;
}
