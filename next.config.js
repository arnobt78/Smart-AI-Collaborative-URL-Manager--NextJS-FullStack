const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */

/**
 * REQ-0002 / VERCEL_PRODUCTION_GUARDRAILS — security + static cache headers.
 * REQ-0006 — wrapped with withSentryConfig (tunnelRoute bypasses ad-blockers).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Temporarily skip linting during builds to avoid circular config issues
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // Enable image optimization
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days cache
  },
  // Expose Cloudinary cloud name to client
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Content-hashed build assets — long-lived immutable cache (reduces bot re-fetch)
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

/**
 * tunnelRoute: same-origin /api/monitoring — browsers send Sentry envelopes here
 * instead of *.ingest.sentry.io, so ad-block / privacy extensions usually allow them.
 * Source-map upload uses SENTRY_AUTH_TOKEN when present (skipped if missing).
 */
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Same-origin tunnel (normal browser + incognito with ad-block)
  tunnelRoute: "/api/monitoring",
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
