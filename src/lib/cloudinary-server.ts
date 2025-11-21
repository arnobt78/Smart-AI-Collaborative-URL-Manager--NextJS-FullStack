// Server-side only Cloudinary utilities
import { v2 as cloudinary } from "cloudinary";
import type { OptimizedImageOptions } from "./cloudinary";
import crypto from "crypto";

// Configure Cloudinary (only used on server)
if (typeof window === "undefined") {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// In-memory cache for uploaded images (URL -> Cloudinary URL)
// This prevents re-uploading the same image within the same server session
const imageUploadCache = new Map<string, string>();

/**
 * Generate a deterministic public_id from image URL
 * This ensures the same URL always gets the same Cloudinary public_id
 * which allows Cloudinary to handle deduplication automatically
 */
function generatePublicId(
  imageUrl: string,
  folder: string = "external-images"
): string {
  // Create a hash of the URL for consistent public_id
  const hash = crypto
    .createHash("md5")
    .update(imageUrl)
    .digest("hex")
    .substring(0, 16);
  // Use folder/hash format
  return `${folder}/${hash}`;
}

/**
 * Upload a public folder image to Cloudinary and get optimized URL
 * This is useful for static assets in the public folder
 * SERVER-SIDE ONLY
 */
export async function uploadPublicImage(
  publicPath: string,
  options: OptimizedImageOptions = {}
): Promise<string | null> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn("Cloudinary not configured, returning original path");
    return publicPath;
  }

  if (typeof window !== "undefined") {
    throw new Error("uploadPublicImage can only be called server-side");
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const fullUrl = `${baseUrl}${publicPath}`;

    // Upload to Cloudinary with optimization
    const result = await cloudinary.uploader.upload(fullUrl, {
      folder: "public-assets",
      overwrite: false,
      resource_type: "image",
      transformation: [
        {
          width: options.width || 800,
          height: options.height,
          quality: options.quality || "auto",
          fetch_format: options.fetchFormat || "auto",
          flags: ["immutable_cache"],
        },
      ],
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error uploading public image to Cloudinary:", error);
    return publicPath; // Fallback to original path
  }
}

/**
 * Upload an external image URL to Cloudinary and get optimized URL
 * Uses uploader.upload() like hotel-booking project (works even if Fetch is disabled)
 * Includes caching to avoid re-uploading the same images
 * SERVER-SIDE ONLY
 */
export async function uploadExternalImage(
  imageUrl: string,
  options: OptimizedImageOptions = {}
): Promise<string | null> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn("Cloudinary not configured, returning original URL");
    return imageUrl;
  }

  if (typeof window !== "undefined") {
    throw new Error("uploadExternalImage can only be called server-side");
  }

  // Skip localhost URLs
  try {
    const url = new URL(imageUrl);
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.includes(".local")
    ) {
      return imageUrl;
    }
  } catch {
    // Invalid URL, skip
    return imageUrl;
  }

  // Check in-memory cache first
  const cacheKey = `${imageUrl}-${options.width || "auto"}-${
    options.height || "auto"
  }`;
  if (imageUploadCache.has(cacheKey)) {
    const cached = imageUploadCache.get(cacheKey);
    // Empty string means previous upload failed (404, etc.)
    if (cached === "") {
      return null;
    }
    return cached || null;
  }

  try {
    const folder = "external-images";
    const publicId = generatePublicId(imageUrl, folder);

    // Check if image already exists in Cloudinary by trying to get it
    // This prevents re-uploading if the image was uploaded in a previous session
    try {
      await cloudinary.api.resource(publicId, {
        resource_type: "image",
      });

      // Image exists! Generate optimized URL from existing resource
      const optimizedUrl = cloudinary.url(publicId, {
        resource_type: "image",
        secure: true,
        transformation: [
          {
            width: options.width || 800,
            height: options.height,
            crop: options.height ? "fill" : "scale",
            quality: options.quality || "auto",
            fetch_format: options.fetchFormat || "auto",
          },
        ],
      });

      // Cache it
      imageUploadCache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    } catch (_error: unknown) {
      // Resource doesn't exist (404) or other error - proceed with upload
      // This is expected for new images, so we continue
      // We intentionally ignore the error to proceed with upload
    }

    // Fetch the image from the external URL with timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response: Response;
    try {
      response = await fetch(imageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; UrllistBot/1.0; +https://urlist.com)",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId); // Clear timeout on success
    } catch (fetchError) {
      clearTimeout(timeoutId); // Clear timeout on error
      // Timeout or network error - don't block, just return null
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.warn(
          `Timeout fetching image from ${imageUrl} (exceeded 10s)`
        );
      } else {
        console.warn(`Failed to fetch image from ${imageUrl}:`, fetchError);
      }
      // Cache empty string to indicate failure
      imageUploadCache.set(cacheKey, "");
      return null;
    }

    if (!response.ok) {
      console.warn(
        `Failed to fetch image from ${imageUrl}: ${response.status} ${response.statusText}`
      );
      // Return null instead of broken URL to prevent client from trying to load 404 images
      // Cache null to avoid repeated failed requests for the same broken URL
      imageUploadCache.set(cacheKey, ""); // Cache empty string to indicate failure
      return null; // Return null so metadata API knows the image is unavailable
    }

    // Convert to buffer then base64
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    const dataURI = `data:${mimeType};base64,${base64}`;

    // Upload to Cloudinary using uploader.upload() (like hotel-booking)
    // Use deterministic public_id so Cloudinary handles deduplication
    // Note: public_id already includes folder, so don't set folder separately
    const result = await cloudinary.uploader.upload(dataURI, {
      public_id: publicId,
      overwrite: false, // Don't overwrite if exists
      resource_type: "image",
      secure: true, // Force HTTPS URLs
      transformation: [
        {
          width: options.width || 800,
          height: options.height,
          crop: options.height ? "fill" : "scale",
          quality: options.quality || "auto",
          fetch_format: options.fetchFormat || "auto",
        },
      ],
    });

    // Cache the result
    imageUploadCache.set(cacheKey, result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading external image to Cloudinary:", error);
    return imageUrl; // Fallback to original URL
  }
}
