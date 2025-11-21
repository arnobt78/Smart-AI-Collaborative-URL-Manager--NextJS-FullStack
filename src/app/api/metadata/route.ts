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
      signal: AbortSignal.timeout(10000), // 10 second timeout - faster failure, less blocking
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
      // If forbidden or error, try to at least get favicon
      if ([400, 403, 404, 500, 502, 503].includes(response.status)) {
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

        // Try common favicon paths as fallback image (better than nothing)
        const commonFavicons = [
          "/favicon.ico",
          "/favicon.png",
          "/favicon.svg",
          "/apple-touch-icon.png",
          "/images/favicon.ico",
          "/images/favicon.png",
        ];

        let fallbackFavicon: string | null = null;
        for (const path of commonFavicons) {
          const faviconUrl = `${baseUrl}${path}`;
          try {
            const faviconCheck = await fetch(faviconUrl, {
              method: "HEAD",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
              signal: AbortSignal.timeout(3000),
            });
            if (
              faviconCheck.ok &&
              faviconCheck.headers.get("content-type")?.startsWith("image/")
            ) {
              fallbackFavicon = faviconUrl;
              break;
            }
          } catch {
            // Skip if check fails
            continue;
          }
        }

        return NextResponse.json({
          title: new URL(url).hostname.replace(/^www\./, ""),
          description: null,
          image: fallbackFavicon, // Use favicon as fallback image
          favicon: fallbackFavicon,
          siteName: new URL(url).hostname.replace(/^www\./, ""),
          error: `No metadata available (HTTP ${response.status})`,
        });
      }
      // For rate limiting (429), return empty metadata instead of throwing
      // This allows import to continue with imported data
      if (response.status === 429) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `⚠️ [METADATA] Rate limited (429) for ${url} - using imported data`
          );
        }
        return NextResponse.json({
          title: new URL(url).hostname.replace(/^www\./, ""),
          description: null,
          image: undefined,
          favicon: undefined,
          siteName: new URL(url).hostname.replace(/^www\./, ""),
          error: `Rate limited (429) - using imported data`,
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

    const getFavicon = async (): Promise<string | null> => {
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

      // Fallback: try common favicon paths (actually check them)
      const commonFaviconPaths = [
        "/favicon.ico",
        "/favicon.png",
        "/favicon.svg",
        "/images/favicon.ico",
        "/images/favicon.png",
        "/assets/favicon.ico",
        "/icon.png",
        "/apple-touch-icon.png",
        "/apple-touch-icon-precomposed.png",
        "/favicon-32x32.png",
        "/favicon-16x16.png",
      ];

      // Try to verify at least one exists (quick check)
      for (const path of commonFaviconPaths) {
        const faviconUrl = `${baseUrl}${path}`;
        try {
          const checkResponse = (await Promise.race([
            fetch(faviconUrl, {
              method: "HEAD",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
              signal: AbortSignal.timeout(2000),
            }),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 2000)
            ),
          ])) as Response;

          if (
            checkResponse.ok &&
            checkResponse.headers.get("content-type")?.startsWith("image/")
          ) {
            return faviconUrl;
          }
        } catch {
          // Skip if check fails
          continue;
        }
      }

      // Return most common path as last resort (will be checked on client)
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

      // Try to extract from <img> tags in the HTML (more aggressive extraction)
      const imgMatches = Array.from(
        html.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)
      );

      // Collect all potential images with their sizes
      const potentialImages: Array<{ url: string; score: number }> = [];

      for (const match of imgMatches) {
        if (match[1]) {
          const imgUrl = resolveImageUrl(match[1]);
          if (!imgUrl || imgUrl.startsWith("data:")) continue;

          const imgTag = match[0];

          // Check for width/height attributes or CSS classes that suggest size
          const hasWidth = imgTag.match(/width=["']?(\d+)["']?/i);
          const hasHeight = imgTag.match(/height=["']?(\d+)["']?/i);
          const width = hasWidth ? parseInt(hasWidth[1]) : 0;
          const height = hasHeight ? parseInt(hasHeight[1]) : 0;

          // Check for CSS classes that suggest it's a hero/banner image
          const hasHeroClass =
            /hero|banner|cover|featured|main|header|image|picture|photo|illustration/i.test(
              imgTag
            );
          const hasThumbClass =
            /thumb|thumbnail|small|icon|logo|avatar|badge|button/i.test(imgTag);

          // Calculate score based on various factors
          let score = 0;

          // Size scoring (larger is better)
          if (width >= 800 || height >= 600) score += 100; // Very large
          else if (width >= 400 || height >= 300) score += 50; // Large
          else if (width >= 200 || height >= 200) score += 25; // Medium
          else if (width > 0 || height > 0) score += 10; // Has size info
          else score += 5; // No size info (unknown, might be good)

          // URL pattern scoring (prefer certain patterns)
          if (/og|social|share|preview|meta|feature/i.test(imgUrl)) score += 30;
          if (/hero|banner|cover|header|main|featured/i.test(imgUrl))
            score += 25;
          if (/image|img|photo|picture|illustration/i.test(imgUrl)) score += 15;

          // Class-based scoring
          if (hasHeroClass && !hasThumbClass) score += 20;
          if (hasThumbClass) score -= 30; // Penalize thumbnails/icons

          // Penalize obvious icons/logos/avatars
          if (
            /icon|logo|avatar|badge|button|nav|menu|spinner|loading/i.test(
              imgUrl
            )
          ) {
            score -= 50;
          }

          // Only consider images with positive score
          if (score > 0) {
            potentialImages.push({ url: imgUrl, score });
          }
        }
      }

      // Sort by score and pick the best one
      if (potentialImages.length > 0) {
        potentialImages.sort((a, b) => b.score - a.score);
        resolvedImage = potentialImages[0].url;
      }

      // If still no image, try common image paths (more comprehensive)
      if (!resolvedImage) {
        const commonImagePaths = [
          // OG images (highest priority)
          "/images/og-image.jpg",
          "/images/og-image.png",
          "/images/og-image.webp",
          "/og-image.jpg",
          "/og-image.png",
          "/og-image.webp",
          "/public/images/og-image.jpg",
          "/public/images/og-image.png",
          "/assets/images/og-image.png",
          "/assets/images/og-image.jpg",
          "/assets/og-image.png",
          "/assets/og-image.jpg",
          // General images
          "/images/image.jpg",
          "/images/image.png",
          "/images/hero.jpg",
          "/images/hero.png",
          "/images/cover.jpg",
          "/images/cover.png",
          "/images/banner.jpg",
          "/images/banner.png",
          "/images/featured.jpg",
          "/images/featured.png",
          // Thumbnails/previews
          "/images/thumbnail.jpg",
          "/images/thumbnail.png",
          "/images/preview.jpg",
          "/images/preview.png",
          // Root level images
          "/image.jpg",
          "/image.png",
          "/hero.jpg",
          "/hero.png",
          "/cover.jpg",
          "/cover.png",
          "/banner.jpg",
          "/banner.png",
          // Logos (as last resort, but still better than nothing)
          "/logo.png",
          "/logo.jpg",
          "/logo.svg",
          "/images/logo.png",
          "/images/logo.jpg",
          "/icon.png",
          "/icon.jpg",
          // Favicons as absolute last resort
          "/favicon.png",
          "/favicon.jpg",
          "/images/favicon.png",
        ];

        // Try to find an existing image by checking common paths (with timeout)
        for (const path of commonImagePaths) {
          const testUrl = `${baseUrl}${path}`;
          try {
            if (
              await Promise.race([
                checkImageExists(testUrl),
                new Promise<boolean>((resolve) =>
                  setTimeout(() => resolve(false), 1000)
                ),
              ])
            ) {
              resolvedImage = testUrl;
              break;
            }
          } catch {
            // Skip if check fails
            continue;
          }
        }
      }

      // Final fallback: use favicon as image if no other image found
      if (!resolvedImage) {
        const favicon = await getFavicon();
        if (favicon) {
          // Verify favicon exists before using it as image
          try {
            if (
              await Promise.race([
                checkImageExists(favicon),
                new Promise<boolean>((resolve) =>
                  setTimeout(() => resolve(false), 1000)
                ),
              ])
            ) {
              resolvedImage = favicon;
            }
          } catch {
            // Skip if check fails
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

    const faviconUrl = await getFavicon();
    let optimizedFavicon: string | null = null;
    if (faviconUrl) {
      try {
        // Wrap in timeout to prevent blocking if uploadExternalImage hangs
        optimizedFavicon = await Promise.race([
          uploadExternalImage(faviconUrl, {
            width: 32,
            height: 32,
            quality: "auto",
          }),
          new Promise<null>((resolve) =>
            setTimeout(() => {
              console.warn(`Favicon upload timeout for ${faviconUrl}`);
              resolve(null);
            }, 15000)
          ),
        ]);
      } catch (error) {
        console.warn(`Error optimizing favicon ${faviconUrl}:`, error);
        optimizedFavicon = null;
      }
    }

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
