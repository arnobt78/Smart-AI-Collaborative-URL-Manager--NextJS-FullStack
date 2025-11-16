import { NextResponse } from "next/server";
import { uploadExternalImage } from "@/lib/cloudinary-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    // Check content type - if it's not HTML, return fallback
    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      // Not HTML content (could be plain text, JSON, etc.)
      return NextResponse.json({
        title: new URL(url).hostname,
        description: null,
        image: null,
        favicon: null,
        siteName: new URL(url).hostname,
        error: `Content type is ${contentType}, not HTML`,
      });
    }

    if (!response.ok) {
      // If forbidden or error, return minimal fallback metadata
      if ([400, 403, 404, 500, 502, 503].includes(response.status)) {
        return NextResponse.json({
          title: new URL(url).hostname,
          description: null,
          image: null,
          favicon: null,
          siteName: new URL(url).hostname,
          error: `No metadata available (HTTP ${response.status})`,
        });
      }
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Helper function to decode HTML entities
    const decodeHtmlEntities = (text: string): string => {
      const entityMap: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'",
        "&apos;": "'",
        "&nbsp;": " ",
      };
      return text.replace(/&[#\w]+;/g, (entity) => {
        if (entity.startsWith("&#")) {
          const code = entity.startsWith("&#x")
            ? parseInt(entity.slice(3, -1), 16)
            : parseInt(entity.slice(2, -1), 10);
          return String.fromCharCode(code);
        }
        return entityMap[entity] || entity;
      });
    };

    // Simple regex-based metadata extraction with improved pattern matching
    const getMetaContent = (name: string): string | null => {
      // Try various patterns to catch different meta tag formats
      const patterns = [
        // Standard: <meta property="og:title" content="...">
        new RegExp(
          `<meta[^>]*(?:name|property)=["']${name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}["'][^>]*content=["']([^"']+)["']`,
          "i"
        ),
        // Reversed: <meta content="..." property="og:title">
        new RegExp(
          `<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}["']`,
          "i"
        ),
        // With spaces/newlines
        new RegExp(
          `<meta[^>]*(?:name|property)=["']${name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}["'][^>]*\\s+content=["']([^"']+)["']`,
          "is"
        ),
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const decoded = decodeHtmlEntities(match[1]);
          if (decoded.trim().length > 0) {
            return decoded.trim();
          }
        }
      }

      return null;
    };

    const getTitle = (): string => {
      // Try JSON-LD structured data first (Schema.org)
      const jsonLd = getJsonLdData();
      if (jsonLd.title) {
        const clean = decodeHtmlEntities(jsonLd.title).trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try Open Graph title
      const ogTitle = getMetaContent("og:title");
      if (ogTitle) {
        const clean = decodeHtmlEntities(ogTitle).trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try Twitter title
      const twitterTitle = getMetaContent("twitter:title");
      if (twitterTitle) {
        const clean = decodeHtmlEntities(twitterTitle).trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try standard meta title tag
      const metaTitle = getMetaContent("title");
      if (metaTitle) {
        const clean = decodeHtmlEntities(metaTitle).trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try <title> tag (handle various formats including multiline and encoded entities)
      const titlePatterns = [
        /<title[^>]*>[\s\S]*?([^<]+)[\s\S]*?<\/title>/i,
        /<title[^>]*>([^<]+)<\/title>/i,
        /<title>([^<]+)<\/title>/i,
      ];

      for (const pattern of titlePatterns) {
        const titleMatch = html.match(pattern);
        if (titleMatch && titleMatch[1]) {
          let cleanTitle = titleMatch[1]
            .replace(/\s+/g, " ")
            .replace(/&nbsp;/g, " ")
            .trim();
          cleanTitle = decodeHtmlEntities(cleanTitle);
          if (cleanTitle && cleanTitle.length > 0) {
            // Limit title length (truncate if too long)
            if (cleanTitle.length > 200) {
              cleanTitle = cleanTitle.substring(0, 197) + "...";
            }
            return cleanTitle;
          }
        }
      }

      // Try <h1> tag (first main heading)
      const h1Patterns = [
        /<h1[^>]*>[\s\S]*?([^<]{10,200})[\s\S]*?<\/h1>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
      ];

      for (const pattern of h1Patterns) {
        const h1Match = html.match(pattern);
        if (h1Match && h1Match[1]) {
          let cleanH1 = h1Match[1]
            .replace(/\s+/g, " ")
            .replace(/&nbsp;/g, " ")
            .trim();
          cleanH1 = decodeHtmlEntities(cleanH1);
          if (cleanH1 && cleanH1.length > 0 && cleanH1.length < 200) {
            return cleanH1;
          }
        }
      }

      // Fallback to hostname (clean it up)
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, ""); // Remove www. prefix
    };

    const getFavicon = (): string | null => {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      // Try various favicon patterns (more comprehensive)
      const faviconPatterns = [
        // Standard favicon link
        /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i,
        /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i,
        // Meta tags
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      ];

      for (const pattern of faviconPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let favicon = match[1];

          // Resolve relative URLs
          if (favicon.startsWith("//")) {
            favicon = `${urlObj.protocol}${favicon}`;
          } else if (favicon.startsWith("/")) {
            favicon = `${baseUrl}${favicon}`;
          } else if (!favicon.startsWith("http")) {
            favicon = `${baseUrl}/${favicon}`;
          }

          return favicon;
        }
      }

      // Fallback: try common favicon paths
      const commonFaviconPaths = [
        "/favicon.ico",
        "/favicon.png",
        "/favicon.svg",
        "/images/favicon.ico",
        "/images/favicon.png",
        "/assets/favicon.ico",
        "/icon.png",
        "/apple-touch-icon.png",
      ];

      // Note: We'll check these paths asynchronously if needed
      // For now, return the most common path
      return `${baseUrl}/favicon.ico`;
    };

    // Helper function to resolve relative URLs to absolute URLs
    const resolveImageUrl = (imageUrl: string | null): string | null => {
      if (!imageUrl) return null;
      const urlObj = new URL(url);

      // Already absolute URL
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }

      // Protocol-relative URL (//example.com/image.jpg)
      if (imageUrl.startsWith("//")) {
        return `${urlObj.protocol}${imageUrl}`;
      }

      // Absolute path (/images/image.jpg)
      if (imageUrl.startsWith("/")) {
        return `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
      }

      // Relative path (images/image.jpg or ./images/image.jpg)
      // Resolve relative to the current URL path
      const basePath = urlObj.pathname.substring(
        0,
        urlObj.pathname.lastIndexOf("/") + 1
      );
      return `${urlObj.protocol}//${urlObj.host}${basePath}${imageUrl.replace(
        /^\.\//,
        ""
      )}`;
    };

    // Helper function to check if an image URL is accessible
    const checkImageExists = async (imageUrl: string): Promise<boolean> => {
      try {
        const response = await fetch(imageUrl, {
          method: "HEAD",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; UrllistBot/1.0; +https://urlist.com)",
          },
        });
        return (
          response.ok &&
          response.headers.get("content-type")?.startsWith("image/") === true
        );
      } catch {
        return false;
      }
    };

    // Extract JSON-LD structured data (Schema.org)
    const getJsonLdData = (): {
      title?: string;
      description?: string;
      image?: string;
    } => {
      try {
        const jsonLdMatches = html.matchAll(
          /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
        );

        for (const match of jsonLdMatches) {
          try {
            const jsonData = JSON.parse(match[1]);
            const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;

            if (data["@type"]) {
              // Extract from various Schema.org types
              const title = data.name || data.headline || data.title;
              const description = data.description || data.about;
              let image = data.image;

              // Handle image as object or string
              if (image && typeof image === "object") {
                image = image.url || image.contentUrl || image;
              }

              if (image && typeof image === "string") {
                image = resolveImageUrl(image);
              }

              return {
                title: title || undefined,
                description: description || undefined,
                image: image || undefined,
              };
            }
          } catch {
            // Invalid JSON-LD, skip
            continue;
          }
        }
      } catch {
        // No JSON-LD found
      }

      return {};
    };

    // Get primary image from meta tags (improved extraction)
    // First try JSON-LD structured data
    const jsonLd = getJsonLdData();
    const rawImage =
      jsonLd.image ||
      getMetaContent("og:image") ||
      getMetaContent("twitter:image") ||
      getMetaContent("twitter:image:src") ||
      getMetaContent("image");
    let resolvedImage = resolveImageUrl(rawImage);

    // If no image found in meta tags, try extracting from various sources
    if (!resolvedImage) {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      // Try to extract from <img> tags in the HTML (first large image)
      const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["']/gi);
      for (const match of imgMatches) {
        if (match[1]) {
          const imgUrl = resolveImageUrl(match[1]);
          if (
            imgUrl &&
            !imgUrl.includes("icon") &&
            !imgUrl.includes("logo") &&
            !imgUrl.includes("avatar")
          ) {
            // Prefer larger images (check width/height attributes if available)
            const imgTag = match[0];
            const hasWidth = imgTag.match(/width=["']?(\d+)["']?/i);
            const hasHeight = imgTag.match(/height=["']?(\d+)["']?/i);
            const width = hasWidth ? parseInt(hasWidth[1]) : 0;
            const height = hasHeight ? parseInt(hasHeight[1]) : 0;

            // If image seems substantial (at least 200x200), use it
            if (width >= 200 || height >= 200 || (!hasWidth && !hasHeight)) {
              resolvedImage = imgUrl;
              break;
            }
          }
        }
      }

      // If still no image, try common image paths
      if (!resolvedImage) {
        const commonImagePaths = [
          "/images/og-image.jpg",
          "/images/og-image.png",
          "/images/og-image.webp",
          "/images/image.jpg",
          "/images/image.png",
          "/images/thumbnail.jpg",
          "/images/thumbnail.png",
          "/images/preview.jpg",
          "/images/preview.png",
          "/public/images/og-image.jpg",
          "/public/images/og-image.png",
          "/public/og-image.jpg",
          "/public/og-image.png",
          "/icon.png",
          "/icon.jpg",
          "/logo.png",
          "/logo.jpg",
          "/og-image.png",
          "/og-image.jpg",
          "/thumbnail.png",
          "/thumbnail.jpg",
          "/favicon.png",
          "/favicon.jpg",
          "/images/favicon.png",
          "/images/logo.png",
          "/images/logo.jpg",
          "/assets/images/og-image.png",
          "/assets/images/og-image.jpg",
          "/assets/og-image.png",
          "/assets/og-image.jpg",
        ];

        // Try to find an existing image by checking common paths
        for (const path of commonImagePaths) {
          const testUrl = `${baseUrl}${path}`;
          if (await checkImageExists(testUrl)) {
            resolvedImage = testUrl;
            break;
          }
        }
      }
    }

    // Improved description extraction
    const getDescription = (): string | null => {
      // Try JSON-LD structured data first
      const jsonLd = getJsonLdData();
      if (jsonLd.description) {
        const clean = jsonLd.description.trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try Open Graph description
      const ogDesc = getMetaContent("og:description");
      if (ogDesc) {
        const clean = ogDesc.trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try Twitter description
      const twitterDesc = getMetaContent("twitter:description");
      if (twitterDesc) {
        const clean = twitterDesc.trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try standard meta description
      const metaDesc = getMetaContent("description");
      if (metaDesc) {
        const clean = metaDesc.trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try meta name="description"
      const nameDescMatch =
        html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i
        );
      if (nameDescMatch && nameDescMatch[1]) {
        const clean = nameDescMatch[1].trim();
        if (clean && clean.length > 0) return clean;
      }

      // Try to find first meaningful paragraph (<p> tag)
      const pMatch = html.match(/<p[^>]*>[\s\S]*?([^<]{50,300})[\s\S]*?<\/p>/i);
      if (pMatch && pMatch[1]) {
        const clean = pMatch[1]
          .trim()
          .replace(/\s+/g, " ")
          .replace(/&nbsp;/g, " ");
        if (clean && clean.length > 50) {
          // Return first 200 characters
          return clean.substring(0, 200) + (clean.length > 200 ? "..." : "");
        }
      }

      return null;
    };

    // Optimize images using Cloudinary
    // Use upload method (like hotel-booking) instead of fetch URLs
    // This works even if Cloudinary Fetch is disabled
    const optimizedImage = resolvedImage
      ? await uploadExternalImage(resolvedImage, {
          width: 1200,
          height: 630,
          quality: "auto",
        })
      : null;

    const faviconUrl = getFavicon();
    const optimizedFavicon = faviconUrl
      ? await uploadExternalImage(faviconUrl, {
          width: 32,
          height: 32,
          quality: "auto",
        })
      : null;

    const metadata = {
      title: getTitle(),
      description: getDescription(),
      // Only use optimized image if upload was successful
      // If uploadExternalImage returns null, it means the image is broken/404 - return null instead of broken URL
      // If optimizedImage is undefined, it means resolvedImage was null/empty - return null
      image:
        optimizedImage !== undefined ? optimizedImage : resolvedImage || null,
      favicon:
        optimizedFavicon !== undefined ? optimizedFavicon : faviconUrl || null,
      siteName:
        getMetaContent("og:site_name") ||
        getMetaContent("application-name") ||
        new URL(url).hostname,
    };

    return NextResponse.json(metadata);
  } catch (error: unknown) {
    console.error("Error fetching metadata:", error);
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Failed to fetch metadata: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        : "Failed to fetch metadata";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
