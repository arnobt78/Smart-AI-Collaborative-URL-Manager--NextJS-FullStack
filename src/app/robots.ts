import type { MetadataRoute } from "next";

/**
 * REQ-0002 — single robots source of truth (do not add public/robots.txt).
 * Allow marketing + public browse/list SEO; keep API/build and auth app surfaces out of crawls.
 * AI scrapers are blocked separately (complements Vercel Firewall AI Bots = Deny).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/_next/",
          "/api/",
          "/lists",
          "/new",
          "/business-insights",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "anthropic-ai",
          "Claude-Web",
        ],
        disallow: "/",
      },
    ],
    sitemap: "https://daily-urlist.vercel.app/sitemap.xml",
    host: "https://daily-urlist.vercel.app",
  };
}
