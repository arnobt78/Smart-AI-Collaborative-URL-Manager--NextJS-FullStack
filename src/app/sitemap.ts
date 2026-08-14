import type { MetadataRoute } from "next";

/**
 * SEO sitemap for public marketing / discovery routes.
 * Private app surfaces (/lists, /new, etc.) stay out of robots + sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://daily-urlist.vercel.app";
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/browse`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/api-docs`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
